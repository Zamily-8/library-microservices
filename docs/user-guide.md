# 📖 Guide Utilisateur — Système de Gestion de Bibliothèque

## Introduction

Ce système permet de gérer une bibliothèque en ligne via une API REST sécurisée.
Il offre 3 fonctionnalités principales : gestion des utilisateurs, des livres et des emprunts.

**URL de base :** `http://localhost`
**Authentification :** Token JWT (à inclure dans chaque requête protégée)

---

## 1. Démarrer l'application

```bash
docker compose up -d
```

Vérifier que tout fonctionne :
```bash
curl http://localhost/health
# Résultat attendu : {"status":"OK","gateway":"nginx"}
```

---

## 2. Créer un compte

```http
POST http://localhost/api/users/register
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "motdepasse123"
}
```

**Réponse (201) :**
```json
{
  "message": "Inscription réussie",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "64a1b2c3...",
    "username": "alice",
    "email": "alice@example.com",
    "role": "user"
  }
}
```

> ⚠️ **Conserve le token** — il est nécessaire pour toutes les requêtes suivantes.

---

## 3. Se connecter

```http
POST http://localhost/api/users/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "motdepasse123"
}
```

**Réponse (200) :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

---

## 4. Voir son profil

```http
GET http://localhost/api/users/profile
Authorization: Bearer TON_TOKEN
```

---

## 5. Gérer les livres

### Lister tous les livres
```http
GET http://localhost/api/books
Authorization: Bearer TON_TOKEN
```

### Rechercher un livre
```http
GET http://localhost/api/books?search=orwell
Authorization: Bearer TON_TOKEN
```

### Voir uniquement les livres disponibles
```http
GET http://localhost/api/books?available=true
Authorization: Bearer TON_TOKEN
```

### Ajouter un livre
```http
POST http://localhost/api/books
Authorization: Bearer TON_TOKEN
Content-Type: application/json

{
  "title": "1984",
  "author": "George Orwell",
  "isbn": "978-0-452-28423-4",
  "description": "Roman dystopique",
  "totalCopies": 3
}
```

### Modifier un livre
```http
PUT http://localhost/api/books/:id
Authorization: Bearer TON_TOKEN
Content-Type: application/json

{
  "description": "Nouvelle description"
}
```

### Supprimer un livre
```http
DELETE http://localhost/api/books/:id
Authorization: Bearer TON_TOKEN
```

---

## 6. Emprunter un livre

```http
POST http://localhost/api/loans/borrow
Authorization: Bearer TON_TOKEN
Content-Type: application/json

{
  "bookId": "ID_DU_LIVRE"
}
```

**Réponse (201) :**
```json
{
  "message": "Livre emprunté avec succès",
  "loan": {
    "_id": "64b2c3d4...",
    "bookTitle": "1984",
    "status": "active",
    "borrowedAt": "2026-04-15T10:00:00.000Z",
    "dueDate": "2026-04-29T10:00:00.000Z"
  }
}
```

> 💡 La date de retour est fixée automatiquement à **14 jours** après l'emprunt.

---

## 7. Voir mes emprunts

```http
GET http://localhost/api/loans/my
Authorization: Bearer TON_TOKEN
```

---

## 8. Retourner un livre

```http
POST http://localhost/api/loans/return/ID_DE_L_EMPRUNT
Authorization: Bearer TON_TOKEN
```

---

## 9. Interface RabbitMQ (événements en temps réel)

1. Ouvre **http://localhost:15672**
2. Login : `admin` — Password : `password`
3. Clique sur **Queues** → `loan_events`
4. Tu vois tous les événements `BOOK_BORROWED` et `BOOK_RETURNED`

---

## Codes d'erreur

| Code | Signification | Solution |
|---|---|---|
| 400 | Données invalides | Vérifie le corps de la requête |
| 401 | Token manquant ou expiré | Reconnecte-toi |
| 403 | Non autorisé | Tu n'as pas les droits |
| 404 | Ressource introuvable | Vérifie l'ID dans l'URL |
| 500 | Erreur serveur | Consulte les logs Docker |