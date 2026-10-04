import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric, Text
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class UserAddress(SQLModel, table=True):
    __tablename__ = "user_addresses"
    __table_args__ = (
        Index("ix_user_addresses_state_district", "state", "district"),
        CheckConstraint(
            "address_type IN ('farm_gate', 'warehouse', 'mandi_shop', 'hub', 'billing')",
            name="chk_user_addresses_type",
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        index=True,
        nullable=False,
        ondelete="CASCADE",
    )
    address_type: str = Field(
        max_length=50,
        nullable=False,
        description="Allowed: farm_gate, warehouse, mandi_shop, hub, billing",
    )
    street_address: str = Field(
        sa_type=Text(),  # type: ignore
        nullable=False,
    )
    village_or_taluka: str | None = Field(
        default=None,
        max_length=100,
        nullable=True,
    )
    district: str = Field(
        max_length=100,
        nullable=False,
    )
    state: str = Field(
        max_length=100,
        nullable=False,
    )
    pincode: str = Field(
        max_length=10,
        nullable=False,
    )
    latitude: Decimal | None = Field(
        default=None,
        sa_type=Numeric(9, 6),  # type: ignore
        nullable=True,
    )
    longitude: Decimal | None = Field(
        default=None,
        sa_type=Numeric(9, 6),  # type: ignore
        nullable=True,
    )
    is_default: bool = Field(
        default=False,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        nullable=False,
    )
