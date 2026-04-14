const express = require('express');
const Book = require('../models/Book');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/books — Liste tous les livres
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, available } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    if (available !== undefined) {
      filter.available = available === 'true';
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json({ books, total: books.length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// GET /api/books/:id — Récupérer un livre par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    res.json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// POST /api/books — Créer un livre
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, author, isbn, description, totalCopies } = req.body;

    const book = await Book.create({
      title,
      author,
      isbn,
      description,
      totalCopies: totalCopies || 1,
      availableCopies: totalCopies || 1,
      available: true
    });

    res.status(201).json({ message: 'Livre créé avec succès', book });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Cet ISBN existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PUT /api/books/:id — Modifier un livre
router.put('/:id', authenticate, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    res.json({ message: 'Livre mis à jour', book });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// DELETE /api/books/:id — Supprimer un livre
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    res.json({ message: 'Livre supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// PATCH /api/books/:id/availability — Changer la disponibilité (appelé par Loan Service)
router.patch('/:id/availability', authenticate, async (req, res) => {
  try {
    const { action } = req.body; // 'borrow' ou 'return'
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }

    if (action === 'borrow') {
      if (book.availableCopies <= 0) {
        return res.status(400).json({ message: 'Aucune copie disponible' });
      }
      book.availableCopies -= 1;
      book.available = book.availableCopies > 0;
    } else if (action === 'return') {
      book.availableCopies = Math.min(book.availableCopies + 1, book.totalCopies);
      book.available = true;
    }

    await book.save();
    res.json({ message: `Livre ${action === 'borrow' ? 'emprunté' : 'retourné'}`, book });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;