const LEVEL_ORDER = { BAJO: 1, MEDIO: 2, ALTO: 3, EXTREMO: 4 };

function required(env, names) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing secrets: ${missing.join(", ")}`);
}

function basicAuth(username, password) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

async function kafkaRequest(env, baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl.replace(/\\/$/, "")}${path}`, {
    ...options,
    headers: {
      Authorization: basicAuth(env.KAFKA_USERNAME, env.KAFKA_PASSWORD),
      Accept: "application/vnd.kafka.json.v2+json",
      ...(options.body ? { "Content-Type": "application/vnd.kafka.json.v2+json" } : {}),
      ...(options.headers || {}),
    },
  });
  const raw = await response.text();
  let body = raw;
  try { body = raw ? JSON.parse(raw) : null; } catch { /* plain text error */ }
  if (!response.ok) {
    throw new Error(`Kafka REST ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

function recipients(env) {
  const list = (env.TWILIO_TO_NUMBERS || env.TWILIO_TO_NUMBER || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!list.length) throw new Error("Set TWILIO_TO_NUMBERS with E.164 phone numbers.");
  return [...new Set(list)];
}

function formatSystemMessage(alert) {
  const level = String(alert.nivel || "").toUpperCase();
  const type = String(alert.tipo || "Alerta meteorológica");
  const location = [alert.distrito, alert.provincia, alert.departamento].filter(Boolean).join(", ");
  const intro = {
    BAJO: "AVISO PREVENTIVO",
    MEDIO: "ALERTA MODERADA",
    ALTO: "ALERTA ALTA",
    EXTREMO: "ALERTA EXTREMA",
  }[level] || "ALERTA METEOROLÓGICA";

  const details = [
    `GÓTITA | ${intro}`,
    `Fenómeno: ${type}`,
    location ? `Zona: ${location}` : null,
    alert.mensaje ? String(alert.mensaje) : null,
    alert.fecha ? `Hora: ${alert.fecha}` : null,
    alert.fuente ? `Fuente: ${alert.fuente}` : null,
    "Mantente atento a los avisos de las autoridades.",
  ].filter(Boolean);
  return details.join("\n").slice(0, 1500);
}

async function sendSms(env, to, body) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams({
    From: env.TWILIO_FROM_NUMBER,
    To: to,
    Body: body,
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuth(env.TWILIO_API_KEY, env.TWILIO_API_SECRET),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Twilio ${response.status}: ${data.message || JSON.stringify(data)}`);
  }
  return data.sid;
}

function validAlert(value) {
  return value && typeof value === "object" &&
    value.tipo && value.nivel && value.departamento && value.mensaje &&
    LEVEL_ORDER[String(value.nivel).toUpperCase()];
}

async function runPoll(env) {
  required(env, [
    "KAFKA_REST_BASE_URL", "KAFKA_USERNAME", "KAFKA_PASSWORD",
    "KAFKA_TOPIC", "TWILIO_ACCOUNT_SID", "TWILIO_API_KEY",
    "TWILIO_API_SECRET", "TWILIO_FROM_NUMBER",
  ]);
  const toNumbers = recipients(env);
  const base = env.KAFKA_REST_BASE_URL.replace(/\\/$/, "");
  const group = env.KAFKA_CONSUMER_GROUP || "gotita-twilio-cloudflare";
  const minLevel = LEVEL_ORDER[String(env.TWILIO_MIN_LEVEL || "MEDIO").toUpperCase()] || 2;
  const instance = `gotita-cf-${Date.now()}-${crypto.randomUUID()}`;
  const createPath = `/consumers/${encodeURIComponent(group)}`;
  let consumerUrl;

  try {
    const created = await kafkaRequest(env, base, createPath, {
      method: "POST",
      body: JSON.stringify({
        name: instance,
        format: "json",
        "auto.offset.reset": env.KAFKA_AUTO_OFFSET_RESET || "latest",
        "auto.commit.enable": "false",
      }),
    });
    if (!created?.base_uri) throw new Error("Kafka REST did not return base_uri.");
    consumerUrl = new URL(created.base_uri, base).toString().replace(/\\/$/, "");

    await kafkaRequest(env, consumerUrl, "/subscription", {
      method: "POST",
      body: JSON.stringify({ topics: [env.KAFKA_TOPIC] }),
    });

    const records = await kafkaRequest(env, consumerUrl, "/records?timeout=1000", { method: "GET" });
    let sent = 0;
    let ignored = 0;

    for (const record of Array.isArray(records) ? records : []) {
      const alert = record?.value;
      if (!validAlert(alert)) {
        ignored++;
      } else if (LEVEL_ORDER[String(alert.nivel).toUpperCase()] >= minLevel) {
        const message = formatSystemMessage(alert);
        for (const to of toNumbers) {
          await sendSms(env, to, message);
          sent++;
        }
      } else {
        ignored++;
      }

      // Commit only after all sends for this record succeed.
      await kafkaRequest(env, consumerUrl, "/offsets", {
        method: "POST",
        body: JSON.stringify({
          offsets: [{ topic: record.topic, partition: record.partition, offset: record.offset + 1 }],
        }),
      });
    }
    return { received: Array.isArray(records) ? records.length : 0, sent, ignored };
  } finally {
    if (consumerUrl) {
      try { await kafkaRequest(env, consumerUrl, "", { method: "DELETE" }); }
      catch (error) { console.error("Kafka consumer cleanup failed:", error.message); }
    }
  }
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runPoll(env).then(
      (result) => console.log("GÓTITA scheduled poll completed", result),
      (error) => console.error("GÓTITA scheduled poll failed", error.message),
    ));
  },
  async fetch(request, env) {
    if (request.method === "GET" && new URL(request.url).pathname === "/health") {
      return Response.json({ ok: true, service: "gotita-kafka-twilio-worker" });
    }
    return new Response("Not found", { status: 404 });
  },
};
