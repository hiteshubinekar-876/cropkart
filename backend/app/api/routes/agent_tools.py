"""Authenticated data tools called by the CropSathi LangFlow agent."""

import hmac
from datetime import date, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlmodel import col, or_, select

from app.api.deps import SessionDep
from app.core.config import settings
from app.models.address import UserAddress
from app.models.crop import Crop
from app.models.crop_listing import CropListing
from app.models.market_data import MarketData

router = APIRouter(prefix="/tools/v1", tags=["CropSathi tools"])


def _tool_error(tool: str, code: str, message: str) -> dict[str, Any]:
    return {
        "success": False,
        "tool": tool,
        "error": {"code": code, "message": message},
    }


def require_tool_key(
    supplied_key: Annotated[
        str | None, Header(alias="X-CropSathi-Tool-Key")
    ] = None,
) -> None:
    """Require a dedicated service key; do not reuse the LangFlow UI key."""
    configured = settings.CROPSATHI_TOOL_KEY
    if configured is None or not configured.get_secret_value():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_tool_error(
                "auth",
                "NOT_CONFIGURED",
                "CropSathi tool authentication is not configured on the backend.",
            ),
        )
    expected_key = configured.get_secret_value()
    if supplied_key is None or not hmac.compare_digest(supplied_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_tool_error(
                "auth",
                "UNAUTHORIZED",
                "Invalid or missing X-CropSathi-Tool-Key header.",
            ),
        )


ToolAuth = Annotated[None, Depends(require_tool_key)]


class DemandForecastRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=100)
    days: int = Field(default=30, ge=1, le=365)


@router.get("/market-prices")
def get_market_prices(
    session: SessionDep,
    _auth: ToolAuth,
    crop: str = Query(min_length=1, max_length=100),
    location: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict[str, Any]:
    """Read real market observations from Supabase's market_data table."""
    crop_term = f"%{crop.strip()}%"
    location_term = f"%{location.strip()}%"
    statement = (
        select(MarketData)
        .where(
            col(MarketData.commodity).ilike(crop_term),
            or_(
                col(MarketData.market_name).ilike(location_term),
                col(MarketData.district).ilike(location_term),
                col(MarketData.state).ilike(location_term),
            ),
        )
        .order_by(col(MarketData.arrival_date).desc())
        .limit(limit)
    )
    rows = session.exec(statement).all()
    return {
        "success": True,
        "tool": "market_prices",
        "data": {
            "crop": crop.strip(),
            "location": location.strip(),
            "total_records": len(rows),
            "records": [
                {
                    "commodity": row.commodity,
                    "variety": row.variety,
                    "mandi": row.market_name,
                    "district": row.district,
                    "state": row.state,
                    "record_date": row.arrival_date.isoformat(),
                    "modal_price": float(row.modal_price),
                    "min_price": float(row.min_price),
                    "max_price": float(row.max_price),
                    "arrival_quantity": float(row.arrival_quantity),
                    "data_source": row.source,
                }
                for row in rows
            ],
        },
    }


@router.post("/demand-forecast")
def forecast_demand(
    request: DemandForecastRequest,
    session: SessionDep,
    _auth: ToolAuth,
) -> dict[str, Any]:
    """Run the existing CropKart demand model using its Supabase-backed inputs."""
    try:
        from app.ml.inference import DemandForecastingError, predict_demand

        result = predict_demand(
            crop=request.crop,
            location=request.location,
            days=request.days,
            db=session,
        )
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_tool_error(
                "demand_forecast",
                "MODEL_UNAVAILABLE",
                "The CropKart demand model is not available in this backend runtime.",
            ),
        ) from exc
    except Exception as exc:
        # The forecasting error type is imported lazily with the ML module.
        error_code = getattr(exc, "code", None)
        if not error_code:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=_tool_error(
                    "demand_forecast",
                    "PREDICTION_ERROR",
                    "The demand forecast could not be computed.",
                ),
            ) from exc
        error_status = (
            status.HTTP_422_UNPROCESSABLE_ENTITY
            if error_code == "INVALID_INPUT"
            else status.HTTP_404_NOT_FOUND
            if error_code == "INSUFFICIENT_DATA"
            else status.HTTP_503_SERVICE_UNAVAILABLE
            if error_code == "MODEL_UNAVAILABLE"
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        message = str(exc) if isinstance(exc, DemandForecastingError) else "Forecast failed."
        raise HTTPException(
            status_code=error_status,
            detail=_tool_error("demand_forecast", str(error_code), message),
        ) from exc

    return {
        "success": True,
        "tool": "demand_forecast",
        "data": {
            "crop": result["crop"],
            "location": result["location"],
            "forecast_days": result["forecast_days"],
            "predicted_demand": result["predicted_demand"],
            "unit": result["unit"],
            "model_version": result["model_version"],
            "data_source": result["data_source"],
        },
    }


@router.get("/crop-listings")
def get_crop_listings(
    session: SessionDep,
    _auth: ToolAuth,
    crop: str | None = Query(default=None, max_length=100),
    location: str | None = Query(default=None, max_length=100),
    min_quantity: float | None = Query(default=None, ge=0),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict[str, Any]:
    """Read active farmer listings and pickup-area names from Supabase."""
    statement = (
        select(CropListing, Crop, UserAddress)
        .join(Crop, CropListing.crop_id == Crop.id)
        .join(UserAddress, CropListing.pickup_address_id == UserAddress.id)
        .where(CropListing.status == "active", CropListing.available_quantity > 0)
    )
    if crop and crop.strip():
        statement = statement.where(col(Crop.name).ilike(f"%{crop.strip()}%"))
    if location and location.strip():
        location_term = f"%{location.strip()}%"
        statement = statement.where(
            or_(
                col(UserAddress.district).ilike(location_term),
                col(UserAddress.state).ilike(location_term),
                col(UserAddress.village_or_taluka).ilike(location_term),
            )
        )
    if min_quantity is not None:
        statement = statement.where(CropListing.available_quantity >= min_quantity)

    rows = session.exec(
        statement.order_by(col(CropListing.created_at).desc()).limit(limit)
    ).all()
    listings = [
        {
            "id": str(listing.id),
            "farmer_id": str(listing.farmer_id),
            "name": crop_record.name,
            "variety": listing.variety,
            "category": crop_record.category,
            "quantity": float(listing.available_quantity),
            "unit": listing.unit,
            "price_per_unit": float(listing.price_per_unit),
            "location": address.village_or_taluka or address.district,
            "district": address.district,
            "state": address.state,
            "quality_grade": listing.grade,
            "harvest_date": (
                listing.harvest_date.isoformat() if listing.harvest_date else None
            ),
            "status": listing.status.upper(),
            "created_at": listing.created_at.isoformat(),
        }
        for listing, crop_record, address in rows
    ]
    return {
        "success": True,
        "tool": "crop_listings",
        "data": {"total": len(listings), "listings": listings},
    }


@router.get("/buyer-requirements")
def get_buyer_requirements(
    session: SessionDep,
    _auth: ToolAuth,
    crop: str | None = Query(default=None, max_length=100),
    location: str | None = Query(default=None, max_length=100),
    status_filter: str | None = Query(default=None, alias="status", max_length=40),
    urgency: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict[str, Any]:
    """Read buyer demand only when its real table exists in the backend schema."""
    connection = session.connection()
    schema = inspect(connection)
    if not schema.has_table("buyer_requirements"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_tool_error(
                "buyer_requirements",
                "NOT_CONFIGURED",
                "The Supabase schema has no buyer_requirements table; no demand data was fabricated.",
            ),
        )

    columns = {column["name"] for column in schema.get_columns("buyer_requirements")}
    if not {"crop_name", "quantity"}.issubset(columns):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_tool_error(
                "buyer_requirements",
                "SCHEMA_UNSUPPORTED",
                "The buyer_requirements table does not expose crop_name and quantity fields.",
            ),
        )

    output_columns = [
        name
        for name in (
            "id",
            "crop_name",
            "variety",
            "quantity",
            "unit",
            "target_price",
            "location",
            "district",
            "state",
            "urgency",
            "status",
            "created_at",
        )
        if name in columns
    ]
    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if crop:
        clauses.append("crop_name ILIKE :crop")
        params["crop"] = f"%{crop.strip()}%"
    if location:
        location_columns = [
            name for name in ("location", "district", "state") if name in columns
        ]
        if location_columns:
            clauses.append(
                "(" + " OR ".join(f"{name} ILIKE :location" for name in location_columns) + ")"
            )
            params["location"] = f"%{location.strip()}%"
    if status_filter and "status" in columns:
        clauses.append("status ILIKE :status")
        params["status"] = status_filter.strip()
    if urgency and "urgency" in columns:
        clauses.append("urgency ILIKE :urgency")
        params["urgency"] = urgency.strip()

    where_clause = " WHERE " + " AND ".join(clauses) if clauses else ""
    order_clause = " ORDER BY created_at DESC" if "created_at" in columns else ""
    records = session.execute(
        text(
            f"SELECT {', '.join(output_columns)} FROM buyer_requirements"
            f"{where_clause}{order_clause} LIMIT :limit"
        ),
        params,
    ).mappings().all()
    requirements = [
        {
            "id": str(row.get("id", "")),
            "crop_name": str(row["crop_name"]),
            "variety": row.get("variety"),
            "quantity": float(row["quantity"]),
            "unit": row.get("unit") or "quintal",
            "target_price": (
                float(row["target_price"])
                if row.get("target_price") is not None
                else None
            ),
            "location": row.get("location"),
            "district": row.get("district"),
            "state": row.get("state"),
            "urgency": row.get("urgency"),
            "status": str(row.get("status") or "OPEN").upper(),
            "created_at": (
                row["created_at"].isoformat()
                if isinstance(row.get("created_at"), (date, datetime))
                else row.get("created_at")
            ),
        }
        for row in records
    ]
    return {
        "success": True,
        "tool": "buyer_requirements",
        "data": {"total": len(requirements), "requirements": requirements},
    }
