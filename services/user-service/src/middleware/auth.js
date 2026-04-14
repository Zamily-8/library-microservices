const jwt = require('jsonwebtoken');

// Ce middleware vérifie que le token JWT est valide
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // On attache les infos user à la requête
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token expiré ou invalide' });
  }
};

module.exports = { authenticate };