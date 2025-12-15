"""
Meeting Model
Groups related transcripts together.
"""

from datetime import datetime
from typing import Dict, Any, List
from uuid import uuid4

from sqlalchemy import Column, String, Text, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Meeting(Base):
    """
    Meeting model for grouping related transcripts.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "meetings"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # User reference (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Meeting info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meeting_type = Column(String(50), default="general")
    
    # Scheduling
    scheduled_date = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Participants (array of {name, email, role})
    attendees = Column(JSONB, default=list)
    
    # Tags for organization
    tags = Column(ARRAY(String), default=list)
    
    # Additional metadata
    metadata = Column(JSONB, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transcripts = relationship("Transcript", back_populates="meeting")
    
    def to_dict(self, include_transcripts: bool = False) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        result = {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "title": self.title,
            "description": self.description,
            "meeting_type": self.meeting_type,
            "scheduled_date": self.scheduled_date.isoformat() if self.scheduled_date else None,
            "attendees": self.attendees,
            "tags": self.tags,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "transcript_count": len(self.transcripts) if self.transcripts else 0,
        }
        
        if include_transcripts and self.transcripts:
            result["transcripts"] = [t.to_dict() for t in self.transcripts]
            
        return result
