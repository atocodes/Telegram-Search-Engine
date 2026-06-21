"""Thin Ollama JSON client for the local model on your gaming laptop."""
from __future__ import annotations

import json
import logging

import httpx

from app.config import settings

log = logging.getLogger("analysis.ollama")


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    def generate_json(self, prompt: str, *, timeout: float = 120.0) -> dict:
        """Call Ollama with format=json and parse the response into a dict."""
        try:
            resp = httpx.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.2},
                },
                timeout=timeout,
            )
            resp.raise_for_status()
        except httpx.HTTPError as e:
            log.error("Ollama request failed: %s", e)
            return {}

        body = resp.json()
        raw = body.get("response", "").strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            log.warning("Ollama returned non-JSON: %.200s", raw)
            return {}
