# The PDF generation service: an HTTP API and a queue worker.
#
# Built from the REPOSITORY ROOT, not from this directory:
#
#   docker build -f apps/api/Dockerfile -t pdf-slot-api .
#
# because the service depends on `packages/core` as a workspace, and a build
# context that started here could not see it. Core is the library the editor
# in the browser also runs; the two must be the same code or the preview stops
# matching the download, which is why it is a workspace here rather than a
# version this image resolves on its own.

# Two runtimes, on purpose: node installs, bun runs. The lockfile in this
# repository is npm's, and installing with bun would resolve a different tree
# from the one every test ran against -- so the install stage needs npm, which
# the bun image does not ship.
FROM node:24-alpine AS deps

WORKDIR /app

# Dependencies first, so a change to a source file does not reinstall them.
# Every workspace manifest is needed: npm resolves the tree from all of them,
# and a missing one makes `npm ci` fail rather than install less.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/

# --omit=dev leaves out vitest and the rest. drizzle-kit is a devDependency
# and migrations are run by `scripts/migrate-http.mjs`, which uses `pg`
# directly -- see the README -- so nothing here needs it.
RUN npm ci --omit=dev --workspace=api --include-workspace-root


FROM oven/bun:1.4-alpine AS runtime

WORKDIR /app

# Postgres client tools are not needed; drizzle talks to it over the wire.
# tini is, because Bun is PID 1 here and PID 1 does not get the default
# signal handlers -- without it a SIGTERM is ignored and the container is
# killed after the grace period, mid-render, every deploy.
RUN apk add --no-cache tini

# One tree: npm hoists a workspace install to the root, and
# node_modules/@pdf-slot/core is a symlink into packages/core -- which is why
# that directory is copied below rather than left out as "not the service".
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/core ./packages/core
COPY apps/api/package.json apps/api/drizzle.config.ts ./apps/api/
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/scripts ./apps/api/scripts

WORKDIR /app/apps/api

# Not root. Bun's image ships a `bun` user; the service writes nothing to
# disk (blobs go to Azure, state to Postgres), so it needs nothing it owns.
USER bun

# What the compose healthcheck and Elli's API should both ask.
EXPOSE 3000
ENV PORT=3000

# ROLE=both by default: this one container serves requests and renders. See
# src/index.ts -- `api` and `worker` split them when the render load makes
# that worth doing.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "src/index.ts"]
