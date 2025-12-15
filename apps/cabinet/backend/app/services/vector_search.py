"""
Vector Search Service
Semantic search using pgvector for cosine similarity queries.
"""

import logging
import time
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.embeddings import EmbeddingService
from app.models.transcript import Transcript, TranscriptChunk
from app.models.search_history import SearchHistory


logger = logging.getLogger(__name__)


class VectorSearchService:
    """
    Service for semantic search using vector embeddings and pgvector.
    """
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
    
    async def semantic_search(
        self,
        query: str,
        user_id: UUID,
        db: AsyncSession,
        limit: int = 10,
        similarity_threshold: float = 0.7,
        category_ids: Optional[List[UUID]] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform semantic search using vector similarity.
        
        Args:
            query: Search query text
            user_id: User ID to search within
            db: Database session
            limit: Maximum results to return
            similarity_threshold: Minimum similarity score (0-1)
            category_ids: Filter by category IDs
            date_from: Filter by start date
            date_to: Filter by end date
            
        Returns:
            Dict with search results and metadata
        """
        start_time = time.time()
        
        logger.info(f"Semantic search: '{query}' for user {user_id}")
        
        # Generate embedding for query
        query_embedding = await self.embedding_service.generate_embedding(query)
        
        # Build the vector search query
        # pgvector uses <=> for cosine distance (1 - similarity)
        sql = text("""
            WITH ranked_chunks AS (
                SELECT 
                    tc.id as chunk_id,
                    tc.transcript_id,
                    tc.chunk_text,
                    tc.chunk_index,
                    1 - (tc.embedding <=> :query_embedding::vector) as similarity,
                    t.title,
                    t.source_type,
                    t.category_id,
                    t.sentiment,
                    t.created_at,
                    c.name as category_name
                FROM transcript_chunks tc
                JOIN transcripts t ON tc.transcript_id = t.id
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = :user_id
                AND t.status = 'completed'
                AND tc.embedding IS NOT NULL
                AND 1 - (tc.embedding <=> :query_embedding::vector) >= :threshold
                ORDER BY similarity DESC
                LIMIT :limit
            )
            SELECT * FROM ranked_chunks
        """)
        
        result = await db.execute(
            sql,
            {
                "query_embedding": query_embedding,
                "user_id": user_id,
                "threshold": similarity_threshold,
                "limit": limit * 2,  # Get more to group by transcript
            }
        )
        
        rows = result.fetchall()
        
        # Group chunks by transcript
        transcript_results = {}
        for row in rows:
            tid = str(row.transcript_id)
            if tid not in transcript_results:
                transcript_results[tid] = {
                    "transcript_id": row.transcript_id,
                    "title": row.title,
                    "source_type": row.source_type,
                    "category_name": row.category_name,
                    "sentiment": row.sentiment,
                    "created_at": row.created_at,
                    "matching_chunks": [],
                    "max_similarity": 0,
                }
            
            transcript_results[tid]["matching_chunks"].append({
                "chunk_id": row.chunk_id,
                "chunk_text": row.chunk_text,
                "chunk_index": row.chunk_index,
                "similarity_score": float(row.similarity),
            })
            
            if row.similarity > transcript_results[tid]["max_similarity"]:
                transcript_results[tid]["max_similarity"] = float(row.similarity)
        
        # Sort by max similarity and limit
        results = sorted(
            transcript_results.values(),
            key=lambda x: x["max_similarity"],
            reverse=True
        )[:limit]
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Log search history
        await self._log_search(
            db=db,
            user_id=user_id,
            query=query,
            search_type="semantic",
            results_count=len(results),
            execution_time_ms=execution_time_ms,
        )
        
        return {
            "results": results,
            "total": len(results),
            "query": query,
            "search_type": "semantic",
            "execution_time_ms": execution_time_ms,
        }
    
    async def keyword_search(
        self,
        query: str,
        user_id: UUID,
        db: AsyncSession,
        limit: int = 20,
        page: int = 1,
        category_ids: Optional[List[UUID]] = None,
    ) -> Dict[str, Any]:
        """
        Perform full-text keyword search using PostgreSQL tsvector.
        
        Args:
            query: Search query text
            user_id: User ID to search within
            db: Database session
            limit: Results per page
            page: Page number
            category_ids: Filter by category IDs
            
        Returns:
            Dict with search results and metadata
        """
        start_time = time.time()
        
        logger.info(f"Keyword search: '{query}' for user {user_id}")
        
        offset = (page - 1) * limit
        
        # Build full-text search query
        sql = text("""
            SELECT 
                t.id as transcript_id,
                t.title,
                t.source_type,
                t.sentiment,
                t.created_at,
                c.name as category_name,
                ts_rank(
                    to_tsvector('english', COALESCE(t.title, '') || ' ' || COALESCE(t.full_text, '')),
                    plainto_tsquery('english', :query)
                ) as rank_score,
                ts_headline(
                    'english',
                    COALESCE(t.full_text, ''),
                    plainto_tsquery('english', :query),
                    'MaxWords=50, MinWords=20, StartSel=**, StopSel=**'
                ) as snippet
            FROM transcripts t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = :user_id
            AND t.status = 'completed'
            AND to_tsvector('english', COALESCE(t.title, '') || ' ' || COALESCE(t.full_text, ''))
                @@ plainto_tsquery('english', :query)
            ORDER BY rank_score DESC
            LIMIT :limit OFFSET :offset
        """)
        
        result = await db.execute(
            sql,
            {
                "query": query,
                "user_id": user_id,
                "limit": limit,
                "offset": offset,
            }
        )
        
        rows = result.fetchall()
        
        results = [
            {
                "transcript_id": row.transcript_id,
                "title": row.title,
                "source_type": row.source_type,
                "category_name": row.category_name,
                "sentiment": row.sentiment,
                "created_at": row.created_at,
                "snippet": row.snippet,
                "rank_score": float(row.rank_score),
            }
            for row in rows
        ]
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Log search history
        await self._log_search(
            db=db,
            user_id=user_id,
            query=query,
            search_type="keyword",
            results_count=len(results),
            execution_time_ms=execution_time_ms,
        )
        
        return {
            "results": results,
            "total": len(results),
            "query": query,
            "search_type": "keyword",
            "page": page,
            "execution_time_ms": execution_time_ms,
        }
    
    async def combined_search(
        self,
        query: str,
        user_id: UUID,
        db: AsyncSession,
        limit: int = 20,
        semantic_weight: float = 0.5,
        keyword_weight: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Perform hybrid search combining semantic and keyword results.
        
        Args:
            query: Search query text
            user_id: User ID to search within
            db: Database session
            limit: Maximum results
            semantic_weight: Weight for semantic results (0-1)
            keyword_weight: Weight for keyword results (0-1)
            
        Returns:
            Dict with combined search results
        """
        start_time = time.time()
        
        logger.info(f"Combined search: '{query}' for user {user_id}")
        
        # Run both searches
        semantic_results = await self.semantic_search(
            query, user_id, db, limit=limit * 2
        )
        keyword_results = await self.keyword_search(
            query, user_id, db, limit=limit * 2
        )
        
        # Normalize and combine scores
        combined = {}
        
        # Add semantic results
        for result in semantic_results["results"]:
            tid = str(result["transcript_id"])
            combined[tid] = {
                **result,
                "semantic_score": result.get("max_similarity", 0),
                "keyword_score": 0,
                "combined_score": result.get("max_similarity", 0) * semantic_weight,
            }
        
        # Add/update with keyword results
        for result in keyword_results["results"]:
            tid = str(result["transcript_id"])
            keyword_score = result.get("rank_score", 0)
            
            if tid in combined:
                combined[tid]["keyword_score"] = keyword_score
                combined[tid]["snippet"] = result.get("snippet")
                combined[tid]["combined_score"] += keyword_score * keyword_weight
            else:
                combined[tid] = {
                    **result,
                    "semantic_score": 0,
                    "keyword_score": keyword_score,
                    "combined_score": keyword_score * keyword_weight,
                }
        
        # Sort by combined score
        results = sorted(
            combined.values(),
            key=lambda x: x["combined_score"],
            reverse=True
        )[:limit]
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Log search history
        await self._log_search(
            db=db,
            user_id=user_id,
            query=query,
            search_type="combined",
            results_count=len(results),
            execution_time_ms=execution_time_ms,
        )
        
        return {
            "results": results,
            "total": len(results),
            "query": query,
            "search_type": "combined",
            "execution_time_ms": execution_time_ms,
        }
    
    async def _log_search(
        self,
        db: AsyncSession,
        user_id: UUID,
        query: str,
        search_type: str,
        results_count: int,
        execution_time_ms: int,
    ):
        """Log search to history for analytics."""
        try:
            history = SearchHistory(
                user_id=user_id,
                query_text=query,
                search_type=search_type,
                results_count=results_count,
                execution_time_ms=execution_time_ms,
            )
            db.add(history)
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to log search history: {str(e)}")
