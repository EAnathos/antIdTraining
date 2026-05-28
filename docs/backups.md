# Sauvegardes base

Ce projet utilise une stratégie de sauvegarde simple et exploitable sans Docker :

- export PostgreSQL avec `pg_dump`
- archivage du dossier `apps/backend/uploads` si présent
- stockage daté dans un répertoire `backups/`

## Objectifs

- **RPO** : 24 heures maximum pour une sauvegarde quotidienne
- **RTO** : dépend du volume, viser moins d’une heure pour une restauration simple

## Script de sauvegarde

Le script `scripts/backup-db.sh` crée un backup horodaté contenant :

- `database.dump` : dump PostgreSQL au format custom
- `uploads.tar.gz` : archive des fichiers uploadés
- `manifest.json` : métadonnées de sauvegarde

### Variables requises

- `DATABASE_URL` : connexion PostgreSQL à sauvegarder

### Variables optionnelles

- `BACKUP_ROOT` : dossier racine des backups, par défaut `./backups`
- `UPLOADS_DIR` : dossier des uploads, par défaut `apps/backend/uploads`

## Restauration

Le script `scripts/restore-db.sh` restaure un backup depuis un répertoire de sauvegarde.

Exemple :

```bash
DATABASE_URL="postgresql://..." ./scripts/restore-db.sh ./backups/20260524T120000Z
```

## Politique de rétention

Recommandation minimale :

- conserver les backups quotidiens 7 jours
- conserver les backups hebdomadaires 4 semaines
- conserver un backup mensuel 3 mois

## Runbook

1. Créer le backup.
2. Copier le répertoire de backup vers un stockage externe.
3. Tester une restauration sur une base de préproduction.
4. Vérifier l’intégrité des données et des uploads.

## Alertes recommandées

- échec de backup
- absence de backup dans les dernières 24 heures
- restauration de test non concluante
