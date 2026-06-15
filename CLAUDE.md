# CLAUDE.md

## Stack

Monorepo npm workspaces : frontend (`apps/frontend`) et backend (`apps/backend`).

- **Frontend** : React + Vite + TypeScript + Tailwind CSS
- **Backend** : Express + Prisma + PostgreSQL + Redis
- **Tests** : Vitest (frontend + backend), coverage v8

## Commandes clés

```bash
npm run dev               # démarre frontend + backend en parallèle
npm run lint              # lint les deux apps (ESLint)
npm run format:check      # vérifie le formatage Prettier
npm run format            # applique le formatage
npm run test:coverage     # tests + coverage (seuils à respecter)
npm run build             # build de production (frontend + backend)
npm run db:migrate        # applique les migrations Prisma
npm run db:generate       # régénère le client Prisma
npm run docker:up         # démarre l'environnement Docker complet
```

## Vérifications obligatoires avant de clore une tâche

Les hooks dans `.claude/settings.json` automatisent ces vérifications :

| Étape                   | Quand                      | Hook          |
| ----------------------- | -------------------------- | ------------- |
| `npm run lint`          | après chaque Edit/Write    | `PostToolUse` |
| `npm run format`        | après chaque Edit/Write    | `PostToolUse` |
| `npm run test:coverage` | à la fin de chaque réponse | `Stop`        |
| `npm run build`         | à la fin de chaque réponse | `Stop`        |

Ne pas considérer une tâche terminée si l'une de ces étapes échoue.

## Architecture

```
apps/
  backend/
    src/
      routes/      # handlers Express, regroupés par domaine
      services/    # logique métier
      middleware/  # auth, upload, asyncHandler, error
      lib/         # utilitaires (redis, encryption, rateLimit, mail, …)
      prisma.ts    # instance Prisma singleton
      config.ts    # variables d'environnement validées
  frontend/
    src/
      pages/       # pages routées (React Router)
      components/  # composants réutilisables (admin/, layout/)
      lib/         # api.ts (client centralisé), queryClient, helpers
      hooks/       # hooks React Query (useAdminData, …)
      types/       # models.ts (types partagés)
```

## Conventions

- **Validation** : Zod côté backend, schémas définis inline dans les routes
- **Erreurs** : `AppError(status, message)` pour les erreurs métier, propagées via `asyncHandler`
- **Auth** : cookie JWT `adminToken` (admin) + header Bearer (API), middleware `requireAuth` / `requireAdmin`
- **Images** : upload multer → sharp → WebP multi-résolutions (`/uploads/`)
- **Chiffrement** : `encryptSensitiveText` / `decryptSensitiveText` pour les champs PII (nécessite `DATA_ENCRYPTION_KEY`)
- **React Query** : toutes les requêtes serveur passent par `apps/frontend/src/lib/api.ts`

## Prisma

Toute modification du schéma (`apps/backend/prisma/schema.prisma`) nécessite :

1. Créer le fichier de migration (`npm run db:migrate`)
2. Mettre à jour l'export de la base de données depuis le panel admin

## Workflow Git

Pour chaque nouvelle fonctionnalité ou correction demandée, créer une branche dédiée **avant** de commencer les modifications :

```bash
git checkout -b feat/<nom-court>    # nouvelle fonctionnalité
git checkout -b fix/<nom-court>     # correction de bug
git checkout -b chore/<nom-court>   # tâche technique (deps, config, …)
```

Ne travailler directement sur `dev` que pour des changements triviaux (typo, commentaire). Merger dans `dev` une fois la tâche terminée et les vérifications passées.

## Documentation

Si une modification impacte le comportement, l'architecture, l'API ou les scripts, mettre à jour :

- `docs/` (architecture.md, api.md, database-schema.md, …)
- ou les fichiers `README.md` concernés
