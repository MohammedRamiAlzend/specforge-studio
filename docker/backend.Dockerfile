FROM oven/bun:1.3.14

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 \
  && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN bun install --frozen-lockfile --production

COPY backend backend
COPY ops ops
RUN chmod +x /app/ops/backup.sh && mkdir -p /app/data /app/data/exports /app/backups

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/specforge.db
ENV EXPORT_DIR=/app/data/exports
ENV BACKUP_STATUS_FILE=/app/backups/last-backup.json
ENV AUTH_REQUIRED=true
ENV AUTH_RATE_LIMIT_ENABLED=true

EXPOSE 3000
CMD ["bun", "run", "--cwd", "backend", "start"]
