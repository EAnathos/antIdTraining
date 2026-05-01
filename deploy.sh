#!/bin/bash
set -e

echo "[$(date)] Deploy started"

cd ~/eanathos/antIdTraining

# Pull les changements
echo "[$(date)] Pulling from git..."
git pull origin main

# Install + rebuild
echo "[$(date)] Installing dependencies..."
npm install

echo "[$(date)] Building backend..."
npm run build -w apps/backend

echo "[$(date)] Building frontend..."
npm run build -w apps/frontend

# Deploy frontend (Nginx)
echo "[$(date)] Deploying frontend to /var/www/ant-id-training..."
sudo rsync -a --delete apps/frontend/dist/ /var/www/ant-id-training/

# Restart backend (PM2)
echo "[$(date)] Restarting backend with PM2..."
pm2 restart antIdTraining-backend || pm2 start apps/backend/dist/index.js --name antIdTraining-backend
pm2 save

echo "[$(date)] Deploy completed successfully"
