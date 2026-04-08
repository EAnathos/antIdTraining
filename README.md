# Ant ID Training

Application web d'entraînement à l'identification (React + TypeScript + Tailwind / Express + Prisma 7 + PostgreSQL).

## Lancer en Docker (recommandé)

Prérequis: Docker + Docker Compose.

1. Créer les fichiers d'environnement:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

2. Démarrer:

```bash
npm run docker:up
```

Services disponibles:
- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api/health
- Swagger UI: http://localhost:4000/api/docs
- OpenAPI JSON: http://localhost:4000/api/openapi.json
- PostgreSQL: localhost:5432 (db: `antidtraining`, user: `postgres`, pass: `postgres`)

Variables backend importantes:
- `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` sont obligatoires
- `CORS_ORIGINS` permet de limiter les origines autorisées

À l'initialisation du conteneur backend:
- `prisma generate`
- `prisma db push`
- `prisma seed` (création / mise à jour de l'admin)

Arrêt:

```bash
npm run docker:down
```

Logs:

```bash
npm run docker:logs
```

## Lancer en local (sans Docker)

1. Démarrer PostgreSQL local et créer la base `antidtraining`.
2. Créer `apps/backend/.env` depuis `apps/backend/.env.example`.
3. Exécuter:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend local: http://localhost:5173
Backend local: http://localhost:4000

## Admin initial

En local (modifiable via variables d'environnement):
- Email: `admin@antid.local`
- Mot de passe: `admin123`

En production, `ADMIN_EMAIL` et `ADMIN_PASSWORD` doivent être fournis explicitement pour le seed.

## Notes techniques récentes

- API taxons paginée: `GET /api/taxons` renvoie 50 éléments par requête (`offset`, `items`, `hasMore`, `nextOffset`, `total`).
- Frontend taxons: chargement progressif par requêtes en boucle + virtualisation du tableau pour les grandes listes.
- PWA: manifest + service worker avec cache offline et stratégie `stale-while-revalidate` pour les assets.
- Backend: logs structurés JSON par requête (`method`, `path`, `status`, `durationMs`) et gestion centralisée des erreurs.

## Convention de messages API

Pour garder une UX cohérente entre backend, frontend admin et OpenAPI:

- Format: messages d'erreur en français, phrase courte, ponctuation finale (`.`).
- Validation (`400`): préférer `Requête invalide.` ou `Le paramètre <nom> est ...`.
- Auth (`401`/`403`): utiliser `Non autorisé.` et `Accès administrateur requis.`.
- Ressource absente (`404`): utiliser `... introuvable.`.
- Conflit (`409`): utiliser `Conflit : ...`.

Quand un message change dans le runtime, mettre à jour aussi les exemples/descriptions dans `apps/backend/src/openapi.ts`.
