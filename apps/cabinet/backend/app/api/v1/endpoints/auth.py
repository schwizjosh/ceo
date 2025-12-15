"""
Auth Endpoints
Authentication validation endpoints using shared JWT.
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user, get_current_active_user, User
from app.schemas.auth import UserResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current authenticated user information.
    
    Validates the JWT token and returns user profile from andora_db.
    This endpoint uses the SAME JWT secret as py.raysourcelabs.com.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        preferred_ai_model=current_user.preferred_ai_model,
        created_at=current_user.created_at,
    )


@router.get("/validate")
async def validate_token(
    current_user: User = Depends(get_current_user)
):
    """
    Validate JWT token.
    
    Returns a simple response indicating token validity.
    """
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "email": current_user.email,
    }
