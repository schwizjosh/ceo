"""
Action Item Schemas
Pydantic schemas for action item requests and responses.
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class ActionItemBase(BaseModel):
    """Base action item schema with common fields."""
    description: str = Field(..., min_length=1)
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    priority: str = Field(default="medium")


class ActionItemCreate(ActionItemBase):
    """Schema for creating an action item."""
    transcript_id: UUID
    context: Optional[str] = None
    source_text: Optional[str] = None


class ActionItemUpdate(BaseModel):
    """Schema for updating an action item."""
    description: Optional[str] = Field(None, min_length=1)
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class ActionItemResponse(BaseModel):
    """Schema for action item responses."""
    id: UUID
    transcript_id: UUID
    user_id: UUID
    description: str
    context: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_user_id: Optional[UUID] = None
    due_date: Optional[date] = None
    due_date_confidence: Optional[float] = None
    priority: str
    status: str
    confidence_score: Optional[float] = None
    source_text: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    transcript_title: Optional[str] = None
    
    class Config:
        from_attributes = True


class ActionItemListResponse(BaseModel):
    """Schema for paginated action item list responses."""
    items: List[ActionItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    pending_count: int = 0
    completed_count: int = 0
