from __future__ import annotations
from typing import Any, Dict
from datetime import datetime

# Adapter to use the project's full PDF parser and normalize to our internal schema.

def _to_dt(val: Any) -> datetime | None:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(val, fmt)
            except Exception:
                continue
    return None


def parse_pdf_pautas(pdf_path: str) -> Dict[int, Dict[str, Any]]:
    """Parse PDF using PautasPDFv2 and map keys to our internal fields.

    Returns a dict keyed by order code (int) with fields:
      - fecha_inicial, fecha_vencimiento (datetime | None)
      - frecuencia_dias (int | None)
      - horas_estimadas (float)
      - task_number (int)
      - prioridad (int | None)  # only numeric if convertible
      - speciality (str)
      - specialty_id (int)
      - obs_orden (str)
      - data (original record)
    """
    try:
        from PautasPDFv2 import process_pdf_to_json
    except Exception as e:  # pragma: no cover - import error case
        raise RuntimeError("PautasPDFv2.py not available or import failed") from e

    parsed = process_pdf_to_json(pdf_path)  # Dict[str, dict]
    orders: Dict[int, Dict[str, Any]] = {}

    for code_str, rec in (parsed or {}).items():
        try:
            code = int(code_str)
        except Exception:
            # Skip non-numeric codes
            continue

        # Source keys from PautasPDFv2
        fecha_inicial = _to_dt(rec.get("F inicial"))
        fecha_venc = _to_dt(rec.get("Fecha Venc."))
        frecuencia_dias = None
        try:
            if rec.get("Frec. Dias") is not None:
                frecuencia_dias = int(str(rec.get("Frec. Dias")).strip() or 0) or None
        except Exception:
            frecuencia_dias = None

        horas_estimadas = 0.0
        try:
            hs = rec.get("Hs Estim")
            horas_estimadas = float(hs) if hs is not None else 0.0
        except Exception:
            horas_estimadas = 0.0

        # Use the exact number extracted by the parser
        task_number = 0
        try:
            task_number = int(rec.get("Numero de Tareas") or 0)
        except Exception:
            task_number = 0

        # Prioridad: keep None if non-numeric
        prioridad_val = rec.get("Tipo de Servicio")
        prioridad: int | None = None
        # si "SYS" en prioridad_val, entonces 1, si "CCL" entonces 2, else 3
        if "SYS" in prioridad_val:
            prioridad_val = 1
        elif "CCL" in prioridad_val:
            prioridad_val = 2
        else:
            prioridad_val = 3
        
        try:
            prioridad = int(prioridad_val)  # only numbers
        except Exception:
            prioridad = None

        speciality = str(rec.get("Especialidad") or "")
        specialty_id = int(rec.get("Especialidad_id") or 0)
        obs_orden = str(rec.get("Observacion") or "")

        orders[code] = {
            "code": code,
            "fecha_inicial": fecha_inicial,
            "fecha_vencimiento": fecha_venc,
            "frecuencia_dias": frecuencia_dias,
            "horas_estimadas": horas_estimadas,
            "task_number": task_number,
            "prioridad": prioridad,
            "speciality": speciality,
            "specialty_id": specialty_id,
            "obs_orden": obs_orden,
            # Keep full original record for traceability
            "data": rec,
        }

    return orders
