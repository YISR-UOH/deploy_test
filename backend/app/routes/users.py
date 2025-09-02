from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import admin_required, hash_password, get_current_user
from app.db.session import get_session
from app.models.modelo_user import (
    User,
    UserCreate,
    UserUpdate,
    UserOut,
    map_role_name,
    map_spec_name,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    include_inactive: bool = False,
    _: User = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    if include_inactive:
        result = await session.execute(select(User))
    else:
        result = await session.execute(select(User).where(User.estado == 1))
    return result.scalars().all()

# para supervisor
@router.get("/getMantenedores", response_model=list[UserOut])
async def list_users(session: AsyncSession = Depends(get_session),
    current: User = Depends(get_current_user)):
    
    # Filtrar solo mantenedores (tipo_usuario_id == 2) de la misma especialidad
    result = await session.execute(
        select(User).where(
            User.tipo_usuario_id == 2,
            User.especialidad_id == current.especialidad_id
        )
    )
    return result.scalars().all()


@router.post("", response_model=UserOut)
async def create_user(
    payload: UserCreate,
    _: User = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    # Check duplicate code
    exists = await session.execute(select(User).where(User.code == payload.code))
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="User code already exists")

    user = User(
        code=payload.code,
        nombre=payload.nombre,
        password_hash=hash_password(payload.password),
        tipo_usuario_id=payload.tipo_usuario_id,
        tipo_usuario=map_role_name(payload.tipo_usuario_id),
        especialidad_id=payload.especialidad_id,
        especialidad=map_spec_name(payload.especialidad_id),
        estado=payload.estado,
        theme=payload.theme,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.patch("/{code}", response_model=UserOut)
async def update_user(
    code: int,
    payload: UserUpdate,
    _: User = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.code == code))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.nombre is not None:
        user.nombre = payload.nombre
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    if payload.tipo_usuario_id is not None:
        user.tipo_usuario_id = payload.tipo_usuario_id
        user.tipo_usuario = map_role_name(payload.tipo_usuario_id)
    if payload.especialidad_id is not None:
        user.especialidad_id = payload.especialidad_id
        user.especialidad = map_spec_name(payload.especialidad_id)
    if payload.estado is not None:
        user.estado = payload.estado
    if payload.theme is not None:
        user.theme = payload.theme

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{code}")
async def delete_user(
    code: int,
    _: User = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.code == code))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.estado = 0
    session.add(user)
    await session.commit()
    return {"detail": "User deactivated"}
