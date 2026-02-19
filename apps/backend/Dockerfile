FROM oven/bun:1-alpine

WORKDIR /app

COPY bun.lock ./
COPY apps/backend/package.json ./

RUN bun install

COPY apps/backend/ ./

EXPOSE 3001
CMD ["bun", "--watch", "server.js"]