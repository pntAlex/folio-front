FROM oven/bun:1.3.6-alpine

WORKDIR /app

COPY . .

RUN chmod +x entrypoint.sh

ENV PORT=3000 \
    STATIC_ROOT=/app

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
