"""
Background Tasks Service
Handles async processing pipeline for transcription and analysis.
"""

import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_cabinet_session
from app.models.transcript import Transcript
from app.models.action_item import ActionItem
from app.models.processing_job import ProcessingJob
from app.services.transcription import TranscriptionService, TranscriptionError
from app.services.ai_analysis import AIAnalysisService, AIAnalysisError
from app.services.embeddings import EmbeddingService, EmbeddingError


logger = logging.getLogger(__name__)


class BackgroundProcessor:
    """
    Background processor for async transcript processing pipeline.
    
    Pipeline steps:
    1. Transcribe audio/video (Whisper API)
    2. AI analysis (categorization, sentiment, action items, summary)
    3. Text chunking
    4. Generate embeddings (OpenAI ada-002)
    5. Store vectors in pgvector
    6. Update job status
    """
    
    def __init__(self):
        self.transcription_service = TranscriptionService()
        self.ai_analysis_service = AIAnalysisService()
        self.embedding_service = EmbeddingService()
    
    async def process_upload(
        self,
        job_id: UUID,
        transcript_id: UUID,
        file_path: str,
        source_type: str,
        user_id: UUID,
        ai_model: Optional[str] = None,
    ):
        """
        Run the full processing pipeline for an uploaded file.
        
        Args:
            job_id: Processing job ID for tracking
            transcript_id: Transcript ID to update
            file_path: Path to the uploaded file
            source_type: 'audio' or 'video'
            user_id: User ID who uploaded
            ai_model: AI model for analysis (optional)
        """
        logger.info(f"Starting processing pipeline for job {job_id}")
        
        async with get_cabinet_session() as db:
            try:
                # Get job and transcript
                job = await self._get_job(db, job_id)
                transcript = await self._get_transcript(db, transcript_id)
                
                if not job or not transcript:
                    logger.error(f"Job or transcript not found: {job_id}, {transcript_id}")
                    return
                
                # Start job
                job.start()
                job.update_progress(5, "Starting transcription")
                await db.commit()
                
                # Step 1: Transcription
                logger.info("Step 1: Transcription")
                transcription_result = await self._step_transcribe(
                    job, transcript, file_path, source_type, db
                )
                
                if not transcription_result:
                    return
                
                # Step 2: AI Analysis
                logger.info("Step 2: AI Analysis")
                await self._step_analyze(
                    job, transcript, ai_model, db
                )
                
                # Step 3: Generate Embeddings
                logger.info("Step 3: Generating Embeddings")
                await self._step_embed(
                    job, transcript, db
                )
                
                # Mark complete
                job.complete()
                transcript.status = "completed"
                await db.commit()
                
                logger.info(f"Processing pipeline completed for job {job_id}")
                
            except Exception as e:
                logger.error(f"Processing pipeline failed: {str(e)}")
                await self._fail_job(db, job_id, str(e))
    
    async def process_text_paste(
        self,
        job_id: UUID,
        transcript_id: UUID,
        user_id: UUID,
        ai_model: Optional[str] = None,
    ):
        """
        Process a text-pasted transcript (no transcription needed).
        
        Args:
            job_id: Processing job ID
            transcript_id: Transcript ID
            user_id: User ID
            ai_model: AI model for analysis
        """
        logger.info(f"Processing text paste for job {job_id}")
        
        async with get_cabinet_session() as db:
            try:
                job = await self._get_job(db, job_id)
                transcript = await self._get_transcript(db, transcript_id)
                
                if not job or not transcript:
                    return
                
                job.start()
                job.update_progress(20, "Starting analysis")
                await db.commit()
                
                # Step 1: AI Analysis
                await self._step_analyze(job, transcript, ai_model, db)
                
                # Step 2: Generate Embeddings
                await self._step_embed(job, transcript, db)
                
                # Mark complete
                job.complete()
                transcript.status = "completed"
                await db.commit()
                
                logger.info(f"Text paste processing completed for job {job_id}")
                
            except Exception as e:
                logger.error(f"Text paste processing failed: {str(e)}")
                await self._fail_job(db, job_id, str(e))
    
    async def _step_transcribe(
        self,
        job: ProcessingJob,
        transcript: Transcript,
        file_path: str,
        source_type: str,
        db: AsyncSession,
    ) -> Optional[Dict[str, Any]]:
        """Execute transcription step."""
        try:
            job.update_progress(10, "Transcribing audio")
            await db.commit()
            
            # Get duration
            duration = await self.transcription_service.get_audio_duration(file_path)
            transcript.duration_seconds = duration
            
            # Transcribe
            if source_type == "video":
                result = await self.transcription_service.transcribe_video(file_path)
            else:
                result = await self.transcription_service.transcribe_audio(file_path)
            
            # Update transcript
            transcript.full_text = result["text"]
            transcript.language = result.get("language", "en")
            transcript.transcribed_at = datetime.utcnow()
            transcript.word_count = len(result["text"].split())
            
            job.update_progress(40, "Transcription completed")
            await db.commit()
            
            return result
            
        except TranscriptionError as e:
            job.fail(f"Transcription failed: {str(e)}")
            transcript.status = "failed"
            transcript.processing_error = str(e)
            await db.commit()
            return None
    
    async def _step_analyze(
        self,
        job: ProcessingJob,
        transcript: Transcript,
        ai_model: Optional[str],
        db: AsyncSession,
    ):
        """Execute AI analysis step."""
        try:
            job.update_progress(50, "Analyzing content with AI")
            await db.commit()
            
            if not transcript.full_text:
                logger.warning("No text to analyze")
                return
            
            # Run analysis
            analysis = await self.ai_analysis_service.analyze_transcript(
                text=transcript.full_text,
                title=transcript.title,
                model=ai_model,
                extract_actions=True,
            )
            
            # Update transcript with analysis results
            transcript.ai_summary = analysis.get("summary")
            transcript.key_insights = analysis.get("key_insights", [])
            transcript.sentiment = analysis.get("sentiment")
            transcript.sentiment_score = analysis.get("sentiment_score")
            transcript.topics = analysis.get("topics", [])
            transcript.tags = analysis.get("tags", [])
            transcript.auto_categories = analysis.get("categories", [])
            transcript.analyzed_at = datetime.utcnow()
            
            # Create action items
            for item_data in analysis.get("action_items", []):
                action_item = ActionItem(
                    transcript_id=transcript.id,
                    user_id=transcript.user_id,
                    description=item_data.get("description", ""),
                    assigned_to=item_data.get("assigned_to"),
                    priority=item_data.get("priority", "medium"),
                    confidence_score=item_data.get("confidence"),
                    source_text=item_data.get("source_text"),
                )
                
                # Parse due date if provided
                due_date_str = item_data.get("due_date")
                if due_date_str:
                    try:
                        from datetime import date
                        action_item.due_date = date.fromisoformat(due_date_str)
                        action_item.due_date_confidence = item_data.get("confidence", 0.8)
                    except ValueError:
                        pass
                
                db.add(action_item)
            
            job.update_progress(70, "AI analysis completed")
            await db.commit()
            
        except AIAnalysisError as e:
            logger.warning(f"AI analysis failed: {str(e)}")
            job.update_progress(70, f"AI analysis failed: {str(e)}")
            await db.commit()
    
    async def _step_embed(
        self,
        job: ProcessingJob,
        transcript: Transcript,
        db: AsyncSession,
    ):
        """Execute embedding generation step."""
        try:
            job.update_progress(80, "Generating embeddings")
            await db.commit()
            
            if not transcript.full_text:
                logger.warning("No text to embed")
                return
            
            # Generate and store embeddings
            chunk_count = await self.embedding_service.embed_transcript(
                transcript_id=transcript.id,
                text=transcript.full_text,
                db=db,
            )
            
            job.update_progress(95, f"Created {chunk_count} embeddings")
            await db.commit()
            
        except EmbeddingError as e:
            logger.warning(f"Embedding generation failed: {str(e)}")
            job.update_progress(95, f"Embedding failed: {str(e)}")
            await db.commit()
    
    async def _get_job(
        self, 
        db: AsyncSession, 
        job_id: UUID
    ) -> Optional[ProcessingJob]:
        """Get processing job by ID."""
        from sqlalchemy import select
        result = await db.execute(
            select(ProcessingJob).where(ProcessingJob.id == job_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_transcript(
        self, 
        db: AsyncSession, 
        transcript_id: UUID
    ) -> Optional[Transcript]:
        """Get transcript by ID."""
        from sqlalchemy import select
        result = await db.execute(
            select(Transcript).where(Transcript.id == transcript_id)
        )
        return result.scalar_one_or_none()
    
    async def _fail_job(
        self, 
        db: AsyncSession, 
        job_id: UUID, 
        error: str
    ):
        """Mark job as failed."""
        try:
            job = await self._get_job(db, job_id)
            if job:
                job.fail(error)
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to update job status: {str(e)}")


# Global processor instance
background_processor = BackgroundProcessor()


async def run_processing_pipeline(
    job_id: UUID,
    transcript_id: UUID,
    file_path: str,
    source_type: str,
    user_id: UUID,
    ai_model: Optional[str] = None,
):
    """
    Entry point for running the processing pipeline.
    Use with FastAPI BackgroundTasks.
    """
    await background_processor.process_upload(
        job_id=job_id,
        transcript_id=transcript_id,
        file_path=file_path,
        source_type=source_type,
        user_id=user_id,
        ai_model=ai_model,
    )


async def run_text_processing_pipeline(
    job_id: UUID,
    transcript_id: UUID,
    user_id: UUID,
    ai_model: Optional[str] = None,
):
    """
    Entry point for processing text-pasted transcripts.
    Use with FastAPI BackgroundTasks.
    """
    await background_processor.process_text_paste(
        job_id=job_id,
        transcript_id=transcript_id,
        user_id=user_id,
        ai_model=ai_model,
    )
