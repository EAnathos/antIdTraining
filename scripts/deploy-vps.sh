#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIST="$REPO_DIR/apps/frontend/dist"
DEPLOY_DIR="/var/www/ant-id-training"
BACKEND_PROCESS="antIdTraining-backend"

# Check critical dependencies
printf '\n==> %s\n' "Vérification des dépendances"
if ! command -v redis-cli &> /dev/null; then
	echo "ERROR: redis-cli not found. Install Redis first:"
	echo "  Ubuntu: sudo apt-get install redis-server"
	echo "  CentOS: sudo yum install redis"
	exit 1
fi

if ! redis-cli ping > /dev/null 2>&1; then
	echo "ERROR: Redis is not running or inaccessible."
	echo "Start Redis with: sudo systemctl start redis-server"
	exit 1
fi
echo "✓ Redis is running"

printf '\n==> %s\n' "Mise à jour du dépôt"
cd "$REPO_DIR"
git pull --rebase

printf '\n==> %s\n' "Installation des dépendances"
npm ci

printf '\n==> %s\n' "Génération Prisma + build backend"
npm run build -w apps/backend

printf '\n==> %s\n' "Application des migrations Prisma"
printf '\n==> %s\n' "Chargement des variables d'environnement backend"
if [ -f "$REPO_DIR/apps/backend/.env" ]; then
	set -a
	# shellcheck disable=SC1090
	source "$REPO_DIR/apps/backend/.env"
	set +a
fi

# Ensure DATABASE_URL is set for Prisma migrate
if [ -z "${DATABASE_URL:-}" ]; then
	echo "ERROR: DATABASE_URL not set. Aborting migrations."
	exit 1
fi

# Ensure REDIS_URL is configured (defaults to localhost:6379 if not set)
if [ -z "${REDIS_URL:-}" ]; then
	export REDIS_URL="redis://localhost:6379"
	echo "INFO: REDIS_URL not set, using default: $REDIS_URL"
fi

# Ensure CORS_ORIGINS is set in production
if [ "${NODE_ENV:-production}" = "production" ] && [ -z "${CORS_ORIGINS:-}" ]; then
	echo "ERROR: CORS_ORIGINS not set in production."
	echo "Set CORS_ORIGINS in apps/backend/.env or export it before deployment."
	echo "Example: CORS_ORIGINS=https://your-domain.com"
	exit 1
fi

MASKED_DBURL="${DATABASE_URL//?/*}"
echo "DATABASE_URL (masked): ${MASKED_DBURL:0:60}..."
echo "REDIS_URL: ${REDIS_URL:-redis://localhost:6379}"
(
	cd "$REPO_DIR/apps/backend"
	# If the genusValue migration previously failed, mark it rolled back so deploy can continue.
	npx prisma migrate resolve --schema=./prisma/schema.prisma --rolled-back 20260511120000_add_genus_value_to_taxon_level_profile >/dev/null 2>&1 || true
	# The species backfill migration is no longer needed; ensure a stale failed state does not block deploy.
	npx prisma migrate resolve --schema=./prisma/schema.prisma --rolled-back 20260511123000_backfill_species_profiles_by_genus >/dev/null 2>&1 || true
	npx prisma migrate deploy --schema=./prisma/schema.prisma
)

printf '\n==> %s\n' "Build frontend"
npm run build -w apps/frontend

printf '\n==> %s\n' "Déploiement du frontend dans $DEPLOY_DIR"
rsync -a --delete "$FRONTEND_DIST"/ "$DEPLOY_DIR"/

printf '\n==> %s\n' "Redémarrage du backend PM2"
pm2 restart "$BACKEND_PROCESS"

printf '\n==> %s\n' "Reload Nginx"
sudo systemctl reload nginx

printf '\nDéploiement terminé.\n'
