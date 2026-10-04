import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Index, Numeric, text
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class MarketData(SQLModel, table=True):
    __tablename__ = "market_data"
    __table_args__ = (
        Index(
            "ix_market_data_comm_market_date",
            "commodity",
            "market_name",
            "arrival_date",
        ),
        Index("ix_market_data_state_district", "state", "district"),
        # PostgreSQL-safe deduplication index handling nullable variety and grade via COALESCE
        Index(
            "uq_market_data_dedup",
            "commodity",
            "market_name",
            text("COALESCE(variety, '')"),
            text("COALESCE(grade, '')"),
            "arrival_date",
            unique=True,
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    crop_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="crops.id",
        nullable=True,
        ondelete="SET NULL",
        description="Optional link to normalized crops catalog",
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
    commodity: str = Field(
        max_length=100,
        nullable=False,
        description="Raw commodity name from Agmarknet / APMC",
    )
    variety: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    grade: str | None = Field(
        default=None,
        max_length=50,
        nullable=True,
    )
    arrival_date: date = Field(
        index=True,
        nullable=False,
    )
    arrival_quantity: Decimal = Field(
        default=Decimal("0.00"),
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
    )
    quantity_unit: str = Field(
        default="quintal",
        max_length=20,
        nullable=False,
    )
    min_price: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
        description="Daily minimum recorded price in INR/quintal",
    )
    max_price: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
        description="Daily maximum recorded price in INR/quintal",
    )
    modal_price: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
        description="Daily modal (most frequent benchmark) price in INR/quintal",
    )
    source: str = Field(
        default="agmarknet",
        max_length=50,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
