"""
API Usage Model
Tracks API calls for rate limiting and billing.
"""

from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.database import Base


class APIUsage(Base):
    """
    Tracks API usage for rate limiting and billing.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "api_usage"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # User (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # API details
    endpoint = Column(String(255), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    
    # AI service usage
    ai_service = Column(String(50), nullable=True, index=True)  # openai, anthropic
    ai_model = Column(String(50), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    cost_cents = Column(Integer, nullable=True)
    
    # Request info
    request_size_bytes = Column(Integer, nullable=True)
    response_size_bytes = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    status_code = Column(Integer, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "endpoint": self.endpoint,
            "method": self.method,
            "ai_service": self.ai_service,
            "ai_model": self.ai_model,
            "tokens_used": self.tokens_used,
            "cost_cents": self.cost_cents,
            "request_size_bytes": self.request_size_bytes,
            "response_size_bytes": self.response_size_bytes,
            "response_time_ms": self.response_time_ms,
            "status_code": self.status_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
