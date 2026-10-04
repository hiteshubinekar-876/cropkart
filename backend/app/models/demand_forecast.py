import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric, text
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class DemandForecast(SQLModel, table=True):
    __tablename__ = "demand_forecasts"
    __table_args__ = (
        CheckConstraint(
            "confidence_score >= 0.000 AND confidence_score <= 1.000",
            name="chk_demand_forecasts_confidence_score_range",
        ),
        CheckConstraint(
            "season IN ('kharif', 'rabi', 'zaid')", name="chk_demand_forecasts_season"
        ),
        Index(
            "ix_demand_forecasts_crop_district_date",
            "crop_id",
            "district",
            "forecast_date",
        ),
        Index("ix_demand_forecasts_horizon", "forecast_horizon_days"),
        Index(
            "uq_demand_forecasts_crop_district_date_model",
            "crop_id",
            "district",
            "forecast_date",
            text("COALESCE(model_name, '')"),
            unique=True,
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    crop_id: uuid.UUID = Field(
        foreign_key="crops.id",
        nullable=False,
        ondelete="CASCADE",
    )
    state: str = Field(
        max_length=100,
        nullable=False,
    )
    district: str = Field(
        max_length=100,
        nullable=False,
    )
    forecast_date: date = Field(
        nullable=False,
    )
    forecast_horizon_days: int = Field(
        nullable=False,
        description="Forecast lookahead window in days, e.g. 7, 14, 30",
    )
    predicted_demand_quintals: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
        description="ML target output: predicted buyer demand in quintals",
    )
    estimated_supply_quintals: Decimal | None = Field(
        default=None,
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=True,
    )
    projected_gap_quintals: Decimal | None = Field(
        default=None,
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=True,
        description="Deficit or surplus: predicted_demand - estimated_supply",
    )
    confidence_score: Decimal | None = Field(
        default=None,
        sa_type=Numeric(4, 3),  # type: ignore
        nullable=True,
    )
    season: str | None = Field(
        default=None,
        max_length=50,
        nullable=True,
        description="Allowed: kharif, rabi, zaid",
    )
    festival_multiplier: Decimal = Field(
        default=Decimal("1.00"),
        sa_type=Numeric(4, 2),  # type: ignore
        nullable=False,
    )
    weather_impact_flag: str | None = Field(
        default=None,
        max_length=50,
        nullable=True,
    )
    model_name: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
