const express = require('express');
const axios = require('axios');
const Loan = require('../models/Loan');
const { authenticate } = require('../middleware/auth');
const { publishEvent } = require('../utils/rabbitmq');

const router = express.Router();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const BOOK_SERVICE_URL = process.env.BOOK_SERVICE_URL || 'http://book-service:3002';

// POST /api/loans/borrow — Emprunter un livre
router.post('/borrow', authenticate, async (req, res) => {
  try {
    const { bookId } = req.body;
    const token = req.headers.authorization;

    // 1. Vérifier que le livre existe et est disponible
    const bookResponse = await axios.get(
      `${BOOK_SERVICE_URL}/api/books/${bookId}`,
      { headers: { Authorization: token } }
    );
    const book = bookResponse.data.book;

    if (!book.available) {
      return res.status(400).json({ message: 'Ce livre n\'est pas disponible' });
    }

    // 2. Vérifier que l'utilisateur n'a pas déjà emprunté ce livre
    const existingLoan = await Loan.findOne({
      userId: req.user.id,
      bookId,
      status: 'active'
    });
    if (existingLoan) {
      return res.status(400).json({ message: 'Vous avez déjà emprunté ce livre' });
    }

    // 3. Mettre à jour la disponibilité du livre
    await axios.patch(
      `${BOOK_SERVICE_URL}/api/books/${bookId}/availability`,
      { action: 'borrow' },
      { headers: { Authorization: token } }
    );

    // 4. Créer l'emprunt
    const loan = await Loan.create({
      userId: req.user.id,
      bookId,
      bookTitle: book.title,
      username: req.user.username
    });

    // 5. Publier un événement RabbitMQ (asynchrone, non bloquant)
    await publishEvent('BOOK_BORROWED', {
      loanId: loan._id,
      userId: req.user.id,
      username: req.user.username,
      bookId,
      bookTitle: book.title,
      dueDate: loan.dueDate
    });

    res.status(201).json({
      message: 'Livre emprunté avec succès',
      loan
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/loans/return/:loanId — Retourner un livre
router.post('/return/:loanId', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization;

    // 1. Trouver l'emprunt
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Emprunt non trouvé' });
    }
    if (loan.userId !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    if (loan.status === 'returned') {
      return res.status(400).json({ message: 'Ce livre a déjà été retourné' });
    }

    // 2. Remettre le livre disponible
    await axios.patch(
      `${BOOK_SERVICE_URL}/api/books/${loan.bookId}/availability`,
      { action: 'return' },
      { headers: { Authorization: token } }
    );

    // 3. Mettre à jour l'emprunt
    loan.status = 'returned';
    loan.returnedAt = new Date();
    await loan.save();

    // 4. Publier l'événement RabbitMQ
    await publishEvent('BOOK_RETURNED', {
      loanId: loan._id,
      userId: req.user.id,
      username: req.user.username,
      bookId: loan.bookId,
      bookTitle: loan.bookTitle,
      returnedAt: loan.returnedAt
    });

    res.json({ message: 'Livre retourné avec succès', loan });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/loans/my — Mes emprunts
router.get('/my', authenticate, async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ loans, total: loans.length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/loans — Tous les emprunts (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const loans = await Loan.find().sort({ createdAt: -1 });
    res.json({ loans, total: loans.length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;