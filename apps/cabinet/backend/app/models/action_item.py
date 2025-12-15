"""
Action Item Model
AI-extracted tasks and action items from transcripts.
"""

from datetime import datetime, date
from typing import Dict, Any, Optional
from uuid import uuid4

from sqlalchemy import Column, String, Text, Float, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.database import Base


class ActionItem(Base):
    """
    Action items extracted from transcripts by AI analysis.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "action_items"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Parent transcript
    transcript_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("transcripts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Owner (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Action item details
    description = Column(Text, nullable=False)
    context = Column(Text, nullable=True)  # Surrounding text from transcript
    
    # Assignment
    assigned_to = Column(String(255), nullable=True)  # Name or email from transcript
    assigned_to_user_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)  # If matched to a user
    
    # Scheduling
    due_date = Column(Date, nullable=True, index=True)
    due_date_confidence = Column(Float, nullable=True)  # AI confidence in extracted date
    
    # Priority and status
    priority = Column(
        String(10), 
        default="medium",
        index=True
        # Constraint: low, medium, high, urgent
    )
    status = Column(
        String(20), 
        default="pending",
        index=True
        # Constraint: pending, in_progress, completed, cancelled
    )
    
    # AI metadata
    confidence_score = Column(Float, nullable=True)  # AI confidence in extraction
    source_text = Column(Text, nullable=True)  # Original text that generated this item
    
    # Timestamps
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transcript = relationship("Transcript", back_populates="action_items")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "transcript_id": str(self.transcript_id),
            "user_id": str(self.user_id),
            "description": self.description,
            "context": self.context,
            "assigned_to": self.assigned_to,
            "assigned_to_user_id": str(self.assigned_to_user_id) if self.assigned_to_user_id else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "due_date_confidence": self.due_date_confidence,
            "priority": self.priority,
            "status": self.status,
            "confidence_score": self.confidence_score,
            "source_text": self.source_text,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def mark_complete(self) -> None:
        """Mark the action item as completed."""
        self.status = "completed"
        self.completed_at = datetime.utcnow()
    
    def mark_in_progress(self) -> None:
        """Mark the action item as in progress."""
        self.status = "in_progress"
    
    def cancel(self) -> None:
        """Cancel the action item."""
        self.status = "cancelled"
