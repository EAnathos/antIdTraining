#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$REPO_DIR/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
ENV_FILE="$REPO_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env introuvable à $ENV_FILE"
  exit 1
fi

source <(grep -E '^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB)=' "$ENV_FILE")

if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_PASSWORD:-}" || -z "${POSTGRES_DB:-}" ]]; then
  echo "ERROR: POSTGRES_USER, POSTGRES_PASSWORD et POSTGRES_DB sont requis dans .env"
  exit 1
fi

if ! docker compose -f "$REPO_DIR/docker-compose.yml" ps postgres --quiet 2>/dev/null | grep -q .; then
  echo "ERROR: le container postgres n'est pas en cours d'exécution. Lance 'npm run docker:up' d'abord."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "==> Export PostgreSQL (via Docker)"
docker compose -f "$REPO_DIR/docker-compose.yml" exec -T postgres \
  pg_dump \
    --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" \
    --format=custom \
    --no-owner \
    --no-acl \
  > "$BACKUP_DIR/database.dump"

echo "==> Archive des uploads (via Docker)"
docker compose -f "$REPO_DIR/docker-compose.yml" exec -T backend \
  tar -czf - /app/uploads 2>/dev/null \
  > "$BACKUP_DIR/uploads.tar.gz" || echo "  (aucun fichier uploads à archiver)"

cat > "$BACKUP_DIR/manifest.json" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "databaseDump": "database.dump",
  "uploadsArchive": "uploads.tar.gz"
}
EOF

echo "Backup créé : $BACKUP_DIR"
