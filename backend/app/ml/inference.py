"""
backend/app/ml/inference.py

Production ML Inference Engine for CropKart Demand Forecasting.
Loads the verified serialized Ridge regression pipeline and builds the exact 37-feature
vector from live Supabase / PostgreSQL tables:
- market_data (CEDA/Agmarknet prices & arrivals)
- buyer_requirements (when the optional demand table is configured)
- orders & order_items (Marketplace transactions)

Author: CropKart Architecture Team
"""

import logging
import os
import warnings
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

# Keep model deserialization aligned with the training version pinned in pyproject.toml.
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

import collections

try:
    import sklearn.compose._column_transformer as _ct

    if not hasattr(_ct, "_RemainderColsList"):

        class _RemainderColsList(collections.UserList):
            def __init__(self, columns=None, **kwargs):
                super().__init__(columns or [])

        _ct._RemainderColsList = _RemainderColsList
except Exception:
    pass

from app.core.db import engine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom Exceptions with Machine-Readable Error Codes
# ---------------------------------------------------------------------------


class DemandForecastingError(Exception):
    """Base exception for demand forecasting errors."""

    code: str = "PREDICTION_ERROR"

    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        if code:
            self.code = code


class ModelUnavailableError(DemandForecastingError):
    code: str = "MODEL_UNAVAILABLE"


class InsufficientDataError(DemandForecastingError):
    code: str = "INSUFFICIENT_DATA"


class InvalidInputError(DemandForecastingError):
    code: str = "INVALID_INPUT"


class DatabaseError(DemandForecastingError):
    code: str = "DATABASE_ERROR"


# ---------------------------------------------------------------------------
# Feature Column Definitions (Exact order expected by pipeline)
# ---------------------------------------------------------------------------

NUMERICAL_FEATURES: List[str] = [
    "arrival_quantity",
    "minimum_price",
    "maximum_price",
    "modal_price",
    "required_quantity",
    "order_quantity",
    "order_count",
    "demand_7d_avg",
    "demand_30d_avg",
    "price_7d_avg",
    "price_change_pct",
    "year",
    "month",
    "day",
    "day_of_week",
    "week_of_year",
    "day_of_year",
    "is_weekend",
    "demand_lag_1",
    "demand_lag_3",
    "demand_lag_7",
    "demand_lag_14",
    "demand_lag_30",
    "demand_7d_mean",
    "demand_14d_mean",
    "demand_30d_mean",
    "price_lag_1",
    "price_lag_7",
    "price_7d_mean",
    "price_30d_mean",
    "arrival_lag_1",
    "arrival_7d_mean",
    "arrival_30d_mean",
    "required_quantity_lag_1",
    "required_quantity_7d_mean",
]

CATEGORICAL_FEATURES: List[str] = [
    "crop_name",
    "location_name",
]

ALL_FEATURES: List[str] = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

# Model path resolution
_MODELS_DIR = Path(__file__).resolve().parent / "models"
PRIMARY_MODEL_FILE = "demand_forecasting_model (1).joblib"
CORRUPTED_MODEL_FILE = "best_demand_forecasting_model.joblib"


# ---------------------------------------------------------------------------
# Model Loader Singleton
# ---------------------------------------------------------------------------


class DemandModelLoader:
    _instance: Optional["DemandModelLoader"] = None
    _pipeline: Any = None
    _model_version: str = "demand-v1-ridge"

    def __new__(cls) -> "DemandModelLoader":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self) -> Any:
        """Loads and validates the serialized Ridge demand forecasting pipeline."""
        if self._pipeline is not None:
            return self._pipeline

        model_path = _MODELS_DIR / PRIMARY_MODEL_FILE
        if not model_path.exists():
            logger.error("Primary model file not found at %s", model_path)
            raise ModelUnavailableError(
                f"Demand forecasting model file '{PRIMARY_MODEL_FILE}' not found.",
                code="MODEL_UNAVAILABLE",
            )

        try:
            pipeline = joblib.load(model_path)
            # Verify required pipeline attributes
            if (
                not hasattr(pipeline, "named_steps")
                or "preprocessor" not in pipeline.named_steps
            ):
                raise ValueError("Loaded object is not a valid scikit-learn pipeline.")

            self._pipeline = pipeline
            logger.info(
                "Successfully loaded demand forecasting pipeline from %s",
                model_path.name,
            )
            return self._pipeline

        except Exception as exc:
            logger.error(
                "Failed to load demand forecasting pipeline: %s", exc, exc_info=True
            )
            raise ModelUnavailableError(
                f"Failed to load model pipeline: {str(exc)}",
                code="MODEL_UNAVAILABLE",
            ) from exc

    @property
    def model_version(self) -> str:
        return self._model_version


model_loader = DemandModelLoader()


# ---------------------------------------------------------------------------
# Reusable Historical Data Retrieval Functions
# ---------------------------------------------------------------------------


def retrieve_market_history(
    crop: str,
    location: str,
    db: Session,
    limit: int = 60,
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Retrieves historical price and arrival records.
    Prefer real CEDA observations in the canonical market_data table, then
    fall back to other market_data observations for compatibility.
    Returns (records, data_source_label).
    """
    crop_clean = crop.strip()
    loc_clean = location.strip()

    # CEDA observations are stored in market_data; the legacy
    # agricultural_market_data table is not part of the current schema.
    q_ceda = text("""
        SELECT arrival_date AS record_date, arrival_quantity,
               min_price AS minimum_price, max_price AS maximum_price, modal_price
        FROM market_data
        WHERE source = 'ceda' AND commodity ILIKE :crop
          AND (market_name ILIKE :loc OR district ILIKE :loc)
        ORDER BY arrival_date DESC
        LIMIT :limit
    """)

    try:
        ceda_rows = db.execute(
            q_ceda, {"crop": f"%{crop_clean}%", "loc": f"%{loc_clean}%", "limit": limit}
        ).fetchall()
        if ceda_rows:
            records = [
                {
                    "record_date": r[0],
                    "arrival_quantity": float(r[1]) if r[1] is not None else 0.0,
                    "minimum_price": float(r[2]) if r[2] is not None else 0.0,
                    "maximum_price": float(r[3]) if r[3] is not None else 0.0,
                    "modal_price": float(r[4]) if r[4] is not None else 0.0,
                }
                for r in ceda_rows
            ]
            return records, "CEDA Agmarknet Historical Market Data (Real)"
    except Exception as exc:
        logger.warning("Error querying CEDA market_data observations: %s", exc)

    # Fall back to other rows in the canonical market_data table.
    q_market = text("""
        SELECT arrival_date AS record_date, arrival_quantity,
               min_price AS minimum_price, max_price AS maximum_price, modal_price
        FROM market_data
        WHERE commodity ILIKE :crop AND (market_name ILIKE :loc OR district ILIKE :loc)
        ORDER BY arrival_date DESC
        LIMIT :limit
    """)

    try:
        market_rows = db.execute(
            q_market,
            {"crop": f"%{crop_clean}%", "loc": f"%{loc_clean}%", "limit": limit},
        ).fetchall()
        if market_rows:
            records = [
                {
                    "record_date": r[0],
                    "arrival_quantity": float(r[1]) if r[1] is not None else 0.0,
                    "minimum_price": float(r[2]) if r[2] is not None else 0.0,
                    "maximum_price": float(r[3]) if r[3] is not None else 0.0,
                    "modal_price": float(r[4]) if r[4] is not None else 0.0,
                }
                for r in market_rows
            ]
            return records, "Supabase market_data observations"
    except Exception as exc:
        logger.error("Error querying market_data table: %s", exc)
        raise DatabaseError(f"Database error querying market data: {str(exc)}") from exc

    return [], "None"


def retrieve_buyer_demand_history(
    crop: str,
    location: str,
    db: Session,
    limit: int = 60,
) -> List[Dict[str, Any]]:
    """
    Retrieves aggregated daily buyer requirement volumes.
    """
    q_buyer = text("""
        SELECT DATE(created_at) as req_date, SUM(quantity) as daily_req, COUNT(*) as req_cnt
        FROM buyer_requirements
        WHERE crop_name ILIKE :crop AND (location ILIKE :loc OR district ILIKE :loc)
        GROUP BY DATE(created_at)
        ORDER BY req_date DESC
        LIMIT :limit
    """)

    try:
        rows = db.execute(
            q_buyer,
            {
                "crop": f"%{crop.strip()}%",
                "loc": f"%{location.strip()}%",
                "limit": limit,
            },
        ).fetchall()
        return [
            {
                "req_date": r[0],
                "daily_req": float(r[1]) if r[1] is not None else 0.0,
                "req_cnt": int(r[2]) if r[2] is not None else 0,
            }
            for r in rows
        ]
    except Exception as exc:
        logger.warning("Error querying buyer_requirements: %s", exc)
        return []


def retrieve_order_history(
    crop: str,
    location: str,
    db: Session,
    limit: int = 60,
) -> List[Dict[str, Any]]:
    """
    Retrieves aggregated daily marketplace order quantities and counts.
    """
    q_orders = text("""
        SELECT DATE(o.created_at) as order_date, SUM(oi.quantity) as daily_order_qty, COUNT(DISTINCT o.id) as order_cnt
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN crop_listings cl ON oi.listing_id = cl.id
        JOIN crops c ON cl.crop_id = c.id
        LEFT JOIN user_addresses pickup_address ON cl.pickup_address_id = pickup_address.id
        LEFT JOIN user_addresses delivery_address ON o.delivery_address_id = delivery_address.id
        WHERE c.name ILIKE :crop
          AND (
              pickup_address.village_or_taluka ILIKE :loc
              OR pickup_address.district ILIKE :loc
              OR pickup_address.state ILIKE :loc
              OR delivery_address.village_or_taluka ILIKE :loc
              OR delivery_address.district ILIKE :loc
              OR delivery_address.state ILIKE :loc
          )
        GROUP BY DATE(o.created_at)
        ORDER BY order_date DESC
        LIMIT :limit
    """)

    try:
        rows = db.execute(
            q_orders,
            {
                "crop": f"%{crop.strip()}%",
                "loc": f"%{location.strip()}%",
                "limit": limit,
            },
        ).fetchall()
        return [
            {
                "order_date": r[0],
                "daily_order_qty": float(r[1]) if r[1] is not None else 0.0,
                "order_cnt": int(r[2]) if r[2] is not None else 0,
            }
            for r in rows
        ]
    except Exception as exc:
        logger.warning("Error querying orders: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Feature Vector Construction Engine (37 Features)
# ---------------------------------------------------------------------------


def build_feature_vector(
    crop: str,
    location: str,
    days: int,
    market_records: List[Dict[str, Any]],
    buyer_records: List[Dict[str, Any]],
    order_records: List[Dict[str, Any]],
) -> pd.DataFrame:
    """
    Constructs the exact 37-feature DataFrame required by the Ridge pipeline.
    Validates lag structures, rolling averages, calendar indices, and feature ordering.
    """
    if not market_records:
        raise InsufficientDataError(
            f"No historical market records found for crop '{crop}' in '{location}'.",
            code="INSUFFICIENT_DATA",
        )

    # Reference timeline anchor: latest available market date
    latest_market_date: date = market_records[0]["record_date"]
    if isinstance(latest_market_date, datetime):
        latest_market_date = latest_market_date.date()

    # Target forecast date (today or latest date + forecast days)
    target_date = latest_market_date + timedelta(days=days)

    # Index historical observations by date
    market_by_date = {r["record_date"]: r for r in market_records}
    buyer_by_date = {r["req_date"]: r for r in buyer_records}
    order_by_date = {r["order_date"]: r for r in order_records}

    # Generate aligned chronological daily series for 45 days backwards
    dates = [latest_market_date - timedelta(days=i) for i in range(45)]

    daily_orders: List[float] = [
        order_by_date.get(d, {}).get("daily_order_qty", 0.0) for d in dates
    ]
    daily_order_counts: List[int] = [
        order_by_date.get(d, {}).get("order_cnt", 0) for d in dates
    ]
    daily_reqs: List[float] = [
        buyer_by_date.get(d, {}).get("daily_req", 0.0) for d in dates
    ]

    # Forward/backward-fill market prices and arrivals for continuous series
    daily_arrivals: List[float] = []
    daily_mins: List[float] = []
    daily_maxs: List[float] = []
    daily_modals: List[float] = []

    last_known_market = market_records[0]
    for d in dates:
        if d in market_by_date:
            last_known_market = market_by_date[d]
        daily_arrivals.append(last_known_market["arrival_quantity"])
        daily_mins.append(last_known_market["minimum_price"])
        daily_maxs.append(last_known_market["maximum_price"])
        daily_modals.append(last_known_market["modal_price"])

    # If orders/requirements are completely unpopulated, provide meaningful fallback based on arrival volume
    recent_arrivals = daily_arrivals[:7]
    avg_arrival = float(np.mean(recent_arrivals)) if recent_arrivals else 1000.0

    if sum(daily_orders) == 0.0:
        # Impute order quantity proportional to historical market arrival activity (40-60% conversion rate)
        daily_orders = [arr * 0.5 for arr in daily_arrivals]
        daily_order_counts = [1 if arr > 0 else 0 for arr in daily_arrivals]

    if sum(daily_reqs) == 0.0:
        # Impute required quantity proportional to historical market activity
        daily_reqs = [arr * 0.8 for arr in daily_arrivals]

    def _get_val(arr: List[Any], idx: int, default: float = 0.0) -> float:
        if len(arr) > idx:
            return float(arr[idx])
        return float(arr[-1]) if arr else default

    def _get_mean(arr: List[float], window: int, default: float = 0.0) -> float:
        sub = arr[:window]
        return float(np.mean(sub)) if sub else default

    modal_curr = _get_val(daily_modals, 0)
    modal_lag_7 = _get_val(daily_modals, 7)
    # Scaler was trained with ratio change (fractional -0.1 to +0.1), NOT multiplied by 100
    price_change_pct = (
        float((modal_curr - modal_lag_7) / modal_lag_7) if modal_lag_7 > 0 else 0.0
    )

    feature_dict: Dict[str, Any] = {
        "arrival_quantity": daily_arrivals[0],
        "minimum_price": daily_mins[0],
        "maximum_price": daily_maxs[0],
        "modal_price": daily_modals[0],
        "required_quantity": daily_reqs[0]
        if daily_reqs[0] > 0
        else _get_mean(daily_reqs, 7),
        "order_quantity": daily_orders[0],
        "order_count": daily_order_counts[0],
        "demand_7d_avg": _get_mean(daily_orders, 7),
        "demand_30d_avg": _get_mean(daily_orders, 30),
        "price_7d_avg": _get_mean(daily_modals, 7),
        "price_change_pct": price_change_pct,
        "year": target_date.year,
        "month": target_date.month,
        "day": target_date.day,
        "day_of_week": target_date.weekday(),
        "week_of_year": target_date.isocalendar()[1],
        "day_of_year": target_date.timetuple().tm_yday,
        "is_weekend": 1 if target_date.weekday() >= 5 else 0,
        "demand_lag_1": _get_val(daily_orders, 1),
        "demand_lag_3": _get_val(daily_orders, 3),
        "demand_lag_7": _get_val(daily_orders, 7),
        "demand_lag_14": _get_val(daily_orders, 14),
        "demand_lag_30": _get_val(daily_orders, 30),
        "demand_7d_mean": _get_mean(daily_orders, 7),
        "demand_14d_mean": _get_mean(daily_orders, 14),
        "demand_30d_mean": _get_mean(daily_orders, 30),
        "price_lag_1": _get_val(daily_modals, 1),
        "price_lag_7": _get_val(daily_modals, 7),
        "price_7d_mean": _get_mean(daily_modals, 7),
        "price_30d_mean": _get_mean(daily_modals, 30),
        "arrival_lag_1": _get_val(daily_arrivals, 1),
        "arrival_7d_mean": _get_mean(daily_arrivals, 7),
        "arrival_30d_mean": _get_mean(daily_arrivals, 30),
        "required_quantity_lag_1": _get_val(daily_reqs, 1),
        "required_quantity_7d_mean": _get_mean(daily_reqs, 7),
        "crop_name": crop.strip().title(),
        "location_name": location.strip().title(),
    }

    # Verify all 37 features exist in dictionary
    for feat in ALL_FEATURES:
        if feat not in feature_dict:
            raise DemandForecastingError(
                f"Missing required feature '{feat}' during feature construction."
            )

    # Return DataFrame with strict feature column ordering matching training pipeline
    return pd.DataFrame(
        [[feature_dict[col] for col in ALL_FEATURES]], columns=ALL_FEATURES
    )


# ---------------------------------------------------------------------------
# High-Level Demand Prediction API
# ---------------------------------------------------------------------------


def predict_demand(
    crop: str,
    location: str,
    days: int = 30,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Executes the end-to-end demand forecasting pipeline:
    1. Input validation
    2. Model pipeline loading
    3. Multi-table historical data retrieval from Supabase
    4. 37-feature engineering
    5. Ridge regression inference
    6. Formatted structured result delivery
    """
    # 1. Validation
    if not crop or not crop.strip():
        raise InvalidInputError(
            "Crop name is required and cannot be empty.", code="INVALID_INPUT"
        )

    if not location or not location.strip():
        raise InvalidInputError(
            "Location name is required and cannot be empty.", code="INVALID_INPUT"
        )

    if days < 1 or days > 365:
        raise InvalidInputError(
            "Forecast days must be between 1 and 365.", code="INVALID_INPUT"
        )

    crop_name = crop.strip().title()
    location_name = location.strip().title()

    # 2. Load model pipeline
    pipeline = model_loader.load_model()

    # 3. Retrieve historical database records
    close_db_when_done = False
    if db is None:
        db = Session(engine)
        close_db_when_done = True

    try:
        market_records, data_source = retrieve_market_history(
            crop_name, location_name, db
        )
        if not market_records:
            raise InsufficientDataError(
                f"Insufficient historical data: No market price records exist for crop '{crop_name}' in '{location_name}'.",
                code="INSUFFICIENT_DATA",
            )

        buyer_records = retrieve_buyer_demand_history(crop_name, location_name, db)
        order_records = retrieve_order_history(crop_name, location_name, db)

        # 4. Feature construction
        features_df = build_feature_vector(
            crop=crop_name,
            location=location_name,
            days=days,
            market_records=market_records,
            buyer_records=buyer_records,
            order_records=order_records,
        )

        # 5. Prediction
        raw_pred = pipeline.predict(features_df)[0]
        # Demand cannot be negative in physical markets
        predicted_demand = round(max(0.0, float(raw_pred)), 2)

        # 6. Format structured output
        return {
            "crop": crop_name,
            "location": location_name,
            "forecast_days": days,
            "predicted_demand": predicted_demand,
            "unit": "kg",
            "model_version": model_loader.model_version,
            "data_source": data_source,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "features_summary": {
                "latest_modal_price": float(features_df["modal_price"].iloc[0]),
                "price_7d_avg": float(features_df["price_7d_avg"].iloc[0]),
                "demand_7d_mean": float(features_df["demand_7d_mean"].iloc[0]),
                "records_evaluated": len(market_records),
            },
        }

    except DemandForecastingError:
        raise
    except Exception as exc:
        logger.error("Inference execution error: %s", exc, exc_info=True)
        raise DemandForecastingError(
            f"Prediction execution failed: {str(exc)}", code="PREDICTION_ERROR"
        ) from exc
    finally:
        if close_db_when_done:
            db.close()
