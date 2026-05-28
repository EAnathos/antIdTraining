# Vue d'ensemble de l'API

## Base

- URL locale backend : `http://localhost:4000`
- Préfixe API : `/api`
- Documentation interactive : `/api/docs`
- Spécification OpenAPI : `/api/openapi.json`

## Routes publiques

### Santé et documentation

- `GET /api/health` : état de santé de l'API
- `GET /api/health/ready` : readiness détaillée (PostgreSQL, Redis, métriques)
- `GET /api/openapi.json` : document OpenAPI généré
- `GET /api/docs` : Swagger UI

### Authentification

- `POST /api/auth/login` : connexion avec l’adresse e-mail et le mot de passe
- `POST /api/auth/register` : création d’un compte avec nom d’utilisateur, adresse e-mail et mot de passe, puis envoi d’un code de vérification
- `POST /api/auth/verify-email` : validation du code reçu par e-mail et activation du compte
- `POST /api/auth/logout`
- `GET /api/auth/me` : profil courant, e-mail et points
- `PATCH /api/auth/profile` : mise à jour de l’avatar et de la biographie
- `POST /api/auth/avatar` : upload d’avatar
- `POST /api/auth/delete-account` : suppression du compte connecté
- `POST /api/auth/password-reset-request` : demande de réinitialisation de mot de passe, soit depuis un compte connecté, soit depuis une adresse e-mail saisie publiquement, avec envoi d’un e-mail contenant un lien vers le frontend
- `POST /api/auth/password-reset` : validation du token reçu par e-mail et définition d’un nouveau mot de passe

Chaque connexion déclenche l’envoi d’un e-mail de notification au compte concerné.
Une inscription n’est finalisée qu’après saisie du code de vérification reçu par e-mail.
L’envoi utilise Resend lorsque `RESEND_API_KEY` et `RESEND_FROM` sont configurés.
Le lien de réinitialisation pointe vers `/reset-password?token=...` sur le frontend configuré via `FRONTEND_URL`.
Le parcours public “Mot de passe oublié ?” utilise `/forgot-password` sur le frontend.

### Jeu

- `GET /api/game/question?level=easy|medium|hard` : question aléatoire, avec filtres optionnels `departments` et `swarmingMonths`
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

### Contributions utilisateur

- `POST /api/suggestions`
- `GET /api/entry-proposals/my-contributions`
- `GET /api/entry-proposals/user-counts`
- `POST /api/entry-proposals`

## Routes administrateur

Les routes admin sont protégées par `requireAuth` + `requireAdmin`.

### Entrées

- `GET /api/admin/entries`
- `POST /api/admin/entries`
- `PUT /api/admin/entries/:id`
- `PUT /api/admin/entries/:id/images/order`
- `DELETE /api/admin/entries/:id`

### Taxons

- `POST /api/admin/taxons`
- `PUT /api/admin/taxons/:id`
- `DELETE /api/admin/taxons/:id`

### Références

- `POST /api/admin/references`
- `PUT /api/admin/references/:id`
- `DELETE /api/admin/references/:id`

### Statistiques

- `GET /api/admin/stats/game`
- `GET /api/admin/stats/entries`
- `GET /api/admin/stats/leaderboard`
- `POST /api/admin/stats-tools/reset`

### Base de données

- `GET /api/admin/database/export`
- `POST /api/admin/database/import`
- `GET /api/admin/database/export/bundle`
- `POST /api/admin/database/import/bundle`
- `POST /api/admin/database/cleanup/uploads`

### Historique

- `GET /api/admin/history`

### Utilisateurs

- `GET /api/admin/users`
- `PUT /api/admin/users/:id/points`

### Suggestions

- `GET /api/admin/suggestions`
- `PUT /api/admin/suggestions/:id`
- `DELETE /api/admin/suggestions/:id`

### Propositions d’entrée

- `GET /api/admin/entry-proposals`
- `PUT /api/admin/entry-proposals/:id`
- `DELETE /api/admin/entry-proposals/:id`

## Points d'attention

- Les erreurs de validation renvoient maintenant une structure exploitable par le frontend
- Les erreurs serveur incluent un `errorId`
- Les endpoints de jeu sont limités par IP
- Les uploads sont limités aux images acceptées par le middleware partagé
