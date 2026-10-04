"""CropSathi chat endpoint used by the GreenCart web client."""

from fastapi import APIRouter, HTTPException, status

from app.ai_logic import crop_sathi
from app.schemas.cropsathi import CropSathiChatRequest, CropSathiChatResponse

router = APIRouter(prefix="/ai", tags=["CropSathi AI"])


@router.post("/chat", response_model=CropSathiChatResponse)
async def chat_with_cropsathi(
    request: CropSathiChatRequest,
) -> CropSathiChatResponse:
    """Route a chat turn through LangFlow, preserving the existing fallback."""
    context = request.page_context
    context_lines: list[str] = []
    if context:
        if context.page_title:
            context_lines.append(f"Current page: {context.page_title}")
        if context.focus_product:
            context_lines.append(f"Focused product: {context.focus_product}")
        if context.visible_products:
            context_lines.append(
                "Visible products: " + ", ".join(context.visible_products)
            )
        if context.pathname:
            context_lines.append(f"Page path: {context.pathname}")
    try:
        result = await crop_sathi.chat_with_source(
            message=request.message,
            language=request.language,
            role=request.role,
            context="\n".join(context_lines) or None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="CropSathi could not process the request.",
        ) from exc

    return CropSathiChatResponse(
        success=True,
        message=request.message,
        response=result["response"],
        source=result["source"],
    )
