"""Seed a known channel into the frontier by username or t.me link.

    python -m app.ingestion.add_channel solodevchronicles
    python -m app.ingestion.add_channel https://t.me/SoloDevChronicles

It's then picked up by the next link-graph crawl (resolved, sampled, harvested).
"""
from __future__ import annotations

import argparse
import logging

from app.db.database import close_pool
from app.ingestion import frontier
from app.ingestion.references import _normalize

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ingestion.add_channel")


def _extract_username(raw: str) -> str | None:
    raw = raw.strip()
    if "t.me/" in raw:
        raw = raw.rsplit("t.me/", 1)[1]
    raw = raw.split("/")[0].split("?")[0]
    return _normalize(raw)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("channels", nargs="+", help="usernames or t.me links")
    args = p.parse_args()
    try:
        for raw in args.channels:
            uname = _extract_username(raw)
            if not uname:
                log.warning("could not parse a username from %r — skipping", raw)
                continue
            frontier.enqueue(uname, depth=0, source="manual", discovered_from=None)
            log.info("queued @%s (depth 0)", uname)
        log.info("done — run: python -m app.ingestion.crawl --link-graph")
    finally:
        close_pool()


if __name__ == "__main__":
    main()
