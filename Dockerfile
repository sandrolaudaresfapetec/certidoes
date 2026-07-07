# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js/Prisma"

WORKDIR /app

ENV NODE_ENV="production"

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

COPY package-lock.json package.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

RUN npx prisma generate

COPY . .

RUN npx next build --experimental-build-mode compile

RUN npm prune --omit=dev

# Final stage
FROM base

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl postgresql postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY --from=build /app /app

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]

EXPOSE 3000
CMD ["npm", "run", "start"]
