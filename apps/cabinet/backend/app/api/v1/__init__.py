"""
Cabinet API Endpoints
REST API endpoints for the Cabinet application.
"""

from app.api.v1.endpoints import (
    auth,
    transcripts,
    upload,
    search,
    meetings,
    action_items,
    analytics,
    categories,
    jobs,
)

__all__ = [
    "auth",
    "transcripts",
    "upload",
    "search",
    "meetings",
    "action_items",
    "analytics",
    "categories",
    "jobs",
]
