const request = require('supertest');
const mongoose = require('mongoose');
const { app, startServer } = require('../src/index');

let server;
let authToken;
let userId;

// Avant tous les tests : démarrer le serveur avec une DB de test
beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_users';
  process.env.JWT_SECRET = 'test_secret_key';
  server = await startServer();
}, 30000);

// Après tous les tests : fermer proprement
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (server) server.close();
}, 30000);

// ─────────────────────────────────────────
// TESTS D'INSCRIPTION
// ─────────────────────────────────────────
describe('POST /api/users/register', () => {

  test('✅ Doit créer un nouvel utilisateur', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('test@example.com');

    authToken = res.body.token;
    userId = res.body.user.id;
  });

  test('❌ Doit refuser un email déjà utilisé', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  test('❌ Doit refuser si champs manquants', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ email: 'incomplete@example.com' });

    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────
// TESTS DE CONNEXION
// ─────────────────────────────────────────
describe('POST /api/users/login', () => {

  test('✅ Doit connecter un utilisateur existant', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
  });

  test('❌ Doit refuser un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
  });

  test('❌ Doit refuser un email inconnu', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'nobody@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────
// TESTS DU PROFIL
// ─────────────────────────────────────────
describe('GET /api/users/profile', () => {

  test('✅ Doit retourner le profil avec token valide', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('username');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('❌ Doit refuser sans token', async () => {
    const res = await request(app)
      .get('/api/users/profile');

    expect(res.statusCode).toBe(401);
  });

  test('❌ Doit refuser avec token invalide', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer token_invalide_123');

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────
// TEST HEALTH CHECK
// ─────────────────────────────────────────
describe('GET /health', () => {
  test('✅ Doit retourner status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('user-service');
  });
});