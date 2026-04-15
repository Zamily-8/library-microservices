# Image de base : Node.js version 20 légère (alpine = très petite taille)
FROM node:20-alpine

# Créer le dossier de travail dans le container
WORKDIR /app

# Copier D'ABORD les fichiers package.json (optimisation cache Docker)
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier tout le reste du code source
COPY src/ ./src/

# Exposer le port sur lequel tourne ce service
EXPOSE 3001

# Commande pour démarrer le service
CMD ["node", "src/index.js"]