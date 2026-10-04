import datetime as dt
import uuid
from datetime import UTC
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric, text
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> dt.datetime:
    return dt.datetime.now(UTC)


class MarketPriceHistory(SQLModel, table=True):
    __tablename__ = "market_price_history"
    __table_args__ = (
        Index("ix_price_history_crop_market_date", "crop_id", "market_name", "date"),
        Index("ix_price_history_state_district", "state", "district"),
        Index(
            "uq_price_history_crop_market_date_model",
            "crop_id",
            "market_name",
            "date",
            text("COALESCE(model_version, '')"),
            unique=True,
        ),
        CheckConstraint(
            "price_trend IN ('bullish', 'bearish', 'stable')",
            name="chk_price_history_trend",
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
    market_data_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="market_data.id",
        nullable=True,
        ondelete="SET NULL",
    )
    state: str = Field(
        max_length=100,
        nullable=False,
    )
    district: str = Field(
        max_length=100,
        nullable=False,
    )
    market_name: str = Field(
        max_length=150,
        nullable=False,
    )
    date: dt.date = Field(
        nullable=False,
    )
    actual_modal_price: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
    )
    predicted_modal_price: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
        description="ML target output: predicted future modal price in INR/quintal",
    )
    confidence_lower: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
    )
    confidence_upper: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
    )
    price_trend: str | None = Field(
        default=None,
        max_length=20,
        nullable=True,
        description="Allowed: bullish, bearish, stable",
    )
    rolling_7d_avg_price: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
    )
    rolling_30d_avg_price: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
    )
    model_version: str | None = Field(
        default=None,
        max_length=50,
        nullable=True,
    )
    created_at: dt.datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
