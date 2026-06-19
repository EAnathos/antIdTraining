# Métriques Prometheus

Toutes les métriques sont exposées sur `GET /metrics` (format OpenMetrics) et scrapées par Prometheus toutes les 15 s. Cet endpoint est bloqué par Nginx en accès public — accessible uniquement en interne via le réseau Docker `backend_net`.

## Métriques système (node_exporter)

Métriques du système hôte (CPU, mémoire, disque, réseau). Exposées par le container `node-exporter` sur le port `9100`.

| Métrique                            | Type    | Description                                   |
| ----------------------------------- | ------- | --------------------------------------------- |
| `node_cpu_seconds_total`            | Counter | Temps CPU par mode (idle, user, system, …)    |
| `node_memory_MemAvailable_bytes`    | Gauge   | Mémoire RAM disponible                        |
| `node_memory_MemTotal_bytes`        | Gauge   | Mémoire RAM totale                            |
| `node_filesystem_avail_bytes`       | Gauge   | Espace disque disponible par point de montage |
| `node_network_receive_bytes_total`  | Counter | Octets reçus par interface réseau             |
| `node_network_transmit_bytes_total` | Counter | Octets émis par interface réseau              |

## Métriques Node.js (prom-client)

Métriques du process backend Express. Exposées par le container `backend` sur le port `4000`.

| Métrique                        | Type    | Description                             |
| ------------------------------- | ------- | --------------------------------------- |
| `nodejs_heap_size_used_bytes`   | Gauge   | Mémoire heap V8 utilisée                |
| `nodejs_heap_size_total_bytes`  | Gauge   | Mémoire heap V8 allouée                 |
| `nodejs_external_memory_bytes`  | Gauge   | Mémoire externe (Buffers, C++ bindings) |
| `nodejs_eventloop_lag_seconds`  | Gauge   | Lag de la boucle événementielle         |
| `nodejs_active_handles_total`   | Gauge   | Handles actifs (sockets, timers, …)     |
| `process_cpu_seconds_total`     | Counter | Temps CPU consommé par le process       |
| `process_resident_memory_bytes` | Gauge   | Mémoire résidente (RSS)                 |

## Métriques HTTP (prom-client)

| Métrique              | Type    | Labels         | Description                                  |
| --------------------- | ------- | -------------- | -------------------------------------------- |
| `http_requests_total` | Counter | `status_class` | Nombre de requêtes HTTP par classe de statut |

Valeurs du label `status_class` : `2xx`, `4xx`, `5xx`.

Requêtes PromQL utiles :

```promql
# Taux de requêtes total (par seconde sur 1 min)
rate(http_requests_total[1m])

# Taux d'erreurs 5xx
rate(http_requests_total{status_class="5xx"}[5m])

# Ratio d'erreurs
rate(http_requests_total{status_class="5xx"}[5m])
  / rate(http_requests_total[5m])
```

## Métriques métier (prom-client)

Métriques applicatives synchronisées depuis la base de données toutes les **60 secondes**.

### Utilisateurs

| Métrique                 | Type  | Labels | Description                          |
| ------------------------ | ----- | ------ | ------------------------------------ |
| `registered_users_total` | Gauge | —      | Nombre total d'utilisateurs inscrits |

### Contenu

| Métrique                    | Type  | Labels | Description                          |
| --------------------------- | ----- | ------ | ------------------------------------ |
| `observation_entries_total` | Gauge | —      | Nombre total d'entrées d'observation |
| `entry_images_total`        | Gauge | —      | Nombre total de photos uploadées     |

### Suggestions & propositions

| Métrique                | Type  | Labels   | Description                                |
| ----------------------- | ----- | -------- | ------------------------------------------ |
| `suggestions_total`     | Gauge | `status` | Nombre de suggestions par statut           |
| `entry_proposals_total` | Gauge | `status` | Nombre de propositions d'entrée par statut |

Valeurs du label `status` : `pending`, `accepted`, `rejected`.

```promql
# Backlog à traiter
suggestions_total{status="pending"}
entry_proposals_total{status="pending"}
```

### Sessions de jeu

| Métrique              | Type  | Labels             | Description                                          |
| --------------------- | ----- | ------------------ | ---------------------------------------------------- |
| `game_sessions_total` | Gauge | `level`, `outcome` | Nombre de sessions de jeu par difficulté et résultat |

Valeurs du label `level` : `easy`, `medium`, `hard`.
Valeurs du label `outcome` : `correct`, `incorrect`, `abandoned`.

```promql
# Taux de réussite global
sum(game_sessions_total{outcome="correct"})
  / sum(game_sessions_total{outcome!="abandoned"})

# Taux de réussite par niveau
game_sessions_total{outcome="correct"}
  / ignoring(outcome) sum without(outcome) (game_sessions_total{outcome!="abandoned"})
```

## Métriques PostgreSQL (postgres-exporter)

Exposées par le container `postgres-exporter` sur le port `9187`.

| Métrique                               | Type    | Description                  |
| -------------------------------------- | ------- | ---------------------------- |
| `pg_stat_activity_count`               | Gauge   | Connexions actives           |
| `pg_stat_database_xact_commit_total`   | Counter | Transactions commitées       |
| `pg_stat_database_xact_rollback_total` | Counter | Transactions rollbackées     |
| `pg_database_size_bytes`               | Gauge   | Taille de la base de données |
| `pg_stat_database_blks_hit_total`      | Counter | Blocs lus depuis le cache    |
| `pg_stat_database_blks_read_total`     | Counter | Blocs lus depuis le disque   |

```promql
# Taux de cache hit PostgreSQL (doit être proche de 1)
rate(pg_stat_database_blks_hit_total[5m])
  / (rate(pg_stat_database_blks_hit_total[5m]) + rate(pg_stat_database_blks_read_total[5m]))
```

## Métriques Redis (redis-exporter)

Exposées par le container `redis-exporter` sur le port `9121`.

| Métrique                         | Type    | Description                    |
| -------------------------------- | ------- | ------------------------------ |
| `redis_memory_used_bytes`        | Gauge   | Mémoire utilisée par Redis     |
| `redis_memory_max_bytes`         | Gauge   | Limite mémoire configurée      |
| `redis_connected_clients`        | Gauge   | Clients connectés              |
| `redis_commands_processed_total` | Counter | Commandes traitées             |
| `redis_keyspace_hits_total`      | Counter | Clés trouvées (cache hit)      |
| `redis_keyspace_misses_total`    | Counter | Clés non trouvées (cache miss) |
| `redis_expired_keys_total`       | Counter | Clés expirées                  |

```promql
# Taux de cache hit Redis
rate(redis_keyspace_hits_total[5m])
  / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```
