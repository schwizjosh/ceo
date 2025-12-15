"""
Analytics Schemas
Pydantic schemas for analytics responses.
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


class CategoryStats(BaseModel):
    """Statistics for a category."""
    category_id: str
    category_name: str
    color: str
    transcript_count: int
    total_duration_seconds: float = 0
    total_words: int = 0


class SentimentStats(BaseModel):
    """Sentiment distribution statistics."""
    positive: int = 0
    neutral: int = 0
    negative: int = 0
    mixed: int = 0
    average_score: float = 0


class OverviewStats(BaseModel):
    """Schema for dashboard overview statistics."""
    total_transcripts: int = 0
    total_meetings: int = 0
    total_action_items: int = 0
    pending_action_items: int = 0
    completed_action_items: int = 0
    
    total_duration_seconds: float = 0
    total_duration_formatted: str = "0h 0m"
    
    total_words: int = 0
    total_file_size_bytes: int = 0
    
    transcripts_this_week: int = 0
    transcripts_this_month: int = 0
    
    category_distribution: List[CategoryStats] = Field(default_factory=list)
    sentiment_distribution: SentimentStats = Field(default_factory=SentimentStats)
    
    storage_used_bytes: int = 0
    storage_limit_bytes: int = 5368709120
    storage_used_percent: float = 0
    
    recent_transcripts_count: int = 0
    processing_count: int = 0


class TrendDataPoint(BaseModel):
    """Single data point for trend charts."""
    date: date
    count: int = 0
    duration_seconds: float = 0
    words: int = 0


class SourceTypeStats(BaseModel):
    """Statistics by source type."""
    source_type: str
    count: int = 0
    total_duration_seconds: float = 0


class TrendData(BaseModel):
    """Schema for usage trend data."""
    period: str  # daily, weekly, monthly
    start_date: date
    end_date: date
    
    transcript_trends: List[TrendDataPoint] = Field(default_factory=list)
    action_item_trends: List[TrendDataPoint] = Field(default_factory=list)
    
    source_type_distribution: List[SourceTypeStats] = Field(default_factory=list)
    
    busiest_day: Optional[str] = None
    average_transcripts_per_day: float = 0
    growth_rate_percent: float = 0


class AIUsageStats(BaseModel):
    """AI service usage statistics."""
    total_tokens_used: int = 0
    total_cost_cents: int = 0
    
    transcription_count: int = 0
    analysis_count: int = 0
    embedding_count: int = 0
    
    by_model: Dict[str, Dict[str, int]] = Field(default_factory=dict)
