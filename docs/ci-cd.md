# CI/CD

## Vue d'ensemble

Le pipeline CI/CD est entièrement géré par GitHub Actions. Il n'y a pas de CI (tests automatisés sur PR) pour l'instant — seul le CD est en place.

## Workflow de déploiement (`.github/workflows/cd.yml`)

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
dev  ──(PR)──► master ──(push)──► GitHub Actions ──(SSH)──► VPS
```

1. Travailler sur une branche `feat/` ou `fix/` depuis `dev`
2. Merger dans `dev` (via PR)
3. Quand prêt à déployer : merger `dev` dans `master`
4. Le déploiement se déclenche automatiquement

**Les PRs ne ciblent jamais `master` directement.** Voir le workflow Git dans [CLAUDE.md](../CLAUDE.md).

## Déploiement manuel

En cas de besoin, se connecter au VPS et lancer :

```bash
cd ~/eanathos/antIdTraining
git pull --rebase origin master
npm run docker:up
```

## Logs de déploiement

Visibles dans l'onglet **Actions** du dépôt GitHub, job "Deploy to VPS".
