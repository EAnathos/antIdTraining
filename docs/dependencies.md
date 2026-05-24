# Schéma de dépendances

Ce document résume les dépendances principales du projet et leur utilité.

## Vue d'ensemble

```mermaid
---
title: Dépendances principales d'Ant ID Training
---
flowchart LR
    subgraph FE[Frontend]
        direction TB
        React[React]
        Router[React Router]
        Query[TanStack React Query]
        ZodFE[Zod]
        Vite[Vite]
        Tailwind[Tailwind CSS]
        ESLint[ESLint]

        React --> Router
        React --> Query
        React --> ZodFE
        Vite --> React
        Tailwind --> React
        ESLint -. contrôle qualité .-> React
    end

    subgraph SH[Partagé]
        direction TB
        ZodShared[Zod]
        Cuid2["@paralleldrive/cuid2"]
        FranceMap["@svg-country-maps/france.departments"]
    end

    subgraph BE[Backend]
        direction TB
        Express[Express]
        Prisma["Prisma / @prisma/client"]
        PgAdapter["@prisma/adapter-pg"]
        Pg[pg]
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
        JWT[jsonwebtoken]
        Bcrypt[bcryptjs]
        Pino[pino]
        Multer[multer]
        Sharp[sharp]
        CORS[cors]
        Helmet[helmet]
        Compression[compression]
        Dotenv[dotenv]
        Swagger[swagger-ui-express]
        AdmZip[adm-zip]

        Express --> Prisma
        Prisma --> PgAdapter --> Pg --> Postgres
        Express --> Redis
        Express --> JWT
        Express --> Bcrypt
        Express --> Pino
        Express --> Multer
        Express --> Sharp
        Express --> CORS
        Express --> Helmet
        Express --> Compression
        Express --> Dotenv
        Express --> Swagger
        Express --> AdmZip
        Express --> ZodShared
        Express --> Cuid2
    end

    React --> FranceMap
    Query --> ZodShared
    Router --> Express
```

## Détail des dépendances

### Frontend

| Dépendance | Utilité |
| --- | --- |
| React | Construction de l'interface utilisateur. |
| React Router | Navigation entre les pages. |
| TanStack React Query | Cache, synchronisation et gestion des requêtes serveur. |
| Zod | Validation des données côté client et partage de schémas avec le backend. |
| Vite | Serveur de développement et build de production. |
| Tailwind CSS | Styles utilitaires de l'interface. |
| ESLint | Analyse statique et cohérence du code. |

### Partagé

| Dépendance | Utilité |
| --- | --- |
| Zod | Schémas de validation et typage des payloads. |
| @paralleldrive/cuid2 | Génération d'identifiants courts et uniques. |
| @svg-country-maps/france.departments | Données cartographiques pour l'affichage des départements. |

### Backend

| Dépendance | Utilité |
| --- | --- |
| Express | Serveur HTTP et routage de l'API. |
| Prisma / @prisma/client | Accès à la base, requêtes typées et migrations. |
| @prisma/adapter-pg | Adaptateur Prisma pour PostgreSQL. |
| pg | Client PostgreSQL bas niveau. |
| PostgreSQL | Base de données relationnelle. |
| Redis | Cache et rate limiting. |
| jsonwebtoken | Création et vérification des jetons d'authentification. |
| bcryptjs | Hash des mots de passe. |
| pino | Logs structurés. |
| multer | Gestion des uploads. |
| sharp | Traitement et conversion des images. |
| cors | Gestion des origines autorisées. |
| helmet | En-têtes de sécurité HTTP. |
| compression | Compression des réponses HTTP. |
| dotenv | Chargement des variables d'environnement. |
| swagger-ui-express | Interface de documentation OpenAPI. |
| adm-zip | Manipulation d'archives ZIP pour certains scripts/outils. |

### Outils de développement

| Dépendance | Utilité |
| --- | --- |
| TypeScript | Typage et compilation. |
| tsx | Exécution des scripts TypeScript côté backend. |
| pino-pretty | Lisibilité des logs en développement. |
| @types/* | Typage TypeScript des bibliothèques JS. |

## À retenir

- Le frontend s'appuie surtout sur React, React Router et React Query.
- Le backend est centré sur Express, Prisma, PostgreSQL et les briques de sécurité.
- Zod est le point de jonction principal pour valider les données entre frontend et backend.
