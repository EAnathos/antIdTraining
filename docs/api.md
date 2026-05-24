# Vue d'ensemble de l'API

## Base

- URL locale backend : `http://localhost:4000`
- Préfixe API : `/api`
- Documentation interactive : `/api/docs`
- Spécification OpenAPI : `/api/openapi.json`

## Routes publiques

### Santé et documentation

- `GET /api/health` : état de santé de l'API
- `GET /api/openapi.json` : document OpenAPI généré
- `GET /api/docs` : Swagger UI

### Authentification

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Jeu

- `GET /api/game/question`
- `POST /api/game/validate`

### Données publiques

- `GET /api/taxons`
- `GET /api/taxons/subfamilies`
- `GET /api/taxons/genera?subfamily=...`
- `GET /api/taxons/subgenera?genus=...`
- `GET /api/taxons/species-groups?genus=...`
- `GET /api/taxons/species?genus=...`
- `GET /api/taxons/species-metadata?genus=...&species=...`
- `GET /api/references`
- `GET /api/stats/leaderboard`

### Jeu

- `GET /api/game/question`
- `POST /api/game/validate`

### Contributions utilisateur

- `POST /api/suggestions`
- `GET /api/entry-proposals/my-contributions`
- `GET /api/entry-proposals/user-counts`
- `POST /api/entry-proposals`

## Routes administrateur

Les routes admin sont protégées par `requireAuth` + `requireAdmin`.

Préfixes principaux :

- `/api/admin/entries`
- `/api/admin/taxons`
- `/api/admin/references`
- `/api/admin/stats`
- `/api/admin/stats-tools`
- `/api/admin/database`
- `/api/admin/history`
- `/api/admin/users`
- `/api/admin/suggestions`
- `/api/admin/entry-proposals`

## Points d'attention

- Les erreurs de validation renvoient maintenant une structure exploitable par le frontend
- Les erreurs serveur incluent un `errorId`
- Les endpoints de jeu sont limités par IP
- Les uploads sont limités aux images acceptées par le middleware partagé
