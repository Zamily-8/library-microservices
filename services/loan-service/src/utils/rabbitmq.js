const amqp = require('amqplib');

let channel = null;
const QUEUE_NAME = 'loan_events';

const connectRabbitMQ = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🐰 Tentative connexion RabbitMQ ${i + 1}/${retries}...`);
      const connection = await amqp.connect(
        process.env.RABBITMQ_URL || 'amqp://admin:password@rabbitmq:5672'
      );
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      console.log('✅ Connecté à RabbitMQ');

      connection.on('error', (err) => {
        console.error('❌ Erreur RabbitMQ:', err.message);
        channel = null;
        setTimeout(() => connectRabbitMQ(), 5000);
      });

      connection.on('close', () => {
        console.warn('⚠️ Connexion RabbitMQ fermée, reconnexion...');
        channel = null;
        setTimeout(() => connectRabbitMQ(), 5000);
      });

      return channel;
    } catch (error) {
      console.log(`⏳ RabbitMQ non disponible (${error.message}), attente 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  console.warn('⚠️ RabbitMQ indisponible après toutes les tentatives');
};

const publishEvent = async (eventType, data) => {
  if (!channel) {
    console.warn('⚠️ Pas de canal RabbitMQ, tentative reconnexion...');
    await connectRabbitMQ(3);
  }

  if (!channel) {
    console.warn('⚠️ Impossible de publier - RabbitMQ indisponible');
    return;
  }

  const message = JSON.stringify({
    eventType,
    data,
    timestamp: new Date().toISOString()
  });

  channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
  console.log(`📨 Événement publié: ${eventType}`);
};

module.exports = { connectRabbitMQ, publishEvent };