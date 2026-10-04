"""Market Data schemas for API responses and queries."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlmodel import Field, SQLModel


class MarketDataBase(SQLModel):
    crop_id: uuid.UUID | None = Field(
        default=None, description="Optional foreign key to master crop"
    )
    state: str = Field(max_length=100)
    district: str = Field(max_length=100)
    market_name: str = Field(max_length=150)
    commodity: str = Field(max_length=100)
    variety: str | None = Field(default=None, max_length=100)
    grade: str | None = Field(default=None, max_length=50)
    arrival_date: date
    arrival_quantity: Decimal = Field(default=Decimal("0.00"))
    quantity_unit: str = Field(default="quintal", max_length=20)
    min_price: Decimal
    max_price: Decimal
    modal_price: Decimal
    source: str = Field(default="agmarknet", max_length=50)


class MarketDataPublic(MarketDataBase):
    id: uuid.UUID
    created_at: datetime


class MarketDataListPublic(SQLModel):
    data: list[MarketDataPublic]
    count: int
    skip: int
    limit: int


class CedaSyncRequest(SQLModel):
    commodity_id: int = Field(description="CEDA Agmarknet commodity ID")
    state_id: int = Field(description="CEDA Agmarknet state ID (or 0 for all-India)")
    from_date: date = Field(description="Start date for price data")
    to_date: date = Field(description="End date for price data")
    district_ids: list[int] | None = Field(default=None, description="Optional list of district IDs")
    market_ids: list[int] | None = Field(default=None, description="Optional list of market IDs")
    dry_run: bool = Field(default=False, description="Simulate validation and mapping without DB writes")


class CedaBatchIngestRequest(SQLModel):
    records: list[dict[str, Any]] = Field(description="Raw or enriched CEDA market price records")
    dry_run: bool = Field(default=False, description="Simulate validation and mapping without DB writes")


class CedaSyncResponse(SQLModel):
    total_processed: int
    valid_records: int
    inserted: int
    skipped_duplicate: int
    mapped_crops: int
    unmapped_crops: int
    errors_count: int
    dry_run: bool
    message: str

