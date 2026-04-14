const amqp = require('amqplib');

let channel = null;
const QUEUE_NAME = 'loan_events';

// Connexion à RabbitMQ avec retry automatique
const connectRabbitMQ = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      console.log('✅ Connecté à RabbitMQ');
      return channel;
    } catch (error) {
      console.log(`⏳ RabbitMQ non disponible, tentative ${i + 1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  console.warn('⚠️ RabbitMQ indisponible - les événements ne seront pas envoyés');
};

// Publier un événement dans la queue
const publishEvent = async (eventType, data) => {
  if (!channel) {
    console.warn('⚠️ Pas de connexion RabbitMQ, événement ignoré');
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