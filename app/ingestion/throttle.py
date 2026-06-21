"""Structural throttle so the crawler *cannot* hammer Telegram.

Every Telegram call must pass through `Throttle.wait()` first. This enforces a
minimum spacing plus random jitter between calls, which is the single most
important defense against account bans.
"""
from __future__ import annotations

import asyncio
import random
import time


class Throttle:
    def __init__(self, min_delay: float, jitter: float) -> None:
        self.min_delay = max(0.0, min_delay)
        self.jitter = max(0.0, jitter)
        self._last = 0.0

    async def wait(self) -> None:
        now = time.monotonic()
        target = self._last + self.min_delay + random.uniform(0, self.jitter)
        sleep_for = target - now
        if sleep_for > 0:
            await asyncio.sleep(sleep_for)
        self._last = time.monotonic()
