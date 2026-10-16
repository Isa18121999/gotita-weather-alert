import { PERU_STATIONS, riskFor, UMBRAL_ROJO_MM, type WeatherStation } from '../src/data/stations.ts';

const CACHE_MS = 10 * 60 * 1000;
const SENAMHI_COLLECTION = 'https://wis.senamhi.gob.pe/oapi/collections/urn%3Awmo%3Amd%3Ape-senamhi%3Asynop-hourly/items';
const queryCoords = () => `latitude=${PERU_STATIONS.map(s => s.lat).join(',')}&longitude=${PERU_STATIONS.map(s => s.lng).join(',')}`;
let cache: { at: number; stations: WeatherStation[]; source: string } | null = null;

type Observation = { station: WeatherStation; time: number; precipitation: number | null; temperature: number | null; windKmh: number | null };

function numeric(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function nearestStation(lat: number, lng: number) {
  return PERU_STATIONS.reduce((best, station) => {
    const distance = Math.hypot(station.lat - lat, station.lng - lng);
    return distance < best.distance ? { station, distance } : best;
  }, { station: PERU_STATIONS[0], distance: Number.POSITIVE_INFINITY });
}

function getTime(props: any): number | null {
  const value = props?.datetime ?? props?.time ?? props?.observation_time ?? props?.date;
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function getPrecipitation(props: any): number | null {
  return numeric(props?.precipitation ?? props?.precipitation_amount ?? props?.precipitationAmount ?? props?.pr);
}

function getTemperature(props: any): number | null {
  return numeric(props?.temperature ?? props?.air_temperature ?? props?.t);
}

function getWindKmh(props: any): number | null {
  const mps = numeric(props?.wind_speed ?? props?.windSpeed ?? props?.ff);
  if (mps !== null) return Math.round(mps * 3.6 * 10) / 10;
  return numeric(props?.windKmh ?? props?.wind_kmh);
}

async function consultarSENAMHI(start: Date, end: Date): Promise<Observation[]> {
  const params = new URLSearchParams({
    f: 'json',
    bbox: '-82,-19,-68,0',
    datetime: `${start.toISOString()}/${end.toISOString()}`,
    limit: '1000',
  });
  const response = await fetch(`${SENAMHI_COLLECTION}?${params.toString()}`, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/geo+json, application/json' },
  });
  if (!response.ok) throw new Error(`SENAMHI WIS2 respondió ${response.status}`);
  const raw = await response.json();
  const features = Array.isArray(raw?.features) ? raw.features : [];
  const observations: Observation[] = [];

  for (const feature of features) {
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lng = numeric(coords[0]);
    const lat = numeric(coords[1]);
    if (lat === null || lng === null) continue;
    const match = nearestStation(lat, lng);
    // Evita asignar una observación oficial a una estación GÓTITA geográficamente distante.
    if (match.distance > 0.35) continue;
    const props = feature?.properties ?? {};
    const time = getTime(props);
    if (time === null) continue;
    observations.push({
      station: match.station,
      time,
      precipitation: getPrecipitation(props),
      temperature: getTemperature(props),
      windKmh: getWindKmh(props),
    });
  }
  return observations;
}

function buildOfficialStations(observations: Observation[]): WeatherStation[] {
  const byStation = new Map<string, Observation[]>();
  for (const observation of observations) {
    const list = byStation.get(observation.station.id) ?? [];
    list.push(observation);
    byStation.set(observation.station.id, list);
  }

  const now = Date.now();
  return PERU_STATIONS.map(station => {
    const rows = (byStation.get(station.id) ?? []).sort((a, b) => a.time - b.time);
    const latest = rows.at(-1);
    const rainRows = rows.filter(r => r.precipitation !== null);
    const rain1h = rainRows.filter(r => r.time >= now - 60 * 60 * 1000).reduce((sum, r) => sum + (r.precipitation ?? 0), 0);
    const rain6h = rainRows.filter(r => r.time >= now - 6 * 60 * 60 * 1000).reduce((sum, r) => sum + (r.precipitation ?? 0), 0);
    const rain24h = rainRows.filter(r => r.time >= now - 24 * 60 * 60 * 1000).reduce((sum, r) => sum + (r.precipitation ?? 0), 0);
    const observed24h = Math.round(rain24h * 10) / 10;
    const latestRain = latest?.precipitation ?? 0;
    const riskRain = observed24h > 0 ? observed24h : latestRain;
    return {
      ...station,
      precipitationMm: observed24h,
      riskLevel: riskFor(riskRain),
      thresholdRedMm: UMBRAL_ROJO_MM,
      updatedMinutesAgo: latest ? Math.max(0, Math.round((now - latest.time) / 60000)) : 0,
      current: {
        temperatureC: latest?.temperature ?? null,
        precipitationMm: latestRain,
        rainMm: latestRain,
        windKmh: latest?.windKmh ?? null,
        time: latest ? new Date(latest.time).toISOString() : null,
      },
      source: 'SENAMHI WIS2',
      // Campos extendidos consumidos por el dashboard sin alterar el contrato base.
      ...( { precipitation1hMm: Math.round(rain1h * 10) / 10, precipitation6hMm: Math.round(rain6h * 10) / 10, precipitation24hMm: observed24h } as any ),
    } as WeatherStation;
  });
}

async function obtenerSENAMHI(): Promise<WeatherStation[] | null> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const observations = await consultarSENAMHI(start, end);
    if (!observations.length) return null;
    return buildOfficialStations(observations);
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
    return { ...station, precipitationMm: Math.round(rain24 * 10) / 10, riskLevel: riskFor(rain24), thresholdRedMm: UMBRAL_ROJO_MM, updatedMinutesAgo: Math.max(0, Math.round((Date.now() - currentTime) / 60000)), current: { temperatureC: row?.current?.temperature_2m ?? null, precipitationMm: row?.current?.precipitation ?? null, rainMm: row?.current?.rain ?? null, windKmh: row?.current?.wind_speed_10m ?? null, time: row?.current?.time ?? null }, source: 'Open-Meteo (respaldo)', ...( { precipitation1hMm: row?.current?.precipitation ?? 0, precipitation6hMm: null, precipitation24hMm: Math.round(rain24 * 10) / 10 } as any ) } as WeatherStation;
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
  return {
    stations: data.stations,
    source: data.source,
    generatedAt: new Date().toISOString(),
    note: data.source === 'SENAMHI WIS2'
      ? 'Observaciones horarias consultadas desde SENAMHI WIS2 y agregadas a ventanas de 1 h, 6 h y 24 h. La coincidencia con GÓTITA se realiza por proximidad geográfica y solo dentro de 0.35 grados.'
      : 'No se pudo consultar SENAMHI WIS2; se utiliza Open-Meteo únicamente como respaldo de prototipo.',
  };
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
  return { statusCode: status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }, body };
};
