import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class TransporterVehicle(SQLModel, table=True):
    __tablename__ = "transporter_vehicles"
    __table_args__ = (
        CheckConstraint("capacity_quintals > 0", name="chk_vehicles_capacity_positive"),
        CheckConstraint(
            "vehicle_type IN ('mini_truck_1t', 'pickup_2t', 'eicher_5t', 'truck_10t', 'multi_axle_20t', 'reefer_cold_van')",
            name="chk_vehicles_type",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    transporter_id: uuid.UUID = Field(
        foreign_key="transporter_profiles.id",
        index=True,
        nullable=False,
        ondelete="CASCADE",
    )
    registration_number: str = Field(
        unique=True,
        index=True,
        max_length=50,
        nullable=False,
        description="Official RTO registration number, e.g. MH-12-AB-1234",
    )
    vehicle_type: str = Field(
        max_length=100,
        nullable=False,
        description="Allowed: mini_truck_1t, pickup_2t, eicher_5t, truck_10t, multi_axle_20t, reefer_cold_van",
    )
    capacity_quintals: Decimal = Field(
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=False,
    )
    has_cold_storage: bool = Field(
        default=False,
        nullable=False,
    )
    is_active: bool = Field(
        default=True,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
