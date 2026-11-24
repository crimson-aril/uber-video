FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

COPY . .

RUN set -eu; \
    mkdir -p /app; \
    cp -a /workspace/backend/. /app/; \
    cp /workspace/backend/pnpm-lock.yaml /app/pnpm-lock.yaml; \
    cp /workspace/backend/pnpm-workspace.yaml /app/pnpm-workspace.yaml; \
    cp /workspace/backend/.npmrc /app/.npmrc

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@12.21.0 --activate \
    && pnpm install --frozen-lockfile --prod \
    && chown -R node:node /app

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=node:node /app/ ./

USER node

EXPOSE 3000

CMD ["node", "server.js"]
