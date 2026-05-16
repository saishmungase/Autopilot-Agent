# app/core/security.py
"""
Security utilities: password hashing and JWT token creation/verification.

Uses bcrypt directly (instead of passlib) to avoid the passlib/bcrypt>=4.0
incompatibility where bcrypt removed __about__ and changed its API.
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt  # noqa: F401 (JWTError re-exported for callers)

# --- Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "changeme-use-a-strong-secret-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


# --- Password Hashing (bcrypt directly, no passlib) ---

def get_password_hash(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    # bcrypt requires bytes; encode to UTF-8 and truncate to 72 bytes (bcrypt limit)
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    password_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# --- JWT Token ---

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token. Raises JWTError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
