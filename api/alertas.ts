type AlertLevel = 'ALTO' | 'MEDIO' | 'BAJO';

type AlertPayload = {
  id?: string;
  tipo: string;
  nivel: AlertLevel;
  departamento: string;
  provincia?: string;
  distrito?: string;
  mensaje: string;
  fuente: string;
  timestamp?: string;
  [key: string]: unknown;
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-gotita-alert-token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  },
  body: JSON.stringify(body),
});

const getBody = (event: any): AlertPayload | null => {
  if (!event?.body) return null;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const validateAlert = (alert: AlertPayload | null) => {
  if (!alert) return 'El cuerpo de la solicitud debe ser JSON válido.';
  if (!alert.tipo || !alert.nivel || !alert.departamento || !alert.mensaje || !alert.fuente) {
    return 'Faltan campos obligatorios: tipo, nivel, departamento, mensaje y fuente.';
  }
  if (!['ALTO', 'MEDIO', 'BAJO'].includes(alert.nivel)) {
    return 'nivel debe ser ALTO, MEDIO o BAJO.';
  }
  return null;
};

export const handler = async (event: any) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') return json(204, {});

  const expectedToken = process.env.ALERT_PUBLISH_TOKEN;
  const receivedToken = event?.headers?.['x-gotita-alert-token'] ?? event?.headers?.['X-Gotita-Alert-Token'];

  if (!expectedToken) {
    console.error('ALERT_PUBLISH_TOKEN no está configurado. Publicación bloqueada.');
    return json(503, { error: 'Publicador de alertas no configurado.' });
  }

  if (receivedToken !== expectedToken) {
    return json(401, { error: 'No autorizado.' });
  }

  const alert = getBody(event);
  const validationError = validateAlert(alert);
  if (validationError) return json(400, { error: validationError });

  const baseUrl = process.env.KAFKA_REST_BASE_URL?.replace(/\/$/, '');
  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;
  const topic = process.env.KAFKA_TOPIC || 'gotita-alertas';

  if (!baseUrl || !username || !password) {
    console.error('Configuración Kafka incompleta.');
    return json(503, { error: 'Kafka no está configurado en esta Lambda.' });
  }

  const enrichedAlert = {
    ...alert,
    id: alert.id || `alerta-${Date.now()}`,
    timestamp: alert.timestamp || new Date().toISOString(),
    sistema: 'GÓTITA',
  };

  const kafkaUrl = `${baseUrl}/topics/${encodeURIComponent(topic)}/produce`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const response = await fetch(kafkaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: 'json',
        records: [{ value: enrichedAlert }],
      }),
    });

    const text = await response.text();
    let kafkaBody: unknown = text;
    try { kafkaBody = JSON.parse(text); } catch { /* respuesta no JSON */ }

    if (!response.ok) {
      console.error('Kafka REST error', response.status, kafkaBody);
      return json(502, {
        error: 'Kafka rechazó la alerta.',
        kafkaStatus: response.status,
      });
    }

    console.info('Alerta publicada en Kafka', {
      topic,
      alertId: enrichedAlert.id,
      nivel: enrichedAlert.nivel,
    });

    return json(202, {
      ok: true,
      message: 'Alerta publicada en Kafka.',
      topic,
      alert: enrichedAlert,
      kafka: kafkaBody,
    });
  } catch (error) {
    console.error('No se pudo conectar con Kafka', error);
    return json(502, { error: 'No se pudo conectar con Kafka.' });
  }
};
