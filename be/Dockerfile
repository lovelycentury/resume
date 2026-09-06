# syntax=docker/dockerfile:1.7
#
# @okkly/resume-be — Mastra RAG agent (HTTP API for the resume site).
#
# Build context is the MONOREPO ROOT, not this directory — the build runs a
# pnpm-workspace install and needs the root lockfile + workspace manifest.
# Both compose files set `context: .` accordingly:
#
#   docker build -f be/Dockerfile -t resume-be .   # from repo root
#
# Why the `.mastra/output` copy: `mastra build` (see package.json) bundles
# src/mastra into a self-contained server directory — entry `index.mjs`, its
# chunks, and a deploy `package-lock.json` listing only the deps the bundle
# actually imports. We `npm ci` from that lockfile in a linux stage so the
# native `libsql` binary matches the container, then ship just that.
#
# Targets, all three used by the compose files:
#   dev      sources + full workspace install (devDeps). docker-compose.dev.yml
#            runs `mastra dev` here and bind-mounts src over it, so edits reload.
#   build    dev + the production bundle. Reused as the `ingest` service in
#            docker-compose.yml — it still has the sources and `tsx`.
#   runtime  the shipped image: just the bundle.
#
# Runtime env (supplied by compose / `docker run` — the image bakes in none):
#   GOOGLE_GENERATIVE_AI_API_KEY   required; chat default + embeddings. Boot fails without it.
#   GROQ_API_KEY / OPENROUTER_API_KEY / OLLAMA_API_KEY   optional, unlock their models
#   VECTOR_DB_URL    the vector index — e.g. http://libsql:8080 (the compose service)
#   STORAGE_DB_URL   conversation state — file:/app/data/... on a volume; NOT the libSQL
#                    server, whose hrana protocol chokes on @mastra/libsql's parallel
#                    schema init (SQLITE_SCHEMA on first boot)
#   CORS_ORIGINS     the real frontend origin

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI="true"
RUN corepack enable
WORKDIR /repo

# Workspace dependencies from the lockfile, cached as their own layer.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch

# Sources + the whole workspace installed, devDependencies included. Stopping
# here (`target: dev`) gives docker-compose.dev.yml an image with the `mastra`
# CLI and `tsx` on hand; nothing app-specific is built yet.
FROM deps AS dev
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

FROM dev AS build
RUN pnpm --filter "@okkly/resume-be" run build
# Install the bundle's own runtime deps against its deploy lockfile. Runs in this
# linux stage so `libsql`'s prebuilt binary is linux/glibc, not the build host's.
WORKDIR /repo/be/.mastra/output
RUN npm ci --omit=dev --no-audit --no-fund

# ─────────────────────────────────────────────────────────────────────────────
# Runtime: plain node, no pnpm, no sources, no repo tree — just the bundle.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=5300
WORKDIR /app

COPY --from=build --chown=node:node /repo/be/.mastra/output ./
# Mount point for the conversation-state DB. Created node-owned so a named volume
# bind-mounted here inherits that ownership and the non-root process can write.
RUN mkdir -p /app/data && chown node:node /app/data

# Do not run as root: if the server is RCE'd, the process should own nothing.
# The official image already has user `node` (uid 1000).
USER node

EXPOSE 5300
CMD ["node", "index.mjs"]
