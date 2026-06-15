# API

## Base

- URL locale backend : `http://localhost:4000`
- Préfixe : `/api`
- Documentation interactive : `/api/docs` (Swagger UI)
- Spécification OpenAPI : `/api/openapi.json`

## Authentification

Les routes admin requièrent un JWT valide, transmis soit en cookie `adminToken` soit en header `Authorization: Bearer <token>`.

---

## Routes publiques

### Santé

| Méthode | Route               | Description                                        |
| ------- | ------------------- | -------------------------------------------------- |
| `GET`   | `/api/health`       | Liveness — l'API répond                            |
| `GET`   | `/api/health/ready` | Readiness — vérifie PostgreSQL, Redis et métriques |

### Auth

| Méthode | Route                              | Description                                                                     |
| ------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `POST`  | `/api/auth/register`               | Création de compte (username, email, password) — envoie un code de vérification |
| `POST`  | `/api/auth/verify-email`           | Activation du compte via le code reçu par e-mail                                |
| `POST`  | `/api/auth/login`                  | Connexion — renvoie un JWT et pose le cookie `adminToken`                       |
| `POST`  | `/api/auth/logout`                 | Suppression du cookie                                                           |
| `GET`   | `/api/auth/me`                     | Profil courant, e-mail et points _(auth requise)_                               |
| `PATCH` | `/api/auth/profile`                | Mise à jour de l'avatar (URL) et de la biographie _(auth requise)_              |
| `POST`  | `/api/auth/avatar`                 | Upload d'avatar (multipart) _(auth requise)_                                    |
| `POST`  | `/api/auth/delete-account`         | Suppression du compte connecté _(auth requise)_                                 |
| `GET`   | `/api/auth/users/:username`        | Profil public d'un utilisateur (avatar, bio, points)                            |
| `POST`  | `/api/auth/password-reset-request` | Demande de reset — envoie un e-mail si aucune autre demande dans la semaine     |
| `POST`  | `/api/auth/password-reset`         | Validation du token et définition du nouveau mot de passe                       |

**Règles mot de passe** : minimum 8 caractères, au moins un caractère spécial.  
**Emails** : envoyés via Resend si `RESEND_API_KEY` et `RESEND_FROM` sont configurés.  
**Notification de connexion** : un e-mail est envoyé à chaque connexion réussie (désactivable via `SEND_LOGIN_NOTIFICATION_EMAILS=false`).

### Jeu

| Méthode | Route                | Description                                                                               |
| ------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `GET`   | `/api/game/question` | Question aléatoire — params : `level=easy\|medium\|hard`, `departments`, `swarmingMonths` |
| `POST`  | `/api/game/validate` | Validation d'une réponse et enregistrement du score                                       |

Les deux endpoints sont limités par IP (rate limiting Redis).

### Taxons

| Méthode | Route                          | Description                                   |
| ------- | ------------------------------ | --------------------------------------------- |
| `GET`   | `/api/taxons`                  | Liste complète                                |
| `GET`   | `/api/taxons/subfamilies`      | Sous-familles disponibles                     |
| `GET`   | `/api/taxons/genera`           | Genres d'une sous-famille (`?subfamily=`)     |
| `GET`   | `/api/taxons/subgenera`        | Sous-genres d'un genre (`?genus=`)            |
| `GET`   | `/api/taxons/species-groups`   | Groupes d'espèces (`?genus=`)                 |
| `GET`   | `/api/taxons/species`          | Espèces d'un genre (`?genus=`)                |
| `GET`   | `/api/taxons/species-metadata` | Métadonnées d'une espèce (`?genus=&species=`) |

### Références et stats

| Méthode | Route                    | Description                           |
| ------- | ------------------------ | ------------------------------------- |
| `GET`   | `/api/references`        | Liste des références bibliographiques |
| `GET`   | `/api/stats/leaderboard` | Classement public                     |

### Contributions utilisateur _(auth requise)_

| Méthode | Route                                   | Description                                  |
| ------- | --------------------------------------- | -------------------------------------------- |
| `POST`  | `/api/suggestions`                      | Soumission d'une suggestion                  |
| `POST`  | `/api/entry-proposals`                  | Proposition d'entrée (multipart avec images) |
| `GET`   | `/api/entry-proposals/my-contributions` | Propositions de l'utilisateur connecté       |
| `GET`   | `/api/entry-proposals/user-counts`      | Compteurs de contributions par utilisateur   |

---

## Routes admin _(requireAuth + requireAdmin)_

### Entrées

| Méthode  | Route                                 | Description                      |
| -------- | ------------------------------------- | -------------------------------- |
| `GET`    | `/api/admin/entries`                  | Liste paginée (`?page=&limit=`)  |
| `POST`   | `/api/admin/entries`                  | Création (multipart avec images) |
| `PUT`    | `/api/admin/entries/:id`              | Modification                     |
| `PUT`    | `/api/admin/entries/:id/images/order` | Réordonnancement des images      |
| `DELETE` | `/api/admin/entries/:id`              | Suppression                      |

### Taxons

| Méthode  | Route                   | Description  |
| -------- | ----------------------- | ------------ |
| `POST`   | `/api/admin/taxons`     | Création     |
| `PUT`    | `/api/admin/taxons/:id` | Modification |
| `DELETE` | `/api/admin/taxons/:id` | Suppression  |

### Références

| Méthode  | Route                       | Description  |
| -------- | --------------------------- | ------------ |
| `POST`   | `/api/admin/references`     | Création     |
| `PUT`    | `/api/admin/references/:id` | Modification |
| `DELETE` | `/api/admin/references/:id` | Suppression  |

### Statistiques

| Méthode | Route                          | Description              |
| ------- | ------------------------------ | ------------------------ |
| `GET`   | `/api/admin/stats/game`        | Statistiques de jeu      |
| `GET`   | `/api/admin/stats/entries`     | Statistiques des entrées |
| `GET`   | `/api/admin/stats/leaderboard` | Classement admin         |
| `POST`  | `/api/admin/stats-tools/reset` | Remise à zéro des stats  |

### Base de données

| Méthode | Route                                 | Description                      |
| ------- | ------------------------------------- | -------------------------------- |
| `GET`   | `/api/admin/database/export`          | Export JSON des données          |
| `POST`  | `/api/admin/database/import`          | Import JSON                      |
| `GET`   | `/api/admin/database/export/bundle`   | Export ZIP (données + uploads)   |
| `POST`  | `/api/admin/database/import/bundle`   | Import ZIP                       |
| `POST`  | `/api/admin/database/cleanup/uploads` | Nettoyage des fichiers orphelins |

### Utilisateurs, historique, suggestions, propositions

| Méthode  | Route                            | Description                 |
| -------- | -------------------------------- | --------------------------- |
| `GET`    | `/api/admin/history`             | Journal des actions admin   |
| `GET`    | `/api/admin/users`               | Liste des utilisateurs      |
| `PUT`    | `/api/admin/users/:id/points`    | Modification des points     |
| `GET`    | `/api/admin/suggestions`         | Liste des suggestions       |
| `PUT`    | `/api/admin/suggestions/:id`     | Traitement d'une suggestion |
| `DELETE` | `/api/admin/suggestions/:id`     | Suppression                 |
| `GET`    | `/api/admin/entry-proposals`     | Liste des propositions      |
| `PUT`    | `/api/admin/entry-proposals/:id` | Acceptation ou rejet        |
| `DELETE` | `/api/admin/entry-proposals/:id` | Suppression                 |

---

## Format des erreurs

Toutes les erreurs suivent ce format :

```json
{ "message": "Description lisible." }
```

Les erreurs de validation (400) incluent en plus :

```json
{
  "message": "Requête invalide.",
  "errors": { "field": ["message"] },
  "formErrors": []
}
```

Les erreurs serveur (500) incluent un `errorId` pour le support :

```json
{ "message": "Erreur interne du serveur.", "errorId": "a1b2c3d4e5f6" }
```
