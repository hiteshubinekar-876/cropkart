"""CLI behavior tests for live CEDA ingestion."""

import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

_cli_path = Path(__file__).resolve().parents[1] / "scripts" / "import_market_data.py"
_cli_spec = importlib.util.spec_from_file_location("import_market_data_under_test", _cli_path)
assert _cli_spec is not None and _cli_spec.loader is not None
import_market_data = importlib.util.module_from_spec(_cli_spec)
_cli_spec.loader.exec_module(import_market_data)


def test_ceda_cli_reports_empty_upstream_response(capsys: pytest.CaptureFixture[str]) -> None:
    """An empty CEDA result is reported explicitly and exits as a no-data run."""
    result = {
        "total_processed": 0,
        "valid_records": 0,
        "inserted": 0,
        "skipped_duplicate": 0,
        "mapped_crops": 0,
        "unmapped_crops": 0,
        "errors_count": 0,
        "errors": [],
        "dry_run": False,
    }
    argv = [
        "import_market_data.py",
        "--from-ceda",
        "--commodity-id",
        "1",
        "--state-id",
        "3",
        "--from-date",
        "2025-03-01",
        "--to-date",
        "2025-03-01",
    ]

    with (
        patch.object(sys, "argv", argv),
        patch.object(import_market_data, "Session") as mock_session,
        patch.object(import_market_data, "sync_ceda_to_market_data", return_value=result),
    ):
        mock_session.return_value.__enter__.return_value = MagicMock()
        with pytest.raises(SystemExit) as exc_info:
            import_market_data.main()

    assert exc_info.value.code == 2
    output = capsys.readouterr().out
    assert "Total Processed:    0" in output
    assert "Inserted to DB:     0" in output
    assert "Duplicates Skipped: 0" in output
    assert "CEDA returned 0 records for the selected filters." in output
