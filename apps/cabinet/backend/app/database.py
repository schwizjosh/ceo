"""
Cabinet Database Module
Manages connections to both cabinet_db (business data) and andora_db (auth).
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import QueuePool

from app.config import settings


# ============================================================
# SQLAlchemy Base
# ============================================================
Base = declarative_base()


# ============================================================
# Cabinet Database (cabinet_db) - Business Data
# ============================================================

# Sync engine (for migrations and simple operations)
cabinet_engine = create_engine(
    settings.cabinet_database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Enable connection health checks
    echo=settings.debug,
)

# Async engine (for API endpoints)
cabinet_async_engine = create_async_engine(
    settings.cabinet_async_database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.debug,
)

# Session factories
CabinetSessionLocal = sessionmaker(
    bind=cabinet_engine,
    autocommit=False,
    autoflush=False,
)

CabinetAsyncSessionLocal = async_sessionmaker(
    bind=cabinet_async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ============================================================
# Auth Database (andora_db) - Shared User Authentication
# ============================================================

# Sync engine for auth database
auth_engine = create_engine(
    settings.auth_database_url,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=settings.debug,
)

# Async engine for auth database
auth_async_engine = create_async_engine(
    settings.auth_async_database_url,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=settings.debug,
)

# Session factories for auth
AuthSessionLocal = sessionmaker(
    bind=auth_engine,
    autocommit=False,
    autoflush=False,
)

AuthAsyncSessionLocal = async_sessionmaker(
    bind=auth_async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ============================================================
# Dependency Injection Functions
# ============================================================

async def get_cabinet_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async cabinet database session.
    Use in FastAPI endpoints: db: AsyncSession = Depends(get_cabinet_db)
    """
    async with CabinetAsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_auth_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async auth database session.
    Use in FastAPI endpoints: auth_db: AsyncSession = Depends(get_auth_db)
    """
    async with AuthAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_cabinet_db_sync() -> Session:
    """
    Get sync cabinet database session for background tasks.
    Remember to close the session after use.
    """
    return CabinetSessionLocal()


def get_auth_db_sync() -> Session:
    """
    Get sync auth database session for background tasks.
    Remember to close the session after use.
    """
    return AuthSessionLocal()


@asynccontextmanager
async def get_cabinet_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for cabinet database session.
    Use in services: async with get_cabinet_session() as session:
    """
    async with CabinetAsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_auth_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for auth database session.
    Use in services: async with get_auth_session() as session:
    """
    async with AuthAsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# ============================================================
# Database Initialization
# ============================================================

async def init_db():
    """Initialize database tables (use migrations in production)."""
    async with cabinet_async_engine.begin() as conn:
        # Only for development - use migrations in production
        # await conn.run_sync(Base.metadata.create_all)
        pass


async def close_db():
    """Close database connections on shutdown."""
    await cabinet_async_engine.dispose()
    await auth_async_engine.dispose()


# ============================================================
# Health Check
# ============================================================

async def check_cabinet_db_health() -> bool:
    """Check if cabinet database is accessible."""
    try:
        async with CabinetAsyncSessionLocal() as session:
            await session.execute("SELECT 1")
            return True
    except Exception:
        return False


async def check_auth_db_health() -> bool:
    """Check if auth database is accessible."""
    try:
        async with AuthAsyncSessionLocal() as session:
            await session.execute("SELECT 1")
            return True
    except Exception:
        return False
