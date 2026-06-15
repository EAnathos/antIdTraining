# Dépendances

Bibliothèques principales du projet et leur rôle.

## Frontend

| Dépendance                             | Rôle                                                      |
| -------------------------------------- | --------------------------------------------------------- |
| React                                  | Construction de l'interface utilisateur                   |
| React Router                           | Navigation entre les pages                                |
| TanStack React Query                   | Cache et synchronisation des requêtes serveur             |
| Zod                                    | Validation des données côté client                        |
| Vite                                   | Serveur de développement et build de production           |
| Tailwind CSS                           | Styles utilitaires                                        |
| `@svg-country-maps/france.departments` | Données cartographiques pour l'affichage des départements |

## Backend

| Dépendance                  | Rôle                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| Express 5                   | Serveur HTTP et routage de l'API                                     |
| Prisma + `@prisma/client`   | ORM — schéma, migrations, requêtes typées                            |
| `@prisma/adapter-pg` + `pg` | Adaptateur PostgreSQL bas niveau                                     |
| ioredis                     | Client Redis — rate limiting et cache applicatif                     |
| Zod                         | Validation des payloads entrants                                     |
| jsonwebtoken                | Création et vérification des JWT                                     |
| bcryptjs                    | Hachage des mots de passe                                            |
| pino                        | Logs structurés JSON                                                 |
| multer                      | Gestion des uploads multipart                                        |
| sharp                       | Traitement et conversion des images (→ WebP multi-résolutions)       |
| cors                        | Gestion des origines autorisées                                      |
| helmet                      | En-têtes de sécurité HTTP                                            |
| compression                 | Compression gzip des réponses                                        |
| adm-zip                     | Manipulation d'archives ZIP (export/import bundle)                   |
| swagger-ui-express          | Interface Swagger pour l'OpenAPI généré                              |
| `@paralleldrive/cuid2`      | Génération d'identifiants courts et uniques                          |
| dotenv                      | Chargement des variables d'environnement                             |
| Resend                      | Envoi d'e-mails transactionnels (API REST directe, sans package npm) |

## Outils de développement

| Dépendance               | Rôle                                           |
| ------------------------ | ---------------------------------------------- |
| TypeScript               | Typage statique et compilation                 |
| tsx                      | Exécution des scripts TypeScript (backend)     |
| Vitest                   | Exécution des tests unitaires et d'intégration |
| `@testing-library/react` | Tests des composants React                     |
| `@vitest/coverage-v8`    | Rapport de couverture de code                  |
| ESLint                   | Analyse statique                               |
| Prettier                 | Formatage du code                              |
| pino-pretty              | Lisibilité des logs en développement           |
