"""Agmarknet and Mandi Market Data Ingestion Service.

Parses, cleans, normalizes, and ingests agricultural market price records
from Agmarknet / Data.gov.in / APMC sources into CropKart's market_data table.
Preserves raw commodity names while mapping known commodities to master Crop catalog.
Guarantees idempotency and deduplication according to database constraints.
"""

import csv
import io
import json
import logging
import re
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, BinaryIO, TextIO

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session, select

from app.models.crop import Crop
from app.models.market_data import MarketData

logger = logging.getLogger(__name__)

# Standard commodity mapping to normalize common Agmarknet/mandi names to master crops
COMMODITY_MAPPINGS: dict[str, str] = {
    # Wheat
    "wheat": "Wheat",
    "gehun": "Wheat",
    "gehu": "Wheat",
    "kanak": "Wheat",
    "wheat(atta)": "Wheat",
    "wheat (atta)": "Wheat",
    # Paddy / Rice
    "paddy": "Paddy/Rice",
    "rice": "Paddy/Rice",
    "dhan": "Paddy/Rice",
    "chawal": "Paddy/Rice",
    "paddy(dhan)": "Paddy/Rice",
    "paddy(dhan)(basmati)": "Paddy/Rice",
    "paddy (dhan)": "Paddy/Rice",
    "paddy (dhan) (basmati)": "Paddy/Rice",
    "basmati": "Paddy/Rice",
    "basmati rice": "Paddy/Rice",
    # Onion
    "onion": "Onion",
    "pyaz": "Onion",
    "kanda": "Onion",
    "onion red": "Onion",
    "onion white": "Onion",
    "onion (red)": "Onion",
    "onion (white)": "Onion",
    # Potato
    "potato": "Potato",
    "aloo": "Potato",
    "alu": "Potato",
    "jyoti": "Potato",
    "potato (jyoti)": "Potato",
    # Tomato
    "tomato": "Tomato",
    "tamatar": "Tomato",
    "hybrid tomato": "Tomato",
    "local tomato": "Tomato",
    "tomato (hybrid)": "Tomato",
    "tomato (local)": "Tomato",
    # Maize
    "maize": "Maize",
    "makka": "Maize",
    "corn": "Maize",
    "bhutta": "Maize",
    # Soybean
    "soybean": "Soybean",
    "soyabean": "Soybean",
    "soya": "Soybean",
    "soya bean": "Soybean",
    # Cotton
    "cotton": "Cotton",
    "kapas": "Cotton",
    "narma": "Cotton",
    "cotton (unginned)": "Cotton",
    "cotton (ginned)": "Cotton",
    # Chilli
    "chilli": "Chilli",
    "chili": "Chilli",
    "mirch": "Chilli",
    "green chilli": "Chilli",
    "red chilli": "Chilli",
    "dry chillies": "Chilli",
    "chillies(green)": "Chilli",
    "chillies (green)": "Chilli",
    # Turmeric
    "turmeric": "Turmeric",
    "haldi": "Turmeric",
    "turmeric (raw)": "Turmeric",
    # Gram
    "gram": "Gram",
    "chana": "Gram",
    "bengal gram": "Gram",
    "bengal gram(gram)": "Gram",
    "bengal gram (gram)": "Gram",
    "chickpea": "Gram",
    "chana dal": "Gram",
    # Pigeon Pea
    "pigeon pea": "Pigeon Pea",
    "arhar": "Pigeon Pea",
    "arhar (tur/red gram)": "Pigeon Pea",
    "tur": "Pigeon Pea",
    "toor": "Pigeon Pea",
    "red gram": "Pigeon Pea",
    "arhar dal": "Pigeon Pea",
    # Groundnut
    "groundnut": "Groundnut",
    "peanut": "Groundnut",
    "moongphali": "Groundnut",
    "groundnut pods": "Groundnut",
    "groundnut (split)": "Groundnut",
    # Sugarcane
    "sugarcane": "Sugarcane",
    "ganna": "Sugarcane",
}


def build_crop_cache(session: Session) -> dict[str, uuid.UUID]:
    """
    Builds a case-insensitive lookup table mapping canonical crop names
    from the database to their UUIDs.
    """
    statement = select(Crop)
    crops = session.exec(statement).all()
    cache: dict[str, uuid.UUID] = {}
    for c in crops:
        cache[c.name.strip().lower()] = c.id
    return cache


def resolve_crop_id(
    commodity: str,
    crop_cache: dict[str, uuid.UUID],
) -> uuid.UUID | None:
    """
    Resolves a raw commodity string to a canonical Crop ID.
    Returns None if no confident match is found, ensuring data integrity.
    """
    cleaned = commodity.strip().lower()

    # 1. Direct match with canonical crop name
    if cleaned in crop_cache:
        return crop_cache[cleaned]

    # 2. Match through commodity alias dictionary
    mapped_name = COMMODITY_MAPPINGS.get(cleaned)
    if mapped_name and mapped_name.lower() in crop_cache:
        return crop_cache[mapped_name.lower()]

    # 3. Normalized regex match (stripping punctuation/parentheses)
    normalized = re.sub(r"[^a-zA-Z0-9\s]", " ", cleaned)
    normalized = " ".join(normalized.split())
    if normalized in COMMODITY_MAPPINGS:
        canonical = COMMODITY_MAPPINGS[normalized]
        if canonical.lower() in crop_cache:
            return crop_cache[canonical.lower()]

    # Unmapped - caller will preserve raw commodity name with crop_id=None
    return None


def parse_date(date_val: Any) -> date:
    """
    Parses various date formats common in Agmarknet and Data.gov.in datasets.
    Supports DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD/MMM/YYYY, and datetime objects.
    """
    if isinstance(date_val, date) and not isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()

    date_str = str(date_val).strip()

    # CEDA price and quantity records use ISO timestamps even though Swagger
    # describes the field as a date (for example 2025-03-03T00:00:00.000Z).
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    formats = (
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%d %b %Y",
        "%d-%b-%Y",
        "%d/%b/%Y",
        "%Y/%m/%d",
    )
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue

    raise ValueError(f"Unable to parse date string: {date_val}")


def parse_decimal(val: Any, default: Decimal | None = None) -> Decimal:
    """Safely converts string or number to Decimal, stripping commas and currency symbols."""
    if val is None or val == "":
        if default is not None:
            return default
        raise ValueError("Decimal value cannot be empty")

    cleaned = str(val).replace(",", "").replace("Rs.", "").replace("₹", "").strip()
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError) as err:
        if default is not None:
            return default
        raise ValueError(f"Invalid decimal value: {val}") from err


def normalize_record(
    raw: dict[str, Any],
    crop_cache: dict[str, uuid.UUID],
    default_source: str = "agmarknet",
) -> dict[str, Any]:
    """
    Normalizes a single raw record from Agmarknet / APMC into the schema
    expected by CropKart's market_data table.
    """

    # Key lookups with case-insensitive / variation fallback
    def get_field(*keys: str, default: Any = None) -> Any:
        for k in keys:
            if k in raw and raw[k] is not None:
                return raw[k]
            # Try lowercased keys
            for actual_k, val in raw.items():
                if actual_k.lower().strip() == k.lower().strip() and val is not None:
                    return val
        return default

    state = str(get_field("state", "State", "state_name", default="")).strip()
    district = str(
        get_field("district", "District", "district_name", default="")
    ).strip()
    market = str(
        get_field(
            "market_name",
            "market",
            "Market",
            "Market Name",
            "Market_x0020_Name",
            default="",
        )
    ).strip()
    commodity = str(
        get_field("commodity", "Commodity", "commodity_name", default="")
    ).strip()

    if not state or not district or not market or not commodity:
        raise ValueError(
            f"Missing required location/commodity fields: state='{state}', district='{district}', market='{market}', commodity='{commodity}'"
        )

    variety = get_field("variety", "Variety", "variety_name", default=None)
    if variety:
        variety = str(variety).strip() or None

    grade = get_field("grade", "Grade", "grade_name", default=None)
    if grade:
        grade = str(grade).strip() or None

    raw_date = get_field("arrival_date", "Arrival_Date", "arrivalDate", "Date", "date")
    if not raw_date:
        raise ValueError("Missing arrival_date field")
    arrival_date = parse_date(raw_date)

    min_price = parse_decimal(
        get_field(
            "min_price",
            "Min_x0020_Price",
            "Min Price",
            "Min Price (Rs./Quintal)",
            "minimum_price",
        )
    )
    max_price = parse_decimal(
        get_field(
            "max_price",
            "Max_x0020_Price",
            "Max Price",
            "Max Price (Rs./Quintal)",
            "maximum_price",
        )
    )
    modal_price = parse_decimal(
        get_field(
            "modal_price",
            "Modal_x0020_Price",
            "Modal Price",
            "Modal Price (Rs./Quintal)",
            "modal_price",
        )
    )

    arrival_quantity = parse_decimal(
        get_field(
            "arrival_quantity",
            "Arrivals (Tonnes)",
            "Arrival",
            "Arrival_Quantity",
            "quantity",
            default="0.00",
        ),
        default=Decimal("0.00"),
    )

    quantity_unit = (
        str(get_field("quantity_unit", "Unit", "unit", default="quintal"))
        .strip()
        .lower()
    )
    source = str(get_field("source", "Source", default=default_source)).strip().lower()

    # Map commodity to master crop ID
    crop_id = resolve_crop_id(commodity, crop_cache)

    return {
        "id": uuid.uuid4(),
        "crop_id": crop_id,
        "state": state,
        "district": district,
        "market_name": market,
        "commodity": commodity,
        "variety": variety,
        "grade": grade,
        "arrival_date": arrival_date,
        "arrival_quantity": arrival_quantity,
        "quantity_unit": quantity_unit,
        "min_price": min_price,
        "max_price": max_price,
        "modal_price": modal_price,
        "source": source,
    }


def ingest_market_records(
    session: Session,
    records: list[dict[str, Any]],
    batch_size: int = 500,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Ingests a list of raw mandi records into the market_data table.
    Ensures idempotency via PostgreSQL ON CONFLICT DO NOTHING on index 'uq_market_data_dedup'.
    """
    crop_cache = build_crop_cache(session)

    valid_payloads: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    mapped_count = 0
    unmapped_count = 0

    for idx, raw in enumerate(records):
        try:
            payload = normalize_record(raw, crop_cache)
            valid_payloads.append(payload)
            if payload["crop_id"] is not None:
                mapped_count += 1
            else:
                unmapped_count += 1
        except Exception as err:
            errors.append({"row_index": idx, "error": str(err), "raw": raw})

    if dry_run or not valid_payloads:
        return {
            "total_processed": len(records),
            "valid_records": len(valid_payloads),
            "inserted": 0,
            "mapped_crops": mapped_count,
            "unmapped_crops": unmapped_count,
            "errors_count": len(errors),
            "errors": errors[:50],  # cap error reporting
            "dry_run": dry_run,
        }

    # Ingest in batches using PostgreSQL ON CONFLICT DO NOTHING
    inserted_count = 0
    for i in range(0, len(valid_payloads), batch_size):
        chunk = valid_payloads[i : i + batch_size]
        insert_stmt = pg_insert(MarketData).values(chunk)
        insert_stmt = insert_stmt.on_conflict_do_nothing()
        stmt = insert_stmt.returning(MarketData.id)  # type: ignore[call-overload]
        result = session.exec(stmt)
        inserted_chunk = len(list(result.all()))
        inserted_count += inserted_chunk

    session.commit()

    return {
        "total_processed": len(records),
        "valid_records": len(valid_payloads),
        "inserted": inserted_count,
        "skipped_duplicate": len(valid_payloads) - inserted_count,
        "mapped_crops": mapped_count,
        "unmapped_crops": unmapped_count,
        "errors_count": len(errors),
        "errors": errors[:50],
        "dry_run": False,
    }


def parse_csv_data(file_content: str | TextIO | BinaryIO) -> list[dict[str, Any]]:
    """Reads a CSV file content or buffer and returns rows as dictionaries."""
    text_buffer: io.StringIO | TextIO
    if isinstance(file_content, bytes):
        text_buffer = io.StringIO(file_content.decode("utf-8-sig", errors="replace"))
    elif isinstance(file_content, str):
        text_buffer = io.StringIO(file_content)
    else:
        sample = file_content.read(0)
        if isinstance(sample, bytes):
            raw_content = file_content.read()
            if isinstance(raw_content, bytes):
                text_buffer = io.StringIO(
                    raw_content.decode("utf-8-sig", errors="replace")
                )
            else:
                text_buffer = io.StringIO(str(raw_content))
        else:
            text_buffer = file_content  # type: ignore[assignment]

    reader = csv.DictReader(text_buffer)
    return list(reader)


def parse_json_data(file_content: str | bytes) -> list[dict[str, Any]]:
    """Parses JSON content supporting either an array of objects or an Agmarknet API response wrapper."""
    if isinstance(file_content, bytes):
        file_content = file_content.decode("utf-8", errors="replace")

    data: Any = json.loads(file_content)
    if isinstance(data, list):
        return [dict(item) for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        # Look for standard wrapper keys e.g. records, data, results
        for key in ("records", "data", "results", "items"):
            if key in data and isinstance(data[key], list):
                return [dict(item) for item in data[key] if isinstance(item, dict)]
    raise ValueError("JSON data must be a list of records or contain a 'records' list.")
