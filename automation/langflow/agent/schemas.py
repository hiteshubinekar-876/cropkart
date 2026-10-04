"""
agent/schemas.py - Pydantic Schemas for CropSathi AI Chat.

Extracted cleanly from CropKart schemas without any dependencies on SQL models.
"""

from typing import Optional, Union
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    """Request schema for conversational CropSathi AI chat."""

    message: str = Field(
        ...,
        description="User prompt or chat message",
    )

    user_id: Optional[Union[UUID, str]] = Field(
        None,
        description="Optional ID of the querying user",
    )

    language: Optional[str] = Field(
        "en",
        description="Language code (e.g., 'en', 'hi', 'mr')",
    )

    role: Optional[str] = Field(
        None,
        description="User role (farmer, buyer, transporter, admin)",
    )

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Message cannot be empty")
        return value.strip()


class ChatResponse(BaseModel):
    """Response schema for conversational CropSathi AI chat."""

    success: bool = True
    message: str
    response: str
    source: Optional[str] = Field(
        None,
        description="Execution source: 'langflow' or 'local_fallback'",
    )
