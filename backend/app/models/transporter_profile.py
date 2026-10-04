import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, Text
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class TransporterProfile(SQLModel, table=True):
    __tablename__ = "transporter_profiles"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        unique=True,
        index=True,
        nullable=False,
        ondelete="CASCADE",
    )
    company_name: str | None = Field(
        default=None,
        max_length=255,
        nullable=True,
    )
    driving_license_no: str = Field(
        max_length=50,
        nullable=False,
    )
    operating_states: str | None = Field(
        default=None,
        sa_type=Text(),  # type: ignore
        nullable=True,
    )
    fleet_size: int = Field(
        default=1,
        nullable=False,
    )
    has_cold_storage: bool = Field(
        default=False,
        nullable=False,
    )
    is_available: bool = Field(
        default=True,
        index=True,
        nullable=False,
    )
    rating: Decimal = Field(
        default=Decimal("5.00"),
        sa_type=Numeric(3, 2),  # type: ignore
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
