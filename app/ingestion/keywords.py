"""Keyword expansion: turn DB-stored bases x modifiers into search queries,
and decide which queries are 'due' to crawl (skipping recently-crawled ones)."""
from __future__ import annotations

from typing import Any

from app.db.database import get_conn


# --------------------------------------------------------------- generation ---
def generate_queries(
    bases: list[dict[str, Any]],
    modifiers: list[dict[str, Any]],
    *,
    same_lang_only: bool = True,
) -> list[str]:
    """Combine bases x modifiers into deduped query strings.

    Each base is also emitted on its own. Modifiers are paired with bases of the
    same language by default (so Amharic bases get Amharic places, etc.), which
    keeps queries coherent and avoids a needless combinatorial blowup.
    """
    queries: list[str] = []
    seen: set[str] = set()

    def add(q: str) -> None:
        q = " ".join(q.split()).strip()
        key = q.lower()
        if q and key not in seen:
            seen.add(key)
            queries.append(q)

    for b in bases:
        add(b["term"])
        for m in modifiers:
            if same_lang_only and m["lang"] != b["lang"]:
                continue
            add(f"{b['term']} {m['term']}")
    return queries


# --------------------------------------------------------------- repository ---
def load_terms() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (bases, modifiers) of enabled keyword_terms."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT term, kind, lang FROM keyword_terms WHERE enabled = true"
        ).fetchall()
    bases = [r for r in rows if r["kind"] == "base"]
    modifiers = [r for r in rows if r["kind"] == "modifier"]
    return bases, modifiers


def due_queries(queries: list[str], *, min_age_hours: float, limit: int) -> list[str]:
    """From `queries`, return those never crawled or last crawled longer than
    `min_age_hours` ago — oldest / never-run first. Ensures a keyword_runs row
    exists for each returned query."""
    if not queries:
        return []
    with get_conn() as conn:
        # Make sure every candidate query has a tracking row.
        conn.executemany(
            "INSERT INTO keyword_runs (query) VALUES (%s) ON CONFLICT (query) DO NOTHING",
            [(q,) for q in queries],
        )
        rows = conn.execute(
            """
            SELECT query
            FROM keyword_runs
            WHERE query = ANY(%(qs)s)
              AND (last_crawled_at IS NULL
                   OR last_crawled_at < now() - (%(age)s || ' hours')::interval)
            ORDER BY last_crawled_at ASC NULLS FIRST
            LIMIT %(limit)s
            """,
            {"qs": queries, "age": str(min_age_hours), "limit": limit},
        ).fetchall()
    return [r["query"] for r in rows]


def record_run(query: str, channels_found: int) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE keyword_runs
            SET last_crawled_at = now(),
                channels_found = %s,
                run_count = run_count + 1
            WHERE query = %s
            """,
            (channels_found, query),
        )
