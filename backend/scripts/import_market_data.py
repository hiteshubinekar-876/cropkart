"""CLI Script for importing Agmarknet / Data.gov.in mandi market price data.

Usage:
    python scripts/import_market_data.py --file <path_to_file> [--format csv|json] [--dry-run] [--batch-size 500]

Important:
    Real Agmarknet/APMC market data only.
    Synthetic or placeholder data is never generated or inserted.
"""

import argparse
import logging
import sys
from pathlib import Path

# Add backend root to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.services.ceda_service import (  # noqa: E402
    CedaApiClient,
    CedaApiError,
    sync_ceda_to_market_data,
)
from app.services.market_data_ingestion import (  # noqa: E402
    ingest_market_records,
    parse_csv_data,
    parse_json_data,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("import_market_data")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest Agmarknet/CEDA mandi market records into CropKart database."
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Path to CSV or JSON data file containing real market mandi records.",
    )
    parser.add_argument(
        "--from-ceda",
        action="store_true",
        help="Fetch and sync live market data directly from CEDA API.",
    )
    parser.add_argument(
        "--commodity-id",
        type=int,
        default=None,
        help="CEDA commodity ID (required when --from-ceda is used).",
    )
    parser.add_argument(
        "--state-id",
        type=int,
        default=None,
        help="CEDA state ID (required when --from-ceda is used, or 0 for all-India).",
    )
    parser.add_argument(
        "--from-date",
        type=str,
        default=None,
        help="Start date YYYY-MM-DD for CEDA price query.",
    )
    parser.add_argument(
        "--to-date",
        type=str,
        default=None,
        help="End date YYYY-MM-DD for CEDA price query.",
    )
    parser.add_argument(
        "--district-id",
        type=int,
        action="append",
        dest="district_ids",
        default=None,
        help="Optional verified CEDA district ID; repeat to select multiple districts.",
    )
    parser.add_argument(
        "--market-id",
        type=int,
        action="append",
        dest="market_ids",
        default=None,
        help="Optional verified CEDA market ID; repeat to select multiple markets.",
    )
    parser.add_argument(
        "--format",
        choices=["csv", "json"],
        default=None,
        help="File format (auto-detected from file extension if omitted).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for database upsert (default: 500).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate records and test crop resolution without writing to database.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.file and not args.from_ceda:
        print("\n=======================================================")
        print("CropKart Mandi & CEDA Data Ingestion CLI")
        print("=======================================================\n")
        print("No input data source specified.")
        print("\nOption 1: Import real data from file:")
        print(
            "  python scripts/import_market_data.py --file <path_to_data.csv|json> [OPTIONS]\n"
        )
        print("Option 2: Sync live from CEDA API:")
        print(
            "  python scripts/import_market_data.py --from-ceda --commodity-id <ID> --state-id <ID> \\\n"
            "      --from-date YYYY-MM-DD --to-date YYYY-MM-DD [--dry-run]\n"
        )
        print("Options:")
        print("  --dry-run       Test parsing and normalization without DB writes")
        print("  --batch-size N  Batch insertion size (default: 500)")
        print("  --format        Explicit format: csv or json\n")
        print("Notice: Real Agmarknet / CEDA data only. No synthetic data will be created.")
        sys.exit(0)

    if args.from_ceda:
        if args.commodity_id is None or args.state_id is None:
            logger.error("--commodity-id and --state-id are required when using --from-ceda.")
            sys.exit(1)
        if not args.from_date or not args.to_date:
            logger.error("--from-date and --to-date (YYYY-MM-DD) are required when using --from-ceda.")
            sys.exit(1)

        client = CedaApiClient()
        try:
            with Session(engine) as session:
                logger.info(
                    "Starting CEDA sync (commodity=%d, state=%d, from=%s, to=%s, dry_run=%s)...",
                    args.commodity_id,
                    args.state_id,
                    args.from_date,
                    args.to_date,
                    args.dry_run,
                )
                result = sync_ceda_to_market_data(
                    session=session,
                    client=client,
                    commodity_id=args.commodity_id,
                    state_id=args.state_id,
                    from_date=args.from_date,
                    to_date=args.to_date,
                    district_ids=args.district_ids,
                    market_ids=args.market_ids,
                    batch_size=args.batch_size,
                    dry_run=args.dry_run,
                )
        except (CedaApiError, ValueError) as exc:
            logger.error("CEDA sync failed: %s", exc)
            sys.exit(1)

        print("\n================== CEDA Sync Report ==================")
        print(f"Total Processed:    {result['total_processed']}")
        print(f"Valid Records:      {result['valid_records']}")
        print(f"Inserted to DB:     {result['inserted']}")
        print(f"Duplicates Skipped: {result.get('skipped_duplicate', 0)}")
        print(f"Mapped to Master:   {result['mapped_crops']}")
        print(f"Raw / Unmapped:     {result['unmapped_crops']}")
        print(f"Errors Encountered: {result['errors_count']}")
        if result["errors_count"]:
            print("\nSample Errors:")
            for error_item in result.get("errors", [])[:5]:
                print(f"  Row {error_item['row_index']}: {error_item['error']}")
        if result["total_processed"] == 0:
            print("CEDA returned 0 records for the selected filters.")
        print("======================================================\n")
        if result["total_processed"] == 0:
            sys.exit(2)
        if result["errors_count"] and not result["valid_records"]:
            sys.exit(1)
        sys.exit(0)

    file_path = Path(args.file)
    if not file_path.exists():
        logger.error("File not found: %s", file_path)
        sys.exit(1)

    fmt = args.format
    if not fmt:
        ext = file_path.suffix.lower()
        if ext in (".csv", ".txt"):
            fmt = "csv"
        elif ext in (".json", ".js"):
            fmt = "json"
        else:
            logger.error(
                "Could not determine file format from extension: %s. Use --format csv|json",
                ext,
            )
            sys.exit(1)

    logger.info("Reading input file: %s (format: %s)", file_path, fmt)
    try:
        content = file_path.read_text(encoding="utf-8")
        if fmt == "csv":
            records = parse_csv_data(content)
        else:
            records = parse_json_data(content)
    except Exception as err:
        logger.error("Failed to read or parse file: %s", err)
        sys.exit(1)

    logger.info("Loaded %d records from file.", len(records))

    with Session(engine) as session:
        logger.info(
            "Starting ingestion (dry_run=%s, batch_size=%d)...",
            args.dry_run,
            args.batch_size,
        )
        result = ingest_market_records(
            session=session,
            records=records,
            batch_size=args.batch_size,
            dry_run=args.dry_run,
        )

    print("\n================== Ingestion Report ==================")
    print(f"Total Processed:    {result['total_processed']}")
    print(f"Valid Records:      {result['valid_records']}")
    print(f"Inserted to DB:     {result['inserted']}")
    if not args.dry_run:
        print(f"Duplicates Skipped: {result.get('skipped_duplicate', 0)}")
    print(f"Mapped to Master:   {result['mapped_crops']}")
    print(f"Raw / Unmapped:     {result['unmapped_crops']}")
    print(f"Errors Encountered: {result['errors_count']}")
    if result["errors_count"] > 0:
        print("\nSample Errors:")
        for error_item in result["errors"][:5]:
            print(f"  Row {error_item['row_index']}: {error_item['error']}")
    print("======================================================\n")


if __name__ == "__main__":
    main()
