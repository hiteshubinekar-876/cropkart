"""API module providing dependency injection and routing."""

from app.api.deps import (
    CurrentUser,
    SessionDep,
    TokenDep,
    get_current_active_superuser,
    get_db,
)
from app.api.main import api_router

__all__ = [
    "api_router",
    "get_db",
    "SessionDep",
    "TokenDep",
    "CurrentUser",
    "get_current_active_superuser",
]
