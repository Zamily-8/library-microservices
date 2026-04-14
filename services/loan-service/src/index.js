const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const loanRoutes = require('./routes/loanRoutes');
const { connectRabbitMQ } = require('./utils/rabbitmq');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'loan-service' });
});

app.use('/api/loans', loanRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Connexion RabbitMQ (non bloquante)
    await connectRabbitMQ();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Loan Service démarré sur le port ${PORT}`);
    });

    return server;
  } catch (error) {
    console.error('❌ Erreur de démarrage:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };