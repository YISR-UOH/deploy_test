#!/usr/bin/env python3
"""
Script para esperar a que la base de datos esté disponible antes de iniciar la API.
"""
import asyncio
import asyncpg
import sys
import os
from urllib.parse import urlparse

async def wait_for_db(database_url: str, max_attempts: int = 30, delay: int = 2):
    """Espera a que la base de datos esté disponible."""
    parsed = urlparse(database_url.replace("postgresql+asyncpg://", "postgresql://"))
    
    for attempt in range(max_attempts):
        try:
            print(f"Intento {attempt + 1}/{max_attempts}: Conectando a {parsed.hostname}:{parsed.port}...")
            conn = await asyncpg.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path.lstrip("/") if parsed.path else "postgres"
            )
            await conn.close()
            print("✅ Base de datos disponible")
            return True
        except Exception as e:
            print(f"❌ Error conectando a la DB: {e}")
            if attempt < max_attempts - 1:
                print(f"⏳ Esperando {delay}s antes del siguiente intento...")
                await asyncio.sleep(delay)
    
    print(f"💥 No se pudo conectar a la DB después de {max_attempts} intentos")
    return False

if __name__ == "__main__":
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://cartocor:cartocor@db:5432/cartocor")
    if not asyncio.run(wait_for_db(database_url)):
        sys.exit(1)
