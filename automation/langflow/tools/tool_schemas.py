"""
tools/tool_schemas.py - Standard Schemas for CropSathi AI Tools.

Defines the exact request and response envelopes utilized by LangFlow Agent tools
when communicating with the CropKart tool endpoints (/api/tools/v1/*).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Envelopes
# ---------------------------------------------------------------------------

class ToolErrorDetail(BaseModel):
    """Machine-readable tool error details."""
    code: str = Field(..., description="Stable error code (e.g. INSUFFICIENT_DATA, NOT_FOUND, UNAUTHORIZED)")
    message: str = Field(..., description="Human-readable error description")


class ToolSuccessResponse(BaseModel):
    """Standardized success envelope for LangFlow Agent tools."""
    success: bool = True
    tool: str = Field(..., description="Tool identifier name")
    data: Any = Field(..., description="Structured tool output payload")


class ToolFailureResponse(BaseModel):
    """Standardized failure envelope for LangFlow Agent tools."""
    success: bool = False
    tool: str = Field(..., description="Tool identifier name")
    error: ToolErrorDetail = Field(..., description="Error detail object")


# ---------------------------------------------------------------------------
# 1. Demand Forecast Tool Schemas
# ---------------------------------------------------------------------------

class DemandForecastRequestSchema(BaseModel):
    crop: str = Field(..., description="Crop name to forecast (e.g. Wheat, Rice, Tomato, Onion).")
    location: str = Field(..., description="Target mandi or city location (e.g. Pune, Mumbai, Nashik).")
    days: int = Field(30, description="Forecast horizon in days (e.g. 15, 30, 60). Default is 30.")


class DemandForecastData(BaseModel):
    crop: str
    location: str
    forecast_days: int
    predicted_demand: float
    unit: str = "kg"
    model_version: str = "demand-v1-ridge"
    data_source: str


# ---------------------------------------------------------------------------
# 2. Market Prices Tool Schemas
# ---------------------------------------------------------------------------

class MarketPricesRequestSchema(BaseModel):
    crop: str = Field(..., description="Crop commodity name (e.g. Wheat, Tomato, Onion).")
    location: str = Field(..., description="Market or mandi location (e.g. Pune, Nashik, Mumbai).")
    limit: int = Field(10, description="Maximum number of price records to retrieve (1-50). Default is 10.")


class MarketPriceRecord(BaseModel):
    commodity: str
    variety: Optional[str] = None
    mandi: str
    district: Optional[str] = None
    state: Optional[str] = None
    record_date: str
    modal_price: float
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    arrival_quantity: Optional[float] = None
    data_source: str


# ---------------------------------------------------------------------------
# 3. Crop Listings Tool Schemas
# ---------------------------------------------------------------------------

class CropListingsRequestSchema(BaseModel):
    crop: Optional[str] = Field(None, description="Optional crop name filter (e.g. Wheat, Tomato, Rice).")
    location: Optional[str] = Field(None, description="Optional mandi or location filter (e.g. Pune, Nashik).")
    min_quantity: Optional[float] = Field(None, description="Optional minimum available quantity filter.")
    limit: int = Field(10, description="Maximum number of listings to return (1-50). Default is 10.")


class CropListingRecord(BaseModel):
    id: str
    farmer_id: Optional[str] = None
    name: str
    variety: Optional[str] = None
    category: Optional[str] = None
    quantity: float
    unit: str
    price_per_unit: float
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    quality_grade: Optional[str] = None
    harvest_date: Optional[str] = None
    status: str
    created_at: Optional[str] = None


# ---------------------------------------------------------------------------
# 4. Buyer Requirements Tool Schemas
# ---------------------------------------------------------------------------

class BuyerRequirementsRequestSchema(BaseModel):
    crop: Optional[str] = Field(None, description="Optional crop commodity filter (e.g. Wheat, Rice, Cotton).")
    location: Optional[str] = Field(None, description="Optional delivery location filter (e.g. Pune, Mumbai).")
    status: Optional[str] = Field(None, description="Requirement status filter: 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED'.")
    urgency: Optional[str] = Field(None, description="Procurement urgency filter: 'LOW', 'MEDIUM', 'HIGH', 'URGENT'.")
    limit: int = Field(10, description="Maximum number of records to return (1-50). Default is 10.")


class BuyerRequirementRecord(BaseModel):
    id: str
    crop_name: str
    variety: Optional[str] = None
    quantity: float
    unit: str
    target_price: Optional[float] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    urgency: Optional[str] = None
    status: str
    created_at: Optional[str] = None
