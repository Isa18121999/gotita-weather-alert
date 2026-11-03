import http from 'node:http';
import twilio from 'twilio';

const {
  KAFKA_REST_BASE_URL,
  KAFKA_USERNAME,
  KAFKA_PASSWORD,
  KAFKA_TOPIC = 'gotita-alertas',
  KAFKA_CONSUMER_GROUP = 'gotita-twilio',
  KAFKA_CONSUMER_NAME = 'gotita-twilio-consumer',
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_FROM_NUMBER,
  TWILIO_TO_NUMBER,
  TWILIO_MIN_LEVEL = 'MEDIO',
  PORT = '10000',
} = process.env;

const LEVEL_ORDER = { BAJO: 1, MEDIO: 2, ALTO: 3 };

const required = {
  KAFKA_REST_BASE_URL,
  KAFKA_USERNAME,
  KAFKA_PASSWORD,
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_FROM_NUMBER,
  TWILIO_TO_NUMBER,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length) {
  console.error(`Faltan variables de entorno: ${missing.join(', ')}`);
  process.exit(1);
}

const kafkaBase = KAFKA_REST_BASE_URL.replace(/\/$/, '');
const kafkaAuth = Buffer.from(`${KAFKA_USERNAME}:${KAFKA_PASSWORD}`).toString('base64');
const twilioClient = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, {
  accountSid: TWILIO_ACCOUNT_SID,
});

let consumerCreated = false;
let stopping = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function kafkaRequest(path, options = {}) {
  const response = await fetch(`${kafkaBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${kafkaAuth}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // La respuesta puede ser texto plano.
  }

  if (!response.ok) {
    const error = new Error(`Kafka REST ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function ensureConsumer() {
  const path = `/consumers/${encodeURIComponent(KAFKA_CONSUMER_GROUP)}`;
  const createBody = {
    name: KAFKA_CONSUMER_NAME,
    format: 'json',
    'auto.offset.reset': 'earliest',
    'auto.commit.enable': 'true',
  };

  try {
    await kafkaRequest(path, {
      method: 'POST',
      body: JSON.stringify(createBody),
    });
    console.log(`Kafka consumer creado: ${KAFKA_CONSUMER_GROUP}/${KAFKA_CONSUMER_NAME}`);
  } catch (error) {
    if (error.status !== 409) throw error;
    console.log(`Kafka consumer ya existe: ${KAFKA_CONSUMER_GROUP}/${KAFKA_CONSUMER_NAME}`);
  }

  consumerCreated = true;

  const subscriptionPath = `/consumers/${encodeURIComponent(KAFKA_CONSUMER_GROUP)}/instances/${encodeURIComponent(KAFKA_CONSUMER_NAME)}/subscription`;
  await kafkaRequest(subscriptionPath, {
    method: 'POST',
    body: JSON.stringify({ topics: [KAFKA_TOPIC] }),
  });
  console.log(`Suscrito al topic Kafka: ${KAFKA_TOPIC}`);
}

function normalizeAlert(value) {
  if (!value || typeof value !== 'object') return null;
  const alert = value;
  if (!alert.tipo || !alert.nivel || !alert.departamento || !alert.mensaje) return null;
  if (!LEVEL_ORDER[alert.nivel]) return null;
  return alert;
}

function shouldSendSms(alert) {
  const minimum = LEVEL_ORDER[TWILIO_MIN_LEVEL] ?? LEVEL_ORDER.MEDIO;
  return LEVEL_ORDER[alert.nivel] >= minimum;
}

function buildSms(alert) {
  const location = [alert.distrito, alert.provincia, alert.departamento]
    .filter(Boolean)
    .join(', ');
  const parts = [
    `GÓTITA ${alert.nivel}: ${alert.tipo}`,
    location ? `Lugar: ${location}` : null,
    alert.mensaje,
    alert.fuente ? `Fuente: ${alert.fuente}` : null,
  ].filter(Boolean);

  return parts.join('\n').slice(0, 1500);
}

async function processRecord(record) {
  const alert = normalizeAlert(record?.value);
  if (!alert) {
    console.warn('Mensaje Kafka ignorado: no tiene formato de alerta GÓTITA.', record);
    return;
  }

  if (!shouldSendSms(alert)) {
    console.log(`Alerta ${alert.id ?? 'sin-id'} (${alert.nivel}) registrada; no requiere SMS.`);
    return;
  }

  const message = await twilioClient.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: TWILIO_TO_NUMBER,
    body: buildSms(alert),
  });

  console.log('SMS enviado por Twilio', {
    alertId: alert.id,
    nivel: alert.nivel,
    messageSid: message.sid,
  });
}

async function consumeLoop() {
  const recordsPath = `/consumers/${encodeURIComponent(KAFKA_CONSUMER_GROUP)}/instances/${encodeURIComponent(KAFKA_CONSUMER_NAME)}/records?timeout=10000`;

  while (!stopping) {
    try {
      const records = await kafkaRequest(recordsPath, { method: 'GET' });
      if (Array.isArray(records)) {
        for (const record of records) {
          await processRecord(record);
        }
      }
    } catch (error) {
      console.error('Error consumiendo Kafka:', error?.status ?? error?.message ?? error);
      await sleep(5000);
      if (!consumerCreated && !stopping) {
        await ensureConsumer();
      }
    }
  }
}

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Recibido ${signal}. Cerrando consumidor...`);

  if (consumerCreated) {
    const path = `/consumers/${encodeURIComponent(KAFKA_CONSUMER_GROUP)}/instances/${encodeURIComponent(KAFKA_CONSUMER_NAME)}`;
    try {
      await kafkaRequest(path, { method: 'DELETE' });
    } catch (error) {
      console.warn('No se pudo eliminar el consumer de Kafka:', error?.status ?? error?.message ?? error);
    }
  }

  process.exit(0);
}

const server = http.createServer((request, response) => {
  if (request.url === '/health' || request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'gotita-twilio-consumer' }));
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Health server escuchando en ${PORT}`);
});

process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));

try {
  await ensureConsumer();
  await consumeLoop();
} catch (error) {
  console.error('No se pudo iniciar el consumidor GÓTITA:', error?.body ?? error?.message ?? error);
  process.exit(1);
}
