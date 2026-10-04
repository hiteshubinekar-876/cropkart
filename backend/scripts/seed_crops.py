"""CLI script to seed master crops catalog into CropKart database."""

import logging
import sys
from pathlib import Path

# Add backend root to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.services.crop_service import seed_crops  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Connecting to database and seeding master crops catalog...")
    with Session(engine) as session:
        result = seed_crops(session)
        logger.info(
            "Crops seed completed: Total=%d, Inserted=%d, Already Existed=%d",
            result["total"],
            result["inserted"],
            result["existing"],
        )


if __name__ == "__main__":
    main()
