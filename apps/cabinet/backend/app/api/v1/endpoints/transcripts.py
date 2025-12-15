"""
Transcript Endpoints
CRUD operations for transcripts.
"""

from typing import Optional, List
from uuid import UUID
import math

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_active_user, User
from app.database import get_cabinet_db
from app.models.transcript import Transcript
from app.models.category import Category
from app.models.action_item import ActionItem
from app.schemas.transcript import (
    TranscriptCreate,
    TranscriptUpdate,
    TranscriptResponse,
    TranscriptListResponse,
)


router = APIRouter(prefix="/transcripts", tags=["Transcripts"])


@router.get("", response_model=TranscriptListResponse)
async def list_transcripts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[UUID] = None,
    source_type: Optional[str] = None,
    sentiment: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    is_archived: Optional[bool] = Query(False),
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|title|updated_at|duration_seconds)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    List user's transcripts with pagination and filtering.
    """
    # Build query
    query = select(Transcript).where(Transcript.user_id == current_user.id)
    count_query = select(func.count(Transcript.id)).where(Transcript.user_id == current_user.id)
    
    # Apply filters
    if status_filter:
        query = query.where(Transcript.status == status_filter)
        count_query = count_query.where(Transcript.status == status_filter)
    
    if category_id:
        query = query.where(Transcript.category_id == category_id)
        count_query = count_query.where(Transcript.category_id == category_id)
    
    if source_type:
        query = query.where(Transcript.source_type == source_type)
        count_query = count_query.where(Transcript.source_type == source_type)
    
    if sentiment:
        query = query.where(Transcript.sentiment == sentiment)
        count_query = count_query.where(Transcript.sentiment == sentiment)
    
    if is_favorite is not None:
        query = query.where(Transcript.is_favorite == is_favorite)
        count_query = count_query.where(Transcript.is_favorite == is_favorite)
    
    if is_archived is not None:
        query = query.where(Transcript.is_archived == is_archived)
        count_query = count_query.where(Transcript.is_archived == is_archived)
    
    if search:
        search_filter = Transcript.title.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    sort_column = getattr(Transcript, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Include category relationship
    query = query.options(selectinload(Transcript.category))
    
    # Execute
    result = await db.execute(query)
    transcripts = result.scalars().all()
    
    # Calculate pagination info
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # Build response items
    items = []
    for t in transcripts:
        item = TranscriptResponse(
            id=t.id,
            user_id=t.user_id,
            meeting_id=t.meeting_id,
            title=t.title,
            description=t.description,
            source_type=t.source_type,
            source_filename=t.source_filename,
            file_size_bytes=t.file_size_bytes,
            duration_seconds=t.duration_seconds,
            language=t.language,
            confidence_score=t.confidence_score,
            word_count=t.word_count,
            ai_summary=t.ai_summary,
            key_insights=t.key_insights,
            sentiment=t.sentiment,
            sentiment_score=t.sentiment_score,
            topics=t.topics,
            tags=t.tags or [],
            category_id=t.category_id,
            category_name=t.category.name if t.category else None,
            category_color=t.category.color if t.category else None,
            status=t.status,
            is_favorite=t.is_favorite,
            is_archived=t.is_archived,
            transcribed_at=t.transcribed_at,
            analyzed_at=t.analyzed_at,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        items.append(item)
    
    return TranscriptListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/{transcript_id}", response_model=TranscriptResponse)
async def get_transcript(
    transcript_id: UUID,
    include_text: bool = Query(True),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Get a transcript by ID.
    """
    query = (
        select(Transcript)
        .where(
            and_(
                Transcript.id == transcript_id,
                Transcript.user_id == current_user.id
            )
        )
        .options(selectinload(Transcript.category))
        .options(selectinload(Transcript.action_items))
    )
    
    result = await db.execute(query)
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    return TranscriptResponse(
        id=transcript.id,
        user_id=transcript.user_id,
        meeting_id=transcript.meeting_id,
        title=transcript.title,
        description=transcript.description,
        source_type=transcript.source_type,
        source_filename=transcript.source_filename,
        file_size_bytes=transcript.file_size_bytes,
        duration_seconds=transcript.duration_seconds,
        full_text=transcript.full_text if include_text else None,
        language=transcript.language,
        confidence_score=transcript.confidence_score,
        word_count=transcript.word_count,
        ai_summary=transcript.ai_summary,
        key_insights=transcript.key_insights,
        sentiment=transcript.sentiment,
        sentiment_score=transcript.sentiment_score,
        topics=transcript.topics,
        tags=transcript.tags or [],
        category_id=transcript.category_id,
        category_name=transcript.category.name if transcript.category else None,
        category_color=transcript.category.color if transcript.category else None,
        status=transcript.status,
        is_favorite=transcript.is_favorite,
        is_archived=transcript.is_archived,
        transcribed_at=transcript.transcribed_at,
        analyzed_at=transcript.analyzed_at,
        created_at=transcript.created_at,
        updated_at=transcript.updated_at,
        action_items_count=len(transcript.action_items) if transcript.action_items else 0,
    )


@router.post("", response_model=TranscriptResponse, status_code=status.HTTP_201_CREATED)
async def create_transcript(
    data: TranscriptCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Create a transcript from pasted text.
    """
    from fastapi import BackgroundTasks
    from app.models.processing_job import ProcessingJob
    from app.services.background_tasks import run_text_processing_pipeline
    
    # Create transcript
    transcript = Transcript(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        source_type=data.source_type or "paste",
        full_text=data.full_text,
        language=data.language or "en",
        category_id=data.category_id,
        meeting_id=data.meeting_id,
        tags=data.tags or [],
        word_count=len(data.full_text.split()),
        status="processing",
    )
    
    db.add(transcript)
    await db.commit()
    await db.refresh(transcript)
    
    # Create processing job
    job = ProcessingJob(
        transcript_id=transcript.id,
        user_id=current_user.id,
        job_type="analysis",
        status="queued",
    )
    db.add(job)
    await db.commit()
    
    # Note: In production, use BackgroundTasks or a task queue
    # For now, we return immediately and processing happens async
    
    return TranscriptResponse(
        id=transcript.id,
        user_id=transcript.user_id,
        meeting_id=transcript.meeting_id,
        title=transcript.title,
        description=transcript.description,
        source_type=transcript.source_type,
        full_text=transcript.full_text,
        language=transcript.language,
        word_count=transcript.word_count,
        tags=transcript.tags or [],
        category_id=transcript.category_id,
        status=transcript.status,
        is_favorite=transcript.is_favorite,
        is_archived=transcript.is_archived,
        created_at=transcript.created_at,
        updated_at=transcript.updated_at,
    )


@router.put("/{transcript_id}", response_model=TranscriptResponse)
async def update_transcript(
    transcript_id: UUID,
    data: TranscriptUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Update a transcript.
    """
    query = select(Transcript).where(
        and_(
            Transcript.id == transcript_id,
            Transcript.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transcript, field, value)
    
    await db.commit()
    await db.refresh(transcript)
    
    return TranscriptResponse(
        id=transcript.id,
        user_id=transcript.user_id,
        meeting_id=transcript.meeting_id,
        title=transcript.title,
        description=transcript.description,
        source_type=transcript.source_type,
        source_filename=transcript.source_filename,
        file_size_bytes=transcript.file_size_bytes,
        duration_seconds=transcript.duration_seconds,
        language=transcript.language,
        word_count=transcript.word_count,
        ai_summary=transcript.ai_summary,
        sentiment=transcript.sentiment,
        sentiment_score=transcript.sentiment_score,
        tags=transcript.tags or [],
        category_id=transcript.category_id,
        status=transcript.status,
        is_favorite=transcript.is_favorite,
        is_archived=transcript.is_archived,
        created_at=transcript.created_at,
        updated_at=transcript.updated_at,
    )


@router.delete("/{transcript_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transcript(
    transcript_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Delete a transcript.
    """
    query = select(Transcript).where(
        and_(
            Transcript.id == transcript_id,
            Transcript.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    await db.delete(transcript)
    await db.commit()


@router.patch("/{transcript_id}/favorite")
async def toggle_favorite(
    transcript_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Toggle favorite status of a transcript.
    """
    query = select(Transcript).where(
        and_(
            Transcript.id == transcript_id,
            Transcript.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    transcript.is_favorite = not transcript.is_favorite
    await db.commit()
    
    return {"is_favorite": transcript.is_favorite}


@router.patch("/{transcript_id}/archive")
async def toggle_archive(
    transcript_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Toggle archive status of a transcript.
    """
    query = select(Transcript).where(
        and_(
            Transcript.id == transcript_id,
            Transcript.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    transcript.is_archived = not transcript.is_archived
    await db.commit()
    
    return {"is_archived": transcript.is_archived}
