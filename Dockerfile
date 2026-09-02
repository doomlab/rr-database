FROM node:20-bookworm-slim AS base
WORKDIR /app
# sodium-native (via secure-password, used for password hashing) is a native
# addon whose prebuilt binaries target glibc — it segfaults/crashes the
# whole Node process on Alpine's musl libc, which silently exits the
# container the moment login/signup hashes a password. Debian slim (glibc)
# avoids that; do not switch this back to an alpine base.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*
# scholarly (unofficial Google Scholar client) is only used by
# scripts/query_google_scholar.py, spawned as a subprocess from the "Pull
# from Google Scholar" admin action — Debian bookworm's system Python is
# externally managed, hence --break-system-packages.
RUN pip3 install --no-cache-dir --break-system-packages scholarly

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate --schema=db/schema.prisma
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/db ./db
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/types.ts ./types.ts
COPY --from=builder /app/scripts/query_google_scholar.py ./scripts/query_google_scholar.py

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=db/schema.prisma && npm run start"]
