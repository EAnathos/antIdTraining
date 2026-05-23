
# Frontend

Interface utilisateur du projet Ant ID Training.

Technologies:
- React
- Vite
- TypeScript
- Tailwind CSS

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

La carte des composants et les points d'intégration avec le backend se trouvent dans la documentation centrale:

- `docs/frontend-component-map.md` — carte des composants et flux
- `docs/frontend-component-map.svg` — diagramme (placeholder)

Intégration backend:
- L'API backend (Express + Prisma) fournit les données principales: taxons, entrées, images, sessions joueurs, suggestions, statistiques.
- Endpoints usuels: `/api/taxons`, `/api/entries`, `/api/auth` et endpoints d'upload d'images.
- Pour modifier l'URL de l'API, consultez le client API dans `apps/frontend/src/lib`.

## Bonnes pratiques

- Vérifier `npm run lint` avant les commits.
- Les uploads d'images sont traités par le backend et stockés dans `apps/backend/uploads`.

## Pour aller plus loin

- Documentation backend: `apps/backend/README.md`
- Documentation centrale: [README racine](../README.md)

