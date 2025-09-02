import os, time, json
import requests

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8081")


def wait_health(timeout=20):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            r = requests.get(f"{BASE}/healthz", timeout=2)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def login(code: int, password: str) -> str:
    r = requests.post(
        f"{BASE}/auth/login",
        json={"code": code, "password": password},
        timeout=5,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def ensure_users(admin_token: str):
    hdr = {"Authorization": f"Bearer {admin_token}"}
    for payload in (
        {"code": 2001, "nombre": "Supervisor Mecanico", "password": "pass", "tipo_usuario_id": 1, "especialidad_id": 2},
        {"code": 3001, "nombre": "Mantenedor Mecanico", "password": "pass", "tipo_usuario_id": 2, "especialidad_id": 2},
    ):
        r = requests.post(f"{BASE}/users", headers=hdr, json=payload, timeout=5)
        if r.status_code not in (200, 201):
            # 409 duplicate is fine
            try:
                if r.json().get("detail") != "User code already exists":
                    r.raise_for_status()
            except Exception:
                pass


def first_supervisor_order(sup_token: str) -> int | None:
    hdr = {"Authorization": f"Bearer {sup_token}"}
    r = requests.get(f"{BASE}/ordenes", headers=hdr, timeout=10)
    r.raise_for_status()
    arr = r.json()
    return arr[0]["code"] if arr else None


def assign_order(sup_token: str, order_code: int, mantenedor: int):
    hdr = {"Authorization": f"Bearer {sup_token}"}
    body = {"assigned_to": mantenedor, "obs_orden": "Asignación de prueba"}
    r = requests.patch(f"{BASE}/ordenes/{order_code}/assign", headers=hdr, json=body, timeout=10)
    r.raise_for_status()
    return r.json()


def list_orders(token: str):
    hdr = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE}/ordenes", headers=hdr, timeout=10)
    r.raise_for_status()
    return r.json()


def main():
    assert wait_health(), "API not healthy on /healthz"
    admin = login(1111, "1234")
    ensure_users(admin)
    sup = login(2001, "pass")
    man = login(3001, "pass")
    oc = first_supervisor_order(sup)
    assert oc, "No orders found for supervisor"
    res = assign_order(sup, oc, 3001)
    print({k: res.get(k) for k in ("code", "assigned_by", "assigned_to", "status")})
    sup_list = list_orders(sup)
    man_list = list_orders(man)
    assert any(o.get("code") == oc for o in sup_list)
    assert any(o.get("code") == oc for o in man_list)
    print("visibility_ok", oc)


if __name__ == "__main__":
    main()
