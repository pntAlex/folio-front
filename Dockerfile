FROM oven/bun:latest

WORKDIR /app

COPY . .

ENV PORT=3000 \
    STATIC_ROOT=/app

EXPOSE 3000

CMD ["bun", "server.ts"]
