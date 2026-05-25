#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$REPO_DIR/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
UPLOADS_DIR="${UPLOADS_DIR:-$REPO_DIR/apps/backend/uploads}"
DATABASE_URL="${DATABASE_URL:-}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL is required."
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools first."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "==> Exporting PostgreSQL dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file "$BACKUP_DIR/database.dump"

if [[ -d "$UPLOADS_DIR" ]]; then
  echo "==> Archiving uploads"
  tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$UPLOADS_DIR" .
fi

cat > "$BACKUP_DIR/manifest.json" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "databaseDump": "database.dump",
  "uploadsArchive": "$([[ -f "$BACKUP_DIR/uploads.tar.gz" ]] && echo uploads.tar.gz || echo null)"
}
EOF

echo "Backup created at: $BACKUP_DIR"