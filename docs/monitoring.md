# Monitoring et alerting

Cette application expose désormais deux niveaux de santé côté backend :

- `GET /api/health` : liveness simple pour vérifier que l’API répond.
- `GET /api/health/ready` : readiness détaillée, avec vérification PostgreSQL, Redis et métriques de requêtes.

## Réponse de readiness

L’endpoint `GET /api/health/ready` renvoie :

- l’état global `ok`
- un horodatage
- l’uptime du service
- l’état de PostgreSQL et Redis
- des métriques de trafic HTTP en mémoire

## Alertes recommandées

À connecter dans votre outil de supervision ou votre orchestrateur :

1. **API indisponible**
   - alerter si `GET /api/health` renvoie autre chose que `200`

2. **Dépendance dégradée**
   - alerter si `GET /api/health/ready` renvoie `503`
   - déclencher si PostgreSQL ou Redis est en échec

3. **Hausse des erreurs serveur**
   - surveiller `serverErrors` dans la réponse readiness
   - déclencher si la tendance augmente sur une fenêtre glissante

4. **Latence anormale**
   - surveiller `latencyMs` des checks base et Redis
   - déclencher si la latence dépasse votre seuil SLO

## Bonnes pratiques

- Garder les checks simples et rapides.
- Utiliser un uptime check externe en plus des logs applicatifs.
- Définir des seuils d’alerte séparés pour la disponibilité et la performance.
- Conserver les logs structurés du backend pour corréler les alertes.