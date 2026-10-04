import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class Order(SQLModel, table=True):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_status_payment", "order_status", "payment_status"),
        CheckConstraint(
            "order_status IN ('placed', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled')",
            name="chk_orders_status",
        ),
        CheckConstraint(
            "payment_status IN ('unpaid', 'escrow_funded', 'settled', 'refunded')",
            name="chk_orders_payment_status",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    order_number: str = Field(
        unique=True,
        index=True,
        max_length=50,
        nullable=False,
        description="Human readable order identifier, e.g. CK-202610-001",
    )
    buyer_id: uuid.UUID = Field(
        foreign_key="buyer_profiles.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
    )
    delivery_address_id: uuid.UUID = Field(
        foreign_key="user_addresses.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
    )
    total_items_amount: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
    )
    transport_fee: Decimal = Field(
        default=Decimal("0.00"),
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    platform_fee: Decimal = Field(
        default=Decimal("0.00"),
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    total_amount: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
    )
    order_status: str = Field(
        default="placed",
        max_length=50,
        nullable=False,
        description="Allowed: placed, confirmed, in_transit, delivered, completed, cancelled",
    )
    payment_status: str = Field(
        default="unpaid",
        max_length=50,
        nullable=False,
        description="Allowed: unpaid, escrow_funded, settled, refunded",
    )
    requires_transport: bool = Field(
        default=True,
        nullable=False,
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
