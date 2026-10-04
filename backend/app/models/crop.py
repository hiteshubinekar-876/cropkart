import uuid
from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, Text
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class Crop(SQLModel, table=True):
    __tablename__ = "crops"
    __table_args__ = (
        CheckConstraint(
            "category IN ('cereals', 'pulses', 'vegetables', 'fruits', 'oilseeds', 'spices', 'cash_crops')",
            name="chk_crops_category",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    name: str = Field(
        unique=True,
        index=True,
        max_length=100,
        nullable=False,
        description="Standardized English commodity name",
    )
    hindi_name: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    category: str = Field(
        index=True,
        max_length=50,
        nullable=False,
        description="Allowed: cereals, pulses, vegetables, fruits, oilseeds, spices, cash_crops",
    )
    standard_unit: str = Field(
        default="quintal",
        max_length=20,
        nullable=False,
    )
    shelf_life_days: int | None = Field(
        default=None,
        nullable=True,
    )
    image_url: str | None = Field(
        default=None,
        sa_type=Text(),  # type: ignore
        nullable=True,
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
