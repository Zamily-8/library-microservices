# 🔧 Procédures de Maintenance et Rollback

## Opérations courantes

### Démarrer tous les services
```bash
docker compose up -d
```

### Arrêter tous les services
```bash
# Arrêt simple (données conservées)
docker compose down

# Arrêt + suppression des données
docker compose down -v
```
> ⚠️ `down -v` supprime définitivement toutes les données MongoDB.

### Voir les logs
```bash
# Tous les services en temps réel
docker compose logs -f

# Un service spécifique
docker compose logs -f user-service
docker compose logs -f book-service
docker compose logs -f loan-service
docker compose logs -f nginx-gateway
```

### Redémarrer un service
```bash
docker compose restart user-service
```

### Vérifier l'état des services
```bash
docker compose ps
curl http://localhost/health
```

---

## Mise à jour d'un service

```bash
# 1. Modifier le code source

# 2. Reconstruire uniquement le service modifié
docker compose up --build -d user-service

# 3. Vérifier qu'il est healthy
docker compose ps user-service

# 4. Vérifier les logs
docker compose logs user-service --tail 20
```

---

## Procédure de Rollback

### Rollback rapide — annuler le dernier commit

```bash
# 1. Voir l'historique des commits
git log --oneline -5

# 2. Annuler le dernier commit (crée un commit inverse)
git revert HEAD

# 3. Pousser sur GitHub
git push

# 4. Reconstruire les containers
docker compose down
docker compose up --build -d
```

### Rollback vers un commit spécifique

```bash
# 1. Identifier le commit cible dans l'historique
git log --oneline

# Exemple de résultat :
# abc1234 feat: add loan service
# def5678 feat: add book service  ← cible
# ghi9012 Initial commit

# 2. Revenir à ce commit
git revert def5678

# 3. Reconstruire
docker compose up --build -d
```

### Rollback d'urgence via image Docker taguée

```bash
# 1. Modifier docker-compose.yml pour pointer vers une ancienne image
# Remplacer :
#   build: ./services/user-service
# Par :
#   image: ghcr.io/zamily-8/library-user-service:sha-abc123

# 2. Redémarrer
docker compose up -d
```

---

## Sauvegarde des données

### Sauvegarder toutes les bases
```bash
# Créer le dossier de backup
mkdir -p backup/$(date +%Y%m%d)

# Users
docker exec mongo-users mongodump \
  --db users_db --out /tmp/backup
docker cp mongo-users:/tmp/backup \
  ./backup/$(date +%Y%m%d)/users

# Books
docker exec mongo-books mongodump \
  --db books_db --out /tmp/backup
docker cp mongo-books:/tmp/backup \
  ./backup/$(date +%Y%m%d)/books

# Loans
docker exec mongo-loans mongodump \
  --db loans_db --out /tmp/backup
docker cp mongo-loans:/tmp/backup \
  ./backup/$(date +%Y%m%d)/loans

echo "Backup terminé dans ./backup/$(date +%Y%m%d)"
```

### Restaurer une base
```bash
# Exemple pour users
docker cp ./backup/20260415/users mongo-users:/tmp/restore
docker exec mongo-users mongorestore \
  --db users_db /tmp/restore/users_db
```

---

## Résolution des problèmes courants

### Problème : un container redémarre en boucle
```bash
# Voir l'erreur exacte
docker compose logs NOM_DU_SERVICE --tail 30

# Causes fréquentes et solutions :
# 1. MongoDB pas prêt → attendre et relancer
docker compose restart NOM_DU_SERVICE

# 2. Erreur de syntaxe dans le code
# → Corriger le code et reconstruire
docker compose up --build -d NOM_DU_SERVICE

# 3. Variable d'environnement manquante
# → Vérifier docker-compose.yml
```

### Problème : port 80 déjà utilisé
```bash
# Windows — trouver quel processus utilise le port 80
netstat -ano | findstr :80

# Tuer le processus (remplacer PID par le numéro trouvé)
taskkill /PID PID /F

# Ou changer le port dans docker-compose.yml
# ports:
#   - "8080:80"   ← utiliser 8080 à la place
```

### Problème : "Cannot connect to MongoDB"
```bash
# Vérifier que MongoDB tourne
docker compose ps mongo-users

# Le redémarrer si nécessaire
docker compose restart mongo-users

# Attendre 10 secondes puis redémarrer le service
sleep 10
docker compose restart user-service
```

### Problème : RabbitMQ inaccessible
```bash
# Redémarrer RabbitMQ
docker compose restart rabbitmq

# Attendre qu'il soit healthy
docker compose ps rabbitmq

# Puis redémarrer loan-service
docker compose restart loan-service
```

### Problème : espace disque insuffisant
```bash
# Nettoyer les images Docker inutilisées
docker image prune -f

# Nettoyer les volumes orphelins
docker volume prune -f

# Nettoyage complet (ATTENTION : supprime tout ce qui n'est pas utilisé)
docker system prune -f
```