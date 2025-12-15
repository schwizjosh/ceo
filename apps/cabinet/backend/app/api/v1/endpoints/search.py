"""
Search Endpoints
Semantic, keyword, and combined search endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_active_user, User
from app.database import get_cabinet_db
from app.schemas.search import (
    SemanticSearchRequest,
    KeywordSearchRequest,
    CombinedSearchRequest,
    SearchResponse,
)
from app.services.vector_search import VectorSearchService


router = APIRouter(prefix="/search", tags=["Search"])


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(
    request: SemanticSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Perform semantic (vector similarity) search.
    
    Uses OpenAI embeddings and pgvector for cosine similarity search.
    Returns transcript chunks most similar to the query.
    """
    search_service = VectorSearchService()
    
    # Extract filter UUIDs
    category_ids = None
    if request.filters and request.filters.category_ids:
        category_ids = request.filters.category_ids
    
    result = await search_service.semantic_search(
        query=request.query,
        user_id=current_user.id,
        db=db,
        limit=request.limit,
        similarity_threshold=request.similarity_threshold,
        category_ids=category_ids,
    )
    
    return SearchResponse(
        results=result["results"],
        total=result["total"],
        query=result["query"],
        search_type=result["search_type"],
        execution_time_ms=result["execution_time_ms"],
    )


@router.post("/keyword", response_model=SearchResponse)
async def keyword_search(
    request: KeywordSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Perform full-text keyword search.
    
    Uses PostgreSQL tsvector for text search with ranking.
    Returns transcripts matching the keywords.
    """
    search_service = VectorSearchService()
    
    category_ids = None
    if request.filters and request.filters.category_ids:
        category_ids = request.filters.category_ids
    
    result = await search_service.keyword_search(
        query=request.query,
        user_id=current_user.id,
        db=db,
        limit=request.limit,
        page=request.page,
        category_ids=category_ids,
    )
    
    return SearchResponse(
        results=result["results"],
        total=result["total"],
        query=result["query"],
        search_type=result["search_type"],
        execution_time_ms=result["execution_time_ms"],
    )


@router.post("/combined", response_model=SearchResponse)
async def combined_search(
    request: CombinedSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_cabinet_db),
):
    """
    Perform hybrid search combining semantic and keyword results.
    
    Combines vector similarity and full-text search with configurable weights.
    Best balance of semantic understanding and exact matching.
    """
    search_service = VectorSearchService()
    
    result = await search_service.combined_search(
        query=request.query,
        user_id=current_user.id,
        db=db,
        limit=request.limit,
        semantic_weight=request.semantic_weight,
        keyword_weight=request.keyword_weight,
    )
    
    return SearchResponse(
        results=result["results"],
        total=result["total"],
        query=result["query"],
        search_type=result["search_type"],
        execution_time_ms=result["execution_time_ms"],
    )
