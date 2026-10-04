import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class CropListing(SQLModel, table=True):
    __tablename__ = "crop_listings"
    __table_args__ = (
        Index("ix_crop_listings_status_crop_id", "status", "crop_id"),
        CheckConstraint(
            "total_quantity > 0", name="chk_crop_listings_total_quantity_positive"
        ),
        CheckConstraint(
            "available_quantity >= 0",
            name="chk_crop_listings_available_quantity_non_negative",
        ),
        CheckConstraint("price_per_unit > 0", name="chk_crop_listings_price_positive"),
        CheckConstraint(
            "status IN ('active', 'sold_out', 'expired', 'paused')",
            name="chk_crop_listings_status",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    farmer_id: uuid.UUID = Field(
        foreign_key="farmer_profiles.id",
        index=True,
        nullable=False,
        ondelete="CASCADE",
    )
    crop_id: uuid.UUID = Field(
        foreign_key="crops.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
    )
    pickup_address_id: uuid.UUID = Field(
        foreign_key="user_addresses.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
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
    total_quantity: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
    )
    available_quantity: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
    )
    unit: str = Field(
        default="quintal",
        max_length=20,
        nullable=False,
    )
    price_per_unit: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    min_order_quantity: Decimal = Field(
        default=Decimal("1.00"),
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    harvest_date: date | None = Field(
        default=None,
        nullable=True,
    )
    is_organic: bool = Field(
        default=False,
        nullable=False,
    )
    status: str = Field(
        default="active",
        max_length=30,
        nullable=False,
        description="Allowed: active, sold_out, expired, paused",
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
