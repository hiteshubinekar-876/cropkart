"""Unit tests for Agmarknet market data ingestion service."""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from app.services.market_data_ingestion import (
    ingest_market_records,
    normalize_record,
    parse_csv_data,
    parse_date,
    parse_decimal,
    parse_json_data,
    resolve_crop_id,
)


def test_parse_date_formats() -> None:
    """Tests parsing various date representations from Agmarknet."""
    assert parse_date("02/10/2026") == date(2026, 10, 2)
    assert parse_date("2026-10-02") == date(2026, 10, 2)
    assert parse_date("2025-03-03T00:00:00.000Z") == date(2025, 3, 3)
    assert parse_date("02-10-2026") == date(2026, 10, 2)
    assert parse_date("02 Oct 2026") == date(2026, 10, 2)
    assert parse_date(date(2026, 10, 2)) == date(2026, 10, 2)

    with pytest.raises(ValueError, match="Unable to parse date string"):
        parse_date("invalid-date-string")


def test_parse_decimal_formats() -> None:
    """Tests cleaning and parsing decimal prices and quantities."""
    assert parse_decimal("2,450.00") == Decimal("2450.00")
    assert parse_decimal("₹3,100.50") == Decimal("3100.50")
    assert parse_decimal("Rs. 1800") == Decimal("1800")
    assert parse_decimal(2500) == Decimal("2500")
    assert parse_decimal(None, default=Decimal("0.00")) == Decimal("0.00")
    assert parse_decimal("", default=Decimal("0.00")) == Decimal("0.00")

    with pytest.raises(ValueError, match="Invalid decimal value"):
        parse_decimal("not-a-number")


def test_resolve_crop_id_known_and_aliases() -> None:
    """Tests mapping of commodity names and regional aliases to master Crop IDs."""
    wheat_id = uuid.uuid4()
    paddy_id = uuid.uuid4()
    onion_id = uuid.uuid4()

    cache = {
        "wheat": wheat_id,
        "paddy/rice": paddy_id,
        "onion": onion_id,
    }

    # Exact canonical match
    assert resolve_crop_id("Wheat", cache) == wheat_id
    assert resolve_crop_id("wheat", cache) == wheat_id

    # Regional aliases
    assert resolve_crop_id("Gehun", cache) == wheat_id
    assert resolve_crop_id("Kanak", cache) == wheat_id
    assert resolve_crop_id("Wheat(Atta)", cache) == wheat_id

    assert resolve_crop_id("Paddy", cache) == paddy_id
    assert resolve_crop_id("Rice", cache) == paddy_id
    assert resolve_crop_id("Dhan", cache) == paddy_id
    assert resolve_crop_id("Paddy(Dhan)", cache) == paddy_id
    assert resolve_crop_id("Basmati Rice", cache) == paddy_id

    assert resolve_crop_id("Pyaz", cache) == onion_id
    assert resolve_crop_id("Kanda", cache) == onion_id
    assert resolve_crop_id("Onion Red", cache) == onion_id

    # Unmapped commodity (e.g. Avocado / Dragonfruit) -> must be None to preserve data integrity
    assert resolve_crop_id("Dragonfruit", cache) is None
    assert resolve_crop_id("Kiwi", cache) is None


def test_normalize_record_valid() -> None:
    """Tests normalization of raw Agmarknet record dictionary."""
    wheat_id = uuid.uuid4()
    cache = {"wheat": wheat_id}

    raw = {
        "State": "Madhya Pradesh",
        "District": "Indore",
        "Market": "Indore APMC",
        "Commodity": "Wheat",
        "Variety": "Lokwan",
        "Grade": "FAQ",
        "Arrival_Date": "02/10/2026",
        "Min Price": "2400.00",
        "Max Price": "2600.00",
        "Modal Price": "2500.00",
        "Arrivals (Tonnes)": "150.50",
    }

    normalized = normalize_record(raw, cache)
    assert normalized["state"] == "Madhya Pradesh"
    assert normalized["district"] == "Indore"
    assert normalized["market_name"] == "Indore APMC"
    assert normalized["commodity"] == "Wheat"
    assert normalized["variety"] == "Lokwan"
    assert normalized["grade"] == "FAQ"
    assert normalized["arrival_date"] == date(2026, 10, 2)
    assert normalized["min_price"] == Decimal("2400.00")
    assert normalized["max_price"] == Decimal("2600.00")
    assert normalized["modal_price"] == Decimal("2500.00")
    assert normalized["arrival_quantity"] == Decimal("150.50")
    assert normalized["crop_id"] == wheat_id


def test_normalize_record_missing_required_field() -> None:
    """Tests that records missing critical location or commodity fields raise ValueError."""
    cache: dict[str, uuid.UUID] = {}
    invalid_raw = {
        "State": "Maharashtra",
        "District": "Nashik",
        # Market is missing
        "Commodity": "Onion",
        "Arrival_Date": "02/10/2026",
        "Min Price": "1500",
        "Max Price": "2000",
        "Modal Price": "1800",
    }

    with pytest.raises(ValueError, match="Missing required location/commodity fields"):
        normalize_record(invalid_raw, cache)


def test_parse_csv_data() -> None:
    """Tests parsing CSV string into record dicts."""
    csv_text = (
        "State,District,Market,Commodity,Variety,Grade,Arrival_Date,Min Price,Max Price,Modal Price\n"
        "Punjab,Ludhiana,Khanna,Wheat,HD-2967,FAQ,02/10/2026,2275,2350,2300\n"
        "Maharashtra,Nashik,Lasalgaon,Onion,Red,FAQ,02/10/2026,1600,2400,2000\n"
    )
    rows = parse_csv_data(csv_text)
    assert len(rows) == 2
    assert rows[0]["State"] == "Punjab"
    assert rows[0]["Commodity"] == "Wheat"
    assert rows[1]["Market"] == "Lasalgaon"


def test_parse_json_data() -> None:
    """Tests parsing JSON records list and wrapped API response."""
    json_list = '[{"State": "Punjab", "Commodity": "Wheat"}]'
    parsed_list = parse_json_data(json_list)
    assert len(parsed_list) == 1
    assert parsed_list[0]["Commodity"] == "Wheat"

    json_wrapped = '{"records": [{"State": "Gujarat", "Commodity": "Cotton"}]}'
    parsed_wrapped = parse_json_data(json_wrapped)
    assert len(parsed_wrapped) == 1
    assert parsed_wrapped[0]["Commodity"] == "Cotton"


def test_market_data_ingestion_batches_and_counts_duplicates() -> None:
    """Valid unmapped CEDA rows are retained and DB conflict counts are reported."""
    session = MagicMock()
    first_batch_result = MagicMock()
    first_batch_result.all.return_value = [uuid.uuid4()]
    duplicate_batch_result = MagicMock()
    duplicate_batch_result.all.return_value = []
    session.exec.side_effect = [first_batch_result, duplicate_batch_result]

    raw = {
        "State": "Punjab",
        "District": "Ludhiana",
        "Market": "Khanna",
        "Commodity": "Unmapped crop",
        "Date": "2025-03-01",
        "Min Price": 2200,
        "Max Price": 2400,
        "Modal Price": 2300,
        "source": "ceda",
    }

    with (
        patch("app.services.market_data_ingestion.build_crop_cache", return_value={}),
        patch("app.services.market_data_ingestion.pg_insert") as pg_insert,
    ):
        insert = pg_insert.return_value
        insert.values.return_value.on_conflict_do_nothing.return_value.returning.return_value = "stmt"
        result = ingest_market_records(
            session=session,
            records=[raw, raw],
            batch_size=1,
        )

    assert result["total_processed"] == 2
    assert result["valid_records"] == 2
    assert result["inserted"] == 1
    assert result["skipped_duplicate"] == 1
    assert result["mapped_crops"] == 0
    assert result["unmapped_crops"] == 2
    assert session.exec.call_count == 2
    session.commit.assert_called_once()
