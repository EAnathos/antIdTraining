#!/usr/bin/env bash
# Reads POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB from $ENV_FILE.
# Requires $ENV_FILE to be set by the caller before sourcing.

POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"

if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_PASSWORD:-}" || -z "${POSTGRES_DB:-}" ]]; then
  echo "ERROR: POSTGRES_USER, POSTGRES_PASSWORD et POSTGRES_DB sont requis dans .env"
  exit 1
fi
