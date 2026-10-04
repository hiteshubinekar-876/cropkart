import uuid
from datetime import UTC, datetime

from pydantic import EmailStr
from sqlalchemy import CheckConstraint, DateTime
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('farmer', 'buyer', 'transporter', 'admin')", name="chk_users_role"
        ),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    phone_number: str = Field(
        unique=True,
        index=True,
        max_length=20,
        nullable=False,
        description="Primary mobile phone number for authentication and SMS alerts",
    )
    email: EmailStr | None = Field(
        default=None,
        unique=True,
        index=True,
        max_length=255,
        nullable=True,
        description="Optional contact email",
    )
    hashed_password: str | None = Field(
        default=None,
        max_length=255,
        nullable=True,
        description="Password hash for local auth; nullable for Supabase Auth users",
    )
    full_name: str = Field(
        max_length=255,
        nullable=False,
        description="Full legal name of the user",
    )
    role: str = Field(
        default="farmer",
        index=True,
        max_length=30,
        nullable=False,
        description="Role classification: farmer, buyer, transporter, admin",
    )
    is_active: bool = Field(
        default=True,
        nullable=False,
    )
    is_verified: bool = Field(
        default=False,
        nullable=False,
        description="KYC or phone verification status",
    )
    is_superuser: bool = Field(
        default=False,
        nullable=False,
        description="Superuser administrative privilege flag",
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
