import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import pymysql
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def load_local_env():
    path = Path(__file__).with_name(".env")
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()


def env(name, default):
    return os.getenv(name, default)


def database_connection():
    return pymysql.connect(
        host=env("MYSQL_HOST", "127.0.0.1"), port=int(env("MYSQL_PORT", "3306")),
        user=env("MYSQL_USER", "root"), password=env("MYSQL_PASSWORD", ""),
        database=env("MYSQL_DATABASE", "profile"), cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def create_users_table():
    with database_connection() as connection, connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    encode = base64.urlsafe_b64encode
    return f"scrypt${encode(salt).decode()}${encode(digest).decode()}"


def verify_password(password, stored):
    try:
        _, salt, expected = stored.split("$", 2)
        actual = hashlib.scrypt(password.encode(), salt=base64.urlsafe_b64decode(salt), n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, base64.urlsafe_b64decode(expected))
    except (ValueError, TypeError):
        return False


def encode_token(user_id):
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=").decode()
    message = f'{encode({"alg": "HS256", "typ": "JWT"})}.{encode({"sub": str(user_id), "exp": int(time.time()) + 86400})}'
    signature = hmac.new(env("JWT_SECRET", "change-this-local-secret").encode(), message.encode(), hashlib.sha256).digest()
    return f"{message}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


@asynccontextmanager
async def lifespan(_):
    create_users_table()
    yield


app = FastAPI(title="Cybersecurity Portfolio API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in env("CORS_ORIGINS", "*").split(",")],
    allow_methods=["GET", "POST"], allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Cybersecurity Portfolio API is running"}


@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    try:
        with database_connection() as connection, connection.cursor() as cursor:
            cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)", (payload.username, payload.email.lower(), hash_password(payload.password)))
            user_id = cursor.lastrowid
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="Username hoặc email đã được sử dụng")
    return {"message": "Đăng ký thành công", "access_token": encode_token(user_id), "token_type": "bearer"}


@app.post("/auth/login")
def login(payload: LoginRequest):
    with database_connection() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT id, username, email, password_hash FROM users WHERE email = %s", (payload.email.lower(),))
        user = cursor.fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")
    return {"message": "Đăng nhập thành công", "access_token": encode_token(user["id"]), "token_type": "bearer", "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}


@app.get("/health")
def health():
    with database_connection() as connection:
        connection.ping()
    return {"status": "ok", "database": env("MYSQL_DATABASE", "profile"), "checked_at": datetime.now(timezone.utc)}
