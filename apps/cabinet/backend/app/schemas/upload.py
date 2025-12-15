"""
Upload Schemas
Pydantic schemas for file upload and job status responses.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Schema for file upload response."""
    job_id: UUID
    transcript_id: Optional[UUID] = None
    filename: str
    file_size_bytes: int
    content_type: str
    status: str = "queued"
    message: str = "File uploaded successfully. Processing started."


class JobStep(BaseModel):
    """Schema for a completed job step."""
    step: str
    completed_at: datetime
    details: Optional[Dict[str, Any]] = None


class JobStatusResponse(BaseModel):
    """Schema for processing job status response."""
    id: UUID
    transcript_id: Optional[UUID] = None
    job_type: str
    status: str
    progress_percent: int = 0
    current_step: Optional[str] = None
    steps_completed: List[JobStep] = Field(default_factory=list)
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    estimated_time_remaining_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True
