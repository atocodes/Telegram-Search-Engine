"""All SQL lives here so worker / analysis / API share one source of truth."""
from __future__ import annotations

from typing import Any

from app.db.database import get_conn


# ---------------------------------------------------------------- channels ---
def upsert_channel(
    *,
    tg_id: int | None,
    username: str | None,
    title: str,
    member_count: int | None,
    discovered_by_keyword: str | None,
) -> int:
    """Insert or update a channel deduped by tg_id (or username). Returns id."""
    with get_conn() as conn:
        row = conn.execute(
            """
            INSERT INTO channels (tg_id, username, title, member_count, discovered_by_keyword)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (tg_id) DO UPDATE SET
                username = COALESCE(EXCLUDED.username, channels.username),
                title = EXCLUDED.title,
                member_count = COALESCE(EXCLUDED.member_count, channels.member_count)
            RETURNING id
            """,
            (tg_id, username, title, member_count, discovered_by_keyword),
        ).fetchone()
        return row["id"]


def mark_channel_crawled(channel_id: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE channels SET last_crawled_at = now() WHERE id = %s",
            (channel_id,),
        )


def channels_needing_analysis(limit: int = 50) -> list[dict[str, Any]]:
    """Channels with messages but no (or stale) analysis."""
    with get_conn() as conn:
        return conn.execute(
            """
            SELECT c.id, c.title, c.username, c.member_count
            FROM channels c
            WHERE EXISTS (SELECT 1 FROM messages m WHERE m.channel_id = c.id)
              AND (
                NOT EXISTS (SELECT 1 FROM channel_analysis a WHERE a.channel_id = c.id)
                OR (SELECT analyzed_at FROM channel_analysis a WHERE a.channel_id = c.id)
                     < c.last_crawled_at
              )
            ORDER BY c.last_crawled_at DESC NULLS LAST
            LIMIT %s
            """,
            (limit,),
        ).fetchall()


# ---------------------------------------------------------------- messages ---
def insert_messages(channel_id: int, msgs: list[dict[str, Any]]) -> int:
    """Bulk insert sampled messages; ignores duplicates. Returns inserted count."""
    if not msgs:
        return 0
    inserted = 0
    with get_conn() as conn:
        for m in msgs:
            cur = conn.execute(
                """
                INSERT INTO messages
                    (channel_id, tg_message_id, text, has_image, has_link, posted_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (channel_id, tg_message_id) DO NOTHING
                """,
                (
                    channel_id,
                    m["tg_message_id"],
                    m.get("text"),
                    m.get("has_image", False),
                    m.get("has_link", False),
                    m.get("posted_at"),
                ),
            )
            inserted += cur.rowcount
    return inserted


def get_channel_messages(channel_id: int, limit: int = 50) -> list[dict[str, Any]]:
    with get_conn() as conn:
        return conn.execute(
            """
            SELECT tg_message_id, text, has_image, has_link, posted_at
            FROM messages
            WHERE channel_id = %s
            ORDER BY posted_at DESC NULLS LAST
            LIMIT %s
            """,
            (channel_id, limit),
        ).fetchall()


# ---------------------------------------------------------------- analysis ---
def upsert_analysis(channel_id: int, data: dict[str, Any]) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO channel_analysis (
                channel_id, category, is_marketplace, confidence,
                summary, tone, typical_content, why_recommended,
                activity_score, quality_score, freshness_score, final_score,
                analyzed_at
            ) VALUES (
                %(channel_id)s, %(category)s, %(is_marketplace)s, %(confidence)s,
                %(summary)s, %(tone)s, %(typical_content)s, %(why_recommended)s,
                %(activity_score)s, %(quality_score)s, %(freshness_score)s, %(final_score)s,
                now()
            )
            ON CONFLICT (channel_id) DO UPDATE SET
                category = EXCLUDED.category,
                is_marketplace = EXCLUDED.is_marketplace,
                confidence = EXCLUDED.confidence,
                summary = EXCLUDED.summary,
                tone = EXCLUDED.tone,
                typical_content = EXCLUDED.typical_content,
                why_recommended = EXCLUDED.why_recommended,
                activity_score = EXCLUDED.activity_score,
                quality_score = EXCLUDED.quality_score,
                freshness_score = EXCLUDED.freshness_score,
                final_score = EXCLUDED.final_score,
                analyzed_at = now()
            """,
            {"channel_id": channel_id, **data},
        )
        # Refresh the FTS vector now that summary/category may have changed.
        conn.execute(
            "UPDATE channels SET search_tsv = channels_build_tsv(%s) WHERE id = %s",
            (channel_id, channel_id),
        )


# ------------------------------------------------------------------ search ---
def search_channels(query: str, limit: int = 20) -> list[dict[str, Any]]:
    """Full-text search ranked by final_score blended with text relevance."""
    with get_conn() as conn:
        return conn.execute(
            """
            SELECT r.*,
                   ts_rank(c.search_tsv, websearch_to_tsquery('simple', %(q)s)) AS text_rank
            FROM channel_ranked r
            JOIN channels c ON c.id = r.id
            WHERE c.search_tsv @@ websearch_to_tsquery('simple', %(q)s)
            ORDER BY (COALESCE(r.final_score, 0) * 0.7
                      + ts_rank(c.search_tsv, websearch_to_tsquery('simple', %(q)s)) * 100 * 0.3)
                     DESC
            LIMIT %(limit)s
            """,
            {"q": query, "limit": limit},
        ).fetchall()


def get_channel(channel_id: int) -> dict[str, Any] | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM channel_ranked WHERE id = %s", (channel_id,)
        ).fetchone()


def list_categories() -> list[dict[str, Any]]:
    with get_conn() as conn:
        return conn.execute(
            """
            SELECT category, COUNT(*) AS channel_count
            FROM channel_analysis
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY channel_count DESC
            """
        ).fetchall()
