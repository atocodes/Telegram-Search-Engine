# Migrating to the dockerized Postgres

The stack now includes its own Postgres (see `docker-compose.yml`) — no external
database needed. Data lives in the `pg_data` Docker volume.

## Fresh install (no existing data)

Nothing to do — on first `docker compose up`, Postgres runs every file in
`migrations/` automatically (mounted into its init dir), so the schema is created
and the DB is ready. Then crawl/analyze to populate it.

## Moving your existing Supabase data over (keep data)

Do this **before** the dockerized Postgres has been initialized for the first
time, OR wipe its volume first so the restore lands in a clean DB.

### 1. Dump from Supabase (on your Mac)

```bash
# Use the DIRECT connection string from Supabase (not the pooler) for pg_dump.
pg_dump "postgresql://postgres:PASSWORD@db.YOURREF.supabase.co:5432/postgres" \
  --no-owner --no-privileges --clean --if-exists \
  -f supabase_dump.sql
```

(`--no-owner --no-privileges` strips Supabase-specific roles so it restores
cleanly into the plain Postgres container.)

### 2. Copy the dump to the server

```bash
scp supabase_dump.sql root@<server-ip>:~/Telegram-Search-Engine/
```

### 3. Start ONLY Postgres with a clean volume, then restore

On the server:

```bash
cd ~/Telegram-Search-Engine

# If postgres was already started once, wipe its volume so the restore is clean:
docker compose down
docker volume rm telegram-search-engine_pg_data 2>/dev/null || true

# Bring up just the database (its init migrations will create the schema)...
docker compose --env-file .env.prod up -d postgres

# ...then load your data on top. Because the dump uses --clean --if-exists it
# drops + recreates objects, so it overrides the auto-created schema cleanly.
docker compose exec -T postgres psql -U tgsearch -d tgsearch < supabase_dump.sql
```

### 4. Bring up the rest of the stack

```bash
docker compose --env-file .env.prod up -d --build
# reindex search from the restored data
docker compose exec api python -m app.search.reindex
```

Your demo is now running entirely on the dockerized Postgres with your data.

## Backups (do this!)

You now own the database, so back it up. A script is provided:

```bash
./scripts/backup.sh           # writes backups/tgsearch-<timestamp>.sql.gz
./scripts/restore.sh backups/tgsearch-20260101-120000.sql.gz
```

Schedule a nightly backup with cron (on the server):

```bash
crontab -e
# add:
0 3 * * * cd /root/Telegram-Search-Engine && ./scripts/backup.sh >> backups/cron.log 2>&1
```

For off-box safety, periodically copy `backups/*.sql.gz` somewhere else
(another machine, or object storage).

## Running the crawl pipeline against the dockerized DB

The crawler/analyzer run on YOUR machine (residential IP + GPU), not in the
stack. Point their `app/.env` `DATABASE_URL` at the server's Postgres. Easiest is
an SSH tunnel so you don't expose 5432 publicly:

```bash
# on your Mac — tunnel localhost:5432 to the server's Postgres
ssh -N -L 5432:localhost:5432 root@<server-ip>
# then in app/.env:
# DATABASE_URL=postgresql://tgsearch:PASSWORD@localhost:5432/tgsearch
```

Run crawl/analyze/metrics as usual; they write to the server DB, and the demo
reflects it. Re-run `reindex` after big changes.
