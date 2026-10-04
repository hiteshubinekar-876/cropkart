"""Crop Master Data Service and Seeding Logic."""

import logging
from typing import Any

from sqlmodel import Session, col, select

from app.models.crop import Crop

logger = logging.getLogger(__name__)

DEFAULT_CROPS: list[dict[str, Any]] = [
    {
        "name": "Wheat",
        "hindi_name": "गेहूं",
        "category": "cereals",
        "standard_unit": "quintal",
        "shelf_life_days": 365,
    },
    {
        "name": "Paddy/Rice",
        "hindi_name": "धान/चावल",
        "category": "cereals",
        "standard_unit": "quintal",
        "shelf_life_days": 365,
    },
    {
        "name": "Onion",
        "hindi_name": "प्याज",
        "category": "vegetables",
        "standard_unit": "quintal",
        "shelf_life_days": 90,
    },
    {
        "name": "Potato",
        "hindi_name": "आलू",
        "category": "vegetables",
        "standard_unit": "quintal",
        "shelf_life_days": 120,
    },
    {
        "name": "Tomato",
        "hindi_name": "टमाटर",
        "category": "vegetables",
        "standard_unit": "quintal",
        "shelf_life_days": 14,
    },
    {
        "name": "Maize",
        "hindi_name": "मक्का",
        "category": "cereals",
        "standard_unit": "quintal",
        "shelf_life_days": 240,
    },
    {
        "name": "Soybean",
        "hindi_name": "सोयाबीन",
        "category": "oilseeds",
        "standard_unit": "quintal",
        "shelf_life_days": 300,
    },
    {
        "name": "Cotton",
        "hindi_name": "कपास",
        "category": "cash_crops",
        "standard_unit": "quintal",
        "shelf_life_days": 365,
    },
    {
        "name": "Chilli",
        "hindi_name": "मिर्च",
        "category": "spices",
        "standard_unit": "quintal",
        "shelf_life_days": 60,
    },
    {
        "name": "Turmeric",
        "hindi_name": "हल्दी",
        "category": "spices",
        "standard_unit": "quintal",
        "shelf_life_days": 365,
    },
    {
        "name": "Gram",
        "hindi_name": "चना",
        "category": "pulses",
        "standard_unit": "quintal",
        "shelf_life_days": 365,
    },
    {
        "name": "Pigeon Pea",
        "hindi_name": "अरहर/तूर",
        "category": "pulses",
        "standard_unit": "quintal",
        "shelf_life_days": 365,
    },
    {
        "name": "Groundnut",
        "hindi_name": "मूंगफली",
        "category": "oilseeds",
        "standard_unit": "quintal",
        "shelf_life_days": 180,
    },
    {
        "name": "Sugarcane",
        "hindi_name": "गन्ना",
        "category": "cash_crops",
        "standard_unit": "quintal",
        "shelf_life_days": 15,
    },
]


def seed_crops(session: Session) -> dict[str, int]:
    """
    Idempotently seeds the master crops catalog into the database.
    Ensures that existing crops are not duplicated.
    """
    inserted = 0
    existing = 0

    for crop_data in DEFAULT_CROPS:
        statement = select(Crop).where(Crop.name == crop_data["name"])
        crop_record = session.exec(statement).first()

        if not crop_record:
            new_crop = Crop(
                name=crop_data["name"],
                hindi_name=crop_data.get("hindi_name"),
                category=crop_data["category"],
                standard_unit=crop_data.get("standard_unit", "quintal"),
                shelf_life_days=crop_data.get("shelf_life_days"),
            )
            session.add(new_crop)
            inserted += 1
            logger.info("Queued crop for insertion: %s", crop_data["name"])
        else:
            existing += 1
            # Update attributes if needed
            crop_record.hindi_name = crop_data.get("hindi_name")
            crop_record.category = crop_data["category"]
            crop_record.standard_unit = crop_data.get("standard_unit", "quintal")
            crop_record.shelf_life_days = crop_data.get("shelf_life_days")
            session.add(crop_record)
            logger.debug("Crop already exists: %s", crop_data["name"])

    if inserted > 0 or existing > 0:
        session.commit()

    logger.info("Crops seed complete: %d inserted, %d existing.", inserted, existing)
    return {
        "total": len(DEFAULT_CROPS),
        "inserted": inserted,
        "existing": existing,
    }


def get_crop_by_name(session: Session, name: str) -> Crop | None:
    """Finds a crop by exact or case-insensitive name."""
    statement = select(Crop).where(col(Crop.name).ilike(name.strip()))
    return session.exec(statement).first()


def list_crops(session: Session, skip: int = 0, limit: int = 100) -> list[Crop]:
    """Retrieves all master catalog crops."""
    statement = select(Crop).offset(skip).limit(limit)
    return list(session.exec(statement).all())
