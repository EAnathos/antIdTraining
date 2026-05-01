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

printf '\n==> %s\n' "Build backend"
npm run build -w apps/backend

printf '\n==> %s\n' "Build frontend"
npm run build -w apps/frontend

printf '\n==> %s\n' "Déploiement du frontend dans $DEPLOY_DIR"
rsync -a --delete "$FRONTEND_DIST"/ "$DEPLOY_DIR"/

printf '\n==> %s\n' "Redémarrage du backend PM2"
pm2 restart "$BACKEND_PROCESS"

printf '\n==> %s\n' "Reload Nginx"
sudo systemctl reload nginx

printf '\nDéploiement terminé.\n'
