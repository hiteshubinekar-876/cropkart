import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class FarmerProfile(SQLModel, table=True):
    __tablename__ = "farmer_profiles"

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
    farm_name: str | None = Field(
        default=None,
        max_length=255,
        nullable=True,
    )
    land_size_acres: Decimal | None = Field(
        default=None,
        sa_type=Numeric(10, 2),  # type: ignore
        nullable=True,
    )
    soil_type: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    irrigation_type: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    kisan_credit_card_no: str | None = Field(
        default=None,
        max_length=50,
        nullable=True,
    )
    experience_years: int | None = Field(
        default=None,
        nullable=True,
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
