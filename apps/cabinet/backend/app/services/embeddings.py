"""
Embedding Service
Generates vector embeddings using OpenAI text-embedding-ada-002.
Handles text chunking and embedding storage in pgvector.
"""

import logging
from typing import List, Optional, Tuple
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from app.config import settings
from app.models.transcript import TranscriptChunk


logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service for generating and managing vector embeddings.
    Uses OpenAI text-embedding-ada-002 (1536 dimensions).
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.embedding_model
        self.dimensions = settings.embedding_dimensions
        self.chunk_size = settings.chunk_size
        self.chunk_overlap = settings.chunk_overlap
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats (1536 dimensions)
        """
        if not text or not text.strip():
            raise EmbeddingError("Cannot embed empty text")
        
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=text[:8000],  # Limit input length
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise EmbeddingError(f"Failed to generate embedding: {str(e)}")
    
    async def generate_embeddings_batch(
        self, 
        texts: List[str]
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in a batch.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        # Filter empty texts and limit length
        processed_texts = [t[:8000] for t in texts if t and t.strip()]
        
        if not processed_texts:
            return []
        
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=processed_texts,
            )
            
            # Sort by index to maintain order
            embeddings = sorted(response.data, key=lambda x: x.index)
            return [e.embedding for e in embeddings]
            
        except Exception as e:
            logger.error(f"Batch embedding failed: {str(e)}")
            raise EmbeddingError(f"Failed to generate embeddings: {str(e)}")
    
    def chunk_text(
        self, 
        text: str,
        chunk_size: Optional[int] = None,
        overlap: Optional[int] = None,
    ) -> List[Tuple[str, int, int]]:
        """
        Split text into overlapping chunks for embedding.
        
        Args:
            text: Full text to chunk
            chunk_size: Characters per chunk (default: settings.chunk_size)
            overlap: Characters of overlap (default: settings.chunk_overlap)
            
        Returns:
            List of (chunk_text, start_char, end_char) tuples
        """
        chunk_size = chunk_size or self.chunk_size
        overlap = overlap or self.chunk_overlap
        
        if not text or len(text) <= chunk_size:
            return [(text, 0, len(text))] if text else []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings
                for delimiter in ['. ', '! ', '? ', '\n\n', '\n']:
                    last_delimiter = text[start:end].rfind(delimiter)
                    if last_delimiter > chunk_size * 0.5:
                        end = start + last_delimiter + len(delimiter)
                        break
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append((chunk_text, start, min(end, len(text))))
            
            # Move start position with overlap
            start = end - overlap
            if start <= chunks[-1][1] if chunks else 0:
                start = end  # Prevent infinite loop
        
        logger.info(f"Text chunked into {len(chunks)} chunks")
        return chunks
    
    async def embed_transcript(
        self,
        transcript_id: UUID,
        text: str,
        db: AsyncSession,
    ) -> int:
        """
        Chunk text, generate embeddings, and store in database.
        
        Args:
            transcript_id: UUID of the parent transcript
            text: Full transcript text
            db: Database session
            
        Returns:
            Number of chunks created
        """
        logger.info(f"Embedding transcript {transcript_id}")
        
        # Delete existing chunks for this transcript
        await db.execute(
            delete(TranscriptChunk).where(
                TranscriptChunk.transcript_id == transcript_id
            )
        )
        
        # Chunk the text
        chunks = self.chunk_text(text)
        
        if not chunks:
            logger.warning(f"No chunks generated for transcript {transcript_id}")
            return 0
        
        # Generate embeddings in batches
        batch_size = 50
        all_chunks = []
        
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            chunk_texts = [c[0] for c in batch]
            
            embeddings = await self.generate_embeddings_batch(chunk_texts)
            
            for j, (chunk_text, start_char, end_char) in enumerate(batch):
                chunk = TranscriptChunk(
                    transcript_id=transcript_id,
                    chunk_index=i + j,
                    chunk_text=chunk_text,
                    start_char=start_char,
                    end_char=end_char,
                    embedding=embeddings[j] if j < len(embeddings) else None,
                    token_count=len(chunk_text.split()),
                )
                all_chunks.append(chunk)
        
        # Bulk insert chunks
        db.add_all(all_chunks)
        await db.commit()
        
        logger.info(f"Created {len(all_chunks)} chunks with embeddings")
        return len(all_chunks)
    
    def estimate_tokens(self, text: str) -> int:
        """
        Estimate the number of tokens in a text.
        Rough estimate: ~4 characters per token for English.
        
        Args:
            text: Text to estimate
            
        Returns:
            Estimated token count
        """
        return len(text) // 4


class EmbeddingError(Exception):
    """Custom exception for embedding errors."""
    pass
