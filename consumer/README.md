# GÓTITA — consumidor Kafka → Twilio

Este proceso consume el topic `gotita-alertas` de Apache Kafka (Aiven) y envía SMS mediante Twilio.

## Flujo

`/api/alertas` → Aiven Kafka (`gotita-alertas`) → `consumer/twilio-consumer.mjs` → Twilio SMS

El consumidor usa Kafka REST/Karapace para crear un consumer, suscribirse al topic y consumir mensajes por HTTP. Aiven documenta este flujo con creación de consumer, suscripción y consumo mediante REST.

## Variables de entorno

Configúralas únicamente en el servicio donde se ejecute el consumidor. **No las subas a GitHub y no las envíes por el chat.**

### Kafka

- `KAFKA_REST_BASE_URL` — URL base del Kafka REST de Aiven.
- `KAFKA_USERNAME` — usuario del servicio Kafka.
- `KAFKA_PASSWORD` — contraseña del servicio Kafka.
- `KAFKA_TOPIC` — por defecto `gotita-alertas`.
- `KAFKA_CONSUMER_GROUP` — por defecto `gotita-twilio`.
- `KAFKA_CONSUMER_NAME` — por defecto `gotita-twilio-consumer`.

### Twilio

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY`
- `TWILIO_API_SECRET`
- `TWILIO_FROM_NUMBER` — número/remitente habilitado en Twilio.
- `TWILIO_TO_NUMBER` — número que recibirá las alertas.
- `TWILIO_MIN_LEVEL` — por defecto `MEDIO`; acepta `BAJO`, `MEDIO` o `ALTO`.

`ALTO` y `MEDIO` generan SMS con la configuración por defecto. `BAJO` queda registrado en el consumidor sin enviar SMS.

## Ejecución

```bash
npm install
npm run consumer
```

El proceso expone `/health` para comprobar que el servicio está vivo.

## Seguridad

Las credenciales de Aiven y Twilio deben mantenerse como variables de entorno/secretos del proveedor de hosting. Nunca deben quedar en `package.json`, el código fuente, `.env` versionado o mensajes de commit.
