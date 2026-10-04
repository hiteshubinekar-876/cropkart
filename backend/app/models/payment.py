import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Numeric
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class Payment(SQLModel, table=True):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_payments_amount_positive"),
        CheckConstraint(
            "payment_type IN ('buyer_escrow_deposit', 'farmer_payout', 'transporter_payout', 'refund')",
            name="chk_payments_type",
        ),
        CheckConstraint(
            "payment_method IN ('upi', 'net_banking', 'credit_card', 'neft_rtgs', 'wallet')",
            name="chk_payments_method",
        ),
        CheckConstraint(
            "status IN ('initiated', 'in_escrow', 'released', 'failed', 'refunded')",
            name="chk_payments_status",
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
        ondelete="RESTRICT",
    )
    payer_id: uuid.UUID = Field(
        foreign_key="users.id",
        index=True,
        nullable=False,
        ondelete="RESTRICT",
    )
    payee_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        nullable=True,
        ondelete="RESTRICT",
    )
    payment_type: str = Field(
        max_length=50,
        nullable=False,
        description="Allowed: buyer_escrow_deposit, farmer_payout, transporter_payout, refund",
    )
    payment_method: str = Field(
        max_length=50,
        nullable=False,
        description="Allowed: upi, net_banking, credit_card, neft_rtgs, wallet",
    )
    amount: Decimal = Field(
        sa_type=Numeric(12, 2),  # type: ignore
        nullable=False,
    )
    transaction_reference: str | None = Field(
        default=None,
        unique=True,
        index=True,
        max_length=100,
        nullable=True,
    )
    status: str = Field(
        default="initiated",
        max_length=50,
        nullable=False,
        description="Allowed: initiated, in_escrow, released, failed, refunded",
    )
    escrow_released_at: datetime | None = Field(
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
