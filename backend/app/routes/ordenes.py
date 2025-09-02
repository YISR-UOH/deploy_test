from __future__ import annotations
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy import or_, false
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import admin_required, get_current_user
from app.db.session import get_session
from app.models.modelo_user import User
from app.models.modelo_orden import Orden, Task, AssignOrdenIn, OrdenOut, TaskOut, recompute_order_status, OrdenOutWithData
from app.services.parser_pautas import parse_pdf_pautas

router = APIRouter(prefix="/ordenes", tags=["ordenes"])


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    _: User = Depends(admin_required),
    session: AsyncSession = Depends(get_session),
):
    # Save to a temp path and parse
    content = await file.read()
    if not content or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Invalid or empty PDF")
    tmp_path = "/tmp/" + file.filename
    with open(tmp_path, "wb") as f:
        f.write(content)

    orders = parse_pdf_pautas(tmp_path)
    created_codes: List[int] = []

    for code, data in orders.items():
        # Upsert Orden
        result = await session.execute(select(Orden).where(Orden.code == code))
        orden = result.scalar_one_or_none()
        if not orden:
            orden = Orden(code=code)
        orden.fecha_inicial = data.get("fecha_inicial")
        orden.fecha_vencimiento = data.get("fecha_vencimiento")
        orden.frecuencia_dias = data.get("frecuencia_dias")
        orden.horas_estimadas = float(data.get("horas_estimadas") or 0.0)
        orden.task_number = int(data.get("task_number") or 0)
        orden.prioridad = data.get("prioridad")
        orden.speciality = data.get("speciality") or orden.speciality
        orden.specialty_id = int(data.get("specialty_id") or orden.specialty_id)
        orden.obs_orden = data.get("obs_orden") or orden.obs_orden
        # Ensure JSON-serializable payload (e.g., datetimes -> ISO strings)
        orden.data = jsonable_encoder(data)
        session.add(orden)
        await session.commit()

        # Create tasks if none exist for this orden
        if orden.task_number and orden.task_number > 0:
            # Check if tasks already exist
            result = await session.execute(select(Task).where(Task.order_code == orden.code))
            existing = result.scalars().all()
            if not existing:
                for tnum in range(1, orden.task_number + 1):
                    t = Task(order_code=orden.code, task_number=tnum, status=0)
                    session.add(t)
                await session.commit()
        created_codes.append(orden.code)

    return {"ordenes": created_codes}


@router.patch("/{code}/assign")
async def assign_orden(
    code: int,
    payload: AssignOrdenIn,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):

    if current.tipo_usuario_id != 1:
        raise HTTPException(status_code=403, detail="Only Supervisor can assign")

    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")


    target_q = await session.execute(select(User).where(User.code == payload.assigned_to))
    target = target_q.scalar_one_or_none()
    if not target or target.tipo_usuario_id != 2:
        raise HTTPException(status_code=400, detail="assigned_to must be a Mantenedor")


    if (orden.specialty_id or 0) != current.especialidad_id:
        raise HTTPException(status_code=403, detail="Different specialty from supervisor")
    if target.especialidad_id != current.especialidad_id:
        raise HTTPException(status_code=403, detail="Target user not in your specialty")
    

    # Defensive: ensure orden.data is a dict
    if not isinstance(orden.data, dict):
        orden.data = {}

    # If 'data' key exists and is a dict, update there; else, update root
    if isinstance(orden.data.get("data"), dict):
        rec = orden.data["data"]
    else:
        rec = orden.data
    if rec is None or not isinstance(rec, dict):
        rec = {}

    # Update both DB fields and JSON
    orden.assigned_by = current.code
    rec["assigned_by"] = current.code
    orden.assigned_to = target.code
    rec["assigned_to"] = target.code
    orden.status = 0  # Reset status to pending

    # Observacion
    if payload.obs_orden:
        orden.obs_orden = payload.obs_orden
        rec["Observacion"] = payload.obs_orden

    # Prioridad
    if payload.prioridad is not None:
        orden.prioridad = payload.prioridad
        rec["Prioridad"] = payload.prioridad

    # If we updated a nested 'data' record, re-assign it to orden.data
    if isinstance(orden.data.get("data"), dict):
        orden.data["data"] = rec
    else:
        orden.data = rec

    session.add(orden)
    await session.commit()
    await session.refresh(orden)
    return orden


@router.get("", response_model=list[OrdenOut])
async def list_ordenes(
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Helper to build response including Descripcion and Tareas from stored data
    async def to_out(o: Orden, session) -> OrdenOut:
        raw = o.data or {}
        # In newer uploads, the original parser record is under key "data"; fallback to raw
        rec = raw.get("data") if isinstance(raw, dict) else None
        if not isinstance(rec, dict):
            rec = raw if isinstance(raw, dict) else {}
        assigned_by_name: User | None = await session.execute(select(User).where(User.code == o.assigned_by)) if o.assigned_by else None
        asigned_by_name = assigned_by_name.scalar_one_or_none() if assigned_by_name else None
        assigned_by_name = asigned_by_name.nombre if asigned_by_name else None
        assigned_to_name: User | None = await session.execute(select(User).where(User.code == o.assigned_to)) if o.assigned_to else None
        assigned_to_name = assigned_to_name.scalar_one_or_none() if assigned_to_name else None
        assigned_to_name = assigned_to_name.nombre if assigned_to_name else None
        descripcion = rec.get("Descripcion") if isinstance(rec, dict) else None
        tareas = rec.get("Tareas") if isinstance(rec, dict) else None
        protocolos = rec.get("Protocolos") if isinstance(rec, dict) else None
        return OrdenOut(
            code=o.code,
            fecha_inicial=o.fecha_inicial,
            fecha_vencimiento=o.fecha_vencimiento,
            frecuencia_dias=o.frecuencia_dias,
            horas_estimadas=o.horas_estimadas,
            task_number=o.task_number,
            prioridad=o.prioridad,
            assigned_by=o.assigned_by,
            assigned_to=o.assigned_to,
            assigned_by_name= assigned_by_name,
            assigned_to_name= assigned_to_name,
            status=o.status,
            speciality=o.speciality,
            specialty_id=o.specialty_id,
            obs_orden=o.obs_orden,
            descripcion=descripcion,
            tareas=tareas,
            tipo_servicio=rec.get("Tipo de Servicio") if isinstance(rec, dict) else None,
            protocolos=protocolos,
        )

    # Supervisor gets all in their specialty; Mantenedor only assigned to them; Admin gets all
    if current.tipo_usuario_id == 1:
        q = await session.execute(select(Orden).where(Orden.specialty_id == current.especialidad_id, 
                                                     Orden.status != 3))
        result = [await to_out(o,session) for o in q.scalars().all()]
        return sorted(result, key=lambda x: (x.prioridad or 3, x.frecuencia_dias or 0))
    if current.tipo_usuario_id == 2:
        # Mantenedor: only assigned to them and not completed or canceled
        q = await session.execute(select(Orden).where(Orden.assigned_to == current.code, Orden.status != 2 , Orden.status != 3))
        result = [await to_out(o,session) for o in q.scalars().all()]
        return sorted(result, key=lambda x: (x.prioridad or 3, x.frecuencia_dias or 0))
    # Admin or others
    q = await session.execute(select(Orden))
    # sort by prioridad (low to high) and frecuencia_dias (low to high  )
    result: list[OrdenOut] = [await to_out(o,session) for o in q.scalars().all()]
    
    return sorted(result, key=lambda x: (x.prioridad or 3, x.frecuencia_dias or 0))


@router.get("/{code}/tareas", response_model=list[TaskOut])
async def list_tareas(
    code: int,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Load order
    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")

    # Access control: Supervisor of the specialty (or who assigned), Mantenedor asignado, o Admin
    if current.tipo_usuario_id == 1:
        # Supervisor: misma especialidad o quien asignó esta orden
        if orden.specialty_id != current.especialidad_id and orden.assigned_by != current.code:
            raise HTTPException(status_code=403, detail="Not allowed for this order")
    elif current.tipo_usuario_id == 2:
        if orden.assigned_to != current.code:
            raise HTTPException(status_code=403, detail="Not allowed for this order")
    # Admin/otros: permitido

    t_q = await session.execute(select(Task).where(Task.order_code == code))
    tasks = list(t_q.scalars())
    enriched: list[TaskOut] = []
    for t in tasks:
        duration = None
        if t.init_task and t.end_task:
            try:
                duration = (t.end_task - t.init_task).total_seconds()
            except Exception:
                duration = None
        enriched.append(
            TaskOut(
                order_code=t.order_code,
                task_number=t.task_number,
                completed_by=t.completed_by,
                init_task=t.init_task,
                end_task=t.end_task,
                obs_assigned_by=t.obs_assigned_by,
                obs_assigned_to=t.obs_assigned_to,
                status=t.status,
                duration_seconds=duration,
            )
        )
    return enriched


@router.patch("/{code}/tareas/{task_number}/start")
async def start_task(
    code: int,
    task_number: int,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Only Mantenedor assigned to the order can start tasks
    if current.tipo_usuario_id != 2:
        raise HTTPException(status_code=403, detail="Only Mantenedor can start a task")

    # Load order
    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")
    if orden.assigned_to != current.code:
        raise HTTPException(status_code=403, detail="Task not assigned to you")

    # Load task
    t_q = await session.execute(
        select(Task).where(Task.order_code == code, Task.task_number == task_number)
    )
    task = t_q.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Guard: already completed
    if task.status == 2:
        return {
            "order_code": task.order_code,
            "task_number": task.task_number,
            "status": task.status,
            "init_task": task.init_task,
            "order_status": orden.status,
            "detail": "Task already completed",
        }

    # If already in progress just echo current state
    if task.status == 1 and task.init_task is not None:
        return {
            "order_code": task.order_code,
            "task_number": task.task_number,
            "status": task.status,
            "init_task": task.init_task,
            "order_status": orden.status,
            "detail": "Task already started",
        }

    # Start task (store naive UTC for consistency with other stored datetimes)
    # Use naive UTC to avoid offset-aware vs naive issues in DB comparisons
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if task.init_task is None:
        task.init_task = now_utc
    if task.status == 0:
        task.status = 1

    session.add(task)
    await session.commit()

    # Recompute order status based on all tasks
    all_q = await session.execute(select(Task).where(Task.order_code == code))
    all_tasks = list(all_q.scalars())
    orden.status = recompute_order_status(all_tasks)
    session.add(orden)
    await session.commit()

    return {
        "order_code": task.order_code,
        "task_number": task.task_number,
        "status": task.status,
        "init_task": task.init_task,
        "order_status": orden.status,
    }


@router.patch("/{code}/tareas/{task_number}/finish")
async def finish_task(
    code: int,
    task_number: int,
    payload: TaskFinishIn | None = None,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Only Mantenedor assigned to the order can finish tasks
    if current.tipo_usuario_id != 2:
        raise HTTPException(status_code=403, detail="Only Mantenedor can finish a task")

    # Load order
    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")
    if orden.assigned_to != current.code:
        raise HTTPException(status_code=403, detail="Task not assigned to you")

    # Load task
    t_q = await session.execute(
        select(Task).where(Task.order_code == code, Task.task_number == task_number)
    )
    task = t_q.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Merge incoming data only when finishing (even if already finished we still expose existing data)
    incoming: Dict[str, Any] = {}
    if payload and payload.data:
        if not isinstance(payload.data, dict):
            raise HTTPException(status_code=400, detail="data must be an object")
        incoming = payload.data

    # If already completed, don't overwrite existing timestamps but optionally merge new keys (non-destructive)
    if task.status == 2 and task.end_task is not None:
        if incoming:
            base = task.data if isinstance(task.data, dict) else {}
            # Shallow merge (incoming overrides existing same-level keys)
            merged = {**base, **incoming}
            task.data = merged
            session.add(task)
            await session.commit()

    # Finish task (ensure start time exists)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if task.init_task is None:
        task.init_task = now_utc
    task.end_task = now_utc
    task.status = 2
    task.completed_by = current.code
    # Persist individual task duration
    if task.init_task and task.end_task:
        try:
            task.duration_seconds = (task.end_task - task.init_task).total_seconds()
        except Exception:
            task.duration_seconds = None

    # Merge data field (only at finish). If task.data exists, shallow merge.
    base = task.data if isinstance(task.data, dict) else {}
    if incoming:
        base = {**base, **incoming}
    # Only set if we have any content
    if base:
        task.data = base

    session.add(task)
    await session.commit()

    # Recompute order status based on all tasks
    all_q = await session.execute(select(Task).where(Task.order_code == code))
    all_tasks = list(all_q.scalars())
    orden.status = recompute_order_status(all_tasks)
    # If order just became completed, compute and persist total_duration_seconds (sum of task.duration_seconds)
    total = 0.0
    for t in all_tasks:
        if t.duration_seconds is not None:
            total += t.duration_seconds
        elif t.init_task and t.end_task:  # fallback if older tasks without persisted duration
            try:
                total += (t.end_task - t.init_task).total_seconds()
            except Exception:
                pass
    orden.total_duration_seconds = total
    session.add(orden)
    await session.commit()

    return {
        "order_code": task.order_code,
        "task_number": task.task_number,
        "status": task.status,
        "init_task": task.init_task,
        "end_task": task.end_task,
        "order_status": orden.status,
        "data": task.data,
    }

class TaskObsIn(BaseModel):
    obs: str


class TaskFinishIn(BaseModel):
    data: Dict[str, Any] | None = None


@router.patch("/{code}/tareas/{task_number}/obs/supervisor")
async def set_task_obs_supervisor(
    code: int,
    task_number: int,
    payload: TaskObsIn,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current.tipo_usuario_id != 1:
        raise HTTPException(status_code=403, detail="Only Supervisor can set this observation")

    # Ensure order exists and belongs to this supervisor's assignments
    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")
    if orden.assigned_by != current.code:
        raise HTTPException(status_code=403, detail="You didn't assign this order")

    # Load task and update obs from supervisor
    t_q = await session.execute(select(Task).where(Task.order_code == code, Task.task_number == task_number))
    task = t_q.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.obs_assigned_by = payload.obs or ""
    session.add(task)
    await session.commit()

    return {
        "order_code": task.order_code,
        "task_number": task.task_number,
        "obs_assigned_by": task.obs_assigned_by,
    }


@router.patch("/{code}/tareas/{task_number}/obs/mantenedor")
async def set_task_obs_mantenedor(
    code: int,
    task_number: int,
    payload: TaskObsIn,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current.tipo_usuario_id != 2:
        raise HTTPException(status_code=403, detail="Only Mantenedor can set this observation")

    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")
    if orden.assigned_to != current.code:
        raise HTTPException(status_code=403, detail="Task not assigned to you")

    # Load task and update obs from mantenedor
    t_q = await session.execute(select(Task).where(Task.order_code == code, Task.task_number == task_number))
    task = t_q.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.obs_assigned_to = payload.obs or ""
    session.add(task)
    await session.commit()

    return {
        "order_code": task.order_code,
        "task_number": task.task_number,
        "obs_assigned_to": task.obs_assigned_to,
    }



@router.get("/summary")
async def supervisor_summary(
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Only Supervisor can view their assignment summary
    if current.tipo_usuario_id != 1:
        raise HTTPException(status_code=403, detail="Only Supervisor can view summary")

    # Get orders assigned by this supervisor
    ord_q = await session.execute(
        select(Orden).where(Orden.assigned_by == current.code)
    )
    orders = list(ord_q.scalars())
    if not orders:
        return {
            "supervisor_code": current.code,
            "specialty_id": current.especialidad_id,
            "assigned_maintainers": [],
            "totals": {"orders": 0, "orders_completed": 0, "orders_cancelled": 0, "tasks": 0, "tasks_completed": 0, "tasks_cancelled": 0, "total_duration_seconds": 0.0, "horas_estimadas": 0.0},
        }

    order_codes = [o.code for o in orders]
    # Fetch all tasks for these orders in one go
    if order_codes:
        cond = or_(*[Task.order_code == oc for oc in order_codes])
        task_q = await session.execute(select(Task).where(cond))
    else:
        task_q = await session.execute(select(Task).where(false()))
    tasks = list(task_q.scalars())
    tasks_by_order: Dict[int, list[Task]] = {}
    for t in tasks:
        tasks_by_order.setdefault(t.order_code, []).append(t)

    # Gather maintainers involved
    mantenedores_codes = sorted({o.assigned_to for o in orders if o.assigned_to})
    users_map: Dict[int, User] = {}
    if mantenedores_codes:
        cond = or_(*[User.code == c for c in mantenedores_codes])
        u_q = await session.execute(select(User).where(cond))
        for u in u_q.scalars():
            users_map[u.code] = u

    # Aggregate per mantenedor
    per_mant: Dict[int, Dict[str, Any]] = {}
    totals = {"orders": 0, "orders_completed": 0, "orders_cancelled": 0, "tasks": 0, "tasks_completed": 0, "tasks_cancelled": 0, "total_duration_seconds": 0.0, "horas_estimadas": 0.0}

    for o in orders:
        totals["orders"] += 1
        if o.status == 2:
            totals["orders_completed"] += 1
        elif o.status == 3:
            totals["orders_cancelled"] += 1
        
        otasks = tasks_by_order.get(o.code, [])
        t_total = len(otasks) if otasks else (o.task_number or 0)
        t_done = sum(1 for t in otasks if t.status == 2)
        t_cancelled = sum(1 for t in otasks if t.status == 3)
        totals["tasks"] += t_total
        totals["tasks_completed"] += t_done
        totals["tasks_cancelled"] += t_cancelled
        if o.total_duration_seconds:
            totals["total_duration_seconds"] += o.total_duration_seconds
        if o.horas_estimadas:
            totals["horas_estimadas"] += o.horas_estimadas
        key = o.assigned_to or 0
        if key not in per_mant:
            u = users_map.get(key)
            per_mant[key] = {
                "code": key,
                "nombre": (u.nombre if u else None),
                "orders_total": 0,
                "orders_completed": 0,
                "orders_cancelled": 0,
                "orders_in_progress": 0,
                "orders_pending": 0,
                "tasks_total": 0,
                "tasks_completed": 0,
                "tasks_cancelled": 0,
                "orders": [],
            }
        entry = per_mant[key]
        entry["orders_total"] += 1
        if o.status == 2:
            entry["orders_completed"] += 1
        elif o.status == 3:
            entry["orders_cancelled"] += 1
        elif o.status == 1:
            entry["orders_in_progress"] += 1
        else:
            entry["orders_pending"] += 1
        entry["tasks_total"] += t_total
        entry["tasks_completed"] += t_done
        entry["tasks_cancelled"] += t_cancelled
        entry["orders"].append({
            "code": o.code,
            "status": o.status,
            "tasks_completed": t_done,
            "tasks_cancelled": t_cancelled,
            "tasks_total": t_total,
            "horas_estimadas": o.horas_estimadas,
            "total_duration_seconds": o.total_duration_seconds,
        })

    return {
        "supervisor_code": current.code,
        "specialty_id": current.especialidad_id,
        "assigned_maintainers": list(per_mant.values()),
        "totals": totals,
    }


@router.get("/{code}", response_model=OrdenOutWithData)
async def get_order_with_data(
    code: int,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):

    result = await session.execute(select(Orden).where(Orden.code == code))
    assigned_by_name = None
    assigned_to_name = None
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")

    if current.tipo_usuario_id == 1:
        if orden.specialty_id != current.especialidad_id and orden.assigned_by != current.code:
            raise HTTPException(status_code=403, detail="Not allowed for this order")
    elif current.tipo_usuario_id == 2:
        if orden.assigned_to != current.code:
            raise HTTPException(status_code=403, detail="Not allowed for this order")
    
    if orden.assigned_by:
        assigned_by_name = await session.execute(select(User).where(User.code == orden.assigned_by))
        assigned_by_name = assigned_by_name.scalar_one_or_none()
    if orden.assigned_to:
        assigned_to_name = await session.execute(select(User).where(User.code == orden.assigned_to))
        assigned_to_name = assigned_to_name.scalar_one_or_none()
    # Compute order elapsed metrics
    task_q = await session.execute(select(Task).where(Task.order_code == orden.code))
    order_tasks = list(task_q.scalars())

    response: OrdenOutWithData = OrdenOutWithData(
        orden=orden,
        assigned_by_name=assigned_by_name.nombre if assigned_by_name else None,
        assigned_to_name=assigned_to_name.nombre if assigned_to_name else None,
        tasks=order_tasks
    )
    return response
    
# cancel order, las tareas que no estén completadas se cancelan, supervisor y mantenedor pueden cancelar, recibe el code de la orden y un comentario opcional que se guarda en obs_orden_cancelada
@router.delete("/{code}")
async def cancel_order(
    code: int,
    payload: Dict[str, str] | None = None,
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current.tipo_usuario_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Only Supervisor or Mantenedor can cancel")

    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")

    # Only Supervisor or Mantenedor assigned to this order can cancel
    if (current.tipo_usuario_id == 1 and orden.specialty_id != current.especialidad_id) or (current.tipo_usuario_id == 2 and orden.assigned_to != current.code):
        raise HTTPException(status_code=403, detail="Not allowed to cancel this order")
    
    # Cancel order: set status to 3 (canceled)
    orden.status = 3
    # If payload has obs_orden_cancelada, set it
    if payload:
        orden.obs_orden_cancelada = "Orden cancelada por " + current.nombre + " (" + str(current.code) + ")" + " observacion : "+payload.get("obs_orden_cancelada","")
        orden.code_orden_cancelada = payload.get("code_orden_cancelada",None)
    else:
        orden.obs_orden_cancelada = "Orden cancelada por " + current.nombre + " (" + str(current.code) + ")"
    # Cancel all tasks that are not completed
    t_q = await session.execute(select(Task).where(Task.order_code == code, Task.status != 2))
    tasks = list(t_q.scalars())
    for t in tasks:
        t.status = 3
        session.add(t)
    session.add(orden)
    await session.commit()
    return {"message": "Orden cancelada", "orden": code}


# add checkListDict to Orden model only user type 2 
@router.patch("/{code}/checklist")
async def update_checklist(
    code: int,
    payload: dict[str, Any],
    current: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current.tipo_usuario_id != 2 and current.tipo_usuario_id != 1:
        raise HTTPException(status_code=403, detail="Only Mantenedor can update checklist")

    result = await session.execute(select(Orden).where(Orden.code == code))
    orden = result.scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden not found")
    
    if orden.assigned_to != current.code and current.tipo_usuario_id == 2:
        raise HTTPException(status_code=403, detail="Not allowed to update this order")
    
    if orden.assigned_by != current.code and current.tipo_usuario_id == 1:
        raise HTTPException(status_code=403, detail="Not allowed to update this order")

    # Ensure payload is a dict
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be an object")

    # Update checklist field
    orden.checkListDict = payload

    session.add(orden)
    await session.commit()
    
    return {"message": "Checklist updated", "orden": code}