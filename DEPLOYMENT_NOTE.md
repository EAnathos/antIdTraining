# Note de déploiement VPS

## Infos du projet

- Repo local : `~/eanathos/antIdTraining/`
- Frontend déployé dans : `/var/www/ant-id-training/`
- Processus backend PM2 : `antIdTraining-backend`
- Nginx : `/etc/nginx/sites-available/antIdTraining-frontend`
- Nginx backend : `/etc/nginx/sites-available/antIdTraining-backend`

## Mise à jour du site

Depuis le repo :

```bash
cd ~/eanathos/antIdTraining/
git pull
npm ci
npm run build -w apps/backend
npm run build -w apps/frontend
rsync -a --delete apps/frontend/dist/ /var/www/ant-id-training/
pm2 restart antIdTraining-backend
```

### Script prêt à l'emploi

Tu peux aussi lancer :

```bash
bash scripts/deploy-vps.sh
```

Le script fait :
- `git pull --rebase`
- `npm ci`
- build backend + frontend
- copie du frontend vers `/var/www/ant-id-training/`
- redémarrage de `antIdTraining-backend`
- reload de Nginx

## Si tu modifies aussi la conf Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Raccourci mental

1. Pull du repo
2. Build backend + frontend
3. Copier le frontend dans `/var/www/ant-id-training/`
4. Redémarrer PM2
5. Recharger Nginx seulement si la config a changé

## Nettoyage des images orphelines

Si besoin, lancer le nettoyage depuis l’admin, ou utiliser l’action serveur dédiée si elle est exposée.

