from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool

_pool: ThreadedConnectionPool | None = None


def init_pool(config) -> None:  # noqa: ANN001
    """Create the global connection pool (idempotent)."""
    global _pool
    if _pool is not None:
        return
    _pool = ThreadedConnectionPool(minconn=1, maxconn=10, **config.dsn)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_conn() -> Iterator[Any]:
    """Borrow a connection from the pool and return it when done."""
    if _pool is None:
        raise RuntimeError("Connection pool is not initialised. Call init_pool().")
    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)


@contextmanager
def get_cursor(commit: bool = False) -> Iterator[psycopg2.extras.RealDictCursor]:
    """Yield a dict cursor; commit on success when commit=True, rollback on error."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield cur
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def query_all(sql: str, params: tuple | dict | None = None) -> list[dict]:
    with get_cursor() as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


def query_one(sql: str, params: tuple | dict | None = None) -> dict | None:
    with get_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def execute(sql: str, params: tuple | dict | None = None) -> int:
    """Run a write statement in its own transaction; returns affected rowcount."""
    with get_cursor(commit=True) as cur:
        cur.execute(sql, params)
        return cur.rowcount


def next_id(table: str, column: str) -> int:
    """Generate the next integer id for tables whose PK is a plain INT.
    """
    row = query_one(f"SELECT COALESCE(MAX({column}), 0) + 1 AS next FROM {table}")
    return int(row["next"]) if row else 1
