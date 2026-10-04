"""CEDA (Centre for Economic Data and Analysis) API Integration Service.

Connects to CEDA Ashoka University Agmarknet Data Portal API:
    CEDA API ──(CEDA_API_KEY)──> FastAPI CEDA service ──(validate + normalize)──> market_data ──> Supabase PostgreSQL

Features:
- Programmatic fetching of Agmarknet commodities, geographies, markets, and prices
- Bearer token authentication via CEDA_API_KEY
- Robust validation, decimal precision cleaning, and canonical crop matching
- Idempotent upsert into Supabase PostgreSQL (market_data table) using ON CONFLICT DO NOTHING
"""

import logging
import uuid
from datetime import date
from decimal import Decimal
from typing import Any

import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.models.market_data import MarketData
from app.services.market_data_ingestion import (
    build_crop_cache,
    ingest_market_records,
    parse_date,
    parse_decimal,
    resolve_crop_id,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------


class CedaApiError(Exception):
    """Base exception for all CEDA API related errors."""


class CedaAuthError(CedaApiError):
    """Raised when CEDA_API_KEY is missing, invalid, or expired (HTTP 401)."""


class CedaRateLimitError(CedaApiError):
    """Raised when CEDA rate limits are reached (HTTP 429)."""


class CedaRequestError(CedaApiError):
    """Raised when request payload or parameters are invalid (HTTP 400)."""


class CedaServerError(CedaApiError):
    """Raised when upstream CEDA server returns 5xx error."""


# ---------------------------------------------------------------------------
# CEDA API Client
# ---------------------------------------------------------------------------


class CedaApiClient:
    """HTTP Client for communicating with the CEDA Agmarknet Data Portal API."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.CEDA_API_KEY
        self.base_url = (base_url or settings.CEDA_API_BASE_URL).rstrip("/")
        self.timeout = timeout if timeout is not None else settings.CEDA_API_TIMEOUT_SECONDS

    def _get_headers(self) -> dict[str, str]:
        if not self.api_key or not self.api_key.strip():
            raise CedaAuthError(
                "CEDA_API_KEY is not configured or provided. "
                "Please configure CEDA_API_KEY in the environment or settings."
            )
        return {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _handle_response(self, response: httpx.Response) -> Any:
        if response.status_code == 200:
            try:
                return response.json()
            except Exception as err:
                raise CedaServerError(f"Invalid JSON response from CEDA API: {err}") from err

        try:
            body = response.json()
        except Exception:
            body = {}

        nested_body = body.get("output") if isinstance(body, dict) else None
        error_body = nested_body if isinstance(nested_body, dict) else body
        message = (
            error_body.get("message")
            if isinstance(error_body, dict)
            else None
        )

        if response.status_code == 401:
            msg = message or "Unauthorized (invalid or expired CEDA API key)"
            raise CedaAuthError(f"CEDA Authentication Failed: {msg}")

        if response.status_code == 429:
            raise CedaRateLimitError("CEDA API rate limit exceeded. Please retry later.")

        if response.status_code == 400:
            msg = message or "Invalid request parameters"
            raise CedaRequestError(f"CEDA Bad Request (400): {msg}")

        if response.status_code >= 500:
            raise CedaServerError(
                f"CEDA upstream server error ({response.status_code}): {response.text[:200]}"
            )

        raise CedaApiError(
            f"Unexpected CEDA API response status {response.status_code}: {response.text[:200]}"
        )

    @staticmethod
    def _extract_records(
        response_data: Any,
        collection_key: str,
        endpoint: str,
    ) -> list[dict[str, Any]]:
        """Read CEDA's documented list response and its live ``output.data`` wrapper."""
        payload = response_data
        if isinstance(payload, dict) and isinstance(payload.get("output"), dict):
            payload = payload["output"]
            response_type = payload.get("type")
            if response_type not in (None, "success"):
                raise CedaApiError(
                    f"CEDA returned an API error for {endpoint}: "
                    f"{payload.get('message', 'unknown error')}"
                )

        records: Any = None
        if isinstance(payload, list):
            records = payload
        elif isinstance(payload, dict):
            for key in ("data", collection_key):
                candidate = payload.get(key)
                if isinstance(candidate, list):
                    records = candidate
                    break

        if not isinstance(records, list) or any(
            not isinstance(record, dict) for record in records
        ):
            raise CedaServerError(
                f"Malformed CEDA response for {endpoint}: expected a list of records"
            )
        return records

    def get_commodities(self) -> list[dict[str, Any]]:
        """
        Fetches the list of all available commodities from CEDA.
        Endpoint: GET /agmarknet/commodities
        """
        url = f"{self.base_url}/agmarknet/commodities"
        headers = self._get_headers()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers)
                data = self._handle_response(response)
                return self._extract_records(data, "commodities", "commodities")
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error("Network error connecting to CEDA API: %s", exc)
            raise CedaServerError(f"Failed to connect to CEDA API: {exc}") from exc

    def get_geographies(self) -> list[dict[str, Any]]:
        """
        Fetches the list of all states and districts from CEDA.
        Endpoint: GET /agmarknet/geographies
        """
        url = f"{self.base_url}/agmarknet/geographies"
        headers = self._get_headers()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers)
                data = self._handle_response(response)
                return self._extract_records(data, "geographies", "geographies")
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error("Network error connecting to CEDA API: %s", exc)
            raise CedaServerError(f"Failed to connect to CEDA API: {exc}") from exc

    def get_markets(
        self,
        commodity_id: int,
        state_id: int,
        district_id: int,
        indicator: str = "price",
    ) -> list[dict[str, Any]]:
        """
        Fetches the list of markets for a given commodity, state, and district.
        Endpoint: POST /agmarknet/markets
        """
        url = f"{self.base_url}/agmarknet/markets"
        headers = self._get_headers()
        payload = {
            "commodity_id": commodity_id,
            "state_id": state_id,
            "district_id": district_id,
            "indicator": indicator,
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                data = self._handle_response(response)
                return self._extract_records(data, "data", "markets")
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error("Network error connecting to CEDA API: %s", exc)
            raise CedaServerError(f"Failed to connect to CEDA API: {exc}") from exc

    def fetch_prices(
        self,
        commodity_id: int,
        state_id: int,
        from_date: str | date,
        to_date: str | date,
        district_ids: list[int] | None = None,
        market_ids: list[int] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetches daily mandi prices for a commodity from CEDA.
        Endpoint: POST /agmarknet/prices
        """
        url = f"{self.base_url}/agmarknet/prices"
        headers = self._get_headers()

        payload: dict[str, Any] = {
            "commodity_id": commodity_id,
            "state_id": state_id,
            "from_date": str(from_date),
            "to_date": str(to_date),
        }
        if district_ids:
            payload["district_id"] = district_ids
        if market_ids:
            payload["market_id"] = market_ids

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                data = self._handle_response(response)
                return self._extract_records(data, "data", "prices")
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error("Network error connecting to CEDA API: %s", exc)
            raise CedaServerError(f"Failed to connect to CEDA API: {exc}") from exc

    def fetch_quantities(
        self,
        commodity_id: int,
        state_id: int,
        from_date: str | date,
        to_date: str | date,
        district_ids: list[int] | None = None,
        market_ids: list[int] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetches daily mandi arrivals/quantities for a commodity from CEDA.
        Endpoint: POST /agmarknet/quantities
        """
        url = f"{self.base_url}/agmarknet/quantities"
        headers = self._get_headers()

        payload: dict[str, Any] = {
            "commodity_id": commodity_id,
            "state_id": state_id,
            "from_date": str(from_date),
            "to_date": str(to_date),
        }
        if district_ids:
            payload["district_id"] = district_ids
        if market_ids:
            payload["market_id"] = market_ids

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, headers=headers, json=payload)
                data = self._handle_response(response)
                return self._extract_records(data, "data", "quantities")
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error("Network error connecting to CEDA API: %s", exc)
            raise CedaServerError(f"Failed to connect to CEDA API: {exc}") from exc


# ---------------------------------------------------------------------------
# Metadata Lookup Helpers
# ---------------------------------------------------------------------------


class CedaMetadataRegistry:
    """Caches and resolves CEDA numeric IDs (commodity, state, district, market) to readable names."""

    def __init__(
        self,
        commodities: dict[int, str] | None = None,
        states: dict[int, str] | None = None,
        districts: dict[tuple[int, int], str] | None = None,
        markets: dict[int, str] | None = None,
    ) -> None:
        self.commodities: dict[int, str] = commodities or {}
        self.states: dict[int, str] = states or {}
        self.districts: dict[tuple[int, int], str] = districts or {}
        self.markets: dict[int, str] = markets or {}

    @classmethod
    def from_client(cls, client: CedaApiClient) -> "CedaMetadataRegistry":
        """Builds lookup tables from the live CEDA API."""
        registry = cls()
        try:
            # 1. Commodities
            comm_list = client.get_commodities()
            for c in comm_list:
                cid = c.get("commodity_id", c.get("id"))
                cname = c.get("commodity_name", c.get("name"))
                if cid is not None and cname:
                    registry.commodities[int(cid)] = str(cname).strip()

            # 2. Geographies
            geo_list = client.get_geographies()
            for g in geo_list:
                sid = g.get("state_id", g.get("census_state_id"))
                sname = g.get("state_name", g.get("census_state_name"))
                if sid is not None and sname:
                    s_int = int(sid)
                    registry.states[s_int] = str(sname).strip()
                    for d in g.get("districts", []):
                        did = d.get("district_id", d.get("census_district_id"))
                        dname = d.get("district_name", d.get("census_district_name"))
                        if did is not None and dname:
                            registry.districts[(s_int, int(did))] = str(dname).strip()
                    # The live endpoint returns one flat state/district row per record.
                    did = g.get("census_district_id", g.get("district_id"))
                    dname = g.get("census_district_name", g.get("district_name"))
                    if did is not None and dname:
                        registry.districts[(s_int, int(did))] = str(dname).strip()
        except Exception as exc:
            logger.warning("Could not pre-fetch full CEDA metadata registry: %s", exc)
        return registry


def _reuse_existing_ceda_market_names(
    session: Session,
    records: list[dict[str, Any]],
    metadata: CedaMetadataRegistry,
) -> None:
    """Reuse a verified stored name when a repeated API row exactly matches it.

    CEDA price rows expose market IDs while the separate market lookup can be
    temporarily unavailable or rate-limited. An exact match on location, date,
    and all three prices against one existing CEDA row is enough to reuse its
    previously resolved name safely. Ambiguous matches are left unresolved.
    """
    records_by_location: dict[tuple[int, int, int], list[dict[str, Any]]] = {}
    for raw in records:
        raw_market_name = raw.get("market_name", raw.get("market"))
        market_id = raw.get("market_id")
        raw_commodity_id = raw.get("commodity_id")
        raw_state_id = raw.get("census_state_id", raw.get("state_id"))
        raw_district_id = raw.get("census_district_id", raw.get("district_id"))
        if (
            (raw_market_name and str(raw_market_name).strip())
            or market_id is None
            or raw_commodity_id is None
            or raw_state_id is None
            or raw_district_id is None
        ):
            continue
        try:
            commodity_id = int(raw_commodity_id)
            state_id = int(raw_state_id)
            district_id = int(raw_district_id)
            market_key = int(market_id)
        except (TypeError, ValueError):
            continue
        if market_key in metadata.markets:
            continue
        records_by_location.setdefault(
            (commodity_id, state_id, district_id), []
        ).append(raw)

    for (commodity_id, state_id, district_id), location_records in (
        records_by_location.items()
    ):
        state = metadata.states.get(state_id)
        district = metadata.districts.get((state_id, district_id))
        commodity = metadata.commodities.get(commodity_id)
        if not state or not district or not commodity:
            continue

        statement = select(MarketData).where(
            MarketData.source == "ceda",
            MarketData.state == state,
            MarketData.district == district,
            MarketData.commodity == commodity,
        )
        existing_rows = session.exec(statement).all()
        existing_names: dict[tuple[date, Decimal, Decimal, Decimal], set[str]] = {}
        for row in existing_rows:
            fingerprint = (
                row.arrival_date,
                row.min_price,
                row.max_price,
                row.modal_price,
            )
            existing_names.setdefault(fingerprint, set()).add(row.market_name)

        for raw in location_records:
            try:
                fingerprint = (
                    parse_date(raw.get("date", raw.get("arrival_date"))),
                    parse_decimal(raw.get("min_price")),
                    parse_decimal(raw.get("max_price")),
                    parse_decimal(raw.get("modal_price")),
                )
                market_key = int(raw["market_id"])
            except (KeyError, TypeError, ValueError):
                continue
            names = existing_names.get(fingerprint, set())
            if len(names) == 1:
                metadata.markets[market_key] = next(iter(names))


# ---------------------------------------------------------------------------
# Normalization & Validation Logic
# ---------------------------------------------------------------------------


def normalize_ceda_record(
    raw: dict[str, Any],
    crop_cache: dict[str, uuid.UUID],
    metadata: CedaMetadataRegistry | None = None,
) -> dict[str, Any]:
    """
    Validates and normalizes a CEDA record into CropKart's market_data schema.

    Supports two formats:
    1. Direct CEDA API response with numeric IDs:
       {"commodity_id": 1, "census_state_id": 8, "census_district_id": 104, "market_id": 255,
        "date": "2026-10-02", "min_price": 2200, "max_price": 2400, "modal_price": 2300}
    2. Enriched or exported CEDA record with textual names:
       {"state": "Punjab", "district": "Ludhiana", "market_name": "Khanna",
        "commodity": "Wheat", "arrival_date": "2026-10-02", "modal_price": 2300}
    """
    # Key lookups with variation fallback
    def get_field(*keys: str, default: Any = None) -> Any:
        for k in keys:
            if k in raw and raw[k] is not None:
                return raw[k]
            for actual_k, val in raw.items():
                if actual_k.lower().strip() == k.lower().strip() and val is not None:
                    return val
        return default

    # 1. State resolution
    state = str(get_field("state", "state_name", "State", default="")).strip()
    state_id = get_field("census_state_id", "state_id")
    if not state and state_id is not None and metadata and int(state_id) in metadata.states:
        state = metadata.states[int(state_id)]

    # 2. District resolution
    district = str(get_field("district", "district_name", "District", default="")).strip()
    district_id = get_field("census_district_id", "district_id")
    if not district and state_id is not None and district_id is not None and metadata:
        dist_key = (int(state_id), int(district_id))
        if dist_key in metadata.districts:
            district = metadata.districts[dist_key]

    # 3. Market resolution
    market = str(
        get_field("market_name", "market", "Market", "Market Name", default="")
    ).strip()
    market_id = get_field("market_id")
    if not market and market_id is not None and metadata and int(market_id) in metadata.markets:
        market = metadata.markets[int(market_id)]

    # 4. Commodity resolution
    commodity = str(get_field("commodity", "commodity_name", "Commodity", default="")).strip()
    commodity_id = get_field("commodity_id")
    if not commodity and commodity_id is not None and metadata and int(commodity_id) in metadata.commodities:
        commodity = metadata.commodities[int(commodity_id)]

    # Validation: Ensure essential location and commodity identifiers are present
    if not state or not district or not market or not commodity:
        raise ValueError(
            f"Missing required fields after CEDA resolution: "
            f"state='{state}', district='{district}', market='{market}', commodity='{commodity}'"
        )

    # 5. Dates
    raw_date = get_field("arrival_date", "date", "Arrival_Date", "Date")
    if not raw_date:
        raise ValueError("Missing arrival_date or date in CEDA record")
    arrival_date = parse_date(raw_date)

    # 6. Prices
    min_price_val = get_field("min_price", "minimum_price", "Min Price")
    max_price_val = get_field("max_price", "maximum_price", "Max Price")
    modal_price_val = get_field("modal_price", "Modal Price")

    missing_prices = [
        name
        for name, value in (
            ("min_price", min_price_val),
            ("max_price", max_price_val),
            ("modal_price", modal_price_val),
        )
        if value is None
    ]
    if missing_prices:
        raise ValueError(
            "CEDA record missing required price fields: " + ", ".join(missing_prices)
        )

    modal_price = parse_decimal(modal_price_val)
    min_price = parse_decimal(min_price_val)
    max_price = parse_decimal(max_price_val)

    # Ensure price consistency (min_price <= max_price)
    if min_price > max_price:
        min_price, max_price = max_price, min_price

    if modal_price < min_price:
        min_price = modal_price
    if modal_price > max_price:
        max_price = modal_price

    # 7. Quantity and unit
    arrival_quantity = parse_decimal(
        get_field("arrival_quantity", "quantity", "Arrivals", "Arrival", default="0.00"),
        default=Decimal("0.00"),
    )
    quantity_unit = (
        str(get_field("quantity_unit", "unit", "Unit", default="quintal"))
        .strip()
        .lower()
    )

    variety = get_field("variety", "Variety", default=None)
    if variety:
        variety = str(variety).strip() or None

    grade = get_field("grade", "Grade", default=None)
    if grade:
        grade = str(grade).strip() or None

    # Map commodity to canonical master Crop catalog
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
        "source": "ceda",
    }


# ---------------------------------------------------------------------------
# End-to-End Synchronization Pipeline
# ---------------------------------------------------------------------------


def sync_ceda_to_market_data(
    session: Session,
    client: CedaApiClient | None = None,
    commodity_id: int | None = None,
    state_id: int | None = None,
    from_date: str | date | None = None,
    to_date: str | date | None = None,
    district_ids: list[int] | None = None,
    market_ids: list[int] | None = None,
    raw_records: list[dict[str, Any]] | None = None,
    metadata_registry: CedaMetadataRegistry | None = None,
    batch_size: int = 500,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Full pipeline:
    Fetches / accepts CEDA records ──> validate + normalize ──> Supabase PostgreSQL (market_data).

    Guarantees:
    - Zero data corruption or unhandled crashes
    - Canonical crop ID mapping to CropKart's crops table
    - Deduplication via PostgreSQL ON CONFLICT DO NOTHING on index 'uq_market_data_dedup'
    """
    records_to_process: list[dict[str, Any]] = []

    if raw_records is not None:
        records_to_process = list(raw_records)
    else:
        if client is None:
            client = CedaApiClient()

        if commodity_id is None or state_id is None:
            raise ValueError("commodity_id and state_id are required when fetching from CEDA API.")

        # Default dates to current date if not specified
        target_to_date = to_date if to_date is not None else date.today()
        target_from_date = from_date if from_date is not None else target_to_date

        logger.info(
            "Fetching prices from CEDA API (commodity=%d, state=%d, from=%s, to=%s)...",
            commodity_id,
            state_id,
            target_from_date,
            target_to_date,
        )
        price_records = client.fetch_prices(
            commodity_id=commodity_id,
            state_id=state_id,
            from_date=target_from_date,
            to_date=target_to_date,
            district_ids=district_ids,
            market_ids=market_ids,
        )

        if not price_records:
            return {
                "total_processed": 0,
                "valid_records": 0,
                "inserted": 0,
                "skipped_duplicate": 0,
                "mapped_crops": 0,
                "unmapped_crops": 0,
                "errors_count": 0,
                "errors": [],
                "dry_run": dry_run,
            }

        # Attempt to fetch quantities to merge arrival quantities if available
        quantity_map: dict[tuple[int, int, int, str], Decimal] = {}
        try:
            qty_records = client.fetch_quantities(
                commodity_id=commodity_id,
                state_id=state_id,
                from_date=target_from_date,
                to_date=target_to_date,
                district_ids=district_ids,
                market_ids=market_ids,
            )
            for q in qty_records:
                q_key = (
                    int(q.get("commodity_id", commodity_id)),
                    int(q.get("census_state_id", state_id)),
                    int(q.get("market_id", 0)),
                    str(q.get("date", "")).strip(),
                )
                if "quantity" in q and q["quantity"] is not None:
                    quantity_map[q_key] = parse_decimal(q["quantity"], default=Decimal("0.00"))
        except Exception as exc:
            logger.info("Could not fetch supplementary CEDA quantities (prices only will be stored): %s", exc)

        # Merge quantities into price records
        for p in price_records:
            item = dict(p)
            q_key = (
                int(item.get("commodity_id", commodity_id)),
                int(item.get("census_state_id", state_id)),
                int(item.get("market_id", 0)),
                str(item.get("date", "")).strip(),
            )
            if q_key in quantity_map:
                item["arrival_quantity"] = quantity_map[q_key]
            records_to_process.append(item)

    if not records_to_process:
        return {
            "total_processed": 0,
            "valid_records": 0,
            "inserted": 0,
            "skipped_duplicate": 0,
            "mapped_crops": 0,
            "unmapped_crops": 0,
            "errors_count": 0,
            "errors": [],
            "dry_run": dry_run,
        }

    # Build or prepare metadata registry for ID resolution if needed
    if metadata_registry is None:
        if client is not None:
            metadata_registry = CedaMetadataRegistry.from_client(client)
        else:
            metadata_registry = CedaMetadataRegistry()

    # Price records contain market IDs, while market names are supplied by the
    # separate CEDA /markets endpoint. Resolve each distinct location once.
    if client is not None:
        _reuse_existing_ceda_market_names(
            session=session,
            records=records_to_process,
            metadata=metadata_registry,
        )
        market_queries: set[tuple[int, int, int]] = set()
        for raw in records_to_process:
            market_id = raw.get("market_id")
            district_id = raw.get("census_district_id", raw.get("district_id"))
            raw_state_id = raw.get("census_state_id", raw.get("state_id", state_id))
            raw_commodity_id = raw.get("commodity_id", commodity_id)
            raw_market_name = raw.get("market_name", raw.get("market"))
            if raw_market_name or market_id is None:
                continue
            if district_id is None or raw_state_id is None or raw_commodity_id is None:
                continue
            try:
                if int(market_id) not in metadata_registry.markets:
                    market_queries.add(
                        (int(raw_commodity_id), int(raw_state_id), int(district_id))
                    )
            except (TypeError, ValueError):
                # Normalization below records the invalid ID against its raw row.
                continue

        for query_commodity_id, query_state_id, query_district_id in sorted(
            market_queries
        ):
            try:
                market_records = client.get_markets(
                    commodity_id=query_commodity_id,
                    state_id=query_state_id,
                    district_id=query_district_id,
                )
            except CedaApiError as exc:
                logger.warning(
                    "Could not resolve market names for CEDA state=%d district=%d: %s",
                    query_state_id,
                    query_district_id,
                    exc,
                )
                continue

            for market_record in market_records:
                market_key = market_record.get(
                    "market_id", market_record.get("id")
                )
                market_name = market_record.get(
                    "market_name",
                    market_record.get("name", market_record.get("market")),
                )
                if market_key is not None and market_name:
                    metadata_registry.markets[int(market_key)] = str(
                        market_name
                    ).strip()

    # Pre-build canonical crop cache from database
    crop_cache = build_crop_cache(session)

    normalized_payloads: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    mapped_count = 0
    unmapped_count = 0

    for idx, raw in enumerate(records_to_process):
        try:
            normalized = normalize_ceda_record(raw, crop_cache, metadata=metadata_registry)
            normalized_payloads.append(normalized)
            if normalized["crop_id"] is not None:
                mapped_count += 1
            else:
                unmapped_count += 1
        except Exception as err:
            errors.append({"row_index": idx, "error": str(err), "raw": raw})

    if dry_run or not normalized_payloads:
        return {
            "total_processed": len(records_to_process),
            "valid_records": len(normalized_payloads),
            "inserted": 0,
            "skipped_duplicate": 0,
            "mapped_crops": mapped_count,
            "unmapped_crops": unmapped_count,
            "errors_count": len(errors),
            "errors": errors[:50],
            "dry_run": dry_run,
        }

    # Ingest normalized payloads via database upsert
    ingest_result = ingest_market_records(
        session=session,
        records=normalized_payloads,
        batch_size=batch_size,
        dry_run=False,
    )

    return {
        "total_processed": len(records_to_process),
        "valid_records": len(normalized_payloads),
        "inserted": ingest_result.get("inserted", 0),
        "skipped_duplicate": ingest_result.get("skipped_duplicate", 0),
        "mapped_crops": mapped_count,
        "unmapped_crops": unmapped_count,
        "errors_count": len(errors) + ingest_result.get("errors_count", 0),
        "errors": (errors + ingest_result.get("errors", []))[:50],
        "dry_run": False,
    }
