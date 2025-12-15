"""
Cabinet Authentication Module
Validates JWT tokens using the SAME secret as py.raysourcelabs.com.
Authenticates users against the shared andora_db.users table.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_auth_db


# Bearer token security scheme
security = HTTPBearer()


class TokenData:
    """Decoded JWT token data."""
    
    def __init__(
        self,
        user_id: UUID,
        email: str,
        exp: datetime,
        iat: datetime,
        **kwargs
    ):
        self.user_id = user_id
        self.email = email
        self.exp = exp
        self.iat = iat
        self.extra = kwargs


class User:
    """User model representing a user from andora_db."""
    
    def __init__(
        self,
        id: UUID,
        email: str,
        name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        is_active: bool = True,
        is_admin: bool = False,
        preferred_ai_model: Optional[str] = None,
        created_at: Optional[datetime] = None,
        **kwargs
    ):
        self.id = id
        self.email = email
        self.name = name
        self.avatar_url = avatar_url
        self.is_active = is_active
        self.is_admin = is_admin
        self.preferred_ai_model = preferred_ai_model or "gpt-4o"
        self.created_at = created_at
        self.extra = kwargs
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary."""
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "is_admin": self.is_admin,
            "preferred_ai_model": self.preferred_ai_model,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def decode_jwt_token(token: str) -> TokenData:
    """
    Decode and validate JWT token.
    Uses the SAME secret as py.raysourcelabs.com for shared authentication.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenData with decoded payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        
        # Extract user_id - handle different payload formats
        user_id = payload.get("user_id") or payload.get("sub") or payload.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user identifier",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        email = payload.get("email", "")
        exp = datetime.fromtimestamp(payload.get("exp", 0))
        iat = datetime.fromtimestamp(payload.get("iat", 0))
        
        # Check expiration
        if exp < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(
            user_id=UUID(user_id) if isinstance(user_id, str) else user_id,
            email=email,
            exp=exp,
            iat=iat,
            **{k: v for k, v in payload.items() if k not in ["user_id", "sub", "id", "email", "exp", "iat"]}
        )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_user_from_db(
    user_id: UUID,
    db: AsyncSession
) -> Optional[User]:
    """
    Fetch user from andora_db.users table.
    
    Args:
        user_id: User UUID
        db: Auth database session
        
    Returns:
        User object or None if not found
    """
    query = text("""
        SELECT 
            id, email, name, avatar_url, 
            is_active, is_admin, preferred_ai_model, created_at
        FROM users 
        WHERE id = :user_id
    """)
    
    result = await db.execute(query, {"user_id": user_id})
    row = result.fetchone()
    
    if not row:
        return None
    
    return User(
        id=row.id,
        email=row.email,
        name=row.name,
        avatar_url=row.avatar_url,
        is_active=row.is_active if hasattr(row, 'is_active') else True,
        is_admin=row.is_admin if hasattr(row, 'is_admin') else False,
        preferred_ai_model=row.preferred_ai_model if hasattr(row, 'preferred_ai_model') else None,
        created_at=row.created_at,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_db: AsyncSession = Depends(get_auth_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    This is the main authentication dependency for Cabinet endpoints.
    It validates the JWT token using the shared secret and fetches
    the user from the shared andora_db.users table.
    
    Args:
        credentials: Bearer token from request header
        auth_db: Auth database session
        
    Returns:
        User object for the authenticated user
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    
    # Decode and validate JWT
    token_data = decode_jwt_token(token)
    
    # Fetch user from auth database
    user = await get_user_from_db(token_data.user_id, auth_db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify they are active.
    
    Use this dependency when you want to ensure the user
    has an active account.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        User object if active
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    return current_user


async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current user and verify they have admin privileges.
    
    Args:
        current_user: User from get_current_active_user dependency
        
    Returns:
        User object if admin
        
    Raises:
        HTTPException: If user is not admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[TokenData]:
    """
    Get user from token if provided, but don't require authentication.
    
    Useful for endpoints that work for both authenticated and anonymous users.
    
    Args:
        credentials: Optional bearer token
        
    Returns:
        TokenData if token provided and valid, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return decode_jwt_token(credentials.credentials)
    except HTTPException:
        return None
