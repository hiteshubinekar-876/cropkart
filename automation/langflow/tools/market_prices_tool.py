"""
tools/market_prices_tool.py - Custom LangFlow Component for Mandi Market Prices.

This file contains the exact Python custom component code embedded in the
CropSathi AI Agent LangFlow flow (MarketPricesTool-1).

It can be pasted directly into a LangFlow Custom Component or loaded by LangFlow.
"""

import os
import httpx
from typing import Any
from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool

try:
    from lfx.base.langchain_utilities.model import LCToolComponent
    from lfx.field_typing import Tool
    from lfx.inputs.inputs import MessageTextInput, SecretStrInput
except ImportError:
    class LCToolComponent:
        pass
    Tool = Any
    MessageTextInput = Any
    SecretStrInput = Any


class MarketPricesToolComponent(LCToolComponent):
    display_name: str = "Market Prices Tool"
    description: str = "Retrieve mandi market prices and modal rates for crops across India."
    name: str = "MarketPricesTool"
    icon: str = "badge-cent"

    inputs = [
        MessageTextInput(
            name="base_url",
            display_name="FastAPI Base URL",
            value=os.getenv("FASTAPI_BASE_URL", "http://host.docker.internal:8001"),
            info="Backend base URL accessible from inside Docker."
        ),
        SecretStrInput(
            name="api_key",
            display_name="Tool Auth Key",
            value="CROPSATHI_TOOL_KEY",
            load_from_db=True,
            info="Shared backend tool key from CROPSATHI_TOOL_KEY."
        ),
    ]

    class MarketPricesSchema(BaseModel):
        crop: str = Field(..., description="Crop commodity name (e.g. Wheat, Tomato, Onion).")
        location: str = Field(..., description="Market or mandi location (e.g. Pune, Nashik, Mumbai).")
        limit: int = Field(10, description="Maximum number of price records to retrieve (1-50). Default is 10.")

    def build_tool(self) -> Tool:
        def get_prices(crop: str, location: str, limit: int = 10) -> dict[str, Any]:
            key = getattr(self, "api_key", None)
            if hasattr(key, "get_secret_value"):
                key = key.get_secret_value()
            if not isinstance(key, str) or not key or key.strip() == "CROPSATHI_TOOL_KEY":
                key = os.getenv("CROPSATHI_TOOL_KEY", "")
            headers = {
                "X-CropSathi-Tool-Key": key.strip(),
                "Content-Type": "application/json",
            }
            url = f"{getattr(self, 'base_url', 'http://host.docker.internal:8001').rstrip('/')}/api/tools/v1/market-prices"
            params = {
                "crop": str(crop).strip(),
                "location": str(location).strip(),
                "limit": int(limit),
            }
            try:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.get(url, params=params, headers=headers)
                    if resp.status_code == 200:
                        return resp.json()
                    try:
                        err_json = resp.json()
                        return {"success": False, "status_code": resp.status_code, "error": err_json.get("detail", resp.text)}
                    except Exception:
                        return {"success": False, "status_code": resp.status_code, "error": resp.text}
            except Exception as e:
                return {"success": False, "error": f"Connection error: {str(e)}"}

        return StructuredTool.from_function(
            name="market_prices",
            description=(
                "Retrieve current and historical mandi/market prices, modal rates, "
                "min/max prices, and arrival dates for agricultural commodities. "
                "Inputs: crop (string), location (string), limit (integer, default 10)."
            ),
            func=get_prices,
            args_schema=self.MarketPricesSchema,
        )
