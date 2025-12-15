"""
Meeting Schemas
Pydantic schemas for meeting requests and responses.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class AttendeeInfo(BaseModel):
    """Schema for meeting attendee information."""
    name: str
    email: Optional[str] = None
    role: Optional[str] = None  # host, participant, guest


class MeetingBase(BaseModel):
    """Base meeting schema with common fields."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_type: str = Field(default="general")
    scheduled_date: Optional[datetime] = None
    tags: Optional[List[str]] = Field(default_factory=list)


class MeetingCreate(MeetingBase):
    """Schema for creating a meeting."""
    attendees: Optional[List[AttendeeInfo]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class MeetingUpdate(BaseModel):
    """Schema for updating a meeting."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    attendees: Optional[List[AttendeeInfo]] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class MeetingResponse(BaseModel):
    """Schema for meeting responses."""
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    meeting_type: str
    scheduled_date: Optional[datetime] = None
    attendees: List[Dict[str, Any]] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    transcript_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MeetingListResponse(BaseModel):
    """Schema for paginated meeting list responses."""
    items: List[MeetingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
