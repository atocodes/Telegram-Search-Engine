"""Thin Ollama JSON client for the local model on your gaming laptop."""
from __future__ import annotations

import json
import logging
from ollama import Client as ollamaClient

import httpx

from app.config import settings

log = logging.getLogger("analysis.ollama")


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    def generate_json(self, prompt: str, *, timeout: float = 300.0) -> dict:
        """Call Ollama with format=json and parse the response into a dict."""
        try:
            client = ollamaClient(
                host=f"{self.base_url}/",
                headers={
                    "Authorization": f"Bearer {settings.ollama_api_key}"
                }

            )

            messages = [
                {
                    'role': 'system',
                    'content': prompt
                },
            ]

            res = client.chat('gpt-oss:120b', messages=messages, stream=False)
            resp = res['message']['content']
        except httpx.HTTPError as e:
            log.error("Ollama request failed: %s", e)
            return {}

        try:
            return json.loads(resp)
        except json.JSONDecodeError:
            log.warning("Ollama returned non-JSON: %.200s", resp)
            return {}
