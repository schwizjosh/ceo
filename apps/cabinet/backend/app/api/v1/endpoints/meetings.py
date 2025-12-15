"""
Meeting Endpoints
CRUD operations for meetings.
"""

from typing import Optional
from uuid import UUID
import math

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_active_user, User
from app.database import get_cabinet_db
from app.models.meeting import Meeting
from app.models.transcript import Transcript
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
)
from app.schemas.transcript import TranscriptResponse


router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.get("", response_model=MeetingListResponse)
async def list_meetings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    meeting_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    List user's meetings with pagination.
    """
    query = select(Meeting).where(Meeting.user_id == current_user.id)
    count_query = select(func.count(Meeting.id)).where(Meeting.user_id == current_user.id)
    
    if meeting_type:
        query = query.where(Meeting.meeting_type == meeting_type)
        count_query = count_query.where(Meeting.meeting_type == meeting_type)
    
    if search:
        search_filter = Meeting.title.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Meeting.created_at.desc()).offset(offset).limit(page_size)
    query = query.options(selectinload(Meeting.transcripts))
    
    result = await db.execute(query)
    meetings = result.scalars().all()
    
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    items = [
        MeetingResponse(
            id=m.id,
            user_id=m.user_id,
            title=m.title,
            description=m.description,
            meeting_type=m.meeting_type,
            scheduled_date=m.scheduled_date,
            attendees=m.attendees or [],
            tags=m.tags or [],
            metadata=m.metadata or {},
            transcript_count=len(m.transcripts) if m.transcripts else 0,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in meetings
    ]
    
    return MeetingListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Get a meeting by ID.
    """
    query = (
        select(Meeting)
        .where(
            and_(
                Meeting.id == meeting_id,
                Meeting.user_id == current_user.id
            )
        )
        .options(selectinload(Meeting.transcripts))
    )
    
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    return MeetingResponse(
        id=meeting.id,
        user_id=meeting.user_id,
        title=meeting.title,
        description=meeting.description,
        meeting_type=meeting.meeting_type,
        scheduled_date=meeting.scheduled_date,
        attendees=meeting.attendees or [],
        tags=meeting.tags or [],
        metadata=meeting.metadata or {},
        transcript_count=len(meeting.transcripts) if meeting.transcripts else 0,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


@router.get("/{meeting_id}/transcripts")
async def get_meeting_transcripts(
    meeting_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Get all transcripts for a meeting.
    """
    # Verify meeting exists and belongs to user
    meeting_query = select(Meeting).where(
        and_(
            Meeting.id == meeting_id,
            Meeting.user_id == current_user.id
        )
    )
    result = await db.execute(meeting_query)
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    # Get transcripts
    query = (
        select(Transcript)
        .where(Transcript.meeting_id == meeting_id)
        .order_by(Transcript.created_at.desc())
    )
    
    result = await db.execute(query)
    transcripts = result.scalars().all()
    
    return {
        "meeting_id": str(meeting_id),
        "meeting_title": meeting.title,
        "transcripts": [
            TranscriptResponse(
                id=t.id,
                user_id=t.user_id,
                meeting_id=t.meeting_id,
                title=t.title,
                description=t.description,
                source_type=t.source_type,
                source_filename=t.source_filename,
                duration_seconds=t.duration_seconds,
                language=t.language,
                word_count=t.word_count,
                ai_summary=t.ai_summary,
                sentiment=t.sentiment,
                tags=t.tags or [],
                status=t.status,
                is_favorite=t.is_favorite,
                is_archived=t.is_archived,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in transcripts
        ]
    }


@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    data: MeetingCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Create a new meeting.
    """
    meeting = Meeting(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        meeting_type=data.meeting_type,
        scheduled_date=data.scheduled_date,
        attendees=[a.model_dump() for a in data.attendees] if data.attendees else [],
        tags=data.tags or [],
        metadata=data.metadata or {},
    )
    
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    
    return MeetingResponse(
        id=meeting.id,
        user_id=meeting.user_id,
        title=meeting.title,
        description=meeting.description,
        meeting_type=meeting.meeting_type,
        scheduled_date=meeting.scheduled_date,
        attendees=meeting.attendees or [],
        tags=meeting.tags or [],
        metadata=meeting.metadata or {},
        transcript_count=0,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: UUID,
    data: MeetingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Update a meeting.
    """
    query = select(Meeting).where(
        and_(
            Meeting.id == meeting_id,
            Meeting.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle attendees conversion
    if "attendees" in update_data and update_data["attendees"]:
        update_data["attendees"] = [
            a.model_dump() if hasattr(a, 'model_dump') else a
            for a in update_data["attendees"]
        ]
    
    for field, value in update_data.items():
        setattr(meeting, field, value)
    
    await db.commit()
    await db.refresh(meeting)
    
    return MeetingResponse(
        id=meeting.id,
        user_id=meeting.user_id,
        title=meeting.title,
        description=meeting.description,
        meeting_type=meeting.meeting_type,
        scheduled_date=meeting.scheduled_date,
        attendees=meeting.attendees or [],
        tags=meeting.tags or [],
        metadata=meeting.metadata or {},
        transcript_count=0,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Delete a meeting.
    """
    query = select(Meeting).where(
        and_(
            Meeting.id == meeting_id,
            Meeting.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    await db.delete(meeting)
    await db.commit()
