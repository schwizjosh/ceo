"""
User Preferences Model
Cabinet-specific user settings (supplements andora_db.users).
"""

from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy import Column, String, Boolean, Integer, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.database import Base


class UserPreferences(Base):
    """
    Cabinet-specific user preferences.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "user_preferences"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # User (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, unique=True, index=True)
    
    # AI preferences
    preferred_ai_model = Column(String(50), default="gpt-4o")
    auto_analyze = Column(Boolean, default=True)
    auto_extract_actions = Column(Boolean, default=True)
    
    # Display preferences
    default_view = Column(String(20), default="list")  # list, grid, compact
    transcripts_per_page = Column(Integer, default=20)
    
    # Notification settings
    notify_on_completion = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=False)
    
    # Storage
    storage_used_bytes = Column(BigInteger, default=0)
    storage_limit_bytes = Column(BigInteger, default=5368709120)  # 5GB default
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "preferred_ai_model": self.preferred_ai_model,
            "auto_analyze": self.auto_analyze,
            "auto_extract_actions": self.auto_extract_actions,
            "default_view": self.default_view,
            "transcripts_per_page": self.transcripts_per_page,
            "notify_on_completion": self.notify_on_completion,
            "email_notifications": self.email_notifications,
            "storage_used_bytes": self.storage_used_bytes,
            "storage_limit_bytes": self.storage_limit_bytes,
            "storage_used_percent": round(
                (self.storage_used_bytes / self.storage_limit_bytes) * 100, 2
            ) if self.storage_limit_bytes > 0 else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @property
    def storage_remaining_bytes(self) -> int:
        """Calculate remaining storage."""
        return max(0, self.storage_limit_bytes - self.storage_used_bytes)
    
    def can_upload(self, file_size_bytes: int) -> bool:
        """Check if user can upload a file of given size."""
        return self.storage_remaining_bytes >= file_size_bytes
