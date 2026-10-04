"""
tools/crop_listings_tool.py - Custom LangFlow Component for Marketplace Crop Listings.

This file contains the exact Python custom component code embedded in the
CropSathi AI Agent LangFlow flow (CropListingsTool-1).

It can be pasted directly into a LangFlow Custom Component or loaded by LangFlow.
"""

import os
import httpx
from typing import Any, Optional
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


class CropListingsToolComponent(LCToolComponent):
    display_name: str = "Crop Listings Tool"
    description: str = "Retrieve available farmer crop listings and inventory from CropKart."
    name: str = "CropListingsTool"
    icon: str = "store"

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

    class CropListingsSchema(BaseModel):
        crop: Optional[str] = Field(None, description="Optional crop name filter (e.g. Wheat, Tomato, Rice).")
        location: Optional[str] = Field(None, description="Optional mandi or location filter (e.g. Pune, Nashik).")
        min_quantity: Optional[float] = Field(None, description="Optional minimum available quantity filter.")
        limit: int = Field(10, description="Maximum number of listings to return (1-50). Default is 10.")

    def build_tool(self) -> Tool:
        def get_listings(
            crop: Optional[str] = None,
            location: Optional[str] = None,
            min_quantity: Optional[float] = None,
            limit: int = 10
        ) -> dict[str, Any]:
            key = getattr(self, "api_key", None)
            if hasattr(key, "get_secret_value"):
                key = key.get_secret_value()
            if not isinstance(key, str) or not key or key.strip() == "CROPSATHI_TOOL_KEY":
                key = os.getenv("CROPSATHI_TOOL_KEY", "")
            headers = {
                "X-CropSathi-Tool-Key": key.strip(),
                "Content-Type": "application/json",
            }
            url = f"{getattr(self, 'base_url', 'http://host.docker.internal:8001').rstrip('/')}/api/tools/v1/crop-listings"
            params: dict[str, Any] = {"limit": int(limit)}
            if crop:
                params["crop"] = str(crop).strip()
            if location:
                params["location"] = str(location).strip()
            if min_quantity is not None:
                params["min_quantity"] = float(min_quantity)

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
            name="crop_listings",
            description=(
                "Retrieve available farmer crop listings, inventory quantities, "
                "pricing, and crop availability on the CropKart marketplace. "
                "Inputs: crop (optional string), location (optional string), min_quantity (optional float), limit (integer, default 10)."
            ),
            func=get_listings,
            args_schema=self.CropListingsSchema,
        )
