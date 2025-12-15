"""
Search Schemas
Pydantic schemas for search requests and responses.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class SearchFilters(BaseModel):
    """Common search filters."""
    category_ids: Optional[List[UUID]] = None
    sentiment: Optional[List[str]] = None  # positive, neutral, negative, mixed
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    source_types: Optional[List[str]] = None  # audio, video, text, paste
    tags: Optional[List[str]] = None
    meeting_id: Optional[UUID] = None


class SemanticSearchRequest(BaseModel):
    """Schema for semantic (vector) search requests."""
    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    filters: Optional[SearchFilters] = None


class KeywordSearchRequest(BaseModel):
    """Schema for keyword (full-text) search requests."""
    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=20, ge=1, le=100)
    page: int = Field(default=1, ge=1)
    filters: Optional[SearchFilters] = None


class CombinedSearchRequest(BaseModel):
    """Schema for combined (hybrid) search requests."""
    query: str = Field(..., min_length=1, max_length=1000)
    limit: int = Field(default=20, ge=1, le=100)
    semantic_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    keyword_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    filters: Optional[SearchFilters] = None


class SearchResultChunk(BaseModel):
    """Schema for search result chunk (semantic search)."""
    chunk_id: UUID
    transcript_id: UUID
    chunk_text: str
    chunk_index: int
    similarity_score: float
    

class SearchResult(BaseModel):
    """Schema for individual search result."""
    transcript_id: UUID
    title: str
    source_type: str
    category_name: Optional[str] = None
    sentiment: Optional[str] = None
    created_at: datetime
    
    # For semantic search
    matching_chunks: Optional[List[SearchResultChunk]] = None
    max_similarity: Optional[float] = None
    
    # For keyword search  
    snippet: Optional[str] = None
    rank_score: Optional[float] = None
    
    # Combined score
    combined_score: Optional[float] = None


class SearchResponse(BaseModel):
    """Schema for search response."""
    results: List[SearchResult]
    total: int
    query: str
    search_type: str  # semantic, keyword, combined
    execution_time_ms: int
    filters_applied: Optional[Dict[str, Any]] = None
