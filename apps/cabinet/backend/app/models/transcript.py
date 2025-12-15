"""
Transcript Models
Core models for storing transcript data and embeddings.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, 
    DateTime, ForeignKey, BigInteger, Enum, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database import Base


class Transcript(Base):
    """
    Core transcript table storing transcription data and AI analysis results.
    user_id references andora_db.users(id) (cross-database).
    """
    
    __tablename__ = "transcripts"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # User reference (cross-database to andora_db.users)
    user_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    
    # Meeting reference (optional)
    meeting_id = Column(
        PGUUID(as_uuid=True), 
        ForeignKey("meetings.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    # Basic info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Source information
    source_type = Column(
        String(20), 
        nullable=False,
        # Constraint: audio, video, text, paste
    )
    source_filename = Column(String(255), nullable=True)
    source_url = Column(Text, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    
    # Transcription data
    full_text = Column(Text, nullable=True)
    language = Column(String(10), default="en")
    confidence_score = Column(Float, nullable=True)
    word_count = Column(Integer, nullable=True)
    
    # AI Analysis results
    ai_summary = Column(Text, nullable=True)
    key_insights = Column(JSONB, default=list)
    sentiment = Column(String(20), nullable=True)  # positive, neutral, negative, mixed
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    topics = Column(JSONB, default=list)
    tags = Column(ARRAY(String), default=list)
    
    # Category assignment
    category_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    auto_categories = Column(JSONB, default=list)
    
    # Status tracking
    status = Column(
        String(20), 
        default="pending",
        index=True
        # Constraint: pending, processing, completed, failed, archived
    )
    processing_error = Column(Text, nullable=True)
    
    # Metadata
    metadata = Column(JSONB, default=dict)
    is_favorite = Column(Boolean, default=False, index=True)
    is_archived = Column(Boolean, default=False)
    
    # Timestamps
    transcribed_at = Column(DateTime(timezone=True), nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chunks = relationship("TranscriptChunk", back_populates="transcript", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="transcript", cascade="all, delete-orphan")
    category = relationship("Category", back_populates="transcripts")
    meeting = relationship("Meeting", back_populates="transcripts")
    processing_jobs = relationship("ProcessingJob", back_populates="transcript", cascade="all, delete-orphan")
    
    def to_dict(self, include_text: bool = False) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        result = {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "meeting_id": str(self.meeting_id) if self.meeting_id else None,
            "title": self.title,
            "description": self.description,
            "source_type": self.source_type,
            "source_filename": self.source_filename,
            "file_size_bytes": self.file_size_bytes,
            "duration_seconds": self.duration_seconds,
            "language": self.language,
            "confidence_score": self.confidence_score,
            "word_count": self.word_count,
            "ai_summary": self.ai_summary,
            "key_insights": self.key_insights,
            "sentiment": self.sentiment,
            "sentiment_score": self.sentiment_score,
            "topics": self.topics,
            "tags": self.tags,
            "category_id": str(self.category_id) if self.category_id else None,
            "status": self.status,
            "is_favorite": self.is_favorite,
            "is_archived": self.is_archived,
            "transcribed_at": self.transcribed_at.isoformat() if self.transcribed_at else None,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_text:
            result["full_text"] = self.full_text
            
        return result


class TranscriptChunk(Base):
    """
    Chunked transcript text with vector embeddings for semantic search.
    Uses pgvector for 1536-dimensional embeddings (text-embedding-ada-002).
    """
    
    __tablename__ = "transcript_chunks"
    
    # Primary key
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Parent transcript
    transcript_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("transcripts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Chunk data
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)
    
    # Vector embedding (1536 dimensions for text-embedding-ada-002)
    embedding = Column(Vector(1536), nullable=True)
    
    # Metadata
    token_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    transcript = relationship("Transcript", back_populates="chunks")
    
    def to_dict(self, include_embedding: bool = False) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        result = {
            "id": str(self.id),
            "transcript_id": str(self.transcript_id),
            "chunk_index": self.chunk_index,
            "chunk_text": self.chunk_text,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_embedding and self.embedding is not None:
            result["embedding"] = self.embedding.tolist()
            
        return result
