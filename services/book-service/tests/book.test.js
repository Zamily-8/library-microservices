const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { app, startServer } = require('../src/index');

let server;
let authToken;
let createdBookId;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_books';
  process.env.JWT_SECRET = 'test_secret_key';

  // Créer un token JWT de test directement (sans passer par User Service)
  authToken = jwt.sign(
    { id: 'test_user_id', username: 'testuser', role: 'user' },
    'test_secret_key',
    { expiresIn: '1h' }
  );

  server = await startServer();
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (server) server.close();
}, 30000);

// ─────────────────────────────────────────
// TESTS CRÉATION DE LIVRE
// ─────────────────────────────────────────
describe('POST /api/books', () => {

  test('✅ Doit créer un nouveau livre', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Le Petit Prince',
        author: 'Antoine de Saint-Exupéry',
        isbn: '978-2-07-040850-4',
        description: 'Un classique de la littérature',
        totalCopies: 3
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.book.title).toBe('Le Petit Prince');
    expect(res.body.book.available).toBe(true);
    expect(res.body.book.availableCopies).toBe(3);

    createdBookId = res.body.book._id;
  });

  test('❌ Doit refuser sans token', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'Test', author: 'Auteur' });

    expect(res.statusCode).toBe(401);
  });

  test('❌ Doit refuser un ISBN en double', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Autre livre',
        author: 'Auteur',
        isbn: '978-2-07-040850-4'
      });

    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────
// TESTS LECTURE DES LIVRES
// ─────────────────────────────────────────
describe('GET /api/books', () => {

  test('✅ Doit lister tous les livres', async () => {
    const res = await request(app)
      .get('/api/books')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('books');
    expect(Array.isArray(res.body.books)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('✅ Doit récupérer un livre par ID', async () => {
    const res = await request(app)
      .get(`/api/books/${createdBookId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.book._id).toBe(createdBookId);
  });

  test('❌ Doit retourner 404 pour un ID inexistant', async () => {
    const res = await request(app)
      .get('/api/books/000000000000000000000000')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────
// TESTS MODIFICATION
// ─────────────────────────────────────────
describe('PUT /api/books/:id', () => {

  test('✅ Doit modifier un livre', async () => {
    const res = await request(app)
      .put(`/api/books/${createdBookId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'Description mise à jour' });

    expect(res.statusCode).toBe(200);
    expect(res.body.book.description).toBe('Description mise à jour');
  });
});

// ─────────────────────────────────────────
// TESTS DISPONIBILITÉ
// ─────────────────────────────────────────
describe('PATCH /api/books/:id/availability', () => {

  test('✅ Doit marquer un livre comme emprunté', async () => {
    const res = await request(app)
      .patch(`/api/books/${createdBookId}/availability`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'borrow' });

    expect(res.statusCode).toBe(200);
    expect(res.body.book.availableCopies).toBe(2);
  });

  test('✅ Doit marquer un livre comme retourné', async () => {
    const res = await request(app)
      .patch(`/api/books/${createdBookId}/availability`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ action: 'return' });

    expect(res.statusCode).toBe(200);
    expect(res.body.book.availableCopies).toBe(3);
  });
});

// ─────────────────────────────────────────
// TESTS SUPPRESSION
// ─────────────────────────────────────────
describe('DELETE /api/books/:id', () => {

  test('✅ Doit supprimer un livre', async () => {
    const res = await request(app)
      .delete(`/api/books/${createdBookId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('supprimé');
  });
});

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
describe('GET /health', () => {
  test('✅ Doit retourner status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('book-service');
  });
});