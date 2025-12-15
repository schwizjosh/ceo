"""
Category Model
System and user-defined categories for organizing transcripts.
"""

from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    """
    Categories for organizing transcripts.
    System categories have is_system=True and user_id=NULL.
    User categories have is_system=False and reference andora_db.users(id).
    """
    
    __tablename__ = "categories"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Category info
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#6366f1")  # Hex color
    icon = Column(String(50), default="folder")
    
    # System vs user category
    is_system = Column(Boolean, default=False)
    user_id = Column(PGUUID(as_uuid=True), nullable=True)  # NULL for system categories
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transcripts = relationship("Transcript", back_populates="category")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "color": self.color,
            "icon": self.icon,
            "is_system": self.is_system,
            "user_id": str(self.user_id) if self.user_id else None,
            "transcript_count": len(self.transcripts) if self.transcripts else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
