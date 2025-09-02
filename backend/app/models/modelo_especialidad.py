from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field


class Specialty(SQLModel, table=True):
    __tablename__ = "specialties"

    code: int = Field(primary_key=True, index=True)
    nombre: str
    descripcion: str = ""
    estado: int = Field(default=1, description="1 activo, 0 inactivo")


class SpecialtyCreate(SQLModel):
    code: int
    nombre: str
    descripcion: Optional[str] = ""


class SpecialtyUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[int] = None


class SpecialtyOut(SQLModel):
    code: int
    nombre: str
    descripcion: str
    estado: int
