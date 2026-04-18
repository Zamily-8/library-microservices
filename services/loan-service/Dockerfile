FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src/ ./src/
COPY tests/ ./tests/

EXPOSE 3003

CMD ["node", "src/index.js"]