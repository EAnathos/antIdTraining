#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIST="$REPO_DIR/apps/frontend/dist"
DEPLOY_DIR="/var/www/ant-id-training"
BACKEND_PROCESS="antIdTraining-backend"

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

npx prisma migrate deploy --schema=./apps/backend/prisma/schema.prisma

printf '\n==> %s\n' "Build frontend"
npm run build -w apps/frontend

printf '\n==> %s\n' "Déploiement du frontend dans $DEPLOY_DIR"
rsync -a --delete "$FRONTEND_DIST"/ "$DEPLOY_DIR"/

printf '\n==> %s\n' "Redémarrage du backend PM2"
pm2 restart "$BACKEND_PROCESS"

printf '\n==> %s\n' "Reload Nginx"
sudo systemctl reload nginx

printf '\nDéploiement terminé.\n'
