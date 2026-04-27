FROM oven/bun:1.3.9

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN bun install --ignore-scripts

COPY . .

RUN bunx --cwd apps/backend prisma generate

WORKDIR /app/apps/backend

ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "bunx prisma migrate deploy --schema prisma/schema.prisma && bun run src/server.ts"]
