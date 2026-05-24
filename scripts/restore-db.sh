#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-}"
DATABASE_URL="${DATABASE_URL:-}"

if [[ -z "$BACKUP_DIR" ]]; then
  echo "Usage: $0 <backup-dir>"
  exit 1
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "ERROR: DATABASE_URL is required."
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore not found. Install PostgreSQL client tools first."
  exit 1
fi

if [[ ! -f "$BACKUP_DIR/database.dump" ]]; then
  echo "ERROR: database.dump not found in $BACKUP_DIR"
  exit 1
fi

echo "==> Restoring database"
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" "$BACKUP_DIR/database.dump"

echo "Restore completed."