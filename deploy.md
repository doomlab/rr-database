# Deploying rr-database

This runs the app behind [Caddy](https://caddyserver.com) (automatic HTTPS via
Let's Encrypt), with Postgres and pgAdmin4 as sibling containers. All four
services are defined in `docker-compose.yml`.

## Prerequisites

- A server (Linux, x86_64 or arm64) with Docker and the Docker Compose plugin
  installed.
- A DNS record pointing at the server's IP: `APP_DOMAIN` (e.g.
  `rr-database.example.org`). pgAdmin4 is served under the same domain at
  `/pgadmin` (see Caddyfile) — no separate subdomain/DNS record needed.
- Ports 80 and 443 open/forwarded to the server (Caddy needs 80 for the
  Let's Encrypt HTTP-01 challenge, and it redirects to 443 for HTTPS).

## 0. Setting up the server on AWS Lightsail

Everything below this section is generic — it works on any server with
Docker. This section is just how to get that server if you're using
[Lightsail](https://lightsail.aws.amazon.com/) specifically.

1. **Create the instance.** Lightsail console → Create instance:
   - Platform: Linux/Unix.
   - Blueprint: **OS Only → Ubuntu 22.04 LTS** (not one of the "app" blueprints
     — Docker isn't preinstalled on any of them, and the plain OS image keeps
     things simple).
   - Instance plan: pick one with **at least 2 GB RAM**. `npm run build`
     compiles the whole Next.js app inside the Docker build step, and that
     step alone regularly wants more than 1 GB — the $5/mo/512MB plan will
     OOM partway through the build. The $10/mo (2 GB) plan is the practical
     minimum; go to 4 GB if you'll also run Postgres and pgAdmin on the same
     box under real usage, not just to test the deploy.
   - Give the instance a name, create it, and wait for it to start.

2. **Attach a static IP.** By default a Lightsail instance's public IP
   changes if it's ever stopped/restarted, which would silently break DNS.
   In the instance's *Networking* tab, create and attach a static IP —
   it's free as long as it stays attached to a running instance.

3. **Open the firewall.** Still in *Networking*, add firewall rules for
   **HTTP (80)** and **HTTPS (443)** — Lightsail blocks everything but SSH
   (22) by default, separately from any firewall inside the OS itself. Caddy
   won't be able to get a certificate until 80 is open.

4. **Point DNS at the static IP.** Create the `APP_DOMAIN` A record (see
   Prerequisites below) pointing at the static IP from step 2. Give DNS a
   few minutes to propagate before moving on — Let's Encrypt's HTTP-01
   challenge in step 2 further down will fail if it can't resolve yet.

5. **SSH in and install Docker.** Use the "Connect using SSH" button in the
   console, or your own SSH client with the downloaded key pair (default
   user on the Ubuntu blueprint is `ubuntu`):

   ```bash
   sudo apt-get update
   sudo apt-get install -y ca-certificates curl gnupg
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
   sudo usermod -aG docker $USER
   ```

   Log out and back in (or run `newgrp docker`) so the group change takes
   effect, then confirm with `docker compose version`.

6. **Add swap.** Even on the recommended 2 GB plan, `docker compose up -d
   --build` running `npm run build` alongside the other three containers can
   spike memory hard enough to make the instance briefly unresponsive
   (including over SSH) — swap turns that into "slower" instead of "frozen
   solid." Add 2 GB:

   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

   The last line makes it survive a reboot. Confirm with `free -h` — you
   should see a `Swap:` line showing `2.0Gi`.

With Docker installed, swap set up, and DNS/firewall pointed at the box,
continue with the steps below exactly as written — they're the same
regardless of host.

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
  encrypts user-contributed OpenAlex keys at rest — losing or rotating it
  makes previously saved keys undecryptable, so back it up somewhere safe.
  Leave `DATABASE_URL` as-is; docker-compose overrides it with the Postgres
  container's connection string.
- `.env.docker` — Postgres credentials, pgAdmin login, and the domain from
  above. Use strong, unique passwords — this file holds real secrets.

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

Then visit `https://<APP_DOMAIN>` (the app) and `https://<APP_DOMAIN>/pgadmin`
(pgAdmin4).

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

## Troubleshooting

**Login/signup fails with a "Failed to find Server Action" error, and the
`app` container's `CREATED`/`STATUS` in `docker compose ps` don't match (it's
restarted since it was created).** This is a red herring — the actual
problem is that the Node process crashed and got auto-restarted by Docker,
and the browser is holding a page from before the crash. Confirm by tailing
logs across a login/signup attempt (`docker compose --env-file .env.docker
logs app --tail 300 --timestamps`) — if you see the whole
`prisma migrate deploy && npm run start` boot sequence repeat immediately
after a `signup()`/`login()` log line, the process died handling that
request. The cause: `secure-password` (password hashing) depends on
`sodium-native`, a native addon whose prebuilt binaries target glibc — it
crashes the whole process on Alpine's musl libc. The Dockerfile already
builds on `node:20-bookworm-slim` (Debian, glibc) specifically because of
this — if this error resurfaces, check whether the base image got changed
back to an `alpine` variant before looking anywhere else.

**`docker compose up -d --build` makes the instance unresponsive (even over
SSH) partway through.** Memory pressure from `npm run build` running
alongside the other three containers on a small instance. Add swap (see
step 6 of the Lightsail setup above) — it turns this into "slow" instead of
"frozen." If you have to hard-reboot to recover, `docker compose ps`
afterward to check whether the `app` image actually finished rebuilding
before the freeze (if not, its tag still points at the old image and you'll
need to rerun the build).

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
`docker compose down` / `up` cycles. If you change `APP_DOMAIN` in
`.env.docker`, restart the `caddy` service so it picks up the new
`Caddyfile` values and issues fresh certificates:

```bash
docker compose --env-file .env.docker up -d caddy
```
