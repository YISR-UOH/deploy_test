from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import admin_required
from app.db.session import get_session
from app.models.modelo_especialidad import (
    Specialty,
    SpecialtyCreate,
    SpecialtyUpdate,
    SpecialtyOut,
)

router = APIRouter(prefix="/especialidades", tags=["especialidades"])


@router.get("", response_model=list[SpecialtyOut])
async def list_specialties(
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_session),
):
    if include_inactive:
        result = await session.execute(select(Specialty))
    else:
        result = await session.execute(select(Specialty).where(Specialty.estado == 1))
    return result.scalars().all()


@router.post("", response_model=SpecialtyOut)
async def create_specialty(
    payload: SpecialtyCreate,
    _: object = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    exists = await session.execute(select(Specialty).where(Specialty.code == payload.code))
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Specialty code already exists")

    spec = Specialty(code=payload.code, nombre=payload.nombre, descripcion=payload.descripcion or "")
    session.add(spec)
    await session.commit()
    await session.refresh(spec)
    return spec


@router.patch("/{code}", response_model=SpecialtyOut)
async def update_specialty(
    code: int,
    payload: SpecialtyUpdate,
    _: object = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Specialty).where(Specialty.code == code))
    spec = result.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Specialty not found")

    if payload.nombre is not None:
        spec.nombre = payload.nombre
    if payload.descripcion is not None:
        spec.descripcion = payload.descripcion
    if payload.estado is not None:
        spec.estado = payload.estado

    session.add(spec)
    await session.commit()
    await session.refresh(spec)
    return spec


@router.delete("/{code}")
async def deactivate_specialty(
    code: int,
    _: object = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Specialty).where(Specialty.code == code))
    spec = result.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Specialty not found")

    spec.estado = 0
    session.add(spec)
    await session.commit()
    return {"detail": "Specialty deactivated"}
