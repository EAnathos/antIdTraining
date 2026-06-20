#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_DIR/.env"

if [[ -z "$BACKUP_DIR" ]]; then
  echo "Usage: $0 <backup-dir>"
  echo "Exemple : $0 backups/20260620T120000Z"
  exit 1
fi

if [[ ! -f "$BACKUP_DIR/database.dump" ]]; then
  echo "ERROR: database.dump introuvable dans $BACKUP_DIR"
  exit 1
fi

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

echo "==> Restauration de la base de données (via Docker)"
docker compose -f "$REPO_DIR/docker-compose.yml" exec -T postgres \
  pg_restore \
    --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
  < "$BACKUP_DIR/database.dump"

if [[ -f "$BACKUP_DIR/uploads.tar.gz" ]]; then
  echo "==> Restauration des uploads (via Docker)"
  docker compose -f "$REPO_DIR/docker-compose.yml" exec -T backend \
    tar -xzf - -C /app/uploads \
    < "$BACKUP_DIR/uploads.tar.gz"
fi

echo "Restauration terminée depuis : $BACKUP_DIR"
