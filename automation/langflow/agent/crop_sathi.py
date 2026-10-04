"""
agent/crop_sathi.py - CropSathi AI Agent Runner.

Orchestrates conversational interactions for farmers, buyers, and transporters.
Attempts execution through the LangFlow CropSathi agent first.
If LangFlow is unreachable or fails, provides graceful, multilingual domain fallback.
"""

import os
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

from .langflow_client import LangFlowClient
from .schemas import ChatRequest, ChatResponse

load_dotenv()
logger = logging.getLogger(__name__)


class CropSathiAgent:
    """
    CropSathi Agent Controller.
    Manages communication between the CropKart API layer and the LangFlow agent.
    """

    def __init__(self, client: Optional[LangFlowClient] = None) -> None:
        self.client: LangFlowClient = client or LangFlowClient()

    async def chat(
        self,
        message: str,
        language: Optional[str] = "en",
        role: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes a user query by delegating to LangFlow, or falling back locally.
        Returns a dict matching ChatResponse schema:
        {"success": True, "message": ..., "response": ..., "source": "langflow" | "local_fallback"}
        """
        # If LangFlow credentials and flow ID are configured, try LangFlow
        if self.client.api_key and self.client.flow_id:
            try:
                res = await self.client.run(message=message)
                if res.get("success") and res.get("text"):
                    return {
                        "success": True,
                        "message": message,
                        "response": res["text"],
                        "source": "langflow",
                    }
                else:
                    logger.warning(
                        "LangFlow returned unsuccessful status (%s): %s",
                        res.get("status_code"),
                        res.get("error"),
                    )
            except Exception as exc:
                logger.warning("LangFlow communication failed (%s): %s", type(exc).__name__, exc)

        # Fallback to local domain rules if LangFlow is unavailable
        fallback_text = self._generate_local_fallback(message=message, language=language)
        return {
            "success": True,
            "message": message,
            "response": fallback_text,
            "source": "local_fallback",
        }

    def _generate_local_fallback(self, message: str, language: Optional[str] = "en") -> str:
        """
        Multilingual fallback advisory for Marathi, Hindi, and English.
        Preserves exact agronomic advisory patterns established in CropKart.
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

        # Default CropSathi advisory
        return (
            f"Namaste! CropSathi received your query: '{message}'. "
            "CropKart provides advisory for crop health, mandi market prices, and buyer discovery. "
            "Connect the LangFlow AI agent server to unlock full generative reasoning and live tool integration."
        )


# Global instance
crop_sathi_agent = CropSathiAgent()
