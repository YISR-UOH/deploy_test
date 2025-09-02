from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import verify_password, create_access_token
from app.db.session import get_session
from app.models.modelo_user import User, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginInput(BaseModel):
    code: int
    password: str


@router.post("/login")
async def login(payload: LoginInput, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.code == payload.code))
    user = result.scalar_one_or_none()
    if not user or user.estado != 1:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(subject=str(user.code))
    user_out = UserOut(
        code=user.code,
        nombre=user.nombre,
        tipo_usuario=user.tipo_usuario,
        tipo_usuario_id=user.tipo_usuario_id,
        especialidad=user.especialidad,
        especialidad_id=user.especialidad_id,
        estado=user.estado,
        theme=user.theme,
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user_out.model_dump()}


# check access token recibe el token en el header Authorization
@router.get("/check")
async def check_access_token(session: AsyncSession = Depends(get_session)):
    # This endpoint is used to check if the access token is valid.
    # The actual implementation would depend on how you handle token validation.
    return {"message": "Access token is valid"}