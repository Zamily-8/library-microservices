const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Mock axios pour simuler les appels aux autres services
jest.mock('axios');
const axios = require('axios');

// Mock RabbitMQ pour ne pas avoir besoin d'une vraie connexion
jest.mock('../src/utils/rabbitmq', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true)
}));

const { app, startServer } = require('../src/index');

let server;
let authToken;
let loanId;
const mockBookId = new mongoose.Types.ObjectId().toString();
const mockUserId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_loans';
  process.env.JWT_SECRET = 'test_secret_key';

  authToken = jwt.sign(
    { id: mockUserId, username: 'testuser', role: 'user' },
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
// TESTS EMPRUNT
// ─────────────────────────────────────────
describe('POST /api/loans/borrow', () => {

  test('✅ Doit créer un emprunt avec succès', async () => {
    // Simuler la réponse du Book Service
    axios.get.mockResolvedValueOnce({
      data: {
        book: {
          _id: mockBookId,
          title: 'Le Petit Prince',
          available: true,
          availableCopies: 2
        }
      }
    });

    // Simuler la mise à jour de disponibilité
    axios.patch.mockResolvedValueOnce({
      data: { book: { available: true } }
    });

    const res = await request(app)
      .post('/api/loans/borrow')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookId: mockBookId });

    expect(res.statusCode).toBe(201);
    expect(res.body.loan.status).toBe('active');
    expect(res.body.loan.bookTitle).toBe('Le Petit Prince');

    loanId = res.body.loan._id;
  });

  test('❌ Doit refuser si le livre est indisponible', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        book: {
          _id: mockBookId,
          title: 'Livre indispo',
          available: false,
          availableCopies: 0
        }
      }
    });

    const res = await request(app)
      .post('/api/loans/borrow')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookId: mockBookId });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('disponible');
  });

  test('❌ Doit refuser sans token', async () => {
    const res = await request(app)
      .post('/api/loans/borrow')
      .send({ bookId: mockBookId });

    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────
// TESTS MES EMPRUNTS
// ─────────────────────────────────────────
describe('GET /api/loans/my', () => {

  test('✅ Doit lister mes emprunts', async () => {
    const res = await request(app)
      .get('/api/loans/my')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.loans)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────
// TESTS RETOUR
// ─────────────────────────────────────────
describe('POST /api/loans/return/:loanId', () => {

  test('✅ Doit retourner un livre', async () => {
    axios.patch.mockResolvedValueOnce({
      data: { book: { available: true } }
    });

    const res = await request(app)
      .post(`/api/loans/return/${loanId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.loan.status).toBe('returned');
    expect(res.body.loan.returnedAt).toBeDefined();
  });

  test('❌ Doit refuser de retourner un livre déjà retourné', async () => {
    const res = await request(app)
      .post(`/api/loans/return/${loanId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('déjà été retourné');
  });

  test('❌ Doit retourner 404 pour un emprunt inexistant', async () => {
    const res = await request(app)
      .post('/api/loans/return/000000000000000000000000')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────
describe('GET /health', () => {
  test('✅ Doit retourner status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('loan-service');
  });
});