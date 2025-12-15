"""
Cabinet Pydantic Schemas
Request/response schemas for API endpoints.
"""

from app.schemas.transcript import (
    TranscriptCreate,
    TranscriptUpdate,
    TranscriptResponse,
    TranscriptListResponse,
    TranscriptChunkResponse,
)
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
)
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemUpdate,
    ActionItemResponse,
    ActionItemListResponse,
)
from app.schemas.search import (
    SemanticSearchRequest,
    KeywordSearchRequest,
    CombinedSearchRequest,
    SearchResult,
    SearchResponse,
)
from app.schemas.upload import (
    UploadResponse,
    JobStatusResponse,
)
from app.schemas.auth import (
    UserResponse,
    TokenResponse,
)
from app.schemas.analytics import (
    OverviewStats,
    TrendData,
)

__all__ = [
    "TranscriptCreate",
    "TranscriptUpdate", 
    "TranscriptResponse",
    "TranscriptListResponse",
    "TranscriptChunkResponse",
    "MeetingCreate",
    "MeetingUpdate",
    "MeetingResponse",
    "MeetingListResponse",
    "ActionItemCreate",
    "ActionItemUpdate",
    "ActionItemResponse",
    "ActionItemListResponse",
    "SemanticSearchRequest",
    "KeywordSearchRequest",
    "CombinedSearchRequest",
    "SearchResult",
    "SearchResponse",
    "UploadResponse",
    "JobStatusResponse",
    "UserResponse",
    "TokenResponse",
    "OverviewStats",
    "TrendData",
]
