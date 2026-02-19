FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY bun.lock ./
COPY apps/frontend/package.json ./

RUN bun install

COPY apps/frontend/ ./

RUN bun run build

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]