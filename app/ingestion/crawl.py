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
from app.ingestion.cleaning import clean_batch
from app.ingestion.telegram_client import TelegramReader

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("ingestion.crawl")


async def crawl(keywords: list[str]) -> None:
    reader = TelegramReader()
    await reader.start()
    try:
        # 1) discover, deduping across keywords by tg_id within this run
        seen: dict[int, dict] = {}
        for kw in keywords:
            found = await reader.search_channels(kw, limit=20)
            log.info("keyword %r -> %d channels", kw, len(found))
            for ch in found:
                if ch["tg_id"] not in seen:
                    seen[ch["tg_id"]] = ch

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
    p.add_argument("--keywords", nargs="*", default=[])
    p.add_argument("--print-session", action="store_true")
    args = p.parse_args()

    if args.print_session:
        asyncio.run(print_session())
        return
    if not args.keywords:
        p.error("provide --keywords or --print-session")
    asyncio.run(crawl(args.keywords))


if __name__ == "__main__":
    main()
