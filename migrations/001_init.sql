-- The Under-grounders — schema
-- Run against your Supabase Postgres (psql or Supabase SQL editor).

-- ---------------------------------------------------------------------------
-- channels: one row per unique Telegram channel (deduped by tg_id / username)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels (
    id                  BIGSERIAL PRIMARY KEY,
    tg_id               BIGINT UNIQUE,                 -- Telegram's numeric channel id
    username            TEXT UNIQUE,                   -- @handle (nullable for private)
    title               TEXT NOT NULL,
    member_count        INTEGER,
    discovered_by_keyword TEXT,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_crawled_at     TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- messages: sampled recent messages per channel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id              BIGSERIAL PRIMARY KEY,
    channel_id      BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    tg_message_id   BIGINT NOT NULL,
    text            TEXT,
    has_image       BOOLEAN NOT NULL DEFAULT false,
    has_link        BOOLEAN NOT NULL DEFAULT false,
    posted_at       TIMESTAMPTZ,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (channel_id, tg_message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_posted ON messages(posted_at);

-- ---------------------------------------------------------------------------
-- channel_analysis: LLM + heuristic output, one row per channel (latest)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_analysis (
    channel_id          BIGINT PRIMARY KEY REFERENCES channels(id) ON DELETE CASCADE,
    category            TEXT,        -- phones|cars|crypto|jobs|real_estate|mixed|spam|...
    is_marketplace      BOOLEAN,
    confidence          REAL,        -- 0..1
    summary             TEXT,
    tone                TEXT,
    typical_content     TEXT,
    why_recommended     TEXT,
    -- component scores (0..100)
    activity_score      REAL DEFAULT 0,
    quality_score       REAL DEFAULT 0,   -- LLM usefulness
    freshness_score     REAL DEFAULT 0,
    final_score         REAL DEFAULT 0,
    analyzed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Full-text search vector over title + summary + category
-- ---------------------------------------------------------------------------
ALTER TABLE channels ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION channels_build_tsv(p_channel_id BIGINT)
RETURNS tsvector LANGUAGE sql STABLE AS $$
    SELECT
        setweight(to_tsvector('simple', coalesce(c.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(c.username, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(a.summary, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(a.category, '')), 'B')
    FROM channels c
    LEFT JOIN channel_analysis a ON a.channel_id = c.id
    WHERE c.id = p_channel_id;
$$;

CREATE INDEX IF NOT EXISTS idx_channels_tsv ON channels USING GIN (search_tsv);

-- ---------------------------------------------------------------------------
-- Convenience view: channel + its analysis flattened
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW channel_ranked AS
SELECT
    c.id, c.tg_id, c.username, c.title, c.member_count,
    c.discovered_by_keyword, c.first_seen_at, c.last_crawled_at,
    a.category, a.is_marketplace, a.confidence, a.summary, a.tone,
    a.typical_content, a.why_recommended,
    a.activity_score, a.quality_score, a.freshness_score, a.final_score
FROM channels c
LEFT JOIN channel_analysis a ON a.channel_id = c.id;
