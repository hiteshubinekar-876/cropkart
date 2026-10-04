"""API tests for /api/v1/market-data routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models.crop import Crop


def test_list_market_data_empty(client: TestClient) -> None:
    """Verifies an unmatched market filter returns an empty, correctly shaped list."""
    response = client.get(
        f"{settings.API_V1_STR}/market-data/",
        params={"state": "__no_such_market_state__"},
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert "skip" in content
    assert "limit" in content
    assert isinstance(content["data"], list)
    assert content["count"] == 0
    assert content["skip"] == 0
    assert content["limit"] == 100


def test_list_market_data_filters(client: TestClient) -> None:
    """Verifies query parameter validation for market data filters."""
    response = client.get(
        f"{settings.API_V1_STR}/market-data/",
        params={
            "state": "__no_such_market_state__",
            "district": "Nashik",
            "market_name": "Lasalgaon",
            "commodity": "Onion",
            "sort_by": "modal_price",
            "sort_order": "asc",
            "skip": 0,
            "limit": 50,
        },
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] == 0
    assert content["data"] == []


def test_search_market_data(client: TestClient) -> None:
    """Verifies search endpoint with query term."""
    response = client.get(
        f"{settings.API_V1_STR}/market-data/search",
        params={"q": "__no_market_data_matches__", "limit": 20},
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert content["count"] == 0


def test_search_market_data_missing_q(client: TestClient) -> None:
    """Verifies that search requires query parameter q."""
    response = client.get(f"{settings.API_V1_STR}/market-data/search")
    assert response.status_code == 422


def test_get_market_data_by_id_not_found(client: TestClient) -> None:
    """Verifies 404 response when querying a non-existent market data UUID."""
    random_id = uuid.uuid4()
    response = client.get(f"{settings.API_V1_STR}/market-data/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_market_data_by_crop_existing(client: TestClient, db: Session) -> None:
    """Verifies querying market data by existing master crop ID."""
    crop = db.exec(select(Crop)).first()
    assert crop is not None, "Master crop catalog must contain crops"

    response = client.get(f"{settings.API_V1_STR}/market-data/crop/{crop.id}")
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert content["count"] >= len(content["data"])


def test_get_market_data_by_crop_not_found(client: TestClient) -> None:
    """Verifies 404 response when querying by non-existent crop ID."""
    random_id = uuid.uuid4()
    response = client.get(f"{settings.API_V1_STR}/market-data/crop/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
