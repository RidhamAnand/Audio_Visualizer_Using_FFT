from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.dependencies import get_current_user, rate_limit
from app.metrics import ACTIVE_USERS
from app.models import User, UserSettings
from app.redis_client import redis
from app.schemas import AuthUserResponse, LoginRequest, MessageResponse, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)) -> AuthUserResponse:
    await rate_limit(request, "register")

    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    await db.flush()

    db.add(UserSettings(user_id=user.id, preferred_mode="spectrogram", color_theme="cyan"))
    await db.commit()
    await db.refresh(user)

    return AuthUserResponse(id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    await rate_limit(request, "login")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    refresh_payload = decode_token(refresh_token, refresh=True)
    refresh_jti = refresh_payload["jti"]
    ttl_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    await redis.setex(f"refresh:{user.id}", ttl_seconds, refresh_jti)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ttl_seconds,
        path="/",
    )

    ACTIVE_USERS.inc()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        payload = decode_token(refresh_token, refresh=True)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = payload.get("sub")
    jti = payload.get("jti")
    if not user_id or not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token")

    stored_jti = await redis.get(f"refresh:{user_id}")
    if stored_jti != jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    new_payload = decode_token(new_refresh, refresh=True)

    ttl_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    await redis.setex(f"refresh:{user_id}", ttl_seconds, new_payload["jti"])

    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ttl_seconds,
        path="/",
    )

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    user: User = Depends(get_current_user),
    refresh_token: str | None = Cookie(default=None),
) -> MessageResponse:
    await redis.delete(f"refresh:{user.id}")

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

    if refresh_token:
        try:
            ACTIVE_USERS.dec()
        except ValueError:
            ACTIVE_USERS.set(0)

    return MessageResponse(message="Logged out")


@router.get("/me", response_model=AuthUserResponse)
async def me(user: User = Depends(get_current_user)) -> AuthUserResponse:
    return AuthUserResponse(id=user.id, email=user.email)
