-- Keyword expansion: database-driven query generation + run tracking.
-- Run after 001_init.sql.

-- ---------------------------------------------------------------------------
-- keyword_terms: building blocks combined into search queries.
--   kind = 'base'     -> the topic (phones, crypto, jobs, ...)
--   kind = 'modifier' -> appended to bases (addis, ethiopia, iphone, ...)
-- A NULL/empty modifier set means bases are also searched on their own.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS keyword_terms (
    id          BIGSERIAL PRIMARY KEY,
    term        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('base', 'modifier')),
    lang        TEXT NOT NULL DEFAULT 'en',   -- 'en' | 'am' (Amharic) | ...
    enabled     BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (term, kind)
);

-- ---------------------------------------------------------------------------
-- keyword_runs: one row per generated query string, tracking when it was last
-- crawled and how many channels it surfaced. Lets us skip recently-crawled
-- queries so repeat runs explore new terms first.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS keyword_runs (
    id              BIGSERIAL PRIMARY KEY,
    query           TEXT UNIQUE NOT NULL,
    last_crawled_at TIMESTAMPTZ,
    channels_found  INTEGER NOT NULL DEFAULT 0,
    run_count       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_keyword_runs_last ON keyword_runs(last_crawled_at);

-- ---------------------------------------------------------------------------
-- Seed terms — Ethiopian marketplace focus, English + Amharic.
-- Edit / extend freely; the generator combines bases x modifiers.
-- ---------------------------------------------------------------------------
INSERT INTO keyword_terms (term, kind, lang) VALUES
    -- bases (English)
    ('phones',       'base', 'en'),
    ('cars',         'base', 'en'),
    ('crypto',       'base', 'en'),
    ('jobs',         'base', 'en'),
    ('real estate',  'base', 'en'),
    ('electronics',  'base', 'en'),
    ('fashion',      'base', 'en'),
    ('market',       'base', 'en'),
    -- bases (Amharic)
    ('ስልክ',          'base', 'am'),   -- phone
    ('መኪና',         'base', 'am'),   -- car
    ('ስራ',          'base', 'am'),   -- job
    ('ቤት',           'base', 'am'),   -- house
    ('ገበያ',          'base', 'am'),   -- market
    -- modifiers: places (English + Amharic)
    ('addis',        'modifier', 'en'),
    ('addis ababa',  'modifier', 'en'),
    ('ethiopia',     'modifier', 'en'),
    ('አዲስ አበባ',     'modifier', 'am'),
    ('ኢትዮጵያ',       'modifier', 'am'),
    -- modifiers: brands / qualifiers
    ('iphone',       'modifier', 'en'),
    ('samsung',      'modifier', 'en'),
    ('used',         'modifier', 'en'),
    ('cheap',        'modifier', 'en')
ON CONFLICT (term, kind) DO NOTHING;
