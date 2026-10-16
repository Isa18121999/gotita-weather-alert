import { PERU_STATIONS, riskFor, UMBRAL_ROJO_MM, type WeatherStation } from '../src/data/stations.ts';

const CACHE_MS = 10 * 60 * 1000;
let cache: { at: number; stations: WeatherStation[]; source: string } | null = null;
const queryCoords = () => `latitude=${PERU_STATIONS.map(s => s.lat).join(',')}&longitude=${PERU_STATIONS.map(s => s.lng).join(',')}`;
const SENAMHI_WIS = 'https://wis.senamhi.gob.pe/oapi/collections/urn%3Awmo%3Amd%3Ape-senamhi%3Asynop-hourly/items?f=json&bbox=-82,-19,-68,0&limit=100';

function nearestStation(lat: number, lng: number) {
  return PERU_STATIONS.reduce((best, station) => {
    const distance = Math.hypot(station.lat - lat, station.lng - lng);
    return distance < best.distance ? { station, distance } : best;
  }, { station: PERU_STATIONS[0], distance: Number.POSITIVE_INFINITY });
}

function numeric(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

async function obtenerSENAMHI(): Promise<WeatherStation[] | null> {
  try {
    const response = await fetch(SENAMHI_WIS, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const raw = await response.json();
    const features = Array.isArray(raw?.features) ? raw.features : [];
    if (!features.length) return null;

    const latest = new Map<string, { temperature: number | null; precipitation: number | null; time: string | null }>();
    for (const feature of features) {
      const coords = feature?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lng = numeric(coords[0]);
      const lat = numeric(coords[1]);
      if (lat === null || lng === null) continue;
      const match = nearestStation(lat, lng);
      if (match.distance > 1.25) continue;
      const props = feature?.properties ?? {};
      const time = props.datetime ?? props.time ?? props.observation_time ?? null;
      const previous = latest.get(match.station.id);
      if (previous && previous.time && time && new Date(previous.time).getTime() >= new Date(time).getTime()) continue;
      latest.set(match.station.id, {
        temperature: numeric(props.temperature ?? props.air_temperature ?? props.t),
        precipitation: numeric(props.precipitation ?? props.precipitation_amount ?? props.pr),
        time,
      });
    }
    if (!latest.size) return null;

    return PERU_STATIONS.map(station => {
      const obs = latest.get(station.id);
      const rain = obs?.precipitation ?? 0;
      return {
        ...station,
        precipitationMm: Math.round(rain * 10) / 10,
        riskLevel: riskFor(rain),
        thresholdRedMm: UMBRAL_ROJO_MM,
        updatedMinutesAgo: obs?.time ? Math.max(0, Math.round((Date.now() - new Date(obs.time).getTime()) / 60000)) : 0,
        current: { temperatureC: obs?.temperature ?? null, precipitationMm: obs?.precipitation ?? null, rainMm: obs?.precipitation ?? null, windKmh: null, time: obs?.time ?? null },
        source: 'SENAMHI WIS2',
      } as WeatherStation;
    });
  } catch {
    return null;
  }
}

async function obtenerOpenMeteo(): Promise<WeatherStation[]> {
  const url = `https://api.open-meteo.com/v1/forecast?${queryCoords()}&current=temperature_2m,precipitation,rain,wind_speed_10m&hourly=precipitation&past_hours=24&forecast_hours=0&timezone=America%2FLima`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : [raw];
  return PERU_STATIONS.map((station, i) => {
    const row = rows[i];
    const hourly = Array.isArray(row?.hourly?.precipitation) ? row.hourly.precipitation : [];
    const rain24 = hourly.reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
    const currentTime = row?.current?.time ? new Date(row.current.time).getTime() : Date.now();
    return { ...station, precipitationMm: Math.round(rain24 * 10) / 10, riskLevel: riskFor(rain24), thresholdRedMm: UMBRAL_ROJO_MM, updatedMinutesAgo: Math.max(0, Math.round((Date.now() - currentTime) / 60000)), current: { temperatureC: row?.current?.temperature_2m ?? null, precipitationMm: row?.current?.precipitation ?? null, rainMm: row?.current?.rain ?? null, windKmh: row?.current?.wind_speed_10m ?? null, time: row?.current?.time ?? null }, source: 'Open-Meteo (respaldo)' } as WeatherStation;
  });
}

async function obtenerLluvias() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const official = await obtenerSENAMHI();
  if (official) { cache = { at: Date.now(), stations: official, source: 'SENAMHI WIS2' }; return cache; }
  const fallback = await obtenerOpenMeteo();
  cache = { at: Date.now(), stations: fallback, source: 'Open-Meteo (respaldo)' };
  return cache;
}

export async function obtenerEstaciones() {
  const data = await obtenerLluvias();
  return { stations: data.stations, source: data.source, generatedAt: new Date().toISOString(), note: data.source === 'SENAMHI WIS2' ? 'Observaciones consultadas desde el servicio WIS de SENAMHI. La coincidencia se realiza por proximidad a las estaciones de GÓTITA.' : 'No se pudo consultar SENAMHI WIS2; se utiliza Open-Meteo únicamente como respaldo de prototipo.' };
}

export async function obtenerPronostico() {
  const url = `https://api.open-meteo.com/v1/forecast?${queryCoords()}&daily=precipitation_sum&past_days=30&forecast_days=4&timezone=America%2FLima`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const raw = await res.json(); const rows = Array.isArray(raw) ? raw : [raw];
  const result: Record<string, { past: { date: string; mm: number }[]; forecast: { date: string; mm: number }[] }> = {};
  PERU_STATIONS.forEach((station, i) => { const times: string[] = rows[i]?.daily?.time ?? []; const values: (number | null)[] = rows[i]?.daily?.precipitation_sum ?? []; const days = times.map((date, d) => ({ date, mm: values[d] ?? 0 })); result[station.id] = { past: days.slice(0, 30), forecast: days.slice(30) }; });
  return { outlook: result, source: 'Open-Meteo', generatedAt: new Date().toISOString(), note: 'Pronóstico de respaldo; no sustituye los pronósticos oficiales de SENAMHI.' };
}

export async function responderWeather(ruta: string) {
  try {
    if (ruta.endsWith('/weather/stations')) return { status: 200, body: JSON.stringify(await obtenerEstaciones()) };
    if (ruta.endsWith('/weather/outlook')) return { status: 200, body: JSON.stringify(await obtenerPronostico()) };
    return { status: 404, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
  } catch (error) {
    return { status: 502, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
  }
}

export const handler = async (event: { rawPath?: string; requestContext?: { http?: { path?: string } } } = {}) => {
  const ruta = event.rawPath ?? event.requestContext?.http?.path ?? '/api/weather/stations';
  const { status, body } = await responderWeather(ruta);
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
    body,
  };
};
