import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class TransportRequest(SQLModel, table=True):
    __tablename__ = "transport_requests"
    __table_args__ = (
        CheckConstraint(
            "total_weight_quintals > 0", name="chk_transport_requests_weight_positive"
        ),
        CheckConstraint(
            "freight_charge >= 0",
            name="chk_transport_requests_freight_charge_non_negative",
        ),
        CheckConstraint(
            "status IN ('unassigned', 'assigned', 'dispatched', 'at_pickup', 'in_transit', 'delivered', 'cancelled')",
            name="chk_transport_requests_status",
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
    transporter_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="transporter_profiles.id",
        index=True,
        nullable=True,
        ondelete="SET NULL",
    )
    vehicle_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="transporter_vehicles.id",
        index=True,
        nullable=True,
        ondelete="SET NULL",
    )
    pickup_address_id: uuid.UUID = Field(
        foreign_key="user_addresses.id",
        nullable=False,
        ondelete="RESTRICT",
    )
    delivery_address_id: uuid.UUID = Field(
        foreign_key="user_addresses.id",
        nullable=False,
        ondelete="RESTRICT",
    )
    total_weight_quintals: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    distance_km: Decimal | None = Field(
        default=None,
        sa_type=Numeric(8, 2),  # type: ignore
        nullable=True,
    )
    freight_charge: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    pickup_otp: str | None = Field(
        default=None,
        max_length=6,
        nullable=True,
    )
    delivery_otp: str | None = Field(
        default=None,
        max_length=6,
        nullable=True,
    )
    status: str = Field(
        default="unassigned",
        index=True,
        max_length=50,
        nullable=False,
        description="Allowed: unassigned, assigned, dispatched, at_pickup, in_transit, delivered, cancelled",
    )
    actual_pickup_time: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=True,
    )
    actual_delivery_time: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=True,
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
