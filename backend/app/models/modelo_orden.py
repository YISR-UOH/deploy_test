from __future__ import annotations
from datetime import datetime
from typing import Any, Optional

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON


class Orden(SQLModel, table=True):
    __tablename__ = "ordenes"

    code: int = Field(primary_key=True, index=True, description="Unique order code (pauta.code)")
    fecha_inicial: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    frecuencia_dias: Optional[int] = None
    horas_estimadas: float = 0.0
    task_number: int = 0
    prioridad: Optional[int] = None

    assigned_by: Optional[int] = None
    assigned_to: Optional[int] = None

    status: int = Field(default=0, description="0 pendiente, 1 en_proceso, 2 completada, 3 cancelada/vencida")

    speciality: str = Field(default="")
    specialty_id: int = Field(default=0)

    obs_orden: str = Field(default="")
    obs_orden_cancelada: Optional[str] = None
    code_orden_cancelada: Optional[int] = Field(default=None, description="1:Falta pieza,2:reprogramacion, 3:orden vencida, 4:otros")
    data: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))  # JSON field
    # Total duration (sum of task durations) in seconds, persisted when order is completed
    total_duration_seconds: Optional[float] = None
    checkListDict: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))  # JSON field


class Task(SQLModel, table=True):
    __tablename__ = "tareas"

    order_code: int = Field(primary_key=True, index=True)
    task_number: int = Field(primary_key=True, index=True)

    completed_by: Optional[int] = None
    init_task: Optional[datetime] = None
    end_task: Optional[datetime] = None

    obs_assigned_by: str = ""
    obs_assigned_to: str = ""
    data: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))  # JSON field
    status: int = Field(default=0, description="0 pendiente, 1 en_proceso, 2 completada, 3 cancelada/vencida")
    # Individual task duration in seconds (persisted at finish)
    duration_seconds: Optional[float] = None


# Input/Output Schemas
class AssignOrdenIn(SQLModel):
    assigned_to: int
    obs_orden: Optional[str] = None
    prioridad: Optional[int] = None


class OrdenOut(SQLModel):
    code: int
    fecha_inicial: Optional[datetime]
    fecha_vencimiento: Optional[datetime]
    frecuencia_dias: Optional[int]
    horas_estimadas: float
    task_number: int
    prioridad: Optional[int]
    assigned_by: Optional[int]
    assigned_by_name: Optional[str] = None  
    assigned_to: Optional[int]
    assigned_to_name: Optional[str] = None
    status: int
    speciality: str
    specialty_id: int
    obs_orden: str

    descripcion: Optional[str] = Field(default=None, alias="Descripcion")
    tareas: Optional[list[dict[str, Any]]] = Field(default=None, alias="Tareas")
    tipo_servicio: Optional[str] = Field(default=None, alias="TipoServicio")
    protocolos: Optional[Any] = Field(default=None, alias="Protocolos")

# order full  
class OrdenOutWithData(SQLModel):
    orden: Orden
    assigned_by_name: Optional[str] = None  
    assigned_to_name: Optional[str] = None
    tasks: Optional[list[Task]] = None  
    
    


class TaskOut(SQLModel):
    order_code: int
    task_number: int
    completed_by: Optional[int]
    init_task: Optional[datetime]
    end_task: Optional[datetime]
    obs_assigned_by: str
    obs_assigned_to: str
    status: int
    duration_seconds: Optional[float] = None  # (end - init) si ambos existen


def derive_specialty_id(speciality: str) -> int:
    s = (speciality or "").upper()
    if "ELP ELECTRICO DE PLANTA" in s:
        return 1
    if "MEP MECANICO DE PLANTA" in s :
        return 2
    return 0


def recompute_order_status(tasks: list[Task]) -> int:
    """
        0 - pending
        1 - in_process
        2 - completed
        3 - cancelled/expired
    """
    if not tasks:
        return 0

    statuses = {t.status for t in tasks}

    # All completed
    if statuses == {2}:
        return 2
    # All cancelled
    if statuses == {3}:
        return 3

    # Any task in progress -> overall in progress
    if 1 in statuses:
        return 1

    # Mixture of completed (2) and pending (0) should be considered in progress
    if 2 in statuses and 0 in statuses:
        return 1

    # If there is at least one completed but others maybe cancelled -> still in progress unless all cancelled
    if 2 in statuses:
        return 1

    # Only pending left
    if statuses == {0}:
        return 0

    # Fallback (unexpected combination)
    return 0
