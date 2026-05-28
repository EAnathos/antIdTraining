# Backend

API du projet Ant ID Training.

Technologies:

- Express
- Prisma
- PostgreSQL
- TypeScript

## Démarrage

### Avec Docker

Le backend est démarré automatiquement via Docker Compose depuis la racine du dépôt.

### En local

```bash
npm install
```

Puis depuis la racine du monorepo:

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

## Variables d'environnement

Créer [.env.example](.env.example) à partir de l'exemple et définir au minimum:

- `DATABASE_URL`
- `JWT_SECRET`

Variables recommandées selon le contexte:

- `REDIS_URL` : optionnel en local si Redis tourne sur `localhost:6379`, recommandé en production
- `CORS_ORIGINS` : obligatoire en production
- `DATA_ENCRYPTION_KEY` : recommandé en production pour chiffrer les crédits photo et emails de suggestions
- `RESEND_API_KEY`, `RESEND_FROM` : configuration de l’envoi des e-mails de vérification, de connexion et de réinitialisation via Resend
- `FRONTEND_URL` : URL publique du frontend, utilisée dans les liens de réinitialisation de mot de passe
- `LOG_LEVEL` : niveau de logs du backend (`info` par défaut)

Le backend utilise Redis pour le rate limiting. Si `REDIS_URL` n'est pas défini, il essaie par défaut `redis://localhost:6379`.
Les données sensibles stockées par le backend sont chiffrées côté application lorsqu'une clé de chiffrement est fournie.
Les comptes joueurs doivent d'abord valider leur adresse e-mail via le code reçu par e-mail avant de pouvoir se connecter.
Les connexions utilisateur déclenchent aussi un e-mail de notification via l'API Resend si ces variables sont configurées.
Les demandes de réinitialisation de mot de passe envoient un e-mail contenant un lien vers `/reset-password?token=...` du frontend configuré.

## Scripts utiles

- `npm run dev` : serveur API en mode watch
- `npm run build` : génération Prisma + compilation TypeScript
- `npm run prisma:generate` : génération du client Prisma
- `npm run prisma:migrate` : migration locale
- `npm run user:list` : liste des utilisateurs
- `npm run user:create` : création d'un utilisateur à partir de `USERNAME_TO_CREATE`, `EMAIL_TO_CREATE`, `PASSWORD_TO_CREATE` et `ROLE_TO_CREATE`
- `npm run user:delete` : suppression d'un utilisateur

## Base de données

Le backend s'appuie sur Prisma pour:

- les modèles métier
- les migrations
- la génération du client

## API

La documentation est exposée via Swagger/OpenAPI depuis l'application lancée.

Documentation complémentaire dans le dossier racine [docs](../../docs/README.md) :

- [Architecture globale](../../docs/architecture.md)
- [Vue d'ensemble de l'API](../../docs/api.md)
- [Schéma de base de données](../../docs/database-schema.md)
