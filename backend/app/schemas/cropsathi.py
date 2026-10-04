"""Request and response schemas for the CropSathi chat gateway."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CropSathiPageContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pathname: str | None = Field(default=None, max_length=200)
    page_title: str | None = Field(default=None, alias="pageTitle", max_length=200)
    focus_product: str | None = Field(default=None, alias="focusProduct", max_length=160)
    visible_products: list[str] = Field(
        default_factory=list, alias="visibleProducts", max_length=12
    )


class CropSathiChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: str = Field(default="en", min_length=2, max_length=12)
    role: str | None = Field(default=None, max_length=30)
    page_context: CropSathiPageContext | None = Field(
        default=None, alias="pageContext"
    )

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty")
        return value


class CropSathiChatResponse(BaseModel):
    success: bool = True
    message: str
    response: str
    source: str
