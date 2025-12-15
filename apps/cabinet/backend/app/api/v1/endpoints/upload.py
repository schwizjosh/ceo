"""
Upload Endpoints
Handle file uploads for audio/video transcription.
"""

import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth import get_current_active_user, User
from app.database import get_cabinet_db
from app.models.transcript import Transcript
from app.models.processing_job import ProcessingJob
from app.schemas.upload import UploadResponse
from app.services.transcription import TranscriptionService
from app.services.background_tasks import run_processing_pipeline


router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/audio", response_model=UploadResponse)
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    meeting_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Upload an audio file for transcription.
    
    Supported formats: MP3, WAV, M4A, OGG, FLAC, WEBM
    Max size: 500MB (configurable)
    """
    transcription_service = TranscriptionService()
    
    # Validate file type
    if not transcription_service.is_supported_audio(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format. Supported: {', '.join(settings.allowed_audio_extensions)}"
        )
    
    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.max_upload_size_mb}MB"
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.upload_dir, "audio", unique_filename)
    
    # Ensure upload directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Create transcript record
    transcript = Transcript(
        user_id=current_user.id,
        title=title or Path(file.filename).stem,
        description=description,
        source_type="audio",
        source_filename=file.filename,
        file_size_bytes=file_size,
        category_id=uuid.UUID(category_id) if category_id else None,
        meeting_id=uuid.UUID(meeting_id) if meeting_id else None,
        status="pending",
    )
    
    db.add(transcript)
    await db.commit()
    await db.refresh(transcript)
    
    # Create processing job
    job = ProcessingJob(
        transcript_id=transcript.id,
        user_id=current_user.id,
        job_type="full_pipeline",
        status="queued",
        input_file_path=file_path,
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Start background processing
    background_tasks.add_task(
        run_processing_pipeline,
        job_id=job.id,
        transcript_id=transcript.id,
        file_path=file_path,
        source_type="audio",
        user_id=current_user.id,
        ai_model=current_user.preferred_ai_model,
    )
    
    return UploadResponse(
        job_id=job.id,
        transcript_id=transcript.id,
        filename=file.filename,
        file_size_bytes=file_size,
        content_type=file.content_type or "audio/mpeg",
        status="queued",
        message="Audio file uploaded successfully. Transcription started.",
    )


@router.post("/video", response_model=UploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    meeting_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Upload a video file for transcription.
    
    Audio will be extracted and transcribed using Whisper.
    Supported formats: MP4, MOV, AVI, MKV, WEBM
    Max size: 500MB (configurable)
    """
    transcription_service = TranscriptionService()
    
    # Validate file type
    if not transcription_service.is_supported_video(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format. Supported: {', '.join(settings.allowed_video_extensions)}"
        )
    
    # Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.max_upload_size_mb}MB"
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.upload_dir, "video", unique_filename)
    
    # Ensure upload directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Create transcript record
    transcript = Transcript(
        user_id=current_user.id,
        title=title or Path(file.filename).stem,
        description=description,
        source_type="video",
        source_filename=file.filename,
        file_size_bytes=file_size,
        category_id=uuid.UUID(category_id) if category_id else None,
        meeting_id=uuid.UUID(meeting_id) if meeting_id else None,
        status="pending",
    )
    
    db.add(transcript)
    await db.commit()
    await db.refresh(transcript)
    
    # Create processing job
    job = ProcessingJob(
        transcript_id=transcript.id,
        user_id=current_user.id,
        job_type="full_pipeline",
        status="queued",
        input_file_path=file_path,
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Start background processing
    background_tasks.add_task(
        run_processing_pipeline,
        job_id=job.id,
        transcript_id=transcript.id,
        file_path=file_path,
        source_type="video",
        user_id=current_user.id,
        ai_model=current_user.preferred_ai_model,
    )
    
    return UploadResponse(
        job_id=job.id,
        transcript_id=transcript.id,
        filename=file.filename,
        file_size_bytes=file_size,
        content_type=file.content_type or "video/mp4",
        status="queued",
        message="Video file uploaded successfully. Audio extraction and transcription started.",
    )
