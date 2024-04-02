# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.12.0
ARG CADDY_VERSION=2.7.6

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app


FROM base AS deps

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

FROM deps AS build

RUN apk add --no-cache chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN PREVIEWS_PUPPETEER_NO_SANDBOX=true npm run build

FROM caddy:${CADDY_VERSION}-alpine AS client

COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=build /usr/src/app/client/dist ./

FROM caddy:${CADDY_VERSION}-alpine AS previews

COPY --from=build /usr/src/app/previews ./

CMD caddy file-server --listen :${PORT:-8080}

FROM base AS final

ENV NODE_ENV production
ENV PORT 3000

USER node

COPY package.json .

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./
COPY --from=build /usr/src/app/templates ./templates


EXPOSE 3000

CMD node server.js
