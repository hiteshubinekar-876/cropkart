import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_order_items_quantity_positive"),
        CheckConstraint(
            "unit_price >= 0", name="chk_order_items_unit_price_non_negative"
        ),
        CheckConstraint(
            "total_price >= 0", name="chk_order_items_total_price_non_negative"
        ),
        CheckConstraint(
            "item_status IN ('pending', 'packed', 'picked_up', 'delivered')",
            name="chk_order_items_status",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    order_id: uuid.UUID = Field(
        foreign_key="orders.id",
        index=True,
        nullable=False,
        ondelete="CASCADE",
    )
    listing_id: uuid.UUID = Field(
        foreign_key="crop_listings.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
    )
    farmer_id: uuid.UUID = Field(
        foreign_key="farmer_profiles.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
    )
    quantity: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    unit_price: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
        description="Historical snapshot price per unit at order placement",
    )
    total_price: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
        description="Historical snapshot total item price",
    )
    item_status: str = Field(
        default="pending",
        max_length=50,
        nullable=False,
        description="Allowed: pending, packed, picked_up, delivered",
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
