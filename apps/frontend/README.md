# Frontend

Interface utilisateur du projet Ant ID Training.

Technologies:

- React
- Vite
- TypeScript
- Tailwind CSS

## Architecture des styles

Le frontend s’appuie sur une base CSS organisée par couches dans `src/styles/` :

- `theme.css` : variables de design, mode clair/sombre et fond global
- `layout.css` : structure de l’application, shell et grille des pages
- `components.css` : cartes, boutons, onglets, alertes et champs de formulaire
- `index.css` : point d’entrée qui agrège Tailwind et les couches de style

Cette séparation permet de faire évoluer l’identité visuelle sans disperser la logique de présentation dans les pages.

## Démarrage

### Avec Docker

Le frontend est démarré automatiquement via Docker Compose depuis la racine du dépôt.

### En local

```bash
npm install
npm run dev
```

Accès local: http://localhost:5173

## Variables d'environnement

Copier l'exemple d'env depuis la racine et, si besoin, depuis le backend:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

Les variables backend importantes: `DATABASE_URL`, `JWT_SECRET` (voir `apps/backend/README.md`).

## Scripts utiles

- `npm run dev` : serveur Vite en développement
- `npm run build` : build de production
- `npm run preview` : aperçu du build de production
- `npm run lint` : vérification ESLint

## Architecture et intégration

La documentation centrale qui décrit l'architecture, l'API et les données se trouve dans [docs/README.md](../../docs/README.md).

Références utiles:

- [Architecture globale](../../docs/architecture.md)
- [Vue d'ensemble de l'API](../../docs/api.md)
- [Schéma de base de données](../../docs/database-schema.md)

Intégration backend:

- L'API backend (Express + Prisma) fournit les données principales: taxons, entrées, images, sessions joueurs, suggestions, statistiques.
- Endpoints usuels: `/api/taxons`, `/api/entries`, `/api/auth` et endpoints d'upload d'images.

## Bonnes pratiques

- Vérifier `npm run lint` avant les commits.
- Les uploads d'images sont traités par le backend et stockés dans `apps/backend/uploads`.

## Pour aller plus loin

- Documentation backend: [README backend](../backend/README.md)
- Documentation centrale: [README racine](../../README.md)
