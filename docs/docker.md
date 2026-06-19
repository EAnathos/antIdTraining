# Docker

## Stack Docker Compose

Le fichier [`docker-compose.yml`](../docker-compose.yml) orchestre l'ensemble des services de l'application.

### Services applicatifs

| Service    | Image                | Port exposé | Rôle                                   |
| ---------- | -------------------- | ----------- | -------------------------------------- |
| `postgres` | `postgres:16-alpine` | `5432`      | Base de données principale             |
| `redis`    | `redis:7-alpine`     | `6379`      | Rate limiting et cache des entrées jeu |
| `backend`  | Build local          | `4000`      | API Express                            |
| `frontend` | Build local          | —           | Build Vite → volume partagé            |
| `nginx`    | `nginx:1.27-alpine`  | `80`        | Reverse proxy + serving du frontend    |

### Services de monitoring

| Service             | Image                                          | Port   | Rôle                                              |
| ------------------- | ---------------------------------------------- | ------ | ------------------------------------------------- |
| `prometheus`        | `prom/prometheus:latest`                       | `9090` | Collecte et stockage des métriques                |
| `grafana`           | `grafana/grafana:latest`                       | `3000` | Visualisation des métriques (dashboards)          |
| `node-exporter`     | `prom/node-exporter:latest`                    | `9100` | Métriques système hôte (CPU, RAM, disque, réseau) |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter:latest` | `9187` | Métriques PostgreSQL                              |
| `redis-exporter`    | `oliver006/redis_exporter:latest`              | `9121` | Métriques Redis                                   |

> Prometheus et Grafana sont liés à `127.0.0.1` uniquement — accessibles via tunnel SSH, jamais exposés publiquement.

### Réseaux

| Réseau         | Services                                                |
| -------------- | ------------------------------------------------------- |
| `frontend_net` | `backend`, `nginx`                                      |
| `backend_net`  | `postgres`, `redis`, `backend`, exporters, `prometheus` |

`frontend_net` est isolé de la base de données et de Redis : seul le backend y a accès.

### Volumes

| Volume            | Service      | Chemin de montage          | Rôle                                                                       |
| ----------------- | ------------ | -------------------------- | -------------------------------------------------------------------------- |
| `postgres_data`   | `postgres`   | `/var/lib/postgresql/data` | Persistance des données PostgreSQL                                         |
| `redis_data`      | `redis`      | `/data`                    | Persistance des données Redis                                              |
| `backend_uploads` | `backend`    | `/app/uploads`             | Le backend **écrit** les fichiers uploadés ici                             |
| `backend_uploads` | `nginx`      | `/uploads`                 | Nginx **sert** ces mêmes fichiers en statique (sans passer par le backend) |
| `frontend_dist`   | `frontend`   | `/dist`                    | Le frontend **écrit** le build Vite ici                                    |
| `frontend_dist`   | `nginx`      | `/usr/share/nginx/html`    | Nginx **sert** le build Vite depuis ce volume                              |
| `prometheus_data` | `prometheus` | `/prometheus`              | Séries temporelles Prometheus                                              |
| `grafana_data`    | `grafana`    | `/var/lib/grafana`         | Dashboards et configuration Grafana                                        |

`backend_uploads` et `frontend_dist` sont des volumes **partagés entre deux containers** : un producer (backend/frontend) qui y écrit, et nginx qui les sert directement en statique — sans proxy HTTP intermédiaire.

## Commandes courantes

```bash
# Démarrer tous les services
npm run docker:up

# Mode watch — rebuild automatique sur changement de fichiers (dev)
npm run docker:watch

# Vérifier l'état des services
docker compose ps

# Voir les logs d'un service
docker compose logs -f backend
docker compose logs -f prometheus

# Appliquer les migrations Prisma manuellement
docker compose exec backend npx prisma migrate deploy

# Redémarrer un service sans tout relancer
docker compose restart backend
```

## Mode watch (développement)

`npm run docker:watch` active la surveillance des fichiers locaux via `docker compose watch`. Dès qu'un fichier change, le service concerné est **rebuildé automatiquement** (avec cache Docker — seuls les layers invalidés sont reconstruits).

| Changement                   | Service rebuildé | Effet                                         |
| ---------------------------- | ---------------- | --------------------------------------------- |
| `apps/frontend/src/**`       | `frontend`       | Nouveau build Vite → nginx sert le résultat   |
| `apps/frontend/public/**`    | `frontend`       | Idem                                          |
| `apps/frontend/package.json` | `frontend`       | Réinstallation npm + rebuild                  |
| `apps/backend/src/**`        | `backend`        | Rebuild TypeScript + redémarrage du container |
| `apps/backend/prisma/**`     | `backend`        | Génération client Prisma + migrations au boot |
| `apps/backend/package.json`  | `backend`        | Réinstallation npm + rebuild                  |

`docker:up` et `docker:watch` sont complémentaires : `up` pour le premier démarrage, `watch` pour le développement itératif ensuite.

## Accès aux outils de monitoring

| Outil      | URL publique                | Accès                                                           |
| ---------- | --------------------------- | --------------------------------------------------------------- |
| Grafana    | `http://<domaine>/grafana/` | Public (auth Grafana requise)                                   |
| Prometheus | tunnel SSH uniquement       | `ssh -L 9090:localhost:9090 user@vps` → `http://localhost:9090` |

Prometheus reste lié à `127.0.0.1` — pas d'interface publique. Grafana est proxifié par Nginx sur `/grafana/`.

## Grafana

Grafana est accessible publiquement via Nginx sur `/grafana/`. Il démarre avec la datasource Prometheus pré-configurée via [`grafana/provisioning/datasources/prometheus.yml`](../grafana/provisioning/datasources/prometheus.yml) — aucune configuration manuelle requise.

Credentials définis dans `.env` (`GRAFANA_USER` / `GRAFANA_PASSWORD`).

Les dashboards créés dans l'UI sont persistés dans le volume `grafana_data`.

## Prometheus

### Targets scrapées

| Job          | Target                   | Métriques                                                |
| ------------ | ------------------------ | -------------------------------------------------------- |
| `prometheus` | `localhost:9090`         | Métriques internes de Prometheus                         |
| `backend`    | `backend:4000/metrics`   | Node.js runtime + compteurs HTTP (`http_requests_total`) |
| `node`       | `node-exporter:9100`     | CPU, RAM, disque, réseau du système hôte                 |
| `postgres`   | `postgres-exporter:9187` | Connexions, transactions, taille des tables              |
| `redis`      | `redis-exporter:9121`    | Commandes, mémoire, clients connectés                    |

### Configuration

Le fichier de configuration est [`prometheus/prometheus.yml`](../prometheus/prometheus.yml). Il définit un intervalle de scrape de 15 s pour tous les jobs.

### Endpoint `/metrics` du backend

Le backend expose `GET /metrics` au format OpenMetrics (text). Cet endpoint est **bloqué par Nginx** (`403 Forbidden`) et n'est accessible qu'en interne depuis Prometheus via le réseau Docker `backend_net`.

Pour tester manuellement depuis le VPS :

```bash
curl http://localhost:4000/metrics
```

## Lancer sans Docker (développement)

Les services de monitoring (`prometheus`, `postgres-exporter`, `redis-exporter`) ne tournent qu'en mode Docker. Le backend fonctionne normalement sans eux — l'endpoint `/metrics` reste disponible mais n'est scrappé par personne. Aucune fonctionnalité applicative n'est affectée.

## Variables d'environnement Docker

Les variables sont chargées depuis deux fichiers à la racine :

| Fichier             | Usage                                        |
| ------------------- | -------------------------------------------- |
| `.env`              | Credentials PostgreSQL, Redis, port Nginx    |
| `apps/backend/.env` | Variables spécifiques au backend (JWT, clés) |

Voir [`.env.example`](../.env.example) et [`apps/backend/.env.example`](../apps/backend/.env.example) pour les valeurs attendues.
