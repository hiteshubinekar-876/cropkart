"""
tools/demand_forecast_tool.py - Custom LangFlow Component for ML Demand Forecasting.

This file contains the exact Python custom component code embedded in the
CropSathi AI Agent LangFlow flow (DemandForecastTool-1).

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
    # Fallback placeholders if running in standard python without LangFlow (lfx) runtime
    class LCToolComponent:
        pass
    Tool = Any
    MessageTextInput = Any
    SecretStrInput = Any


class DemandForecastToolComponent(LCToolComponent):
    display_name: str = "Demand Forecast Tool"
    description: str = "Forecast agricultural crop demand in quintals using CropKart ML models."
    name: str = "DemandForecastTool"
    icon: str = "trending-up"

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

    class DemandForecastSchema(BaseModel):
        crop: str = Field(..., description="Crop name to forecast (e.g. Wheat, Rice, Tomato, Onion).")
        location: str = Field(..., description="Target mandi or city location (e.g. Pune, Mumbai, Nashik).")
        days: int = Field(30, description="Forecast horizon in days (e.g. 15, 30, 60). Default is 30.")

    def build_tool(self) -> Tool:
        def forecast(crop: str, location: str, days: int = 30) -> dict[str, Any]:
            key = getattr(self, "api_key", None)
            if hasattr(key, "get_secret_value"):
                key = key.get_secret_value()
            if not isinstance(key, str) or not key or key.strip() == "CROPSATHI_TOOL_KEY":
                key = os.getenv("CROPSATHI_TOOL_KEY", "")
            headers = {
                "X-CropSathi-Tool-Key": key.strip(),
                "Content-Type": "application/json",
            }
            url = f"{getattr(self, 'base_url', 'http://host.docker.internal:8001').rstrip('/')}/api/tools/v1/demand-forecast"
            payload = {
                "crop": str(crop).strip(),
                "location": str(location).strip(),
                "days": int(days),
            }
            try:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, json=payload, headers=headers)
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
            name="demand_forecast",
            description=(
                "Forecast future crop demand in quintals for a given crop, mandi/location, "
                "and horizon in days using CropKart machine learning models. "
                "Inputs: crop (string), location (string), days (integer, default 30)."
            ),
            func=forecast,
            args_schema=self.DemandForecastSchema,
        )
