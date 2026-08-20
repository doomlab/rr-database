# Deploying rr-database

This runs the app behind [Caddy](https://caddyserver.com) (automatic HTTPS via
Let's Encrypt), with Postgres and pgAdmin4 as sibling containers. All four
services are defined in `docker-compose.yml`.

## Prerequisites

- A server (Linux, x86_64 or arm64) with Docker and the Docker Compose plugin
  installed.
- Two DNS records pointing at the server's IP:
  - `APP_DOMAIN` (e.g. `rr-database.example.org`) → the app
  - `PGADMIN_DOMAIN` (e.g. `pgadmin.rr-database.example.org`) → pgAdmin4
- Ports 80 and 443 open/forwarded to the server (Caddy needs 80 for the
  Let's Encrypt HTTP-01 challenge, and it redirects to 443 for HTTPS).

## 1. Clone and configure

```bash
git clone <repo-url> rr-database
cd rr-database
```

Create the three env files from their examples:

```bash
cp .env.example .env
cp .env.local.example .env.local
cp .env.docker.example .env.docker
```

- `.env` — Zotero API credentials (see `README.md` for how to get a key).
- `.env.local` — `SESSION_SECRET_KEY` and `API_KEY_ENCRYPTION_KEY` (each
  generated with `openssl rand -base64 32`). `API_KEY_ENCRYPTION_KEY`
  encrypts user-contributed OpenAlex/Groq keys at rest — losing or rotating
  it makes previously saved keys undecryptable, so back it up somewhere safe.
  Leave `DATABASE_URL` as-is; docker-compose overrides it with the Postgres
  container's connection string.
- `.env.docker` — Postgres credentials, pgAdmin login, and the two domains
  from above. Use strong, unique passwords — this file holds real secrets.

None of these files should be committed (`.env*` is already in `.gitignore`).

## 2. Build and start

```bash
docker compose --env-file .env.docker up -d --build
```

This builds the app image, then starts `db` → `app` → `pgadmin` → `caddy`.
On first boot the `app` container runs `prisma migrate deploy` before
starting the Next.js server, so the schema is applied automatically.

Watch the logs until Caddy reports it obtained certificates:

```bash
docker compose logs -f caddy
```

Then visit `https://<APP_DOMAIN>` and `https://<PGADMIN_DOMAIN>`.

## 3. Create the first admin user

Sign up normally through the app at `/signup`, then promote that account to
admin directly in the database (via pgAdmin, or `docker compose exec db psql`):

```sql
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'you@example.org';
```

## Redeploying after a code change

```bash
git pull
docker compose --env-file .env.docker up -d --build app
```

Only the `app` service needs to be rebuilt; `db`, `pgadmin`, and `caddy` are
unaffected by app code changes. Migrations run automatically on container
start, so any new Prisma migrations committed to `db/migrations` are applied
before the server comes up.

## Backups

Postgres data lives in the `db_data` named volume. To take a manual dump:

```bash
docker compose exec db pg_dump -U <POSTGRES_USER> <POSTGRES_DB> > backup.sql
```

Restore with:

```bash
docker compose exec -T db psql -U <POSTGRES_USER> <POSTGRES_DB> < backup.sql
```

Set up a cron job calling the dump command on a schedule for real backups —
the above is a manual snapshot only.

## One-time data migrations (`pipeline/*.py`)

The Python scripts in `pipeline/` (Zotero imports, etc.) aren't part of the
`app` image — they run in a separate one-off `pipeline` service, defined
under the `tools` [Compose profile](https://docs.docker.com/compose/how-tos/profiles/)
so it never starts with a normal `up`. It builds from `Dockerfile.pipeline`
(plain Python + `requirements.txt`) and connects to the same `db` container
over the internal network, so it needs no extra configuration beyond the
`.env`/`.env.local` you already set up.

Run a script with:

```bash
docker compose --env-file .env.docker --profile tools run --rm pipeline \
  python pipeline/import_staging_collections.py --dry-run
```

Drop `--dry-run` once the counts look right. `--rm` throws the container away
after it exits — nothing persists beyond what the script wrote to the
database.

`import_staging_collections.py` is the one-time staging-library import: it
reads the Zotero staging library's status subcollections directly (1 – To
Check, 2 – To Tag, 4 – Do Not Add — 3 and 5 are intentionally skipped) and
sets each paper's status accordingly instead of dumping everything in as
`PENDING_REVIEW` the way `import_zotero.py --library staging` did. See the
docstring at the top of that file for the full mapping.

## Useful commands

```bash
docker compose ps                  # status of all services
docker compose logs -f app         # app logs
docker compose restart app         # restart just the app
docker compose down                # stop everything (volumes persist)
```

## Notes on the Let's Encrypt setup

Caddy handles certificate issuance and renewal automatically — there's no
certbot/cron step to maintain. Certificates and Caddy's internal state are
stored in the `caddy_data`/`caddy_config` volumes, so they survive
`docker compose down` / `up` cycles. If you change `APP_DOMAIN` or
`PGADMIN_DOMAIN` in `.env.docker`, restart the `caddy` service so it picks up
the new `Caddyfile` values and issues fresh certificates:

```bash
docker compose --env-file .env.docker up -d caddy
```
