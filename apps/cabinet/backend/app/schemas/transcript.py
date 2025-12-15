"""
Transcript Schemas
Pydantic schemas for transcript requests and responses.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class TranscriptBase(BaseModel):
    """Base transcript schema with common fields."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    tags: Optional[List[str]] = Field(default_factory=list)


class TranscriptCreate(TranscriptBase):
    """Schema for creating a transcript from text paste."""
    full_text: str = Field(..., min_length=1)
    source_type: str = Field(default="paste")
    meeting_id: Optional[UUID] = None
    language: Optional[str] = "en"


class TranscriptUpdate(BaseModel):
    """Schema for updating a transcript."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    meeting_id: Optional[UUID] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None


class TranscriptChunkResponse(BaseModel):
    """Schema for transcript chunk responses."""
    id: UUID
    transcript_id: UUID
    chunk_index: int
    chunk_text: str
    start_char: Optional[int] = None
    end_char: Optional[int] = None
    token_count: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TranscriptResponse(BaseModel):
    """Schema for transcript responses."""
    id: UUID
    user_id: UUID
    meeting_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    source_type: str
    source_filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    full_text: Optional[str] = None
    language: str = "en"
    confidence_score: Optional[float] = None
    word_count: Optional[int] = None
    ai_summary: Optional[str] = None
    key_insights: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    topics: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    status: str
    is_favorite: bool = False
    is_archived: bool = False
    transcribed_at: Optional[datetime] = None
    analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    action_items_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class TranscriptListResponse(BaseModel):
    """Schema for paginated transcript list responses."""
    items: List[TranscriptResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
