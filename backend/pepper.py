import secrets

JWT_SECRET: str = secrets.token_urlsafe(32)
PEPPER: str = secrets.token_urlsafe(16)

print("JWT_SECRET: ", JWT_SECRET)
print("PEPPER: ", PEPPER)