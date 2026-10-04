"""
api/mock_tools_server.py - Standalone Mock Tools Server for CropSathi AI Agent.

Provides the 4 tool endpoints expected by LangFlow tools:
1. POST /api/tools/v1/demand-forecast
2. GET  /api/tools/v1/market-prices
3. GET  /api/tools/v1/crop-listings
4. GET  /api/tools/v1/buyer-requirements
And the chat proxy endpoint:
5. POST /api/ai/chat

Enables running and verifying the LangFlow agent independently of the full CropKart backend.
Usage:
    uvicorn api.mock_tools_server:app --port 8000 --reload
"""

import os
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent.crop_sathi import crop_sathi_agent
from agent.schemas import ChatRequest, ChatResponse
from tools.tool_schemas import (
    DemandForecastRequestSchema,
    ToolSuccessResponse,
    ToolFailureResponse,
    ToolErrorDetail,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="CropKart AI Tools & CropSathi Mock Server",
    version="1.0.0",
    description="Provides authenticated tool endpoints for LangFlow agent execution and testing.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_tool_key(
    x_cropsathi_tool_key: Optional[str] = Header(default=None, alias="X-CropSathi-Tool-Key")
) -> bool:
    expected_key = os.getenv("CROPSATHI_TOOL_KEY")
    if expected_key:
        if not x_cropsathi_tool_key or x_cropsathi_tool_key.strip() != expected_key.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "tool": "auth",
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid or missing X-CropSathi-Tool-Key header.",
                    },
                },
            )
    return True


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "CropSathi AI Tools Mock Server"}


# ---------------------------------------------------------------------------
# 1. Demand Forecast Tool Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/tools/v1/demand-forecast")
def demand_forecast_endpoint(
    req: DemandForecastRequestSchema,
    _auth: bool = Header(None),
):
    crop_lower = req.crop.strip().title()
    location = req.location.strip()
    days = req.days

    # Mock realistic predictions based on crop type
    baseline_demands = {
        "Wheat": 1450.0,
        "Rice": 1820.0,
        "Tomato": 950.0,
        "Onion": 1200.0,
        "Cotton": 640.0,
        "Soybean": 890.0,
        "Maize": 780.0,
        "Chilli": 420.0,
    }

    if crop_lower not in baseline_demands:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "tool": "demand_forecast",
                "error": {
                    "code": "INSUFFICIENT_DATA",
                    "message": f"Insufficient historical records for '{req.crop}' in '{location}'.",
                },
            },
        )

    predicted_val = round(baseline_demands[crop_lower] * (days / 30.0), 2)
    return {
        "success": True,
        "tool": "demand_forecast",
        "data": {
            "crop": crop_lower,
            "location": location,
            "forecast_days": days,
            "predicted_demand": predicted_val,
            "unit": "quintals",
            "model_version": "demand-v1-ridge",
            "data_source": "mock_ridge_pipeline",
        },
    }


# ---------------------------------------------------------------------------
# 2. Market Prices Tool Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/tools/v1/market-prices")
def market_prices_endpoint(
    crop: str = Query(..., description="Crop commodity name"),
    location: str = Query(..., description="Market or mandi location"),
    limit: int = Query(10, ge=1, le=50),
    _auth: bool = Header(None),
):
    crop_clean = crop.strip().title()
    loc_clean = location.strip().title()

    sample_prices = {
        "Wheat": 2420.0,
        "Rice": 3150.0,
        "Tomato": 1850.0,
        "Onion": 2200.0,
        "Cotton": 6800.0,
        "Soybean": 4600.0,
    }
    modal = sample_prices.get(crop_clean, 2500.0)

    records = [
        {
            "commodity": crop_clean,
            "variety": "Common",
            "mandi": f"{loc_clean} APMC Mandi",
            "district": loc_clean,
            "state": "Maharashtra",
            "record_date": "2026-09-28",
            "modal_price": modal,
            "min_price": round(modal * 0.92, 1),
            "max_price": round(modal * 1.08, 1),
            "arrival_quantity": 450.0,
            "data_source": "Agmarknet CEDA Benchmark Data",
        }
    ]

    return {
        "success": True,
        "tool": "market_prices",
        "data": {
            "crop": crop_clean,
            "location": loc_clean,
            "total_records": len(records),
            "records": records,
        },
    }


# ---------------------------------------------------------------------------
# 3. Crop Listings Tool Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/tools/v1/crop-listings")
def crop_listings_endpoint(
    crop: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_quantity: Optional[float] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    _auth: bool = Header(None),
):
    crop_filter = crop.strip().title() if crop else "Wheat"
    loc_filter = location.strip().title() if location else "Pune"

    sample_listings = [
        {
            "id": "listing-mock-101",
            "farmer_id": "farmer-001",
            "name": crop_filter,
            "variety": "Grade A",
            "category": "Grains" if crop_filter in ["Wheat", "Rice"] else "Vegetables",
            "quantity": 250.0,
            "unit": "quintal",
            "price_per_unit": 2400.0,
            "location": f"{loc_filter} Outskirts",
            "district": loc_filter,
            "state": "Maharashtra",
            "quality_grade": "A",
            "harvest_date": "2026-09-20",
            "status": "AVAILABLE",
            "created_at": "2026-09-21T10:00:00Z",
        }
    ]

    return {
        "success": True,
        "tool": "crop_listings",
        "data": {
            "total": len(sample_listings),
            "listings": sample_listings,
        },
    }


# ---------------------------------------------------------------------------
# 4. Buyer Requirements Tool Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/tools/v1/buyer-requirements")
def buyer_requirements_endpoint(
    crop: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    _auth: bool = Header(None),
):
    crop_filter = crop.strip().title() if crop else "Wheat"
    loc_filter = location.strip().title() if location else "Pune"

    sample_requirements = [
        {
            "id": "req-mock-201",
            "crop_name": crop_filter,
            "variety": "Sharbati / Common",
            "quantity": 500.0,
            "unit": "quintal",
            "target_price": 2450.0,
            "location": f"{loc_filter} Industrial Area",
            "district": loc_filter,
            "state": "Maharashtra",
            "urgency": urgency or "HIGH",
            "status": status_filter or "OPEN",
            "created_at": "2026-09-22T08:30:00Z",
        }
    ]

    return {
        "success": True,
        "tool": "buyer_requirements",
        "data": {
            "total": len(sample_requirements),
            "requirements": sample_requirements,
        },
    }


# ---------------------------------------------------------------------------
# 5. CropSathi AI Chat Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """
    Entrypoint for chat interactions with CropSathi.
    Delegates to LangFlow client or local fallback.
    """
    result = await crop_sathi_agent.chat(
        message=request.message,
        language=request.language,
        role=request.role,
    )
    return ChatResponse(
        success=result["success"],
        message=result["message"],
        response=result["response"],
        source=result.get("source"),
    )
