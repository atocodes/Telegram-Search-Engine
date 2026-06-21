"""LLM-driven classification + summary + 'why recommended' via local Ollama."""
from __future__ import annotations

import logging
from typing import Any

from app.analysis.ollama_client import OllamaClient

log = logging.getLogger("analysis.analyzer")

CATEGORIES = [
    "phones", "cars", "crypto", "jobs", "real_estate",
    "electronics", "fashion", "news", "mixed", "spam",
]

_CLASSIFY_PROMPT = """You analyze Telegram channels. Given the channel title and a
sample of recent messages, classify it. Respond ONLY with JSON of this exact shape:
{{
  "category": one of {categories},
  "is_marketplace": true or false,
  "confidence": number between 0 and 1,
  "summary": "one or two sentences on what this channel posts",
  "tone": "marketplace" | "news" | "spam" | "educational",
  "typical_content": "what users typically post here",
  "why_recommended": "a punchy 1-2 sentence reason a user would want this channel"
}}

Channel title: {title}

Recent messages:
{messages}
"""


def _format_messages(messages: list[dict[str, Any]], cap: int = 20) -> str:
    lines = []
    for m in messages[:cap]:
        txt = (m.get("text") or "").replace("\n", " ").strip()
        tag = "[img]" if m.get("has_image") else ""
        if txt or tag:
            lines.append(f"- {tag} {txt}"[:300])
    return "\n".join(lines) if lines else "(no text messages; mostly media)"


class ChannelAnalyzer:
    def __init__(self) -> None:
        self.llm = OllamaClient()

    def analyze(self, title: str, messages: list[dict[str, Any]]) -> dict[str, Any]:
        prompt = _CLASSIFY_PROMPT.format(
            categories=CATEGORIES,
            title=title,
            messages=_format_messages(messages),
        )
        out = self.llm.generate_json(prompt)

        category = out.get("category")
        if category not in CATEGORIES:
            category = "mixed"
        confidence = out.get("confidence")
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.3

        quality = self._quality_from_confidence(out, confidence)

        return {
            "category": category,
            "is_marketplace": bool(out.get("is_marketplace", False)),
            "confidence": max(0.0, min(1.0, confidence)),
            "summary": (out.get("summary") or "").strip()[:1000] or None,
            "tone": (out.get("tone") or "").strip()[:50] or None,
            "typical_content": (out.get("typical_content") or "").strip()[:1000] or None,
            "why_recommended": (out.get("why_recommended") or "").strip()[:500] or None,
            "quality_score": quality,
        }

    @staticmethod
    def _quality_from_confidence(out: dict[str, Any], confidence: float) -> float:
        """LLM usefulness 0..100. Spam is penalized; richer output scores higher."""
        if out.get("category") == "spam":
            return round(10 * confidence, 1)
        richness = sum(
            bool((out.get(k) or "").strip())
            for k in ("summary", "typical_content", "why_recommended")
        ) / 3.0
        base = 50 + 50 * richness  # 50..100 when fields are filled
        return round(base * (0.5 + 0.5 * confidence), 1)
