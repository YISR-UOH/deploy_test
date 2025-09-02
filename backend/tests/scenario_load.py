#!/usr/bin/env python3
"""Prueba de carga basada en escenarios reales.

Flujo de cada Virtual User (VU) con roles:
1. (Admin bootstrap - una sola vez fuera de VUs)
   - Login admin (1111 / 1234)
   - Crear supervisor (tipo_usuario_id=1) y mantenedores (tipo_usuario_id=2) si no existen.
   - Subir PDF de pautas (si se indica --upload-pdf) para poblar órdenes.
2. Cada VU realiza iteraciones del siguiente ciclo (mezcla de supervisor y mantenedor):
   a) Supervisor login (cache token) -> lista órdenes -> asigna una no asignada a un mantenedor.
   b) Mantenedor login (cache token) -> lista sus órdenes -> inicia y/o finaliza una tarea (start/finish) aleatoriamente.
   c) Obtener resumen supervisor y checklist opcional.

Métricas recolectadas (por operación):
- count, errores, latencia promedio, p95, RPS parcial.
- Global: throughput agregado, error rate global, latencias agregadas.

Condiciones de parada:
- Umbral global de error (--error-threshold) excedido tras un intervalo.
- Timeout sin respuestas exitosas.
- Máximo de iteraciones de rampa alcanzado.

Uso ejemplo:
  python tests/scenario_load.py --base-url http://localhost:8081 \
     --supervisores 10 --mantenedores 20 --vus 50 --duration 120 \
     --upload-pdf Pautas_MP.pdf --error-threshold 0.2 --json resumen.json

Nota: Este script está orientado a generar carga mixta; para stress puro usar load_capacity.py.
"""
from __future__ import annotations
import argparse
import asyncio
import json
import os
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import threading

import httpx
from rich.console import Console
from rich.live import Live
from rich.table import Table

def now() -> float:
    return time.perf_counter()

console = Console()

@dataclass
class OpMetric:
    latencies: List[float] = field(default_factory=list)
    errors: int = 0
    count: int = 0

    def add(self, lat: float | None, error: bool):
        if lat is not None:
            self.latencies.append(lat)
        if error:
            self.errors += 1
        self.count += 1

    def snapshot(self) -> dict:
        if self.count == 0:
            return {"count": 0, "errors": 0, "error_rate": 0.0, "lat_avg": 0.0, "lat_p95": 0.0}
        lats = sorted(self.latencies)
        avg = sum(lats)/len(lats) if lats else 0.0
        p95 = lats[int(0.95*(len(lats)-1))] if lats else 0.0
        return {
            "count": self.count,
            "errors": self.errors,
            "error_rate": self.errors / self.count if self.count else 0.0,
            "lat_avg": avg,
            "lat_p95": p95,
        }

class MetricsRegistry:
    def __init__(self):
        self.ops: Dict[str, OpMetric] = {}
    def add(self, name: str, lat: float | None, error: bool):
        self.ops.setdefault(name, OpMetric()).add(lat, error)
    def snapshot(self):
        return {k: v.snapshot() for k,v in self.ops.items()}
    def aggregate(self):
        all_lats = []
        total = 0
        errors = 0
        for m in self.ops.values():
            all_lats.extend(m.latencies)
            total += m.count
            errors += m.errors
        all_lats.sort()
        avg = sum(all_lats)/len(all_lats) if all_lats else 0.0
        p95 = all_lats[int(0.95*(len(all_lats)-1))] if all_lats else 0.0
        return {
            "requests": total,
            "errors": errors,
            "error_rate": errors/total if total else 0.0,
            "lat_avg": avg,
            "lat_p95": p95,
        }

async def timed(client: httpx.AsyncClient, method: str, url: str, name: str, metrics: MetricsRegistry, **kwargs):
    t0 = now()
    resp = None
    error = False
    try:
        resp = await client.request(method, url, **kwargs)
        if resp.status_code >= 400:
            error = True
    except Exception:
        error = True
    latency = now() - t0
    metrics.add(name, latency, error)
    return resp, latency, error

async def login(client: httpx.AsyncClient, base: str, code: int, password: str, metrics: MetricsRegistry, cache: dict):
    # Usar cache global compartido
    with TOKEN_LOCK:
        if code in TOKEN_CACHE:
            return TOKEN_CACHE[code]
    resp, lat, error = await timed(client, "POST", f"{base}/auth/login", "login", metrics, json={"code": code, "password": password}, timeout=5)
    if not error and resp is not None:
        try:
            token = resp.json().get("access_token")
            if token:
                with TOKEN_LOCK:
                    TOKEN_CACHE[code] = token
                return token
        except Exception:
            pass
    return None

async def ensure_users(admin_client: httpx.AsyncClient, base: str, supervisor_count: int, mantenedores_per_supervisor: int, metrics: MetricsRegistry):
    created_supervisores = []
    created_mantenedores = []
    # Supervisor codes start at 2000, mantenedores at 3000
    for i in range(supervisor_count):
        code = 2000 + i
        payload = {"code": code, "nombre": f"Supervisor {i}", "password": "pass", "tipo_usuario_id": 1, "especialidad_id": 2}
        await timed(admin_client, "POST", f"{base}/users", "create_user", metrics, json=payload, timeout=5)
        created_supervisores.append(code)
        for j in range(mantenedores_per_supervisor):
            mcode = 3000 + i*100 + j
            mpayload = {"code": mcode, "nombre": f"Mantenedor {i}-{j}", "password": "pass", "tipo_usuario_id": 2, "especialidad_id": 2}
            await timed(admin_client, "POST", f"{base}/users", "create_user", metrics, json=mpayload, timeout=5)
            created_mantenedores.append(mcode)
    return created_supervisores, created_mantenedores

async def upload_pdf_if_needed(admin_client: httpx.AsyncClient, base: str, pdf_path: Optional[str], metrics: MetricsRegistry):
    if not pdf_path:
        return
    p = Path(pdf_path)
    if not p.exists():
        console.log(f"PDF no encontrado: {pdf_path}")
        return
    files = {"file": (p.name, p.read_bytes(), "application/pdf")}
    await timed(admin_client, "POST", f"{base}/ordenes/upload", "upload_pdf", metrics, files=files, timeout=30)

async def supervisor_cycle(client: httpx.AsyncClient, base: str, sup_code: int, mantenedores: List[int], metrics: MetricsRegistry):
    token = await login(client, base, sup_code, "pass", metrics, cache={})
    if not token:
        return
    headers = {"Authorization": f"Bearer {token}"}
    # List orders
    resp, lat, err = await timed(client, "GET", f"{base}/ordenes", "list_ordenes_sup", metrics, headers=headers, timeout=10)
    if err or resp is None:
        return
    try:
        orders = resp.json()
    except Exception:
        return
    # Pick an order without assigned_to
    candidates = [o for o in orders if o.get("assigned_to") is None and o.get("specialty_id") == 2]
    if candidates:
        o = random.choice(candidates)
        target = random.choice(mantenedores)
        body = {"assigned_to": target, "obs_orden": "auto-assign", "prioridad": o.get("prioridad") or 3}
        await timed(client, "PATCH", f"{base}/ordenes/{o['code']}/assign", "assign", metrics, headers=headers, json=body, timeout=10)
    # Summary
    await timed(client, "GET", f"{base}/ordenes/summary", "summary", metrics, headers=headers, timeout=10)

async def mantenedor_cycle(client: httpx.AsyncClient, base: str, man_code: int, metrics: MetricsRegistry):
    token = await login(client, base, man_code, "pass", metrics, cache={})
    if not token:
        return
    headers = {"Authorization": f"Bearer {token}"}
    resp, lat, err = await timed(client, "GET", f"{base}/ordenes", "list_ordenes_man", metrics, headers=headers, timeout=10)
    if err or resp is None:
        return
    try:
        orders = resp.json()
    except Exception:
        return
    if not orders:
        return
    o = random.choice(orders)
    # Start or finish first task
    task_num = 1
    # Choose action
    action = random.choice(["start", "finish"])
    if action == "start":
        await timed(client, "PATCH", f"{base}/ordenes/{o['code']}/tareas/{task_num}/start", "task_start", metrics, headers=headers, timeout=10)
    else:
        await timed(client, "PATCH", f"{base}/ordenes/{o['code']}/tareas/{task_num}/finish", "task_finish", metrics, headers=headers, timeout=10, json={"data": {"auto": True}})

async def vu_worker(vu_id: int, role: str, base: str, supervisors: List[int], mantenedores: List[int], metrics: MetricsRegistry, stop_event: asyncio.Event):
    async with httpx.AsyncClient() as client:
        while not stop_event.is_set():
            if role == "supervisor":
                sup_code = random.choice(supervisors)
                await supervisor_cycle(client, base, sup_code, mantenedores, metrics)
            else:
                man_code = random.choice(mantenedores)
                await mantenedor_cycle(client, base, man_code, metrics)
            await asyncio.sleep(random.uniform(0.05,0.2))

async def scenario(args):
    base = args.base_url.rstrip('/')
    metrics = MetricsRegistry()
    # Bootstrap admin actions
    async with httpx.AsyncClient() as admin_client:
        # Login admin
        resp, lat, err = await timed(admin_client, "POST", f"{base}/auth/login", "admin_login", metrics, json={"code": 1111, "password": "1234"}, timeout=5)
        if err:
            console.log("No se pudo hacer login admin")
            return {}
        token = None
        try:
            token = resp.json().get("access_token") if resp else None
        except Exception:
            pass
        if not token:
            console.log("Token admin vacío")
            return {}
        admin_client.headers.update({"Authorization": f"Bearer {token}"})
        await ensure_users(admin_client, base, args.supervisores, args.mantenedores_por_supervisor, metrics)
        await upload_pdf_if_needed(admin_client, base, args.upload_pdf, metrics)
    # Generar listas de codigos
    supervisors = [2000 + i for i in range(args.supervisores)]
    mantenedores = [3000 + i*100 + j for i in range(args.supervisores) for j in range(args.mantenedores_por_supervisor)]

    # Preparar rampas
    ramp_mode = args.ramp_start is not None
    target_vus = args.vus if not ramp_mode else args.ramp_start
    sup_fraction = 0.4
    # Función para (re)calcular distribución
    def compute_distribution(vus:int)->tuple[int,int]:
        if vus <=1:
            return 1,0
        sup_v = max(1,int(vus*sup_fraction))
        man_v = max(1, vus - sup_v)
        return sup_v, man_v
    stop_event = asyncio.Event()
    workers: list[asyncio.Task] = []

    async def adjust_workers(desired:int):
        current = len(workers)
        if desired > current:
            add = desired - current
            sup_v, man_v = compute_distribution(desired)
            # contar existentes por rol para mantener proporción aproximada
            # (simplificación: añadir nuevos mezclando)
            for i in range(add):
                role = 'supervisor' if (i % 5 == 0 and sup_v > 0) else 'mantenedor'
                workers.append(asyncio.create_task(vu_worker(len(workers)+1, role, base, supervisors, mantenedores, metrics, stop_event)))
        elif desired < current:
            remove = current - desired
            # cancelar últimos
            to_cancel = workers[-remove:]
            for t in to_cancel:
                t.cancel()
            del workers[-remove:]

    await adjust_workers(target_vus)

    start_time = time.time()
    next_ramp = start_time + (args.ramp_interval if ramp_mode else 1e9)
    with Live(refresh_per_second=4) as live:
        while time.time() - start_time < args.duration and not stop_event.is_set():
            # Rampa
            if ramp_mode and time.time() >= next_ramp:
                new_vus = min(args.ramp_max, len(workers) + args.ramp_step)
                if new_vus != len(workers):
                    await adjust_workers(new_vus)
                next_ramp += args.ramp_interval
                if len(workers) >= args.ramp_max:
                    # No más rampas
                    next_ramp = 1e12
            agg = metrics.aggregate()
            if agg['error_rate'] > args.error_threshold:
                console.log(f"Umbral de error excedido {agg['error_rate']*100:.1f}% > {args.error_threshold*100:.1f}%")
                stop_event.set()
                break
            ops_snap = metrics.snapshot()
            tbl = Table(title=f"Escenario VUs={len(workers)}")
            tbl.add_column("Op")
            tbl.add_column("Count")
            tbl.add_column("Err%")
            tbl.add_column("Avg ms")
            tbl.add_column("p95 ms")
            for op, s in sorted(ops_snap.items()):
                if s['count'] == 0: continue
                tbl.add_row(op, str(s['count']), f"{s['error_rate']*100:.1f}", f"{s['lat_avg']*1000:.1f}", f"{s['lat_p95']*1000:.1f}")
            live.update(tbl)
            await asyncio.sleep(1)
    stop_event.set()
    for t in workers:
        t.cancel()
    await asyncio.gather(*workers, return_exceptions=True)
    return {"aggregate": metrics.aggregate(), "ops": metrics.snapshot(), "duration": time.time()-start_time, "vus_final": len(workers)}

def main():
    ap = argparse.ArgumentParser(description="Escenario de carga realista (órdenes y tareas)")
    ap.add_argument('--base-url', default='http://localhost:8081')
    ap.add_argument('--supervisores', type=int, default=1)
    ap.add_argument('--mantenedores-por-supervisor', type=int, default=2)
    ap.add_argument('--vus', type=int, default=10)
    ap.add_argument('--duration', type=int, default=60, help='Duración total en segundos')
    ap.add_argument('--upload-pdf', type=str, default=None, help='Ruta a PDF para subir antes del escenario')
    ap.add_argument('--error-threshold', type=float, default=0.2)
    ap.add_argument('--json', type=str, default=None, help='Archivo donde guardar JSON final')
    ap.add_argument('--ramp-start', type=int, default=None, help='VUs iniciales (activa modo rampa)')
    ap.add_argument('--ramp-max', type=int, default=50, help='VUs máximos en rampa')
    ap.add_argument('--ramp-step', type=int, default=5, help='Incremento de VUs por intervalo de rampa')
    ap.add_argument('--ramp-interval', type=int, default=15, help='Segundos entre incrementos de rampa')
    args = ap.parse_args()

    res = asyncio.run(scenario(args))
    if args.json:
        Path(args.json).write_text(json.dumps(res, indent=2, ensure_ascii=False))
    else:
        console.print_json(data=res)

if __name__ == '__main__':
    TOKEN_CACHE: dict[int,str] = {}
    TOKEN_LOCK = threading.Lock()
    main()
