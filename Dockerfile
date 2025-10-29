FROM oven/bun:latest

WORKDIR /app

COPY . .

RUN chmod +x entrypoint.sh

ENV PORT=3000 \
    STATIC_ROOT=/app

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
