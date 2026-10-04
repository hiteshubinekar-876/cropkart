"""
ai_logic.py - AI Logic and Service Layer for CropKart & CropSathi

Provides the CropSathiAI service class for AI-driven agricultural assistance.
Designed to be clean, modular, and ready for future LangFlow AI Agent integration.

NOTE: Database access is intentionally decoupled. This module does not execute
database queries or connect to PostgreSQL directly.
"""

import logging
import re
from typing import Any, Dict, Optional, Union

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class CropSathiAI:
    """
    CropSathiAI service class.

    Provides foundational AI assistance for CropKart, including:
    - Conversational chat (with future LangFlow integration and intelligent fallback)
    - Intent detection for agricultural requests
    - Crop matching, pricing, demand forecasting, and farming advice placeholders
    """

    def __init__(self) -> None:
        self.service_name: str = "CropSathi AI"
        self.version: str = "1.0.0"

    @property
    def langflow_url(self) -> str:
        return settings.LANGFLOW_URL or "http://localhost:7860"

    @property
    def langflow_flow_id(self) -> str:
        return settings.LANGFLOW_FLOW_ID or ""

    @property
    def langflow_api_key(self) -> str:
        return (
            settings.LANGFLOW_API_KEY.get_secret_value()
            if settings.LANGFLOW_API_KEY
            else ""
        )

    @property
    def langflow_timeout(self) -> float:
        return settings.LANGFLOW_TIMEOUT

    def _extract_langflow_text(self, data: Dict[str, Any]) -> Optional[str]:
        """Extracts plain text response from nested LangFlow outputs."""
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
        except Exception:
            pass
        return None

    async def chat_with_source(
        self,
        message: str,
        language: Optional[str] = "en",
        role: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Processes a user message and returns a helpful AI response string.
        If LangFlow is configured, delegates to the LangFlow agent endpoint.
        Otherwise, returns an intelligent local response.
        """
        # If LangFlow is configured, attempt to call the LangFlow AI agent
        flow_id = self.langflow_flow_id
        api_key = self.langflow_api_key
        url = self.langflow_url

        if api_key and flow_id:
            try:
                endpoint = f"{url.rstrip('/')}/api/v1/run/{flow_id}"
                headers = {
                    "x-api-key": api_key,
                    "Content-Type": "application/json"
                }
                payload = {
                    "output_type": "chat",
                    "input_type": "chat",
                    "input_value": (
                        f"{context}\n\nUser question: {message}"
                        if context
                        else message
                    ),
                }
                async with httpx.AsyncClient(timeout=self.langflow_timeout) as client:
                    resp = await client.post(endpoint, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        extracted = self._extract_langflow_text(data)
                        if extracted:
                            return {"response": extracted, "source": "langflow"}
                    else:
                        logger.warning(
                            "LangFlow returned status %d: %s",
                            resp.status_code,
                            resp.text[:200],
                        )
            except Exception as exc:
                logger.warning("LangFlow request failed (%s): %s", type(exc).__name__, exc)

        return {
            "response": self._generate_local_response(message),
            "source": "local_fallback",
        }

    async def chat(
        self,
        message: str,
        language: Optional[str] = "en",
        role: Optional[str] = None,
    ) -> str:
        """Preserve the existing string-returning interface for current callers."""
        result = await self.chat_with_source(message, language=language, role=role)
        return result["response"]

    def _generate_local_response(self, message: str) -> str:
        """
        Generates context-aware, multilingual agricultural responses
        for development and testing when LangFlow is not connected.
        """
        msg_lower = message.lower().strip()

        # Marathi queries
        if "पाणी" in message or ("टोमॅटो" in message and "किती" in message):
            return (
                "टोमॅटो पिकासाठी जमिनीच्या मगदुरानुसार नियमित व संतुलित पाणी द्यावे. "
                "ठिबक सिंचनाचा वापर केल्यास पाण्याची बचत होते व फळे तडकण्याची समस्या टळते. "
                "फुलोरा आणि फळधारणेच्या काळात पाण्याचा ताण पडू देऊ नका."
            )

        # Hindi queries
        if "मिट्टी" in message or ("टमाटर" in message and ("कैसी" in message or "अच्छी" in message)):
            return (
                "टमाटर की अच्छी पैदावार के लिए जीवांश युक्त, उचित जल निकासी वाली बलुई दोमट (Sandy Loam) "
                "या दोमट मिट्टी सर्वोत्तम मानी जाती है। मिट्टी का pH मान 6.0 से 6.8 के बीच होना चाहिए।"
            )

        # English - Soil queries for tomato
        if "soil" in msg_lower and "tomato" in msg_lower:
            return (
                "Tomatoes thrive best in well-draining, fertile sandy loam or loamy soil rich in organic matter. "
                "The ideal soil pH range is 6.0 to 6.8. Ensure proper drainage to avoid root rot and fungal diseases."
            )

        # Water / Irrigation queries
        if "water" in msg_lower or "irrigation" in msg_lower:
            return (
                "For most vegetable crops, deep and consistent watering (1-2 inches per week) is recommended. "
                "Drip irrigation at the base of plants is best to prevent foliage diseases and conserve moisture."
            )

        # Pest / Disease queries
        if "pest" in msg_lower or "disease" in msg_lower or "insects" in msg_lower:
            return (
                "For effective pest management, inspect crops early in the morning, use neem-based organic sprays "
                "for preventive control, and ensure adequate crop spacing for aeration."
            )

        # Fertilizer queries
        if "fertilizer" in msg_lower or "npk" in msg_lower or "khad" in msg_lower:
            return (
                "Apply balanced organic compost prior to planting. Supplemental NPK ratios should be adjusted based "
                "on soil test results, switching to phosphorus and potassium-rich feeds during flowering and fruiting."
            )

        # Default helpful CropSathi response
        return (
            f"Namaste! CropSathi AI received your query: '{message}'. "
            f"CropKart provides advisory for crop health, market prices, and buyer discovery. "
            f"Future LangFlow AI Agent integration will deliver comprehensive real-time diagnostics."
        )

    def detect_intent(self, message: str) -> Dict[str, Any]:
        """
        Detects user intent and extracts agricultural entities (crop, quantity, unit, location).
        Supports:
        - GENERAL_FARMING
        - CROP_ADVICE
        - CROP_MATCH
        - PRICE_QUERY
        - DEMAND_QUERY
        - CROP_AVAILABILITY
        - BUY_CROP
        - SELL_CROP
        - ORDER_STATUS
        - APP_HELP
        """
        text = message.lower()

        # Extract quantity and unit (e.g. 500 kg, 20 quintals)
        qty_match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|quintal|quintals|ton|tons|bag|bags)?", text)
        quantity = float(qty_match.group(1)) if qty_match else None
        unit = qty_match.group(2) if (qty_match and qty_match.group(2)) else ("kg" if quantity else None)

        # Common crop keywords
        crops = ["tomato", "wheat", "rice", "soybean", "cotton", "onion", "chilli", "potato", "maize"]
        detected_crop = None
        for c in crops:
            if c in text:
                detected_crop = c
                break

        # Intent detection heuristics
        if any(w in text for w in ["need", "buy", "purchase", "want", "require"]):
            intent = "BUY_CROP" if detected_crop else "GENERAL_FARMING"
        elif any(w in text for w in ["sell", "offer", "listing", "supply"]):
            intent = "SELL_CROP"
        elif any(w in text for w in ["available", "in stock", "who has", "show me available"]):
            intent = "CROP_AVAILABILITY"
        elif any(w in text for w in ["price", "rate", "cost", "mandi price", "msp"]):
            intent = "PRICE_QUERY"
        elif any(w in text for w in ["demand", "forecast", "market trend"]):
            intent = "DEMAND_QUERY"
        elif any(w in text for w in ["match", "connect buyer", "find buyer"]):
            intent = "CROP_MATCH"
        elif any(w in text for w in ["order", "status", "delivery", "track"]):
            intent = "ORDER_STATUS"
        elif any(w in text for w in ["how to use", "help", "app", "navigate"]):
            intent = "APP_HELP"
        elif any(w in text for w in ["soil", "water", "pest", "disease", "fertilizer", "grow", "spray"]):
            intent = "CROP_ADVICE"
        else:
            intent = "GENERAL_FARMING"

        return {
            "intent": intent,
            "crop": detected_crop,
            "quantity": quantity,
            "unit": unit,
            "location": None
        }

    async def crop_match(
        self,
        crop: str,
        quantity: Union[float, int, str],
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """Placeholder crop matching method."""
        return {
            "status": "success",
            "crop": crop,
            "quantity": quantity,
            "location": location or "All Locations",
            "matches": [
                {
                    "buyer_id": "BUYER-DEMO-001",
                    "crop": crop,
                    "target_quantity": quantity,
                    "offered_price_per_unit": 2250,
                    "location": location or "Regional Mandi",
                    "match_score": 0.94,
                }
            ],
            "message": f"Matching completed for {quantity} of {crop}.",
        }

    async def pricing_intelligence(
        self,
        crop: str,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """Placeholder pricing intelligence."""
        return {
            "status": "success",
            "crop": crop,
            "location": location or "Standard Mandi",
            "currency": "INR",
            "current_market_price": 2350.0,
            "recommended_selling_price": 2420.0,
            "minimum_support_price": 2275.0,
            "price_trend": "Upward",
            "confidence_level": "Medium",
            "message": f"Pricing intelligence generated for {crop}.",
        }

    async def demand_forecasting(
        self,
        crop: str,
        location: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Calculates real machine learning demand forecast using Ridge pipeline."""
        try:
            try:
                from app.services.demand_service import get_demand_forecast
            except ImportError:
                from backend.app.services.demand_service import get_demand_forecast

            loc = location.strip() if (location and location.strip()) else "Pune"
            result = get_demand_forecast(crop=crop, location=loc, days=days)
            return {
                "status": "success",
                "crop": result["crop"],
                "location": result["location"],
                "forecast_period": f"Next {days} Days",
                "projected_demand": f"{result['predicted_demand']} {result['unit']}",
                "demand_index": round(min(100.0, (result["predicted_demand"] / 2000.0) * 100), 1),
                "model_version": result["model_version"],
                "data_source": result.get("data_source", ""),
                "message": f"ML demand forecast generated for {crop} in {loc}.",
            }
        except Exception as exc:
            return {
                "status": "error",
                "crop": crop,
                "location": location or "Pune",
                "forecast_period": f"Next {days} Days",
                "error": str(exc),
                "message": f"Could not calculate demand forecast: {str(exc)}",
            }

    async def farming_advice(
        self,
        crop: str,
        question: str,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """Placeholder agronomy advisory."""
        return {
            "status": "success",
            "crop": crop,
            "location": location or "General Climate Zone",
            "question": question,
            "advice": self._generate_local_response(f"{crop} {question}"),
            "message": f"Farming advice provided for {crop}.",
        }

    async def crop_polling(
        self,
        crop: str,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """Placeholder market polling."""
        return {
            "status": "success",
            "crop": crop,
            "location": location or "National Aggregate",
            "total_participants": 150,
            "market_sentiment": "Bullish",
            "message": f"Market polling summary retrieved for {crop}.",
        }

    async def app_help(self, question: str) -> Dict[str, Any]:
        """Assists users with CropKart app navigation."""
        return {
            "status": "success",
            "question": question,
            "topic": "CropKart App Support",
            "assistance": (
                f"You asked: '{question}'. CropKart connects farmers and buyers directly. "
                f"Use the marketplace to view listings, post crop requirements, or check market rates."
            ),
            "message": "App assistance response generated.",
        }


# Convenience function for direct chat
async def chat_with_cropsathi(message: str) -> str:
    return await crop_sathi.chat(message=message)


# Reusable instance
crop_sathi = CropSathiAI()
