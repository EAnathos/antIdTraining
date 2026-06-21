# Sauvegardes

Stratégie de sauvegarde PostgreSQL + uploads via Docker.

Les scripts s'exécutent entièrement dans les containers Docker — aucun client PostgreSQL requis sur l'hôte. Le container `postgres` doit être en cours d'exécution.

## Ce qui est sauvegardé

- `database.dump` : dump complet de la base au format custom (`pg_dump`) — inclut utilisateurs, sessions, taxons, contributions, suggestions, historique admin
- `uploads.tar.gz` : fichiers uploadés depuis le volume Docker `backend_uploads`
- `manifest.json` : métadonnées horodatées

## Commandes

```bash
npm run db:backup                             # crée un backup dans backups/<timestamp>/
npm run db:restore -- backups/20260620T120000Z  # restaure depuis un répertoire de backup
```

Les scripts sous-jacents sont [`scripts/backup-db.sh`](../scripts/backup-db.sh) et [`scripts/restore-db.sh`](../scripts/restore-db.sh).

### Variables lues automatiquement

Les credentials sont lus depuis `.env` à la racine du projet (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). Aucune variable à passer manuellement.

### Variable optionnelle

- `BACKUP_ROOT` : répertoire racine des backups (défaut : `./backups`)

### Exemple de restauration

```bash
npm run db:restore -- backups/20260620T120000Z
```

## Objectifs

- **RPO** : 24 h pour une sauvegarde quotidienne
- **RTO** : moins d'une heure pour une restauration simple

## Politique de rétention recommandée

| Fréquence    | Durée de conservation |
| ------------ | --------------------- |
| Quotidien    | 7 jours               |
| Hebdomadaire | 4 semaines            |
| Mensuel      | 3 mois                |

## Runbook

1. Créer le backup (`npm run db:backup`).
2. Copier le répertoire vers un stockage externe (S3, NAS, etc.).
3. Tester une restauration sur une base de préproduction.
4. Vérifier l'intégrité des données et des uploads.

## Alertes recommandées

- Échec du script de backup
- Absence de backup récent (> 24 h)
- Restauration de test non concluante
