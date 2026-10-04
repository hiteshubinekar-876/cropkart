import random
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserPublic

router = APIRouter(tags=["private"], prefix="/private")


class PrivateUserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone_number: str | None = None
    is_verified: bool = False


@router.post("/users/", response_model=UserPublic)
def create_user(user_in: PrivateUserCreate, session: SessionDep) -> Any:
    """
    Create a new user (internal development endpoint).
    """
    phone_number = user_in.phone_number or f"+919{random.randint(100000000, 999999999)}"
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        phone_number=phone_number,
        hashed_password=get_password_hash(user_in.password),
        is_verified=user_in.is_verified,
    )

    session.add(user)
    session.commit()

    return user
