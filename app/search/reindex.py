"""Bulk-load every analyzed channel from Postgres into Meilisearch.

Use this once after standing up Meili (so already-analyzed channels get indexed),
or any time you want to rebuild the index from the source of truth.

    python -m app.search.reindex
"""
from __future__ import annotations

import logging

from app.db.database import close_pool, get_conn
from app.search import meili

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("search.reindex")


def reindex(batch_size: int = 500) -> None:
    if not meili.is_available():
        log.error("Meilisearch is not reachable at the configured URL — aborting.")
        return

    meili.ensure_index()

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM channel_ranked
            WHERE final_score IS NOT NULL
            ORDER BY id
            """
        ).fetchall()

    log.info("indexing %d analyzed channels", len(rows))
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        meili.upsert(batch)
        log.info("  pushed %d / %d", min(i + batch_size, len(rows)), len(rows))
    log.info("done")


def main() -> None:
    try:
        reindex()
    finally:
        close_pool()


if __name__ == "__main__":
    main()
