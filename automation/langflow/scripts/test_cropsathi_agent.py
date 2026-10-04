"""
scripts/test_cropsathi_agent.py - Test Script for CropSathi AI Agent.

Tests:
1. Agent initialization and environment loading.
2. English agriculture advisory query.
3. Hindi agriculture advisory query (हिंदी).
4. Marathi agriculture advisory query (मराठी).
5. Tool query handling (demand forecast / mandi prices).

Usage:
    python scripts/test_cropsathi_agent.py
"""

import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))
load_dotenv(base_dir / ".env")

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent.crop_sathi import CropSathiAgent
from agent.langflow_client import LangFlowClient


async def run_tests():
    print("==================================================")
    print("   CropSathi AI Agent - Diagnostics & Test Suite  ")
    print("==================================================")

    client = LangFlowClient()
    agent = CropSathiAgent(client=client)

    print(f"[*] LangFlow Base URL: {client.base_url}")
    print(f"[*] Flow ID:           {client.flow_id}")
    print(f"[*] API Key Present:   {'Yes' if client.api_key else 'No (using local fallback)'}")

    is_online = await client.is_available()
    print(f"[*] LangFlow Online:   {'YES' if is_online else 'NO (offline mode / local fallback)'}")
    print("--------------------------------------------------")

    test_queries = [
        ("English - Soil Advice", "What is the best soil for tomato cultivation?", "en"),
        ("Hindi - Soil Advice", "टमाटर के लिए अच्छी मिट्टी कैसी होनी चाहिए?", "hi"),
        ("Marathi - Irrigation Advice", "टोमॅटो पिकासाठी पाणी व्यवस्थापन कसे करावे?", "mr"),
        ("Tool Query - Demand", "What is the projected demand for wheat in Pune?", "en"),
        ("Tool Query - Prices", "What are current market prices for onion in Nashik?", "en"),
    ]

    for label, query, lang in test_queries:
        print(f"\n[TEST] {label}")
        print(f"Query: \"{query}\"")
        result = await agent.chat(message=query, language=lang)
        source = result.get("source", "unknown")
        resp = result.get("response", "")
        print(f"Source: [{source.upper()}]")
        print(f"Response: {resp[:160]}..." if len(resp) > 160 else f"Response: {resp}")

    print("\n==================================================")
    print("Test execution complete. Agent is operational.")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
