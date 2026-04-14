const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'L\'ID utilisateur est obligatoire']
  },
  bookId: {
    type: String,
    required: [true, 'L\'ID du livre est obligatoire']
  },
  bookTitle: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'returned'],
    default: 'active'
  },
  borrowedAt: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // +14 jours
  },
  returnedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Loan', loanSchema);