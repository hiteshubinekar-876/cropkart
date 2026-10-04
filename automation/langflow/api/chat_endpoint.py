"""
api/chat_endpoint.py - FastAPI Router for CropSathi AI Chat.

Can be imported and mounted by any FastAPI application:
    from api.chat_endpoint import router as cropsathi_router
    app.include_router(cropsathi_router)
"""

from fastapi import APIRouter, HTTPException, status
from agent.crop_sathi import crop_sathi_agent
from agent.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/ai", tags=["CropSathi AI"])


@router.post("/chat", response_model=ChatResponse)
async def chat_with_cropsathi(request: ChatRequest):
    """
    CropSathi conversational chat endpoint.
    Routes to LangFlow when configured; falls back to agronomic domain rules.
    """
    try:
        res = await crop_sathi_agent.chat(
            message=request.message,
            language=request.language,
            role=request.role,
        )
        return ChatResponse(
            success=res["success"],
            message=res["message"],
            response=res["response"],
            source=res.get("source"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CropSathi AI error: {str(exc)}",
        )
