# Scripts d'administration

Scripts utilitaires pour gérer les utilisateurs en base de données.

Ces scripts utilisent `tsx` (dev dependency) et ne sont **pas disponibles dans le container de production**. Il faut les exécuter via `docker compose run` qui installe les dépendances de développement à la volée.

## Commandes

### Lister les utilisateurs

```bash
docker compose run --rm --entrypoint "" backend sh -c "npm install && npx tsx scripts/list-users.ts"
```

### Créer / mettre à jour un utilisateur

```bash
docker compose run --rm \
  -e USERNAME_TO_CREATE=<username> \
  -e EMAIL_TO_CREATE=<email> \
  -e PASSWORD_TO_CREATE=<motdepasse> \
  -e ROLE_TO_CREATE=<USER|ADMIN> \
  --entrypoint "" \
  backend sh -c "npm install && npx tsx scripts/create-user.ts"
```

Le script fait un `upsert` : si le username existe déjà, il met à jour l'email, le mot de passe et le rôle.

### Supprimer un utilisateur

```bash
docker compose run --rm \
  -e USERNAME_TO_DELETE=<username> \
  --entrypoint "" \
  backend sh -c "npm install && npx tsx scripts/delete-user.ts"
```
