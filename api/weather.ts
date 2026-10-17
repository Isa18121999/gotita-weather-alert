import { PERU_STATIONS, riskFor, UMBRAL_ROJO_MM, type WeatherStation } from '../src/data/stations.ts';
import { SENAMHI_STATIONS } from '../src/data/senamhiStations.ts';

const CACHE_MS = 10 * 60 * 1000;
const SENAMHI_COLLECTION = 'https://wis.senamhi.gob.pe/oapi/collections/urn%3Awmo%3Amd%3Ape-senamhi%3Asynop-hourly/items';
const queryCoords = () => `latitude=${PERU_STATIONS.map(s => s.lat).join(',')}&longitude=${PERU_STATIONS.map(s => s.lng).join(',')}`;
let cache: { at: number; stations: WeatherStation[]; source: string; note: string } | null = null;

type Observation = {
  station: WeatherStation;
  time: number;
  precipitation: number | null;
  temperature: number | null;
  windKmh: number | null;
};

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function getStationIdentifier(props: any): string | null {
  const candidates = [
    props?.wigos_station_identifier,
    props?.wigosStationIdentifier,
    props?.wigos_id,
    props?.wigosId,
  ];
  const found = candidates.find(value => value !== null && value !== undefined && String(value).trim() !== '');
  return found === undefined ? null : String(found).trim();
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

/**
 * Only an exact, explicitly configured WIGOS identifier can link an observation
 * to a GÓTITA station. We intentionally do not fuzzy-match short station codes
 * or assign the nearest station from coordinates.
 */
function findVerifiedStation(feature: any): WeatherStation | null {
  const identifier = normalize(getStationIdentifier(feature?.properties ?? {}));
  if (!identifier) return null;

  const match = SENAMHI_STATIONS.find(station =>
    station.verified &&
    station.wigosId !== null &&
    normalize(station.wigosId) === identifier
  );

  return match ? PERU_STATIONS.find(station => station.id === match.gotitaId) ?? null : null;
}

async function consultarSENAMHI(start: Date, end: Date): Promise<Observation[]> {
  const params = new URLSearchParams({
    f: 'json',
    bbox: '-82,-19,-68,0',
    datetime: `${start.toISOString()}/${end.toISOString()}`,
    limit: '1000',
  });

  const response = await fetch(`${SENAMHI_COLLECTION}?${params.toString()}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: 'application/geo+json, application/json' },
  });

  if (!response.ok) throw new Error(`SENAMHI WIS2 respondió ${response.status}`);

  const raw = await response.json();
  const features = Array.isArray(raw?.features) ? raw.features : [];
  const observations: Observation[] = [];

  for (const feature of features) {
    const station = findVerifiedStation(feature);
    if (!station) continue;

    const props = feature?.properties ?? {};
    const time = getTime(props);
    if (time === null) continue;

    observations.push({
      station,
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

  // Return only stations with an explicitly matched official observation.
  // Missing observations are not emitted as 0 mm or "BAJO".
  return PERU_STATIONS.flatMap(station => {
    const rows = (byStation.get(station.id) ?? []).sort((a, b) => a.time - b.time);
    if (rows.length === 0) return [];

    const latest = rows.at(-1)!;
    const rainRows = rows.filter(r => r.precipitation !== null);
    const within = (hours: number) => rainRows
      .filter(r => r.time >= now - hours * 60 * 60 * 1000)
      .reduce((sum, r) => sum + (r.precipitation ?? 0), 0);

    const hasRainObservation = rainRows.length > 0;
    const observed24h = hasRainObservation ? Math.round(within(24) * 10) / 10 : null;
    const latestRain = latest.precipitation;
    const riskRain = observed24h ?? latestRain;
    const stationWithObservedRisk = riskRain === null ? null : riskFor(riskRain);
    const senamhi = SENAMHI_STATIONS.find(item =>
      item.gotitaId === station.id && item.verified && item.wigosId
    );

    return [{
      ...station,
      // Extend fields at runtime while keeping compatibility with the existing model.
      precipitationMm: observed24h ?? station.precipitationMm,
      ...(stationWithObservedRisk ? { riskLevel: stationWithObservedRisk } : {}),
      thresholdRedMm: UMBRAL_ROJO_MM,
      updatedMinutesAgo: Math.max(0, Math.round((now - latest.time) / 60000)),
      current: {
        temperatureC: latest.temperature,
        precipitationMm: latestRain,
        rainMm: latestRain,
        windKmh: latest.windKmh,
        time: new Date(latest.time).toISOString(),
      },
      source: senamhi ? 'SENAMHI WIS2' : 'SENAMHI WIS2 · mapeo pendiente',
      ...({
        precipitation1hMm: rainRows.length ? Math.round(within(1) * 10) / 10 : null,
        precipitation6hMm: rainRows.length ? Math.round(within(6) * 10) / 10 : null,
        precipitation24hMm: observed24h,
        dataStatus: 'observado',
        wigosId: senamhi?.wigosId ?? null,
      } as any),
    } as WeatherStation];
  });
}

async function obtenerSENAMHI(): Promise<WeatherStation[] | null> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const observations = await consultarSENAMHI(start, end);
    if (!observations.length) return null;

    const official = buildOfficialStations(observations);
    return official.length ? official : null;
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
    const hasHourlyData = hourly.some((value: unknown) => numeric(value) !== null);
    const rain24 = hasHourlyData
      ? hourly.reduce((sum: number, value: number | null) => sum + (numeric(value) ?? 0), 0)
      : null;
    const currentTime = row?.current?.time ? new Date(row.current.time).getTime() : null;
    const currentRain = numeric(row?.current?.precipitation);

    return {
      ...station,
      precipitationMm: rain24 ?? station.precipitationMm,
      ...(rain24 === null ? {} : { riskLevel: riskFor(rain24) }),
      thresholdRedMm: UMBRAL_ROJO_MM,
      updatedMinutesAgo: currentTime === null ? null as any : Math.max(0, Math.round((Date.now() - currentTime) / 60000)),
      current: {
        temperatureC: numeric(row?.current?.temperature_2m),
        precipitationMm: currentRain,
        rainMm: numeric(row?.current?.rain),
        windKmh: numeric(row?.current?.wind_speed_10m),
        time: row?.current?.time ?? null,
      },
      source: 'Open-Meteo (respaldo)',
      ...({
        precipitation1hMm: currentRain,
        precipitation6hMm: null,
        precipitation24hMm: rain24 === null ? null : Math.round(rain24 * 10) / 10,
        dataStatus: rain24 === null ? 'sin-datos' : 'respaldo',
        wigosId: null,
      } as any),
    } as WeatherStation;
  });
}

async function obtenerLluvias() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;

  const official = await obtenerSENAMHI();
  if (official) {
    cache = {
      at: Date.now(),
      stations: official,
      source: 'SENAMHI WIS2',
      note: 'Solo se muestran observaciones con un WIGOS ID exacto y una correspondencia explícitamente verificada. Las estaciones sin observación no se devuelven como cero.',
    };
    return cache;
  }

  const fallback = await obtenerOpenMeteo();
  cache = {
    at: Date.now(),
    stations: fallback,
    source: 'Open-Meteo (respaldo)',
    note: 'SENAMHI WIS2 no proporcionó observaciones mapeadas de forma inequívoca. Estos valores provienen de Open-Meteo y no son observaciones de SENAMHI.',
  };
  return cache;
}

export async function obtenerEstaciones() {
  const data = await obtenerLluvias();
  return {
    stations: data.stations,
    source: data.source,
    generatedAt: new Date().toISOString(),
    note: data.note,
  };
}

export async function obtenerPronostico() {
  const url = `https://api.open-meteo.com/v1/forecast?${queryCoords()}&daily=precipitation_sum&past_days=30&forecast_days=4&timezone=America%2FLima`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);

  const raw = await res.json();
  const rows = Array.isArray(raw) ? raw : [raw];
  const result: Record<string, { past: { date: string; mm: number | null }[]; forecast: { date: string; mm: number | null }[] }> = {};

  PERU_STATIONS.forEach((station, i) => {
    const times: string[] = rows[i]?.daily?.time ?? [];
    const values: (number | null)[] = rows[i]?.daily?.precipitation_sum ?? [];
    const days = times.map((date, d) => ({ date, mm: values[d] ?? null }));
    result[station.id] = { past: days.slice(0, 30), forecast: days.slice(30) };
  });

  return {
    outlook: result,
    source: 'Open-Meteo',
    generatedAt: new Date().toISOString(),
    note: 'Pronóstico de respaldo; no sustituye los pronósticos oficiales de SENAMHI.',
  };
}

export async function responderWeather(ruta: string) {
  try {
    if (ruta.endsWith('/weather/stations')) {
      return { status: 200, body: JSON.stringify(await obtenerEstaciones()) };
    }
    if (ruta.endsWith('/weather/outlook')) {
      return { status: 200, body: JSON.stringify(await obtenerPronostico()) };
    }
    return { status: 404, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
  } catch (error) {
    return {
      status: 502,
      body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
}

export const handler = async (
  event: { rawPath?: string; requestContext?: { http?: { path?: string } } } = {},
) => {
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
