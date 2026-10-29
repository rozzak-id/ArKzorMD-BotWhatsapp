# syntax=docker/dockerfile:1

# ── Build stage ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/adapter-whatsapp/package.json packages/adapter-whatsapp/package.json
COPY packages/adapter-telegram/package.json packages/adapter-telegram/package.json
COPY packages/adapter-discord/package.json packages/adapter-discord/package.json
COPY plugins/example-command/package.json plugins/example-command/package.json
COPY plugins/example-tool/package.json plugins/example-tool/package.json

RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/app/data

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["node", "apps/server/dist/index.js"]
