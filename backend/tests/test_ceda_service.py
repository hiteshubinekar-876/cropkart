"""Unit tests for CEDA API integration service."""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

import httpx
import pytest
from sqlmodel import Session

from app.models.market_data import MarketData
from app.services.ceda_service import (
    CedaApiClient,
    CedaApiError,
    CedaAuthError,
    CedaMetadataRegistry,
    CedaRateLimitError,
    CedaRequestError,
    CedaServerError,
    _reuse_existing_ceda_market_names,
    normalize_ceda_record,
    sync_ceda_to_market_data,
)


def test_ceda_client_headers_with_key() -> None:
    """Verifies that the client formats Authorization header with Bearer token."""
    client = CedaApiClient(api_key="valid-test-key-12345")
    headers = client._get_headers()
    assert headers["Authorization"] == "Bearer valid-test-key-12345"
    assert headers["Content-Type"] == "application/json"


def test_ceda_client_missing_key_raises_auth_error() -> None:
    """Verifies that an unconfigured or empty API key immediately raises CedaAuthError."""
    client = CedaApiClient(api_key="")
    with pytest.raises(CedaAuthError, match="CEDA_API_KEY is not configured"):
        client._get_headers()

    client_none = CedaApiClient(api_key=None)
    with patch("app.services.ceda_service.settings.CEDA_API_KEY", None):
        client_none.api_key = None
        with pytest.raises(CedaAuthError, match="CEDA_API_KEY is not configured"):
            client_none._get_headers()


def test_ceda_client_handle_response_status_codes() -> None:
    """Verifies that HTTP status codes map to specific typed exceptions."""
    client = CedaApiClient(api_key="test-key")

    # 401 Unauthorized
    resp_401 = httpx.Response(
        status_code=401,
        json={"status": "failure", "message": "Api key expired"},
        request=httpx.Request("GET", "https://api.ceda.ashoka.edu.in/v1/agmarknet/commodities"),
    )
    with pytest.raises(CedaAuthError, match="Api key expired"):
        client._handle_response(resp_401)

    # 429 Rate Limit
    resp_429 = httpx.Response(
        status_code=429,
        text="Too many requests",
        request=httpx.Request("GET", "https://api.ceda.ashoka.edu.in/v1/agmarknet/commodities"),
    )
    with pytest.raises(CedaRateLimitError, match="rate limit exceeded"):
        client._handle_response(resp_429)

    # 400 Bad Request
    resp_400 = httpx.Response(
        status_code=400,
        json={"message": "Invalid commodity_id"},
        request=httpx.Request("POST", "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"),
    )
    with pytest.raises(CedaRequestError, match="Invalid commodity_id"):
        client._handle_response(resp_400)

    # 500 Server Error
    resp_500 = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("GET", "https://api.ceda.ashoka.edu.in/v1/agmarknet/commodities"),
    )
    with pytest.raises(CedaServerError, match="upstream server error"):
        client._handle_response(resp_500)


def test_ceda_client_methods_mocked() -> None:
    """Tests CedaApiClient query methods with mocked HTTP responses."""
    client = CedaApiClient(api_key="test-token")

    # The live CEDA gateway wraps documented response data in output.data.
    mock_comm_resp = httpx.Response(
        200,
        json={
            "output": {
                "type": "success",
                "message": "Data exists",
                "data": [
                    {"commodity_id": 1, "commodity_name": "Wheat"},
                    {"commodity_id": 2, "commodity_name": "Paddy"},
                ],
            }
        },
        request=httpx.Request("GET", "https://api.ceda.ashoka.edu.in/v1/agmarknet/commodities"),
    )
    with patch("httpx.Client.get", return_value=mock_comm_resp):
        comms = client.get_commodities()
        assert len(comms) == 2
        assert comms[0]["commodity_name"] == "Wheat"

    mock_geo_resp = httpx.Response(
        200,
        json={
            "output": {
                "type": "success",
                "message": "Data exists",
                "data": [
                    {
                        "census_state_id": 3,
                        "census_state_name": "Punjab",
                        "census_district_id": 41,
                        "census_district_name": "Ludhiana",
                    }
                ],
            }
        },
        request=httpx.Request("GET", "https://api.ceda.ashoka.edu.in/v1/agmarknet/geographies"),
    )
    with patch("httpx.Client.get", return_value=mock_geo_resp):
        geographies = client.get_geographies()
        assert geographies[0]["census_state_name"] == "Punjab"

    mock_markets_resp = httpx.Response(
        200,
        json={
            "output": {
                "type": "success",
                "message": "Data exists",
                "data": [
                    {
                        "census_state_id": 3,
                        "census_district_id": 41,
                        "market_id": 255,
                        "market_name": "Khanna",
                    }
                ],
            }
        },
        request=httpx.Request("POST", "https://api.ceda.ashoka.edu.in/v1/agmarknet/markets"),
    )
    with patch("httpx.Client.post", return_value=mock_markets_resp) as mock_post:
        markets = client.get_markets(commodity_id=1, state_id=3, district_id=41)
        assert markets[0]["market_name"] == "Khanna"
        assert mock_post.call_args.kwargs["json"] == {
            "commodity_id": 1,
            "state_id": 3,
            "district_id": 41,
            "indicator": "price",
        }

    # Prices use the exact Swagger JSON body and return output.data records.
    mock_price_resp = httpx.Response(
        200,
        json={
            "output": {
                "type": "success",
                "message": "Data exists",
                "data": [
                    {
                        "commodity_id": 1,
                        "census_state_id": 3,
                        "census_district_id": 41,
                        "market_id": 255,
                        "date": "2025-03-01",
                        "min_price": 2200.0,
                        "max_price": 2400.0,
                        "modal_price": 2300.0,
                    }
                ],
            }
        },
        request=httpx.Request("POST", "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"),
    )
    with patch("httpx.Client.post", return_value=mock_price_resp) as mock_post:
        prices = client.fetch_prices(
            commodity_id=1,
            state_id=3,
            from_date="2025-03-01",
            to_date="2025-03-02",
            district_ids=[41],
            market_ids=[255],
        )
        assert len(prices) == 1
        assert prices[0]["modal_price"] == 2300.0
        assert mock_post.call_args.kwargs["headers"]["Authorization"] == "Bearer test-token"
        assert mock_post.call_args.kwargs["json"] == {
            "commodity_id": 1,
            "state_id": 3,
            "district_id": [41],
            "market_id": [255],
            "from_date": "2025-03-01",
            "to_date": "2025-03-02",
        }


def test_ceda_empty_prices_and_wrapped_quantities() -> None:
    """Empty data is a valid empty result and quantity data uses the same wrapper."""
    client = CedaApiClient(api_key="test-token")
    empty_prices = httpx.Response(
        200,
        json={
            "output": {"type": "success", "message": "No data exists", "data": []}
        },
        request=httpx.Request("POST", "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"),
    )
    quantities = httpx.Response(
        200,
        json={
            "output": {
                "type": "success",
                "message": "Data exists",
                "data": [{"date": "2025-03-01", "quantity": 42.5}],
            }
        },
        request=httpx.Request("POST", "https://api.ceda.ashoka.edu.in/v1/agmarknet/quantities"),
    )

    with patch("httpx.Client.post", side_effect=[empty_prices, quantities]):
        assert client.fetch_prices(1, 3, "2025-03-01", "2025-03-01") == []
        assert client.fetch_quantities(1, 3, "2025-03-01", "2025-03-01") == [
            {"date": "2025-03-01", "quantity": 42.5}
        ]


def test_ceda_response_malformed_and_logical_errors() -> None:
    """Malformed success payloads fail loudly instead of looking like empty results."""
    client = CedaApiClient(api_key="test-token")
    with pytest.raises(CedaServerError, match="Malformed CEDA response"):
        client._extract_records({"output": {"type": "success", "data": None}}, "data", "prices")

    with pytest.raises(CedaApiError, match="CEDA returned an API error"):
        client._extract_records(
            {"output": {"type": "error", "message": "invalid filters"}},
            "data",
            "prices",
        )

    error_response = httpx.Response(
        400,
        json={"output": {"type": "error", "message": "missing filters"}},
        request=httpx.Request("POST", "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"),
    )
    with pytest.raises(CedaRequestError, match="missing filters"):
        client._handle_response(error_response)


def test_ceda_metadata_registry_parses_live_field_names() -> None:
    """The runtime metadata field names resolve commodity/state/district IDs."""
    client = MagicMock(spec=CedaApiClient)
    client.get_commodities.return_value = [
        {"commodity_id": 1, "commodity_name": "Wheat"}
    ]
    client.get_geographies.return_value = [
        {
            "census_state_id": 3,
            "census_state_name": "Punjab",
            "census_district_id": 41,
            "census_district_name": "Ludhiana",
        }
    ]

    registry = CedaMetadataRegistry.from_client(client)

    assert registry.commodities == {1: "Wheat"}
    assert registry.states == {3: "Punjab"}
    assert registry.districts == {(3, 41): "Ludhiana"}


def test_repeated_ceda_rows_reuse_a_unique_verified_market_name() -> None:
    """A duplicate can use its prior exact row when CEDA rate-limits /markets."""
    session = MagicMock()
    session.exec.return_value.all.return_value = [
        MarketData(
            state="Rajasthan",
            district="Alwar",
            market_name="Barodamev",
            commodity="Wheat",
            arrival_date=date(2025, 3, 3),
            min_price=Decimal("2864"),
            max_price=Decimal("2887"),
            modal_price=Decimal("2880"),
            source="ceda",
        )
    ]
    record = {
        "commodity_id": 1,
        "census_state_id": 8,
        "census_district_id": 104,
        "market_id": 3149,
        "date": "2025-03-03T00:00:00.000Z",
        "min_price": 2864,
        "max_price": 2887,
        "modal_price": 2880,
    }
    registry = CedaMetadataRegistry(
        commodities={1: "Wheat"},
        states={8: "Rajasthan"},
        districts={(8, 104): "Alwar"},
    )

    _reuse_existing_ceda_market_names(session, [record], registry)

    assert registry.markets[3149] == "Barodamev"


def test_normalize_ceda_record_with_metadata_registry() -> None:
    """Tests normalizing a raw CEDA response containing numeric IDs via CedaMetadataRegistry."""
    wheat_id = uuid.uuid4()
    crop_cache = {"wheat": wheat_id}

    registry = CedaMetadataRegistry(
        commodities={1: "Wheat"},
        states={8: "Punjab"},
        districts={(8, 104): "Ludhiana"},
        markets={255: "Khanna APMC"},
    )

    raw_ceda_record = {
        "commodity_id": 1,
        "census_state_id": 8,
        "census_district_id": 104,
        "market_id": 255,
        "date": "2026-10-02",
        "min_price": "2250.00",
        "max_price": "2450.00",
        "modal_price": "2350.00",
        "quantity": "320.50",
    }

    normalized = normalize_ceda_record(raw_ceda_record, crop_cache, metadata=registry)

    assert normalized["state"] == "Punjab"
    assert normalized["district"] == "Ludhiana"
    assert normalized["market_name"] == "Khanna APMC"
    assert normalized["commodity"] == "Wheat"
    assert normalized["arrival_date"] == date(2026, 10, 2)
    assert normalized["min_price"] == Decimal("2250.00")
    assert normalized["max_price"] == Decimal("2450.00")
    assert normalized["modal_price"] == Decimal("2350.00")
    assert normalized["arrival_quantity"] == Decimal("320.50")
    assert normalized["source"] == "ceda"
    assert normalized["crop_id"] == wheat_id


def test_normalize_ceda_record_price_boundary_corrections() -> None:
    """Tests price boundary validation and sanitation (e.g. min > max or modal out of bounds)."""
    crop_cache: dict[str, uuid.UUID] = {}

    # Case: min_price > max_price in raw reporting -> should be swapped safely
    raw_inverted = {
        "state": "Maharashtra",
        "district": "Nashik",
        "market_name": "Lasalgaon",
        "commodity": "Onion",
        "date": "2026-10-02",
        "min_price": 2800,  # inverted
        "max_price": 2200,
        "modal_price": 2500,
    }
    normalized = normalize_ceda_record(raw_inverted, crop_cache)
    assert normalized["min_price"] == Decimal("2200")
    assert normalized["max_price"] == Decimal("2800")
    assert normalized["modal_price"] == Decimal("2500")


def test_normalize_ceda_record_rejects_missing_market_or_price_fields() -> None:
    """Records missing required CEDA market/price values are not fabricated."""
    raw = {
        "commodity_id": 99,
        "census_state_id": 3,
        "census_district_id": 41,
        "market_id": 255,
        "date": "2025-03-01",
        "min_price": 2200,
        "max_price": 2400,
        "modal_price": 2300,
    }
    registry = CedaMetadataRegistry(
        commodities={99: "Unmapped crop"},
        states={3: "Punjab"},
        districts={(3, 41): "Ludhiana"},
    )
    with pytest.raises(ValueError, match="market=''"):
        normalize_ceda_record(raw, {}, metadata=registry)

    registry.markets[255] = "Khanna"
    raw.pop("max_price")
    with pytest.raises(ValueError, match="missing required price fields: max_price"):
        normalize_ceda_record(raw, {}, metadata=registry)


def test_sync_ceda_to_market_data_dry_run(db: Session) -> None:
    """Tests full synchronization pipeline in dry-run mode (zero database changes)."""
    raw_records = [
        {
            "state": "Punjab",
            "district": "Ludhiana",
            "market_name": "Khanna",
            "commodity": "Wheat",
            "date": "2026-10-02",
            "min_price": 2200,
            "max_price": 2400,
            "modal_price": 2300,
            "quantity": 100,
        }
    ]

    result = sync_ceda_to_market_data(
        session=db,
        raw_records=raw_records,
        dry_run=True,
    )

    assert result["dry_run"] is True
    assert result["total_processed"] == 1
    assert result["valid_records"] == 1
    assert result["inserted"] == 0
    assert result["mapped_crops"] >= 1
    assert result["errors_count"] == 0


def test_sync_ceda_to_market_data_live_with_client_mock(db: Session) -> None:
    """Tests live pipeline with a mocked CedaApiClient."""
    mock_client = MagicMock(spec=CedaApiClient)
    mock_client.fetch_prices.return_value = [
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
    mock_client.fetch_quantities.return_value = [
        {
            "commodity_id": 1,
            "census_state_id": 8,
            "market_id": 255,
            "date": "2026-10-02",
            "quantity": 150.0,
        }
    ]

    registry = CedaMetadataRegistry(
        commodities={1: "Wheat"},
        states={8: "Punjab"},
        districts={(8, 104): "Ludhiana"},
        markets={255: "Khanna"},
    )

    with patch("app.services.ceda_service.ingest_market_records") as mock_ingest:
        mock_ingest.return_value = {
            "inserted": 1,
            "skipped_duplicate": 0,
            "errors": [],
            "errors_count": 0,
        }
        result = sync_ceda_to_market_data(
            session=db,
            client=mock_client,
            commodity_id=1,
            state_id=8,
            from_date="2026-10-02",
            to_date="2026-10-02",
            metadata_registry=registry,
            dry_run=False,
        )

        assert mock_ingest.called
        assert result["valid_records"] == 1
        assert result["inserted"] == 1
        assert result["mapped_crops"] == 1
        assert result["errors_count"] == 0
