FROM oven/bun:1.3.9 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN bun install --frozen-lockfile --ignore-scripts

FROM base AS backend-runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=deps /app/apps/frontend/package.json ./apps/frontend/package.json
COPY . .
RUN bunx --cwd apps/backend prisma generate
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema apps/backend/prisma/schema.prisma && bun run apps/backend/src/server.ts"]
