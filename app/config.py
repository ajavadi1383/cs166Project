from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    DEBUG: bool = os.getenv("FLASK_DEBUG", "1") == "1"

    # PostgreSQL connection settings.
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "auction_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")

    PORT: int = int(os.getenv("PORT", "5000"))

    @property
    def dsn(self) -> dict:
        return {
            "host": self.DB_HOST,
            "port": self.DB_PORT,
            "dbname": self.DB_NAME,
            "user": self.DB_USER,
            "password": self.DB_PASSWORD,
        }
