"""
tools/buyer_requirements_tool.py - Custom LangFlow Component for Buyer Procurement Requests.

This file contains the exact Python custom component code embedded in the
CropSathi AI Agent LangFlow flow (BuyerRequirementsTool-1).

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


class BuyerRequirementsToolComponent(LCToolComponent):
    display_name: str = "Buyer Requirements Tool"
    description: str = "Retrieve active buyer demand and procurement requests from CropKart."
    name: str = "BuyerRequirementsTool"
    icon: str = "shopping-cart"

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

    class BuyerRequirementsSchema(BaseModel):
        crop: Optional[str] = Field(None, description="Optional crop commodity filter (e.g. Wheat, Rice, Cotton).")
        location: Optional[str] = Field(None, description="Optional delivery location filter (e.g. Pune, Mumbai).")
        status: Optional[str] = Field(None, description="Requirement status filter: 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED'.")
        urgency: Optional[str] = Field(None, description="Procurement urgency filter: 'LOW', 'MEDIUM', 'HIGH', 'URGENT'.")
        limit: int = Field(10, description="Maximum number of records to return (1-50). Default is 10.")

    def build_tool(self) -> Tool:
        def get_buyer_requirements(
            crop: Optional[str] = None,
            location: Optional[str] = None,
            status: Optional[str] = None,
            urgency: Optional[str] = None,
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
            url = f"{getattr(self, 'base_url', 'http://host.docker.internal:8001').rstrip('/')}/api/tools/v1/buyer-requirements"
            params: dict[str, Any] = {"limit": int(limit)}
            if crop:
                params["crop"] = str(crop).strip()
            if location:
                params["location"] = str(location).strip()
            if status:
                params["status"] = str(status).strip()
            if urgency:
                params["urgency"] = str(urgency).strip()

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
            name="buyer_requirements",
            description=(
                "Find buyers who require a crop, buyer demand, quantities needed, "
                "urgency, delivery location, and target pricing across CropKart network. "
                "Inputs: crop (optional string), location (optional string), status (optional string), urgency (optional string), limit (integer, default 10)."
            ),
            func=get_buyer_requirements,
            args_schema=self.BuyerRequirementsSchema,
        )
