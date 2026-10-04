"""API tests for CEDA synchronization endpoints in /api/v1/market-data."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from tests.utils.utils import get_superuser_token_headers


def test_sync_ceda_endpoint_requires_auth(client: TestClient) -> None:
    """Verifies that unauthorized requests are rejected with 401."""
    response = client.post(
        f"{settings.API_V1_STR}/market-data/sync-ceda",
        json={
            "commodity_id": 1,
            "state_id": 8,
            "from_date": "2026-10-01",
            "to_date": "2026-10-02",
        },
    )
    assert response.status_code == 401


def test_sync_ceda_endpoint_superuser_success_mock(client: TestClient) -> None:
    """Verifies that a superuser can successfully invoke CEDA sync."""
    headers = get_superuser_token_headers(client)

    mock_prices = [
        {
            "commodity_id": 1,
            "census_state_id": 8,
            "census_district_id": 104,
            "market_id": 255,
            "date": "2026-10-02",
            "min_price": 2200.0,
            "max_price": 2400.0,
            "modal_price": 2300.0,
        }
    ]

    with (
        patch("app.services.ceda_service.CedaApiClient.fetch_prices", return_value=mock_prices),
        patch("app.services.ceda_service.CedaApiClient.fetch_quantities", return_value=[]),
        patch("app.services.ceda_service.CedaMetadataRegistry.from_client") as mock_registry,
    ):
        mock_reg_instance = mock_registry.return_value
        mock_reg_instance.commodities = {1: "Wheat"}
        mock_reg_instance.states = {8: "Punjab"}
        mock_reg_instance.districts = {(8, 104): "Ludhiana"}
        mock_reg_instance.markets = {255: "Khanna"}

        response = client.post(
            f"{settings.API_V1_STR}/market-data/sync-ceda",
            headers=headers,
            json={
                "commodity_id": 1,
                "state_id": 8,
                "from_date": "2026-10-01",
                "to_date": "2026-10-02",
                "dry_run": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid_records"] == 1
        assert data["dry_run"] is True
        assert data["mapped_crops"] == 1
        assert "Simulated (dry-run)" in data["message"]


def test_ingest_ceda_records_batch_superuser(client: TestClient) -> None:
    """Verifies batch CEDA ingestion endpoint with superuser token."""
    headers = get_superuser_token_headers(client)

    payload = {
        "records": [
            {
                "state": "Madhya Pradesh",
                "district": "Indore",
                "market_name": "Indore APMC",
                "commodity": "Wheat",
                "date": "2026-10-02",
                "min_price": 2300,
                "max_price": 2500,
                "modal_price": 2400,
                "quantity": 120,
            }
        ],
        "dry_run": True,
    }

    response = client.post(
        f"{settings.API_V1_STR}/market-data/ingest-ceda-records",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid_records"] == 1
    assert data["dry_run"] is True
    assert data["mapped_crops"] == 1
    assert "Simulated (dry-run)" in data["message"]
