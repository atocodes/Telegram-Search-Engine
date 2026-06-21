"""Crawl entrypoint: keyword -> discover -> dedupe -> sample -> clean -> store.

Usage:
    python -m app.ingestion.crawl --keywords phones addis crypto jobs
    python -m app.ingestion.crawl --print-session   # one-time, to capture session
"""
from __future__ import annotations

import argparse
import asyncio
import logging

from app.config import settings
from app.db import repository as repo
from app.db.database import close_pool
from app.ingestion import keywords as keywords_repo
from app.ingestion.cleaning import clean_batch
from app.ingestion.telegram_client import TelegramReader

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ingestion.crawl")


async def _discover(reader: "TelegramReader", keywords: list[str], record: bool):
    """Search each keyword, dedupe by tg_id. Optionally record per-keyword
    channel counts into keyword_runs (DB-driven mode)."""
    seen: dict[int, dict] = {}
    for kw in keywords:
        found = await reader.search_channels(kw, limit=20)
        log.info("keyword %r -> %d channels", kw, len(found))
        for ch in found:
            if ch["tg_id"] not in seen:
                seen[ch["tg_id"]] = ch
        if record:
            keywords_repo.record_run(kw, len(found))
    return seen


async def crawl(keywords: list[str], *, record_runs: bool = False) -> None:
    reader = TelegramReader()
    await reader.start()
    try:
        # 1) discover, deduping across keywords by tg_id within this run
        seen = await _discover(reader, keywords, record_runs)

        channels = list(seen.values())[: settings.tg_max_channels_per_run]
        log.info("crawling %d unique channels (capped)", len(channels))

        # 2) persist channels + 3) sample & clean messages
        for ch in channels:
            channel_id = repo.upsert_channel(
                tg_id=ch["tg_id"],
                username=ch["username"],
                title=ch["title"],
                member_count=ch["member_count"],
                discovered_by_keyword=ch["discovered_by_keyword"],
            )
            raws = await reader.fetch_recent_messages(
                ch, limit=settings.tg_messages_per_channel
            )
            cleaned = clean_batch(raws)
            inserted = repo.insert_messages(channel_id, cleaned)
            repo.mark_channel_crawled(channel_id)
            log.info(
                "channel %s (%s): %d raw -> %d kept -> %d new",
                ch["title"], ch.get("username"), len(raws), len(cleaned), inserted,
            )
    finally:
        await reader.stop()


async def crawl_from_db(max_queries: int, min_age_hours: float) -> None:
    """DB-driven keyword expansion: generate bases x modifiers, pick the queries
    most overdue for a crawl, run them (recording results), so repeat runs keep
    exploring new terms instead of re-crawling the same handful."""
    bases, modifiers = keywords_repo.load_terms()
    all_queries = keywords_repo.generate_queries(bases, modifiers)
    log.info(
        "generated %d queries from %d bases x %d modifiers",
        len(all_queries), len(bases), len(modifiers),
    )
    due = keywords_repo.due_queries(
        all_queries, min_age_hours=min_age_hours, limit=max_queries
    )
    if not due:
        log.info("no queries are due (all crawled within %sh)", min_age_hours)
        return
    log.info("crawling %d due queries this run", len(due))
    await crawl(due, record_runs=True)


async def print_session() -> None:
    """Interactive first login; prints the session string to store in .env."""
    reader = TelegramReader()
    await reader.start()
    print("\n=== TG_SESSION_STRING (store this in .env) ===")
    print(reader.export_session_string())
    print("=== end ===\n")
    await reader.stop()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--keywords", nargs="*", default=[],
                   help="explicit keywords to crawl")
    p.add_argument("--from-db", action="store_true",
                   help="generate + crawl keywords from the DB (expansion mode)")
    p.add_argument("--max-queries", type=int, default=20,
                   help="[--from-db] max due queries to crawl this run")
    p.add_argument("--min-age-hours", type=float, default=24.0,
                   help="[--from-db] skip queries crawled within this many hours")
    p.add_argument("--print-session", action="store_true")
    args = p.parse_args()

    try:
        if args.print_session:
            asyncio.run(print_session())
            return
        if args.from_db:
            asyncio.run(crawl_from_db(args.max_queries, args.min_age_hours))
            return
        if not args.keywords:
            p.error("provide --keywords, --from-db, or --print-session")
        asyncio.run(crawl(args.keywords))
    finally:
        close_pool()


if __name__ == "__main__":
    main()
