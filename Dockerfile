# JV Enterprises web app — container image for Google Cloud Run.
#
# Multi-stage: the build needs the full toolchain and dev dependencies, the
# runtime needs neither. Next's `output: 'standalone'` emits a self-contained
# server with only the modules actually imported, so the final image is the Node
# runtime plus this app rather than the whole node_modules tree.

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The API address is NOT baked in here. It is read at runtime from API_BASE by
# the root layout and handed to the browser in the page, because a Cloud Run
# `--source` deploy does not pass its build env vars through to these ARGs —
# relying on NEXT_PUBLIC_API_BASE silently compiled the localhost default into
# production. This ARG remains only for a hand-run `docker build`.
ARG NEXT_PUBLIC_ALLOW_SIGNUP=false
ENV NEXT_PUBLIC_ALLOW_SIGNUP=$NEXT_PUBLIC_ALLOW_SIGNUP

RUN npm run build

# ---------------------------------------------------------------------------

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# The standalone output carries its own minimal node_modules; static assets and
# the public folder are not included in it and have to be copied alongside.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER node

ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

CMD ["node", "server.js"]
