# GÓTITA — Cloudflare Kafka → Twilio Worker

This Worker is an alternative to a permanently running Render Background Worker. It polls the Aiven/Karapace Kafka REST Proxy once per minute using a Cron Trigger, sends system-managed SMS templates through Twilio, and commits each Kafka record only after all configured SMS recipients have been accepted by Twilio.

## Important behavior

- This is scheduled polling, **not a continuously connected Kafka consumer**. Delivery latency is typically up to one minute plus provider/network time.
- It uses a short-lived Kafka REST consumer and the `base_uri` returned by Kafka.
- Consumer group defaults to `gotita-twilio-cloudflare`.
- `KAFKA_AUTO_OFFSET_RESET` defaults to `latest` so the first deployment does not replay the entire historical topic. Set it to `earliest` only if replaying old messages is explicitly intended.
- `TWILIO_TO_NUMBERS` is a comma-separated list of E.164 destination numbers. For compatibility, `TWILIO_TO_NUMBER` is also accepted. This is a configured recipient list, not yet a lookup of all registered GÓTITA users.
- Twilio Trial accounts can send only to verified destination numbers and may append trial wording. Confirm account upgrade/verification and messaging permissions before production use.
- A rare failure after Twilio accepts an SMS but before Kafka offset commit can cause a duplicate on the next poll. Production-grade exactly-once SMS delivery needs an idempotency/outbox store and recipient registry.
- The worker ignores invalid records and records below `TWILIO_MIN_LEVEL` (default MEDIO), then commits them so they are not retried forever.

## Required Worker secrets/variables

Set these in Cloudflare Worker → Settings → Variables and Secrets. Use **Secret** for every credential.

| Name | Type |
|---|---|
| `KAFKA_REST_BASE_URL` | Secret or variable (REST proxy base URL returned by Aiven) |
| `KAFKA_USERNAME` | Secret |
| `KAFKA_PASSWORD` | Secret |
| `KAFKA_TOPIC` | Variable: `gotita-alertas` |
| `KAFKA_CONSUMER_GROUP` | Variable: `gotita-twilio-cloudflare` |
| `KAFKA_AUTO_OFFSET_RESET` | Variable: `latest` initially |
| `TWILIO_ACCOUNT_SID` | Secret |
| `TWILIO_API_KEY` | Secret |
| `TWILIO_API_SECRET` | Secret |
| `TWILIO_FROM_NUMBER` | Secret or variable, E.164 Twilio number |
| `TWILIO_TO_NUMBERS` | Secret: comma-separated E.164 recipients |
| `TWILIO_MIN_LEVEL` | Variable: `MEDIO` (BAJO, MEDIO, ALTO, EXTREMO) |

Never commit secrets to GitHub. Rotate any Twilio API key/secret that was exposed in screenshots.

## Deploy with Wrangler

From this directory:

```bash
npm install --save-dev wrangler
npx wrangler login
npx wrangler secret put KAFKA_REST_BASE_URL
npx wrangler secret put KAFKA_USERNAME
npx wrangler secret put KAFKA_PASSWORD
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_API_KEY
npx wrangler secret put TWILIO_API_SECRET
npx wrangler secret put TWILIO_FROM_NUMBER
npx wrangler secret put TWILIO_TO_NUMBERS
npx wrangler deploy
```

Set non-secret values in the Cloudflare dashboard or with `wrangler secret` only when appropriate. The Cron Trigger is configured in `wrangler.toml`.

## Validation before production

1. Confirm Aiven REST Proxy URL and credentials work with the REST v2 consumer API.
2. Confirm the topic's message shape matches the current GÓTITA alert contract: `tipo`, `nivel`, `departamento`, `mensaje`, optional `distrito`, `provincia`, `fecha`, `fuente`, and `id`.
3. Test with a verified Twilio recipient and a non-production Kafka topic/group first.
4. Verify Twilio delivery logs and Kafka committed offsets before enabling the production Cron Trigger.
5. Connect a real GÓTITA recipient registry before claiming all registered users receive SMS; this initial implementation uses the explicit recipient list above.
