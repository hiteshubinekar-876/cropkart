import random
import uuid
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, SQLModel


def generate_phone_number() -> str:
    return f"+919{random.randint(100000000, 999999999)}"


# Shared properties
class UserBase(SQLModel):
    phone_number: str = Field(default_factory=generate_phone_number, max_length=20)
    full_name: str = Field(default="CropKart User", max_length=255)
    email: EmailStr | None = Field(
        default=None, unique=True, index=True, max_length=255
    )
    role: str = Field(default="farmer", max_length=30)
    is_active: bool = True
    is_superuser: bool = False


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    phone_number: str = Field(default_factory=generate_phone_number, max_length=20)
    full_name: str = Field(default="CropKart User", max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="farmer", max_length=30)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=20)
    full_name: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=30)
    is_active: bool | None = None
    is_superuser: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int
