"""
Processing Job Model
Tracks background processing tasks for transcription and analysis.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
from uuid import uuid4

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class ProcessingJob(Base):
    """
    Tracks background processing jobs for async operations.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "processing_jobs"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Parent transcript (optional - created after transcription)
    transcript_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("transcripts.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    
    # Owner (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Job type and status
    job_type = Column(
        String(50), 
        nullable=False,
        index=True
        # Constraint: transcription, analysis, embedding, full_pipeline
    )
    status = Column(
        String(20), 
        default="queued",
        index=True
        # Constraint: queued, processing, completed, failed, cancelled
    )
    
    # Progress tracking
    progress_percent = Column(Integer, default=0)  # 0-100
    current_step = Column(String(100), nullable=True)
    steps_completed = Column(JSONB, default=list)
    
    # Input/Output
    input_file_path = Column(Text, nullable=True)
    output_data = Column(JSONB, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_details = Column(JSONB, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transcript = relationship("Transcript", back_populates="processing_jobs")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "transcript_id": str(self.transcript_id) if self.transcript_id else None,
            "user_id": str(self.user_id),
            "job_type": self.job_type,
            "status": self.status,
            "progress_percent": self.progress_percent,
            "current_step": self.current_step,
            "steps_completed": self.steps_completed,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def start(self) -> None:
        """Mark job as started."""
        self.status = "processing"
        self.started_at = datetime.utcnow()
    
    def complete(self, output_data: Optional[Dict] = None) -> None:
        """Mark job as completed."""
        self.status = "completed"
        self.progress_percent = 100
        self.completed_at = datetime.utcnow()
        if output_data:
            self.output_data = output_data
    
    def fail(self, error_message: str, error_details: Optional[Dict] = None) -> None:
        """Mark job as failed."""
        self.status = "failed"
        self.error_message = error_message
        self.error_details = error_details
        self.completed_at = datetime.utcnow()
    
    def update_progress(self, percent: int, step: Optional[str] = None) -> None:
        """Update job progress."""
        self.progress_percent = min(percent, 100)
        if step:
            self.current_step = step
            if self.steps_completed is None:
                self.steps_completed = []
            self.steps_completed.append({
                "step": step,
                "completed_at": datetime.utcnow().isoformat()
            })
    
    def can_retry(self) -> bool:
        """Check if job can be retried."""
        return self.retry_count < self.max_retries
    
    def retry(self) -> None:
        """Reset job for retry."""
        self.retry_count += 1
        self.status = "queued"
        self.progress_percent = 0
        self.current_step = None
        self.error_message = None
        self.error_details = None
        self.started_at = None
        self.completed_at = None
