from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_settings
from app.db.session import init_db
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.especialidades import router as especialidades_router
from app.routes.ordenes import router as ordenes_router
from app.seed import ensure_admin, ensure_specialties

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Autenticación: usa POST /auth/login con code y password para obtener el token. "
        "En Swagger, haz clic en 'Authorize', selecciona 'bearerAuth' y pega solo el token (sin 'Bearer '). "
        "El token se mantendrá entre recargas."
    ),
    swagger_ui_parameters={"persistAuthorization": True},
    servers=[
        {"url": "http://localhost:8081", "description": "Local"},
        {"url": "http://api:8081", "description": "Docker (red interna)"},
    ],
)
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()
    await ensure_admin()
    await ensure_specialties()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(especialidades_router)
app.include_router(ordenes_router)
