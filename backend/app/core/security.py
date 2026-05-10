from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
MAX_BCRYPT_PASSWORD_BYTES = 72


def _normalize_bcrypt_password(password: str) -> str:
    # bcrypt processes only the first 72 bytes; normalize once for hash and verify parity.
    return password.encode("utf-8")[:MAX_BCRYPT_PASSWORD_BYTES].decode("utf-8", errors="ignore")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_normalize_bcrypt_password(plain_password), hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(_normalize_bcrypt_password(password))


def _create_token(data: dict[str, Any], secret: str, expires_delta: timedelta) -> str:
    payload = data.copy()
    expire = datetime.now(UTC) + expires_delta
    payload.update({"exp": expire, "jti": str(uuid4())})
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token({"sub": subject, "type": "access"}, settings.JWT_SECRET_KEY, expires)


def create_refresh_token(subject: str) -> str:
    expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token({"sub": subject, "type": "refresh"}, settings.JWT_REFRESH_SECRET_KEY, expires)


def decode_token(token: str, refresh: bool = False) -> dict[str, Any]:
    secret = settings.JWT_REFRESH_SECRET_KEY if refresh else settings.JWT_SECRET_KEY
    try:
        return jwt.decode(token, secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
