"""Meilisearch integration.

Postgres remains the source of truth. Analyzed channels are mirrored into a
Meilisearch index for fast, typo-tolerant, faceted search. Every public function
degrades gracefully: if Meili is not configured or unreachable, callers fall
back to Postgres FTS so the product never hard-breaks.
"""
from __future__ import annotations

import logging
from typing import Any

from app.config import settings

log = logging.getLogger("search.meili")

# Document fields we send to Meili. Mirrors channel_ranked, minus heavy text.
_SEARCHABLE = ["title", "username", "summary", "category", "why_recommended"]
_FILTERABLE = ["category", "is_marketplace", "member_count", "final_score"]
_SORTABLE = ["final_score", "member_count"]

# Ranking: text relevance first (typo/words/proximity), then our quality score.
_RANKING_RULES = [
    "words",
    "typo",
    "proximity",
    "attribute",
    "exactness",
    "final_score:desc",
]


def _client():
    """Return a Meili client, or None if not configured / lib missing."""
    if not settings.meili_url:
        return None
    try:
        import meilisearch  # imported lazily so the dep is optional
    except ImportError:
        log.warning("meilisearch package not installed; using Postgres fallback")
        return None
    try:
        return meilisearch.Client(settings.meili_url, settings.meili_master_key or None)
    except Exception as e:  # noqa: BLE001
        log.warning("could not create Meili client: %s", e)
        return None


def is_available() -> bool:
    client = _client()
    if client is None:
        return False
    try:
        client.health()
        return True
    except Exception:  # noqa: BLE001
        return False


def ensure_index() -> None:
    """Create the index and apply settings (idempotent). Safe to call often."""
    client = _client()
    if client is None:
        return
    try:
        client.create_index(settings.meili_index, {"primaryKey": "id"})
    except Exception:  # noqa: BLE001
        pass  # already exists
    try:
        index = client.index(settings.meili_index)
        index.update_searchable_attributes(_SEARCHABLE)
        index.update_filterable_attributes(_FILTERABLE)
        index.update_sortable_attributes(_SORTABLE)
        index.update_ranking_rules(_RANKING_RULES)
    except Exception as e:  # noqa: BLE001
        log.warning("could not apply index settings: %s", e)


def to_document(row: dict[str, Any]) -> dict[str, Any]:
    """Build a Meili document from a channel_ranked-shaped row."""
    return {
        "id": row["id"],
        "title": row.get("title"),
        "username": row.get("username"),
        "summary": row.get("summary"),
        "why_recommended": row.get("why_recommended"),
        "category": row.get("category"),
        "is_marketplace": bool(row.get("is_marketplace")),
        "member_count": row.get("member_count") or 0,
        "final_score": float(row.get("final_score") or 0),
    }


def upsert(rows: list[dict[str, Any]]) -> bool:
    """Mirror one or more channels into Meili. Returns False if unavailable."""
    if not rows:
        return True
    client = _client()
    if client is None:
        return False
    try:
        client.index(settings.meili_index).add_documents(
            [to_document(r) for r in rows]
        )
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("Meili upsert failed (non-fatal): %s", e)
        return False


def search(query: str, limit: int = 20) -> list[dict[str, Any]] | None:
    """Search Meili. Returns hit dicts, or None if Meili is unavailable so the
    caller can fall back to Postgres."""
    client = _client()
    if client is None:
        return None
    try:
        res = client.index(settings.meili_index).search(query, {"limit": limit})
        return res.get("hits", [])
    except Exception as e:  # noqa: BLE001
        log.warning("Meili search failed, falling back: %s", e)
        return None
