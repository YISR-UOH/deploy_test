import hashlib
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.settings import get_settings
from app.db.session import get_session
from app.models.modelo_user import User


settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=True)


def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def hash_password(plain_password: str) -> str:
    # Deterministic SHA-256 with pepper (no salt per spec). For production, prefer Argon2id/bcrypt.
    return _sha256(plain_password + settings.PEPPER)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return hash_password(plain_password) == password_hash


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes if expires_minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": int(expire.timestamp()), "iat": int(time.time())}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sub: str = payload.get("sub")  # user.code as string
        if sub is None:
            raise credentials_exc
        code = int(sub)
    except Exception:
        raise credentials_exc

    result = await session.execute(select(User).where(User.code == code))
    user = result.scalar_one_or_none()
    if not user or user.estado != 1:
        raise credentials_exc
    return user


async def admin_required(current_user: User = Depends(get_current_user)) -> User:
    if current_user.tipo_usuario_id != 0 and (current_user.tipo_usuario or "").lower() != "administrador":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user
