FROM oven/bun:1.3.9

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN bun install --ignore-scripts

COPY . .

RUN ./node_modules/.bin/prisma generate --schema apps/backend/prisma/schema.prisma

WORKDIR /app/apps/backend

ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "../../node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && bun run src/server.ts"]
