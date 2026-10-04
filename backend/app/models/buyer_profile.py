import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class BuyerProfile(SQLModel, table=True):
    __tablename__ = "buyer_profiles"
    __table_args__ = (
        CheckConstraint(
            "business_type IN ('wholesaler', 'retailer', 'food_processor', 'fpo', 'exporter', 'caterer')",
            name="chk_buyer_profiles_type",
        ),
    )

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
    business_name: str = Field(
        max_length=255,
        nullable=False,
    )
    business_type: str = Field(
        max_length=100,
        nullable=False,
        description="Allowed: wholesaler, retailer, food_processor, fpo, exporter, caterer",
    )
    gstin: str | None = Field(
        default=None,
        unique=True,
        index=True,
        max_length=15,
        nullable=True,
    )
    pan_number: str | None = Field(
        default=None,
        max_length=10,
        nullable=True,
    )
    trade_license_no: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    credit_limit: Decimal = Field(
        default=Decimal("0.00"),
        sa_type=Numeric(12, 2),  # type: ignore
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
