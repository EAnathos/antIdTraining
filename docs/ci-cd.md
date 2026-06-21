# CI/CD

## Vue d'ensemble

Le pipeline CI/CD est géré par GitHub Actions avec deux workflows distincts, complétés par Dependabot pour les mises à jour automatiques de dépendances :

- **CI** (`.github/workflows/ci.yml`) — validation automatique sur chaque push et PR
- **CD** (`.github/workflows/cd.yml`) — déploiement automatique sur le VPS à chaque push sur `master`
- **Dependabot** (`.github/dependabot.yml`) — PRs automatiques de mise à jour des dépendances (voir [dependencies.md](dependencies.md))

## CI — Validation (`.github/workflows/ci.yml`)

**Déclencheur** : push sur `dev` ou `main`, et toutes les pull requests.

**Concurrence** : un seul job CI par branche à la fois (`cancel-in-progress: true`).

**Étapes du job `validate`** :

1. Checkout du dépôt
2. Setup Node.js 22 avec cache npm
3. `npm ci` — installation des dépendances
4. `npm run format:check` — vérification Prettier
5. `npm run lint` — ESLint sur frontend + backend
6. `npm run test:coverage` — tests Vitest avec coverage
7. Upload des rapports de coverage en artifacts (`backend-coverage`, `frontend-coverage`)
8. `npm run build -w apps/backend` — build backend
9. `npm run build -w apps/frontend` — build frontend

Les artifacts de coverage sont disponibles dans l'onglet **Actions** après chaque run, même en cas d'échec (`if: always()`).

## CD — Déploiement (`.github/workflows/cd.yml`)

**Déclencheur** : push sur la branche `master`.

**Étapes** :

1. GitHub Actions se connecte au VPS via SSH (action `appleboy/ssh-action@v1.2.0`)
2. `git pull --rebase origin master` — met à jour le code sur le VPS
3. `npm run docker:up` — rebuild les images et relance les containers (`docker compose up -d --build`)

## Secrets GitHub requis

À configurer dans **Settings → Secrets and variables → Actions** du dépôt (Repository secrets) :

| Secret        | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `VPS_HOST`    | Adresse IP ou domaine du VPS                                |
| `VPS_USER`    | Utilisateur SSH (ex. `ubuntu`, `debian`)                    |
| `VPS_SSH_KEY` | Clé privée SSH (contenu complet, y compris `-----BEGIN...`) |
| `VPS_PORT`    | Port SSH (généralement `22`)                                |

## Workflow Git → déploiement

```
feat/fix  ──(PR)──► dev ──(CI)──► [validate]
                     │
                  (PR)──► master ──(push)──► CD ──(SSH)──► VPS
```

1. Travailler sur une branche `feat/` ou `fix/` depuis `dev`
2. Ouvrir une PR vers `dev` — la CI se déclenche automatiquement
3. Merger dans `dev` une fois la CI verte
4. Quand prêt à déployer : merger `dev` dans `master`
5. Le déploiement se déclenche automatiquement

**Les PRs ne ciblent jamais `master` directement.** Voir le workflow Git dans [CLAUDE.md](../CLAUDE.md).

## Déploiement manuel

En cas de besoin, se connecter au VPS et lancer :

```bash
cd ~/eanathos/antIdTraining
git pull --rebase origin master
npm run docker:up
```

## Logs

- **CI** : onglet **Actions** du dépôt GitHub, job "Validate workspace"
- **CD** : onglet **Actions** du dépôt GitHub, job "Deploy to VPS"
