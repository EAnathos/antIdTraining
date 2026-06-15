# Sauvegardes

Stratégie de sauvegarde PostgreSQL + uploads, sans dépendance à Docker.

## Ce qui est sauvegardé

- `database.dump` : dump PostgreSQL au format custom (`pg_dump`)
- `uploads.tar.gz` : fichiers uploadés (`apps/backend/uploads`)
- `manifest.json` : métadonnées horodatées

## Commandes

```bash
npm run backup:db    # crée un backup daté dans backups/
npm run restore:db   # restaure depuis un répertoire de backup
```

Les scripts sous-jacents sont `scripts/backup-db.sh` et `scripts/restore-db.sh`.

### Variables requises

- `DATABASE_URL` : connexion PostgreSQL à sauvegarder/restaurer

### Variables optionnelles

- `BACKUP_ROOT` : répertoire racine des backups (défaut : `./backups`)
- `UPLOADS_DIR` : répertoire des uploads (défaut : `apps/backend/uploads`)

### Exemple de restauration

```bash
DATABASE_URL="postgresql://..." npm run restore:db -- ./backups/20260524T120000Z
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

1. Créer le backup (`npm run backup:db`).
2. Copier le répertoire vers un stockage externe (S3, NAS, etc.).
3. Tester une restauration sur une base de préproduction.
4. Vérifier l'intégrité des données et des uploads.

## Alertes recommandées

- Échec du script de backup
- Absence de backup récent (> 24 h)
- Restauration de test non concluante
