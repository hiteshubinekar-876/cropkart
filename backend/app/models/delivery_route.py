import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class DeliveryRoute(SQLModel, table=True):
    __tablename__ = "delivery_routes"
    __table_args__ = (
        Index(
            "ix_delivery_routes_request_seq", "transport_request_id", "sequence_order"
        ),
        CheckConstraint(
            "status IN ('pending', 'passed', 'skipped')",
            name="chk_delivery_routes_status",
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
    sequence_order: int = Field(
        nullable=False,
        description="Sequential order of milestone checkpoint",
    )
    checkpoint_name: str = Field(
        max_length=255,
        nullable=False,
    )
    latitude: Decimal = Field(
        sa_type=Numeric(9, 6),  # type: ignore
        nullable=False,
    )
    longitude: Decimal = Field(
        sa_type=Numeric(9, 6),  # type: ignore
        nullable=False,
    )
    status: str = Field(
        default="pending",
        max_length=50,
        nullable=False,
        description="Allowed: pending, passed, skipped",
    )
    passed_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=True,
    )
