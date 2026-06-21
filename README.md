# Telegram Discovery Engine

Discovers, analyzes, and ranks public Telegram channels by topic and usefulness.

Pipeline: **discover** (keyword search, read-only) → **sample** (recent messages, no join) → **analyze** (local LLM classification, summary, "why recommended" + heuristic scoring) → **search/rank** (Postgres FTS + ranking blend) → **serve** (FastAPI).

```
app/
  config.py              # env-driven settings
  db/
    database.py          # pooled Postgres connection
    repository.py        # all SQL (shared by worker, analysis, API)
  ingestion/
    throttle.py          # structural rate limiter (ban defense)
    telegram_client.py   # read-only Telethon wrapper (no join, FloodWait-safe)
    cleaning.py          # spam/empty filtering
    crawl.py             # crawl entrypoint
  analysis/
    ollama_client.py     # local LLM (Ollama) JSON client
    analyzer.py          # classification + summary + why-recommended
    scoring.py           # activity / member / freshness / final score
    run.py               # analysis entrypoint
  api/
    main.py              # FastAPI: /search /channel/{id} /categories
    schemas.py
migrations/001_init.sql  # schema + FTS + ranking view
```

## ⚠️ Account safety — read first

This crawler uses an MTProto **user account** because the Bot API cannot
discover or read arbitrary public channels. Bans come from *behavior*, not from
using Telethon. The code is built so the risky behaviors are structurally hard:

- **Read-only, never joins.** Discovery and history work on public entities
  without membership. `TG_ALLOW_JOIN` must stay `false` — the worker refuses to
  start otherwise. Mass-joining is the #1 cause of bans, and we never do it.
- **Throttled by construction.** Every Telegram call passes through a rate
  limiter (`TG_MIN_DELAY_SECONDS` + jitter). FloodWait is always honored in full.
- **Use a dedicated, aged account.** Never your personal number. Before crawling:
  set a profile photo, send a few real messages, let it sit ~a week.
- **One residential IP** matching the SIM's country. No datacenter/rotating proxies.
- **Treat the account as disposable.** Keep a spare number; store
  `TG_SESSION_STRING` so swapping in a replacement takes minutes.

Keep volume low at validation stage (`TG_MAX_CHANNELS_PER_RUN`, a handful of
keywords). You do not need speed.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in values
```

1. **Telegram API creds** — get `api_id`/`api_hash` at https://my.telegram.org
   → API development tools. Put them in `.env` with the dedicated phone number.
2. **Database** — create the schema on your Supabase Postgres:
   ```bash
   psql "$DATABASE_URL" -f migrations/001_init.sql
   ```
   (Or paste the file into the Supabase SQL editor.) Use the connection-pooler
   URI from Supabase → Project Settings → Database.
3. **Local LLM** — install Ollama and pull a model:
   ```bash
   ollama pull llama3.1:8b   # matches OLLAMA_MODEL in .env
   ```

## Run

**One-time: capture the session string** (interactive login, enter the code Telegram sends):

```bash
python -m app.ingestion.crawl --print-session
# copy the printed value into TG_SESSION_STRING in .env
```

**Crawl (discover + sample):**

```bash
python -m app.ingestion.crawl --keywords phones addis market crypto jobs
```

**Analyze (LLM + scoring):**

```bash
python -m app.analysis.run --limit 50
```

**Serve the API:**

```bash
uvicorn app.api.main:app --reload --port 8000
```

Then:
- `GET /search?q=phones%20ethiopia` → ranked channels
- `GET /channel/{id}` → full profile + sample messages + "why recommended"
- `GET /categories` → categories with channel counts

Interactive docs at `http://localhost:8000/docs`.

## Ranking

```
final_score = activity*0.30 + member*0.20 + quality*0.40 + freshness*0.10
```

- **activity** — message volume, image ratio, low repetition
- **member** — log-scaled member count
- **quality** — LLM usefulness (spam penalized, richer output scores higher)
- **freshness** — recency of newest sampled message

Search blends `final_score` (70%) with text relevance (30%).

## Continuous refresh (later)

When channels go stale enough that users notice, schedule the crawl + analysis
on a cron (e.g. every few hours). `channels_needing_analysis` already only
re-analyzes channels crawled since their last analysis, so re-running is cheap.

## Next steps

- Thin frontend (search box → ranked results → channel page with the "why" blurb).
- Add a vendor data-API fallback if you ever hit account bans.
- Move to a hosted LLM if local throughput becomes the bottleneck.
