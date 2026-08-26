#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-data/specforge.db}"
BACKUP_DIR="${2:-backups}"
STATUS_FILE="${BACKUP_STATUS_FILE:-$BACKUP_DIR/last-backup.json}"
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$STATUS_FILE")"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

integrity="$(sqlite3 "$DB_PATH" 'PRAGMA integrity_check;')"
if [[ "$integrity" != "ok" ]]; then
  echo "Integrity check failed: $integrity" >&2
  exit 1
fi

sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);'
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIR/specforge-$timestamp.db"
sqlite3 "$DB_PATH" ".backup '$output'"

final_integrity="$(sqlite3 "$output" 'PRAGMA integrity_check;')"
if [[ "$final_integrity" != "ok" ]]; then
  echo "Backup integrity check failed: $final_integrity" >&2
  rm -f "$output"
  exit 1
fi

size_bytes="$(wc -c < "$output" | tr -d ' ')"
cat > "$STATUS_FILE" <<EOF
{
  "status": "ok",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "size_bytes": $size_bytes
}
EOF

echo "$output"
