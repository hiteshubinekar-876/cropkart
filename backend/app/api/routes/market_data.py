"""Market Data API Routes for CropKart.

Provides read-only access to Agmarknet / APMC mandi market price records,
commodity filtering, master crop associations, and search capabilities.
"""

import uuid
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import col, func, or_, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models.crop import Crop
from app.models.market_data import MarketData
from app.schemas.market_data import (
    CedaBatchIngestRequest,
    CedaSyncRequest,
    CedaSyncResponse,
    MarketDataListPublic,
    MarketDataPublic,
)
from app.services.ceda_service import (
    CedaApiError,
    CedaAuthError,
    CedaRateLimitError,
    CedaRequestError,
    CedaServerError,
    sync_ceda_to_market_data,
)

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.get(
    "/search",
    response_model=MarketDataListPublic,
    summary="Search market records across commodity, market, district, and state",
)
def search_market_data(
    session: SessionDep,
    q: str = Query(..., min_length=1, description="Search term"),
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=50, ge=1, le=500, description="Max records to return"),
) -> MarketDataListPublic:
    """Free-text search across commodity name, market name, district, or state."""
    term = f"%{q.strip()}%"
    search_filter = or_(
        col(MarketData.commodity).ilike(term),
        col(MarketData.market_name).ilike(term),
        col(MarketData.district).ilike(term),
        col(MarketData.state).ilike(term),
    )

    count_stmt = select(func.count()).select_from(MarketData).where(search_filter)
    total_count = session.exec(count_stmt).one()

    stmt = (
        select(MarketData)
        .where(search_filter)
        .order_by(col(MarketData.arrival_date).desc())
        .offset(skip)
        .limit(limit)
    )
    records = list(session.exec(stmt).all())

    return MarketDataListPublic(
        data=[MarketDataPublic.model_validate(r) for r in records],
        count=total_count,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/crop/{crop_id}",
    response_model=MarketDataListPublic,
    summary="Retrieve market data records for a specific master crop catalog item",
)
def get_market_data_by_crop(
    session: SessionDep,
    crop_id: uuid.UUID,
    start_date: date | None = Query(
        default=None, description="Filter arrival date on or after"
    ),
    end_date: date | None = Query(
        default=None, description="Filter arrival date on or before"
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> MarketDataListPublic:
    """Retrieves all mandi market observations linked to a canonical master Crop ID."""
    crop = session.get(Crop, crop_id)
    if not crop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crop with ID {crop_id} not found in master catalog",
        )

    filters: list[Any] = [MarketData.crop_id == crop_id]
    if start_date:
        filters.append(MarketData.arrival_date >= start_date)
    if end_date:
        filters.append(MarketData.arrival_date <= end_date)

    count_stmt = select(func.count()).select_from(MarketData).where(*filters)
    total_count = session.exec(count_stmt).one()

    stmt = (
        select(MarketData)
        .where(*filters)
        .order_by(col(MarketData.arrival_date).desc())
        .offset(skip)
        .limit(limit)
    )
    records = list(session.exec(stmt).all())

    return MarketDataListPublic(
        data=[MarketDataPublic.model_validate(r) for r in records],
        count=total_count,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=MarketDataPublic,
    summary="Retrieve a single market data record by UUID",
)
def get_market_data_by_id(session: SessionDep, id: uuid.UUID) -> MarketDataPublic:
    """Retrieves a single market price entry by its unique UUID."""
    record = session.get(MarketData, id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market data record with ID {id} not found",
        )
    return MarketDataPublic.model_validate(record)


@router.get(
    "/",
    response_model=MarketDataListPublic,
    summary="List market data records with advanced filtering and pagination",
)
def list_market_data(
    session: SessionDep,
    state: str | None = Query(default=None, description="Filter by state name"),
    district: str | None = Query(default=None, description="Filter by district name"),
    market_name: str | None = Query(
        default=None, description="Filter by market / APMC name"
    ),
    commodity: str | None = Query(default=None, description="Filter by commodity name"),
    crop_id: uuid.UUID | None = Query(
        default=None, description="Filter by canonical crop ID"
    ),
    arrival_date: date | None = Query(
        default=None, description="Filter by exact arrival date"
    ),
    start_date: date | None = Query(
        default=None, description="Filter arrival date on or after"
    ),
    end_date: date | None = Query(
        default=None, description="Filter arrival date on or before"
    ),
    skip: int = Query(default=0, ge=0, description="Records to skip"),
    limit: int = Query(default=100, ge=1, le=1000, description="Records per page"),
    sort_by: str = Query(
        default="arrival_date",
        pattern="^(arrival_date|modal_price|market_name|commodity)$",
        description="Field to sort by",
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction (asc or desc)",
    ),
) -> MarketDataListPublic:
    """Lists market price records supporting multi-field filtering, sorting, and pagination."""
    filters: list[Any] = []

    if state:
        filters.append(col(MarketData.state).ilike(f"%{state.strip()}%"))
    if district:
        filters.append(col(MarketData.district).ilike(f"%{district.strip()}%"))
    if market_name:
        filters.append(col(MarketData.market_name).ilike(f"%{market_name.strip()}%"))
    if commodity:
        filters.append(col(MarketData.commodity).ilike(f"%{commodity.strip()}%"))
    if crop_id:
        filters.append(MarketData.crop_id == crop_id)
    if arrival_date:
        filters.append(MarketData.arrival_date == arrival_date)
    if start_date:
        filters.append(MarketData.arrival_date >= start_date)
    if end_date:
        filters.append(MarketData.arrival_date <= end_date)

    count_stmt = select(func.count()).select_from(MarketData)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total_count = session.exec(count_stmt).one()

    # Determine sort attribute
    sort_attr = {
        "arrival_date": col(MarketData.arrival_date),
        "modal_price": col(MarketData.modal_price),
        "market_name": col(MarketData.market_name),
        "commodity": col(MarketData.commodity),
    }.get(sort_by, col(MarketData.arrival_date))

    order_clause = sort_attr.desc() if sort_order.lower() == "desc" else sort_attr.asc()

    stmt = select(MarketData)
    if filters:
        stmt = stmt.where(*filters)
    stmt = (
        stmt.order_by(order_clause, col(MarketData.created_at).desc())
        .offset(skip)
        .limit(limit)
    )

    records = list(session.exec(stmt).all())

    return MarketDataListPublic(
        data=[MarketDataPublic.model_validate(r) for r in records],
        count=total_count,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/sync-ceda",
    response_model=CedaSyncResponse,
    dependencies=[Depends(get_current_active_superuser)],
    summary="Synchronize mandi market price data from CEDA API into Supabase PostgreSQL",
)
def sync_market_data_from_ceda(
    session: SessionDep,
    payload: CedaSyncRequest,
) -> CedaSyncResponse:
    """
    Superuser-only endpoint to fetch, normalize, and ingest real market data from CEDA API.
    Guarantees deduplication via PostgreSQL ON CONFLICT DO NOTHING.
    """
    try:
        result = sync_ceda_to_market_data(
            session=session,
            commodity_id=payload.commodity_id,
            state_id=payload.state_id,
            from_date=payload.from_date,
            to_date=payload.to_date,
            district_ids=payload.district_ids,
            market_ids=payload.market_ids,
            dry_run=payload.dry_run,
        )
    except CedaAuthError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
        )
    except CedaRateLimitError as err:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(err),
        )
    except CedaRequestError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except (CedaServerError, CedaApiError) as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"CEDA upstream service error: {err}",
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )

    if result["total_processed"] == 0:
        message = "CEDA returned 0 records for the selected filters."
    else:
        mode_str = "Simulated (dry-run)" if payload.dry_run else "Synced"
        message = (
            f"{mode_str} {result['valid_records']} valid records from CEDA. "
            f"Inserted: {result['inserted']}, Skipped duplicates: {result['skipped_duplicate']}."
        )

    return CedaSyncResponse(
        total_processed=result["total_processed"],
        valid_records=result["valid_records"],
        inserted=result["inserted"],
        skipped_duplicate=result["skipped_duplicate"],
        mapped_crops=result["mapped_crops"],
        unmapped_crops=result["unmapped_crops"],
        errors_count=result["errors_count"],
        dry_run=result["dry_run"],
        message=message,
    )


@router.post(
    "/ingest-ceda-records",
    response_model=CedaSyncResponse,
    dependencies=[Depends(get_current_active_superuser)],
    summary="Ingest batch CEDA records into Supabase PostgreSQL",
)
def ingest_ceda_records_batch(
    session: SessionDep,
    payload: CedaBatchIngestRequest,
) -> CedaSyncResponse:
    """
    Superuser-only endpoint to validate, normalize, and ingest a batch of CEDA records.
    Maps commodities to master crops and ensures idempotent insertion into market_data.
    """
    result = sync_ceda_to_market_data(
        session=session,
        raw_records=payload.records,
        dry_run=payload.dry_run,
    )

    mode_str = "Simulated (dry-run)" if payload.dry_run else "Ingested"
    message = (
        f"{mode_str} {result['valid_records']} valid records. "
        f"Inserted: {result['inserted']}, Skipped duplicates: {result['skipped_duplicate']}."
    )

    return CedaSyncResponse(
        total_processed=result["total_processed"],
        valid_records=result["valid_records"],
        inserted=result["inserted"],
        skipped_duplicate=result["skipped_duplicate"],
        mapped_crops=result["mapped_crops"],
        unmapped_crops=result["unmapped_crops"],
        errors_count=result["errors_count"],
        dry_run=result["dry_run"],
        message=message,
    )
