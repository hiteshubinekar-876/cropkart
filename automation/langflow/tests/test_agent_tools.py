"""
tests/test_agent_tools.py - Unit and Integration Tests for Agent Tools.

Tests tool schemas, authentication, and endpoint contracts using the mock tools server.
"""

import os
import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(base_dir))

import pytest
from fastapi.testclient import TestClient
from api.mock_tools_server import app

client = TestClient(app)


def test_mock_server_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_demand_forecast_tool_endpoint_valid():
    payload = {
        "crop": "Wheat",
        "location": "Pune",
        "days": 30,
    }
    res = client.post("/api/tools/v1/demand-forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["tool"] == "demand_forecast"
    assert data["data"]["crop"] == "Wheat"
    assert data["data"]["predicted_demand"] > 0
    assert data["data"]["unit"] == "quintals"


def test_demand_forecast_tool_endpoint_insufficient_data():
    payload = {
        "crop": "DragonFruitUnknown",
        "location": "Pune",
        "days": 30,
    }
    res = client.post("/api/tools/v1/demand-forecast", json=payload)
    assert res.status_code == 404
    body = res.json()["detail"]
    assert body["success"] is False
    assert body["error"]["code"] == "INSUFFICIENT_DATA"


def test_market_prices_tool_endpoint():
    res = client.get("/api/tools/v1/market-prices?crop=Onion&location=Nashik")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["tool"] == "market_prices"
    assert len(data["data"]["records"]) > 0
    assert data["data"]["records"][0]["commodity"] == "Onion"


def test_crop_listings_tool_endpoint():
    res = client.get("/api/tools/v1/crop-listings?crop=Wheat&location=Pune")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["tool"] == "crop_listings"
    assert len(data["data"]["listings"]) > 0


def test_buyer_requirements_tool_endpoint():
    res = client.get("/api/tools/v1/buyer-requirements?crop=Wheat&urgency=HIGH")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["tool"] == "buyer_requirements"
    assert len(data["data"]["requirements"]) > 0


def test_chat_proxy_endpoint():
    payload = {
        "message": "What is the best soil for tomato?",
        "language": "en",
    }
    res = client.post("/api/ai/chat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "tomato" in data["response"].lower() or "cropsathi" in data["response"].lower()
