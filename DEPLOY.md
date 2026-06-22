# Deploying the read-only demo on a Hetzner VPS

This deploys the **public demo** (frontend + read-only API + Meilisearch) on a
single small server, behind Caddy with automatic HTTPS. The **crawler + Ollama
pipeline does NOT run here** — you run that locally on your own machine (it needs
a residential IP and a GPU) and it writes into the same Supabase database the
demo reads from.

```
Internet ──► Caddy (HTTPS) ──► web (Next.js) ──► api (FastAPI) ──► Supabase
                                                       └────────► meili
```

The FastAPI service is **not exposed publicly** — only the Next.js frontend is.
The frontend's route handlers proxy `/api/*` to FastAPI over the internal Docker
network, so the backend stays private.

## 1. Create the server

- Hetzner Cloud → new project → add a server.
- A **CX22** (2 vCPU / 4 GB) is plenty; the smallest CX shapes also work for a
  light demo. Ubuntu 24.04. Add your SSH key.
- Note the public IP.

## 2. Point your domain at it

Create a DNS **A record**: `tgsearch.example.com → <server IP>`.
Wait for it to resolve (`ping tgsearch.example.com`). Caddy needs this to
issue the TLS certificate.

## 3. Install Docker on the server

```bash
ssh root@<server-ip>
curl -fsSL https://get.docker.com | sh
```

## 4. Get the code + configure

```bash
git clone https://github.com/youruser/tg-discovery.git
cd tg-discovery
cp .env.prod.example .env.prod
nano .env.prod          # fill in DOMAIN, DATABASE_URL, MEILI_MASTER_KEY, etc.
```

## 5. Launch

```bash
docker compose --env-file .env.prod up -d --build
```

Caddy will fetch HTTPS certs automatically (give it ~30s on first run). Visit
`https://your-domain` — the site should load.

## 6. Apply migrations (once)

Run the SQL migrations against your Supabase DB (from your laptop or the server):

```bash
for f in migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

## 7. Seed the search index (once)

Meilisearch starts empty. Populate it from the data already in Supabase:

```bash
docker compose --env-file .env.prod exec api python -m app.search.reindex
```

(If you skip this, search still works via the Postgres fallback.)

## 8. Done

The demo is live and read-only. To refresh the data later, run the pipeline on
your **local machine** (crawl → analyze → metrics), which updates Supabase; the
demo reflects it immediately. Re-run `reindex` after big data changes so Meili
stays in sync.

## Updating the deployment

```bash
git pull
docker compose --env-file .env.prod up -d --build
```

## Reusing this for future projects

This pattern (Caddy + compose + Supabase) is a clean default for any small
project: drop in a new `docker-compose.yml` with your services, point a domain,
`compose up`. One Hetzner box can host several projects — give each its own
domain block in the Caddyfile and its own compose project name
(`docker compose -p projectname ...`).

## Cost

A CX22 is ~€4–5/mo and can host this demo plus several future projects. Supabase
free tier covers the database. No per-service billing — it's a flat box.
