# syntax=docker/dockerfile:1.7
#
# @okkly/resume-fe — Vite SPA (React 19, no SSR). Build context is the MONOREPO
# ROOT, not this directory: the build runs a pnpm-workspace install and needs
# the root lockfile + pnpm-workspace.yaml. The compose service sets
# `context: .` / `dockerfile: fe/Dockerfile` to match:
#
#   docker build -f fe/Dockerfile -t resume-fe \
#     --build-arg VITE_API_BASE_URL=https://resume-api.okkly.dev .
#
# In production the SPA talks to the backend cross-origin, so its base URL is
# baked into the bundle at build time (src/config/env.ts). Leaving the arg
# empty falls back to the relative "/be" that only the dev-time Vite proxy
# serves. Whatever origin you pass must be listed in the backend's CORS_ORIGINS.
#
# Runtime is Caddy serving fe/dist as static files on :80 — same arrangement as
# okkly/ops/Dockerfile.storybook.
#
# Targets:
#   dev      sources + full workspace install (devDeps). docker-compose.dev.yml
#            runs the Vite dev server here and bind-mounts src over it.
#   build    dev + `vite build` -> fe/dist.
#   runtime  the shipped image: Caddy + those static files.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI="true"
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch

# Sources + the whole workspace installed, devDependencies included. Identical
# instructions to be/Dockerfile's `dev` stage, so BuildKit shares the layer
# between the two images instead of installing twice.
FROM deps AS dev
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

FROM dev AS build
# Consumed by Vite at build time (see header). Empty -> the app uses "/be".
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter "@okkly/resume-fe" run build

FROM caddy:2-alpine AS runtime
COPY fe/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/fe/dist /srv
EXPOSE 80
