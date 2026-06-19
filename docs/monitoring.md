# Monitoring

Le backend expose deux endpoints de santé :

| Endpoint                | Type      | Description                                 |
| ----------------------- | --------- | ------------------------------------------- |
| `GET /api/health`       | Liveness  | L'API répond                                |
| `GET /api/health/ready` | Readiness | Vérifie PostgreSQL, Redis et métriques HTTP |

## Réponse de readiness

```json
{
  "ok": true,
  "timestamp": "...",
  "uptime": 3600,
  "checks": {
    "postgres": { "ok": true, "latencyMs": 2 },
    "redis": { "ok": true, "latencyMs": 1 }
  },
  "metrics": {
    "totalRequests": 1200,
    "serverErrors": 0
  }
}
```

Renvoie `503` si PostgreSQL ou Redis est en échec.

## Alertes recommandées

1. **API indisponible** — `GET /api/health` ne renvoie pas `200`
2. **Dépendance dégradée** — `GET /api/health/ready` renvoie `503`
3. **Hausse des erreurs serveur** — `metrics.serverErrors` augmente sur une fenêtre glissante
4. **Latence anormale** — `latencyMs` dépasse votre seuil SLO

## Traçabilité des erreurs

Les erreurs 500 incluent un `errorId` dans la réponse JSON et dans les logs structurés (pino). Pour diagnostiquer une erreur signalée par un utilisateur, chercher cet `errorId` dans les logs du backend.

## Prometheus

Le backend expose `GET /metrics` au format OpenMetrics, scrappé par Prometheus toutes les 15 s (voir [Docker](docker.md#prometheus)).

Métriques clés disponibles :

| Métrique                       | Type    | Description                                  |
| ------------------------------ | ------- | -------------------------------------------- |
| `http_requests_total`          | Counter | Requêtes HTTP par classe (`2xx`/`4xx`/`5xx`) |
| `process_cpu_seconds_total`    | Counter | Temps CPU consommé par le process Node.js    |
| `nodejs_heap_size_used_bytes`  | Gauge   | Mémoire heap utilisée                        |
| `nodejs_eventloop_lag_seconds` | Gauge   | Lag de la boucle événementielle              |

Requêtes PromQL utiles :

```promql
# Taux d'erreurs 5xx sur 5 minutes
rate(http_requests_total{status_class="5xx"}[5m])

# Taux de requêtes total
rate(http_requests_total[1m])

# Statut de tous les services
up
```

## Bonnes pratiques

- Ajouter un uptime check externe (Uptime Kuma, Better Uptime, etc.) sur `/api/health`.
- Définir des seuils d'alerte séparés pour la disponibilité et la performance.
- Corréler les alertes avec les logs JSON du backend (champ `err`, `errorId`, `path`).
