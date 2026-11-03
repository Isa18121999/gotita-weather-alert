import http from 'node:http';
import twilio from 'twilio';

const {
  KAFKA_REST_BASE_URL,
  KAFKA_USERNAME,
  KAFKA_PASSWORD,
  KAFKA_TOPIC = 'gotita-alertas',
  KAFKA_CONSUMER_GROUP = 'gotita-twilio',
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

let consumerBaseUrl = null;
let stopping = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function kafkaRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${kafkaAuth}`,
      Accept: 'application/vnd.kafka.json.v2+json',
      ...(options.body ? { 'Content-Type': 'application/vnd.kafka.json.v2+json' } : {}),
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

async function createConsumer() {
  const consumerName = `gotita-twilio-${Date.now()}-${process.pid}`;
  const path = `/consumers/${encodeURIComponent(KAFKA_CONSUMER_GROUP)}`;
  const createBody = {
    name: consumerName,
    format: 'json',
    'auto.offset.reset': 'earliest',
    'auto.commit.enable': 'true',
  };

  const created = await kafkaRequest(kafkaBase, path, {
    method: 'POST',
    body: JSON.stringify(createBody),
  });

  const baseUri = created?.base_uri;
  if (!baseUri) {
    throw new Error('Kafka no devolvió base_uri para el consumer.');
  }

  consumerBaseUrl = new URL(baseUri, kafkaBase).toString().replace(/\/$/, '');
  console.log(`Kafka consumer creado: ${consumerName}`);

  await kafkaRequest(consumerBaseUrl, '/subscription', {
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
  while (!stopping) {
    try {
      const records = await kafkaRequest(consumerBaseUrl, '/records?timeout=10000', {
        method: 'GET',
      });

      if (Array.isArray(records)) {
        for (const record of records) {
          await processRecord(record);
        }
      }
    } catch (error) {
      console.error('Error consumiendo Kafka:', error?.status ?? error?.message ?? error);
      await sleep(5000);

      if (!stopping) {
        try {
          await createConsumer();
        } catch (recoveryError) {
          console.error('No se pudo recrear el consumer Kafka:', recoveryError?.body ?? recoveryError?.message ?? recoveryError);
        }
      }
    }
  }
}

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Recibido ${signal}. Cerrando consumidor...`);

  if (consumerBaseUrl) {
    try {
      await kafkaRequest(consumerBaseUrl, '', { method: 'DELETE' });
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
  await createConsumer();
  await consumeLoop();
} catch (error) {
  console.error('No se pudo iniciar el consumidor GÓTITA:', error?.body ?? error?.message ?? error);
  process.exit(1);
}
