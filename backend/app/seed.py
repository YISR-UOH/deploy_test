from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import hash_password
from app.db.session import async_session_maker
from app.models.modelo_user import User, map_role_name, map_spec_name
from app.models.modelo_especialidad import Specialty


async def ensure_admin() -> None:
    async with async_session_maker() as session:  # type: AsyncSession
        result = await session.execute(select(User).where(User.code == 1111))
        admin = result.scalar_one_or_none()
        if admin:
            return
        admin = User(
            code=1111,
            nombre="Admin",
            password_hash=hash_password("1234"),
            tipo_usuario_id=0,
            tipo_usuario=map_role_name(0),
            especialidad_id=0,
            especialidad=map_spec_name(0),
            estado=1,
            theme=1,
        )
        session.add(admin)
        await session.commit()


async def ensure_specialties() -> None:
    """Seed default specialties if they don't exist: 0 Admin, 1 Electrico, 2 Mecanico."""
    async with async_session_maker() as session:  # type: AsyncSession
        # Ensure Admin (0)
        for code, nombre, descripcion in [
            (0, "Administrador", "Rol administrativo"),
            (1, "Electrico", "Especialidad eléctrica"),
            (2, "Mecanico", "Especialidad mecánica"),
        ]:
            result = await session.execute(select(Specialty).where(Specialty.code == code))
            spec = result.scalar_one_or_none()
            if not spec:
                spec = Specialty(code=code, nombre=nombre, descripcion=descripcion, estado=1)
                session.add(spec)
        await session.commit()
