"""
Shared Authentication for Raysource Labs Platform (Python)
Used by Cabinet (cabinet.raysourcelabs.com) - FastAPI backend

This module mirrors the TypeScript @raysourcelabs/shared-auth package
to ensure consistent auth behavior across CEO and Cabinet apps.
"""

from datetime import datetime, timedelta
from typing import Optional, Literal
import os

import jwt
from pydantic import BaseModel


# ============================================================================
# TYPES (Mirrors packages/shared-auth/src/types.ts)
# ============================================================================

class JwtPayload(BaseModel):
    """JWT payload structure - matches TypeScript JwtPayload"""
    id: str
    email: str
    is_admin: bool = False
    iat: Optional[int] = None
    exp: Optional[int] = None


class AuthUser(BaseModel):
    """Authenticated request user"""
    id: str
    email: str
    is_admin: bool = False


class TokenPair(BaseModel):
    """Token pair returned after login"""
    access_token: str
    refresh_token: str
    expires_in: int


class AuthError(BaseModel):
    """Standard API error response"""
    code: Literal['INVALID_TOKEN', 'EXPIRED_TOKEN', 'USER_NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN']
    message: str
    status_code: int


class AuthConfig(BaseModel):
    """Auth config shared across apps"""
    jwt_secret: str
    jwt_expires_in: int = 604800  # 7 days in seconds
    refresh_expires_in: int = 2592000  # 30 days in seconds
    issuer: str = "raysourcelabs.com"
    audience: list[str] = ["py.raysourcelabs.com", "cabinet.raysourcelabs.com"]


# ============================================================================
# CONFIGURATION
# ============================================================================

_config: Optional[AuthConfig] = None


def init_auth_config(
    jwt_secret: Optional[str] = None,
    jwt_expires_in: Optional[int] = None,
    refresh_expires_in: Optional[int] = None,
    issuer: Optional[str] = None,
    audience: Optional[list[str]] = None,
) -> AuthConfig:
    """Initialize auth config with environment-specific values"""
    global _config
    
    secret = jwt_secret or os.getenv("JWT_SECRET", "")
    if not secret:
        raise ValueError("JWT_SECRET is required for authentication")
    
    _config = AuthConfig(
        jwt_secret=secret,
        jwt_expires_in=jwt_expires_in or 604800,
        refresh_expires_in=refresh_expires_in or 2592000,
        issuer=issuer or "raysourcelabs.com",
        audience=audience or ["py.raysourcelabs.com", "cabinet.raysourcelabs.com"],
    )
    return _config


def get_auth_config() -> AuthConfig:
    """Get current auth config"""
    global _config
    if _config is None:
        init_auth_config()
    return _config  # type: ignore


# ============================================================================
# JWT UTILITIES (Mirrors packages/shared-auth/src/jwt.ts)
# ============================================================================

def generate_access_token(payload: JwtPayload) -> str:
    """Generate a JWT access token"""
    config = get_auth_config()
    
    now = datetime.utcnow()
    exp = now + timedelta(seconds=config.jwt_expires_in)
    
    token_data = {
        "id": payload.id,
        "email": payload.email,
        "is_admin": payload.is_admin,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "iss": config.issuer,
        "aud": config.audience,
    }
    
    return jwt.encode(token_data, config.jwt_secret, algorithm="HS256")


def generate_refresh_token(user_id: str) -> str:
    """Generate a refresh token (longer expiry)"""
    config = get_auth_config()
    
    now = datetime.utcnow()
    exp = now + timedelta(seconds=config.refresh_expires_in)
    
    token_data = {
        "id": user_id,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "iss": config.issuer,
        "aud": config.audience,
    }
    
    return jwt.encode(token_data, config.jwt_secret, algorithm="HS256")


def generate_token_pair(payload: JwtPayload) -> TokenPair:
    """Generate both access and refresh tokens"""
    config = get_auth_config()
    
    return TokenPair(
        access_token=generate_access_token(payload),
        refresh_token=generate_refresh_token(payload.id),
        expires_in=config.jwt_expires_in,
    )


def verify_token(token: str) -> JwtPayload:
    """Verify and decode a JWT token"""
    config = get_auth_config()
    
    try:
        decoded = jwt.decode(
            token,
            config.jwt_secret,
            algorithms=["HS256"],
            issuer=config.issuer,
            audience=config.audience,
        )
        
        return JwtPayload(
            id=decoded["id"],
            email=decoded["email"],
            is_admin=decoded.get("is_admin", False),
            iat=decoded.get("iat"),
            exp=decoded.get("exp"),
        )
    except jwt.ExpiredSignatureError:
        raise create_auth_error("EXPIRED_TOKEN", "Token has expired")
    except jwt.InvalidTokenError:
        raise create_auth_error("INVALID_TOKEN", "Invalid token")


def decode_token(token: str) -> Optional[JwtPayload]:
    """Decode a token without verification (use carefully!)"""
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return JwtPayload(
            id=decoded["id"],
            email=decoded["email"],
            is_admin=decoded.get("is_admin", False),
            iat=decoded.get("iat"),
            exp=decoded.get("exp"),
        )
    except Exception:
        return None


def is_token_expired(token: str) -> bool:
    """Check if a token is expired"""
    payload = decode_token(token)
    if payload is None or payload.exp is None:
        return True
    
    return datetime.utcnow().timestamp() >= payload.exp


def extract_token_from_header(auth_header: Optional[str]) -> Optional[str]:
    """Extract token from Authorization header"""
    if not auth_header:
        return None
    
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    return parts[1]


# ============================================================================
# ERROR HANDLING
# ============================================================================

class AuthException(Exception):
    """Custom exception for auth errors"""
    def __init__(self, error: AuthError):
        self.error = error
        super().__init__(error.message)


def create_auth_error(
    code: Literal['INVALID_TOKEN', 'EXPIRED_TOKEN', 'USER_NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN'],
    message: str,
) -> AuthException:
    """Create a standardized auth error"""
    status_codes = {
        "INVALID_TOKEN": 401,
        "EXPIRED_TOKEN": 401,
        "USER_NOT_FOUND": 404,
        "UNAUTHORIZED": 401,
        "FORBIDDEN": 403,
    }
    
    error = AuthError(
        code=code,
        message=message,
        status_code=status_codes[code],
    )
    
    return AuthException(error)


# ============================================================================
# PASSWORD UTILITIES
# ============================================================================

import bcrypt as bcrypt_lib


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt_lib.gensalt(rounds=12)
    return bcrypt_lib.hashpw(password.encode(), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt_lib.checkpw(password.encode(), hashed.encode())


# ============================================================================
# FASTAPI INTEGRATION
# ============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """FastAPI dependency to get current authenticated user"""
    try:
        payload = verify_token(credentials.credentials)
        return AuthUser(
            id=payload.id,
            email=payload.email,
            is_admin=payload.is_admin,
        )
    except AuthException as e:
        raise HTTPException(
            status_code=e.error.status_code,
            detail=e.error.message,
        )


async def require_admin(
    user: AuthUser = Depends(get_current_user),
) -> AuthUser:
    """FastAPI dependency to require admin access"""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
