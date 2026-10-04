"""
agent/langflow_client.py - LangFlow REST API Client for CropSathi AI Agent.

Handles direct communication with the LangFlow execution server via REST endpoints:
- POST /api/v1/run/{flow_id}
- GET  /api/v1/flows/{flow_id}
- GET  /health or /api/v1/all
"""

import os
import logging
from typing import Any, Dict, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class LangFlowClient:
    """
    Dedicated client for communicating with a LangFlow instance.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        flow_id: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.base_url: str = (
            base_url
            or os.getenv("LANGFLOW_URL")
            or "http://localhost:7860"
        ).rstrip("/")
        self.flow_id: str = (
            flow_id
            or os.getenv("LANGFLOW_FLOW_ID")
            or "7ee6cd01-deec-4f9c-8cfc-66e16d94ca10"
        )
        self.api_key: str = api_key or os.getenv("LANGFLOW_API_KEY", "")
        try:
            self.timeout: float = float(
                timeout or os.getenv("LANGFLOW_TIMEOUT", "30.0")
            )
        except ValueError:
            self.timeout = 30.0

    @property
    def headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key.strip()
        return headers

    async def is_available(self) -> bool:
        """Checks if the LangFlow service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/health")
                return resp.status_code in [200, 404]  # 404 still indicates server is up
        except Exception:
            return False

    def extract_text(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Extracts plain text response from nested LangFlow execution output.
        Matches the extraction algorithm verified in CropKart's ai_logic.py.
        """
        try:
            outputs = data.get("outputs", [])
            if outputs and isinstance(outputs, list):
                first_out = outputs[0]
                nested = first_out.get("outputs", [])
                if nested and isinstance(nested, list):
                    res = nested[0].get("results", {})
                    msg = res.get("message", {})
                    if isinstance(msg, dict):
                        if "text" in msg and msg["text"]:
                            return str(msg["text"])
                        if "data" in msg and isinstance(msg["data"], dict) and msg["data"].get("text"):
                            return str(msg["data"]["text"])
                    artifacts = nested[0].get("artifacts", {})
                    if isinstance(artifacts, dict) and "message" in artifacts and artifacts["message"]:
                        return str(artifacts["message"])
                    msgs = nested[0].get("messages", [])
                    if msgs and isinstance(msgs, list) and "message" in msgs[0]:
                        return str(msgs[0]["message"])

            for key in ["result", "message", "response", "output_value"]:
                if key in data and isinstance(data[key], str) and data[key].strip():
                    return data[key]
        except Exception as exc:
            logger.debug("Failed to extract LangFlow response text: %s", exc)

        return None

    async def run(
        self,
        message: str,
        flow_id: Optional[str] = None,
        input_type: str = "chat",
        output_type: str = "chat",
        tweaks: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a flow run on LangFlow.
        POST /api/v1/run/{flow_id}
        """
        target_flow_id = flow_id or self.flow_id
        if not target_flow_id:
            raise ValueError("No flow_id provided and LANGFLOW_FLOW_ID is unset.")

        endpoint = f"{self.base_url}/api/v1/run/{target_flow_id}"
        payload: Dict[str, Any] = {
            "input_value": message,
            "input_type": input_type,
            "output_type": output_type,
        }
        if tweaks:
            payload["tweaks"] = tweaks

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(endpoint, json=payload, headers=self.headers)
            if resp.status_code == 200:
                data = resp.json()
                extracted_text = self.extract_text(data)
                return {
                    "success": True,
                    "status_code": resp.status_code,
                    "text": extracted_text,
                    "raw": data,
                }
            else:
                return {
                    "success": False,
                    "status_code": resp.status_code,
                    "error": resp.text[:500],
                    "raw": None,
                }

    def run_sync(
        self,
        message: str,
        flow_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synchronous version of run() for scripts and CLI testing."""
        target_flow_id = flow_id or self.flow_id
        endpoint = f"{self.base_url}/api/v1/run/{target_flow_id}"
        payload = {
            "input_value": message,
            "input_type": "chat",
            "output_type": "chat",
        }
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(endpoint, json=payload, headers=self.headers)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "status_code": resp.status_code,
                    "text": self.extract_text(data),
                    "raw": data,
                }
            return {
                "success": False,
                "status_code": resp.status_code,
                "error": resp.text[:500],
            }
