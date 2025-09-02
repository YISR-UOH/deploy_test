#!/usr/bin/env python3
"""Prueba de capacidad/concurrencia para la API.

Estrategia:
- Rampa de usuarios concurrentes (virtual users) generando requests continuas.
- Cada usuario mantiene un bucle: (login opcional una vez) -> GET /healthz
- Se mide por intervalo ("tick") métricas: RPS, latencia promedio/p95, errores, usuarios activos reales.
- Se incrementa la concurrencia hasta que la tasa de error supera umbral o el servidor deja de responder (timeouts consecutivos).

Uso rápido:
  python tests/load_capacity.py --base-url http://localhost:8081 \
      --login --code 1111 --password 1234 \
      --start 10 --step 10 --max 500 --step-duration 20 \
      --timeout 2.0 --error-threshold 0.1

Salida: imprime tabla incremental y al final resumen con capacidad estimada.

Limitaciones:
- Genera carga desde un solo proceso (GIL). Para más carga ejecutar en varias máquinas / procesos.
- Usa httpx.AsyncClient; latencias internas Python pueden añadir overhead.

"""
from __future__ import annotations
import argparse
import asyncio
import json
import math
import statistics
import time
from typing import Optional, List

import httpx
from rich.console import Console
from rich.table import Table
from rich.live import Live
from rich.panel import Panel

console = Console()

class MetricsWindow:
    def __init__(self) -> None:
        self.reset()

    def reset(self):
        self.latencies: List[float] = []
        self.errors = 0
        self.requests = 0

    def add(self, latency: float | None, error: bool):
        if latency is not None:
            self.latencies.append(latency)
        if error:
            self.errors += 1
        self.requests += 1

    def snapshot(self):
        if self.latencies:
            avg = sum(self.latencies) / len(self.latencies)
            # Cálculo robusto de p95 sin requerir >=100 muestras
            ordered = sorted(self.latencies)
            idx = int(0.95 * (len(ordered) - 1))
            p95 = ordered[idx]
        else:
            avg = 0.0
            p95 = 0.0
        err_rate = self.errors / self.requests if self.requests else 0.0
        return {
            "requests": self.requests,
            "errors": self.errors,
            "error_rate": err_rate,
            "lat_avg": avg,
            "lat_p95": p95,
        }

async def worker(vu_id: int, stop_event: asyncio.Event, client: httpx.AsyncClient, endpoint: str, metrics_queue: asyncio.Queue, timeout: float):
    while not stop_event.is_set():
        start = time.perf_counter()
        error = False
        try:
            resp = await client.get(endpoint, timeout=timeout)
            if resp.status_code >= 400:
                error = True
        except Exception:
            error = True
        latency = time.perf_counter() - start
        await metrics_queue.put((latency, error))

async def login_and_get_token(client: httpx.AsyncClient, base_url: str, code: int, password: str) -> Optional[str]:
    try:
        resp = await client.post(f"{base_url}/auth/login", json={"code": code, "password": password})
        if resp.status_code == 200:
            data = resp.json()
            return data.get("access_token")
    except Exception:
        return None
    return None

async def ramp_test(args):
    base_url = args.base_url.rstrip("/")
    health_endpoint = f"{base_url}/healthz"
    metrics_queue: asyncio.Queue = asyncio.Queue()
    stop_event = asyncio.Event()

    results = []  # (vus, snapshot dict)
    token: Optional[str] = None

    headers = {}
    async with httpx.AsyncClient() as auth_client:
        if args.login:
            token = await login_and_get_token(auth_client, base_url, args.code, args.password)
            if token:
                headers["Authorization"] = f"Bearer {token}"



    current_vus = args.start
    workers: List[asyncio.Task] = []

    async with httpx.AsyncClient(headers=headers) as client:
        last_alive = time.time()
        with Live(refresh_per_second=4) as live:
            while current_vus <= args.max:
                # Ajustar número de workers a current_vus
                delta = current_vus - len(workers)
                for _ in range(delta):
                    workers.append(asyncio.create_task(worker(len(workers)+1, stop_event, client, health_endpoint, metrics_queue, args.timeout)))

                window = MetricsWindow()
                interval_start = time.time()
                # Recolectar durante step_duration
                while time.time() - interval_start < args.step_duration:
                    try:
                        latency, error = await asyncio.wait_for(metrics_queue.get(), timeout=args.timeout)
                        if not error:
                            last_alive = time.time()
                        window.add(latency, error)
                    except asyncio.TimeoutError:
                        # Verificar si el servidor parece muerto (no respuestas exitosas en timeout * 3)
                        if time.time() - last_alive > args.timeout * 3:
                            console.log("Servidor parece no responder: deteniendo prueba.")
                            stop_event.set()
                            for t in workers:
                                t.cancel()
                            await asyncio.gather(*workers, return_exceptions=True)
                            snapshot = window.snapshot()
                            results.append((current_vus, snapshot))
                            return results

                    # Actualizar UI parcial
                    snap = window.snapshot()
                    table = Table(title="Prueba de Capacidad")
                    table.add_column("VUs", justify="right")
                    table.add_column("RPS", justify="right")
                    table.add_column("Err %", justify="right")
                    table.add_column("Lat avg (ms)", justify="right")
                    table.add_column("Lat p95 (ms)", justify="right")
                    rps = snap['requests']/max(0.001, (time.time()-interval_start))
                    table.add_row(str(current_vus), f"{rps:.1f}", f"{snap['error_rate']*100:.1f}", f"{snap['lat_avg']*1000:.1f}", f"{snap['lat_p95']*1000:.1f}")

                    hist_table = Table(title="Histórico")
                    hist_table.add_column("VUs")
                    hist_table.add_column("RPS")
                    hist_table.add_column("Err %")
                    hist_table.add_column("p95 ms")
                    for vus, s in results[-10:]:  # últimas 10
                        dur_rps = s['requests']/args.step_duration
                        hist_table.add_row(str(vus), f"{dur_rps:.1f}", f"{s['error_rate']*100:.1f}", f"{s['lat_p95']*1000:.1f}")

                    live.update(Panel.fit(table, subtitle="Incrementando concurrencia"))

                snapshot = window.snapshot()
                results.append((current_vus, snapshot))

                # Condición de parada por error
                if snapshot['error_rate'] > args.error_threshold:
                    console.log(f"Umbral de error superado ({snapshot['error_rate']*100:.1f}% > {args.error_threshold*100:.1f}%). Deteniendo.")
                    break

                current_vus += args.step

        stop_event.set()
        for t in workers:
            t.cancel()
        await asyncio.gather(*workers, return_exceptions=True)

    return results


def analizar_resultados(results, args):
    if not results:
        return "Sin datos"
    # Capacidad = mayor VUs antes de superar umbral de error
    capacidad = 0
    mejor_rps = 0
    for vus, snap in results:
        if snap['error_rate'] <= args.error_threshold:
            capacidad = max(capacidad, vus)
            rps = snap['requests']/args.step_duration
            mejor_rps = max(mejor_rps, rps)
    resumen = {
        "capacidad_vus": capacidad,
        "mejor_rps_aprox": round(mejor_rps, 1),
        "umbral_error": args.error_threshold,
        "pasos": [
            {
                "vus": vus,
                "rps": round(snap['requests']/args.step_duration, 2),
                "error_rate": round(snap['error_rate'], 4),
                "lat_avg_ms": round(snap['lat_avg']*1000, 2),
                "lat_p95_ms": round(snap['lat_p95']*1000, 2),
            }
            for vus, snap in results
        ],
    }
    return resumen


def main():
    parser = argparse.ArgumentParser(description="Prueba de capacidad incremental para la API FastAPI")
    parser.add_argument('--base-url', default='http://localhost:8081', help='Base URL de la API')
    parser.add_argument('--login', action='store_true', help='Realizar login antes de la prueba')
    parser.add_argument('--code', type=int, default=1111, help='Código de usuario admin')
    parser.add_argument('--password', default='1234', help='Password de usuario admin')
    parser.add_argument('--start', type=int, default=10, help='Concurrencia inicial (VUs)')
    parser.add_argument('--step', type=int, default=20, help='Incremento de VUs por paso')
    parser.add_argument('--max', type=int, default=500, help='Concurrencia máxima a intentar')
    parser.add_argument('--step-duration', type=int, default=20, help='Duración (s) de cada nivel de concurrencia')
    parser.add_argument('--timeout', type=float, default=2.0, help='Timeout por request (s)')
    parser.add_argument('--error-threshold', type=float, default=0.10, help='Umbral de error para detener (0-1)')
    parser.add_argument('--json', action='store_true', help='Imprimir JSON final con resumen')
    args = parser.parse_args()

    results = asyncio.run(ramp_test(args))
    resumen = analizar_resultados(results, args)
    if args.json:
        print(json.dumps(resumen, indent=2, ensure_ascii=False))
    else:
        console.rule("Resumen")
        console.print_json(data=resumen)

if __name__ == '__main__':
    main()
