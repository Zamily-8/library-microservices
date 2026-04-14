const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globaux
app.use(cors());
app.use(express.json());

// Route de santé (health check) — utilisée par Docker
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'user-service' });
});

// Routes principales
app.use('/api/users', userRoutes);

// Connexion à MongoDB puis démarrage du serveur
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 User Service démarré sur le port ${PORT}`);
    });

    return server;
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    process.exit(1);
  }
};

// On démarre seulement si ce fichier est exécuté directement
// (pas lors des tests Jest)
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };