"""Pydantic response models for the API."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ChannelSummary(BaseModel):
    id: int
    username: str | None = None
    title: str
    member_count: int | None = None
    category: str | None = None
    is_marketplace: bool | None = None
    summary: str | None = None
    why_recommended: str | None = None
    final_score: float | None = None


class MessageOut(BaseModel):
    tg_message_id: int
    text: str | None = None
    has_image: bool = False
    has_link: bool = False
    posted_at: datetime | None = None


class ChannelDetail(ChannelSummary):
    tone: str | None = None
    typical_content: str | None = None
    confidence: float | None = None
    activity_score: float | None = None
    quality_score: float | None = None
    freshness_score: float | None = None
    discovered_by_keyword: str | None = None
    first_seen_at: datetime | None = None
    last_crawled_at: datetime | None = None
    sample_messages: list[MessageOut] = []


class CategoryOut(BaseModel):
    category: str
    channel_count: int
