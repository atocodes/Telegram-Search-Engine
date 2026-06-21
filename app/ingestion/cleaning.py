"""Message cleaning: drop spam/empty, flag images/links, keep useful text."""
from __future__ import annotations

import re
from typing import Any

_LINK_RE = re.compile(r"https?://|t\.me/", re.IGNORECASE)

# Crude bot-ad / spam markers. Tune per niche.
_SPAM_MARKERS = (
    "join now", "click here", "free crypto", "earn $", "investment opportunity",
    "100% profit", "dm me to", "limited offer",
)


def is_spam(text: str | None) -> bool:
    if not text:
        return False
    low = text.lower()
    return sum(marker in low for marker in _SPAM_MARKERS) >= 2


def clean_message(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize one Telethon message dict. Returns None if it should be dropped."""
    text = (raw.get("text") or "").strip()
    has_image = bool(raw.get("has_image"))
    has_link = bool(text and _LINK_RE.search(text))

    # Drop empty, non-image, forwarded spam.
    if not text and not has_image:
        return None
    if raw.get("is_forward") and is_spam(text):
        return None
    if is_spam(text):
        return None

    return {
        "tg_message_id": raw["tg_message_id"],
        "text": text or None,
        "has_image": has_image,
        "has_link": has_link,
        "posted_at": raw.get("posted_at"),
    }


def clean_batch(raws: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for r in raws:
        c = clean_message(r)
        if c:
            out.append(c)
    return out
