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

Par défaut (modifiable via variables d'environnement):
- Email: `admin@antid.local`
- Mot de passe: `admin123`
