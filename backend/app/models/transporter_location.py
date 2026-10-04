import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Index, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class TransporterLocation(SQLModel, table=True):
    __tablename__ = "transporter_locations"
    __table_args__ = (
        Index(
            "ix_transporter_locations_request_time",
            "transport_request_id",
            "recorded_at",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    transport_request_id: uuid.UUID = Field(
        foreign_key="transport_requests.id",
        nullable=False,
        ondelete="CASCADE",
    )
    vehicle_id: uuid.UUID = Field(
        foreign_key="transporter_vehicles.id",
        nullable=False,
        ondelete="CASCADE",
    )
    latitude: Decimal = Field(
        sa_type=Numeric(9, 6),  # type: ignore
        nullable=False,
    )
    longitude: Decimal = Field(
        sa_type=Numeric(9, 6),  # type: ignore
        nullable=False,
    )
    speed_kmh: Decimal | None = Field(
        default=None,
        sa_type=Numeric(5, 2),  # type: ignore
        nullable=True,
    )
    recorded_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
