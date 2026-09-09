# FasterFixes self-hosted (dashboard AGPL-3.0) para o Fly.io.
# Clona o upstream em um commit fixo e aplica os patches de self-hosting
# (Prisma via pg puro e storage S3-compatible), sem depender de fork.
ARG FASTERFIXES_REPO=https://github.com/manucoffin/faster-fixes.git
ARG FASTERFIXES_COMMIT=f52a1dae45a80dc3ff6e4d2129eecd63b1d409b6

FROM node:22-bookworm-slim AS build
ARG FASTERFIXES_REPO
ARG FASTERFIXES_COMMIT
ARG NEXT_PUBLIC_FF_API_ORIGIN
ARG NEXT_PUBLIC_STORAGE_BASE_URL
ARG NEXT_PUBLIC_IS_CLOUD=false
ENV NEXT_PUBLIC_FF_API_ORIGIN=$NEXT_PUBLIC_FF_API_ORIGIN \
    NEXT_PUBLIC_STORAGE_BASE_URL=$NEXT_PUBLIC_STORAGE_BASE_URL \
    NEXT_PUBLIC_IS_CLOUD=$NEXT_PUBLIC_IS_CLOUD \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    CI=1

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@10.4.1

WORKDIR /src
RUN git init -q . && git remote add origin $FASTERFIXES_REPO \
    && git fetch -q --depth 1 origin $FASTERFIXES_COMMIT \
    && git checkout -q FETCH_HEAD

COPY patches/ /patches/
RUN git apply /patches/*.patch

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fasterfixes/core --filter @fasterfixes/react --filter @workspace/db build
COPY build-env.sh /build-env.sh
RUN . /build-env.sh && pnpm --filter web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@10.4.1
WORKDIR /src
COPY --from=build /src /src
COPY entrypoint.sh release.sh /
RUN chmod +x /entrypoint.sh /release.sh
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
