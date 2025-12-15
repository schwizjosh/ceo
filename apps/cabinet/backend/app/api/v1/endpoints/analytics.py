"""
Analytics Endpoints
Dashboard statistics and usage trends.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_active_user, User
from app.database import get_cabinet_db
from app.models.transcript import Transcript
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.models.category import Category
from app.schemas.analytics import OverviewStats, TrendData, CategoryStats, SentimentStats


router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=OverviewStats)
async def get_overview_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Get dashboard overview statistics.
    """
    user_id = current_user.id
    
    # Total transcripts
    total_transcripts = await db.execute(
        select(func.count(Transcript.id)).where(Transcript.user_id == user_id)
    )
    
    # Total meetings
    total_meetings = await db.execute(
        select(func.count(Meeting.id)).where(Meeting.user_id == user_id)
    )
    
    # Action items
    total_actions = await db.execute(
        select(func.count(ActionItem.id)).where(ActionItem.user_id == user_id)
    )
    pending_actions = await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(ActionItem.user_id == user_id, ActionItem.status.in_(["pending", "in_progress"]))
        )
    )
    completed_actions = await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(ActionItem.user_id == user_id, ActionItem.status == "completed")
        )
    )
    
    # Duration and words
    stats = await db.execute(
        select(
            func.sum(Transcript.duration_seconds),
            func.sum(Transcript.word_count),
            func.sum(Transcript.file_size_bytes),
        ).where(Transcript.user_id == user_id)
    )
    row = stats.fetchone()
    total_duration = row[0] or 0
    total_words = row[1] or 0
    total_size = row[2] or 0
    
    # Format duration
    hours = int(total_duration // 3600)
    minutes = int((total_duration % 3600) // 60)
    
    # Category distribution
    category_stats = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.color,
            func.count(Transcript.id).label("count"),
        )
        .join(Transcript, Transcript.category_id == Category.id)
        .where(Transcript.user_id == user_id)
        .group_by(Category.id, Category.name, Category.color)
    )
    
    categories = [
        CategoryStats(
            category_id=str(row.id),
            category_name=row.name,
            color=row.color,
            transcript_count=row.count,
        )
        for row in category_stats.fetchall()
    ]
    
    # Sentiment distribution
    sentiment_counts = await db.execute(
        select(
            Transcript.sentiment,
            func.count(Transcript.id),
        )
        .where(and_(Transcript.user_id == user_id, Transcript.sentiment.isnot(None)))
        .group_by(Transcript.sentiment)
    )
    
    sentiment_dict = {row[0]: row[1] for row in sentiment_counts.fetchall()}
    
    return OverviewStats(
        total_transcripts=total_transcripts.scalar() or 0,
        total_meetings=total_meetings.scalar() or 0,
        total_action_items=total_actions.scalar() or 0,
        pending_action_items=pending_actions.scalar() or 0,
        completed_action_items=completed_actions.scalar() or 0,
        total_duration_seconds=total_duration,
        total_duration_formatted=f"{hours}h {minutes}m",
        total_words=total_words,
        total_file_size_bytes=total_size,
        category_distribution=categories,
        sentiment_distribution=SentimentStats(
            positive=sentiment_dict.get("positive", 0),
            neutral=sentiment_dict.get("neutral", 0),
            negative=sentiment_dict.get("negative", 0),
            mixed=sentiment_dict.get("mixed", 0),
        ),
    )


@router.get("/trends")
async def get_usage_trends(
    period: str = Query("weekly", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Get usage trend data for charts.
    """
    user_id = current_user.id
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get transcript counts by date
    transcripts_by_date = await db.execute(
        select(
            func.date(Transcript.created_at).label("date"),
            func.count(Transcript.id).label("count"),
        )
        .where(and_(Transcript.user_id == user_id, Transcript.created_at >= start_date))
        .group_by(func.date(Transcript.created_at))
        .order_by(func.date(Transcript.created_at))
    )
    
    trends = [
        {"date": str(row.date), "count": row.count}
        for row in transcripts_by_date.fetchall()
    ]
    
    # Source type distribution
    source_stats = await db.execute(
        select(
            Transcript.source_type,
            func.count(Transcript.id).label("count"),
        )
        .where(Transcript.user_id == user_id)
        .group_by(Transcript.source_type)
    )
    
    source_distribution = [
        {"source_type": row.source_type, "count": row.count}
        for row in source_stats.fetchall()
    ]
    
    return {
        "period": period,
        "days": days,
        "transcript_trends": trends,
        "source_type_distribution": source_distribution,
    }
