"""Postgres connection pool shared across worker, analysis, and API."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

from app.config import settings

_pool: ConnectionPool | None = None


def _configure(conn) -> None:
    """Run once per new connection: fail fast on lock contention instead of
    hanging until the server statement_timeout (which strands locks on crash).

    The pool requires this callback to leave the connection OUT of a transaction,
    so we run the SET in autocommit and restore the default afterwards.

    NOTE: we deliberately do NOT set idle_in_transaction_session_timeout here.
    The Supabase transaction pooler recycles idle connections on its own, and a
    short server-side idle timeout caused pooled connections to be killed between
    requests ('server closed the connection unexpectedly')."""
    conn.autocommit = True
    conn.execute("SET lock_timeout = '5s'")
    conn.autocommit = False


def _is_pgbouncer(url: str) -> bool:
    """Heuristic: are we talking to a transaction pooler (Supabase pgbouncer)?
    Those need prepared statements disabled; a direct Postgres does not."""
    u = url.lower()
    return "pooler.supabase.com" in u or "pgbouncer" in u or ":6543" in u


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not set")
        kwargs = {"row_factory": dict_row}
        if _is_pgbouncer(settings.database_url):
            # Transaction poolers (Supabase port 6543) can't use prepared
            # statements — disable them. Harmless to omit for direct Postgres.
            kwargs["prepare_threshold"] = None
        # check_connection revives connections a pooler may have dropped; the
        # longer timeout keeps a slow deep-history crawl from starving the pool.
        _pool = ConnectionPool(
            settings.database_url,
            min_size=1,
            max_size=5,
            timeout=60.0,
            max_idle=120.0,
            kwargs=kwargs,
            configure=_configure,
            check=ConnectionPool.check_connection,
            open=True,
        )
    return _pool


def close_pool() -> None:
    """Close the pool cleanly. Call at process exit to avoid the noisy
    'cannot join thread at interpreter shutdown' finalizer error."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_conn() -> Iterator:
    """Yield a pooled connection; commits on success, rolls back on error."""
    pool = get_pool()
    with pool.connection() as conn:
        yield conn
