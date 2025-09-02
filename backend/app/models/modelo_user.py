from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    code: int = Field(primary_key=True, index=True, description="Unique user code")
    nombre: str
    password_hash: str
    tipo_usuario: str = Field(default="Administrador")
    tipo_usuario_id: int = Field(default=0)
    especialidad: str = Field(default="Administrador")
    especialidad_id: int = Field(default=0)
    estado: int = Field(default=1, description="1 activo, 0 inactivo")
    theme: int = Field(default=0, description="0 claro, 1 oscuro")


class UserCreate(SQLModel):
    code: int
    nombre: str
    password: str
    tipo_usuario_id: int
    especialidad_id: int
    estado: int = 1
    theme: int = 0


class UserUpdate(SQLModel):
    nombre: Optional[str] = None
    password: Optional[str] = None
    tipo_usuario_id: Optional[int] = None
    especialidad_id: Optional[int] = None
    estado: Optional[int] = None
    theme: Optional[int] = None


class UserOut(SQLModel):
    code: int
    nombre: str
    tipo_usuario: str
    tipo_usuario_id: int
    especialidad: str
    especialidad_id: int
    estado: int
    theme: int


# Helpers to map ids to names
ROLE_NAMES = {0: "Administrador", 1: "Supervisor", 2: "Mantenedor"}
SPEC_NAMES = {0: "Administrador", 1: "Electrico", 2: "Mecanico"}


def map_role_name(tipo_usuario_id: int) -> str:
    return ROLE_NAMES.get(tipo_usuario_id, "Administrador")


def map_spec_name(especialidad_id: int) -> str:
    return SPEC_NAMES.get(especialidad_id, "Administrador")
