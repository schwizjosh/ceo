"""
Search History Model
Tracks user searches for analytics.
"""

from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from sqlalchemy import Column, String, Text, Integer, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB

from app.database import Base


class SearchHistory(Base):
    """
    Search history for analytics and improving search.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "search_history"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # User (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Search details
    query_text = Column(Text, nullable=False)
    search_type = Column(
        String(20), 
        nullable=False,
        index=True
        # Constraint: semantic, keyword, combined
    )
    
    # Results
    results_count = Column(Integer, default=0)
    result_ids = Column(ARRAY(PGUUID(as_uuid=True)), default=list)
    
    # Performance
    execution_time_ms = Column(Integer, nullable=True)
    
    # Filters applied
    filters = Column(JSONB, default=dict)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "query_text": self.query_text,
            "search_type": self.search_type,
            "results_count": self.results_count,
            "result_ids": [str(rid) for rid in self.result_ids] if self.result_ids else [],
            "execution_time_ms": self.execution_time_ms,
            "filters": self.filters,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
