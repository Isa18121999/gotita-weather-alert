import { PERU_STATIONS, riskFor, UMBRAL_ROJO_MM, type WeatherStation, type NaturalRegion } from '../src/data/stations.ts';
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

function getStationIdentifier(props: any): string | null {
  const value = props?.wigos_station_identifier ?? props?.wigosStationIdentifier ?? props?.wigos_id ?? props?.wigosId;
  return value === null || value === undefined || String(value).trim() === ''
    ? null
    : String(value).trim().toUpperCase();
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

function getCoordinates(feature: any): { lat: number; lng: number } | null {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = numeric(coordinates[0]);
  const lat = numeric(coordinates[1]);
  return lat !== null && lng !== null ? { lat, lng } : null;
}

function regionFor(department: string, lat: number, lng: number): NaturalRegion {
  const coast = new Set(['Tumbes', 'Piura', 'Lambayeque', 'La Libertad', 'Áncash', 'Lima', 'Callao', 'Ica', 'Arequipa', 'Moquegua', 'Tacna']);
  const selva = new Set(['Amazonas', 'Loreto', 'San Martín', 'Ucayali', 'Madre de Dios']);
  if (coast.has(department)) return 'Costa';
  if (selva.has(department)) return 'Selva';
  if (lng < -75.5 && lat < -8.5) return 'Sierra';
  return 'Sierra';
}

/**
 * Creates a station from an actual SENAMHI WIS2 observation.
 * The WIGOS identifier and observation coordinates come from the official
 * observation feature; no fake/example station is introduced.
 */
function stationFromObservation(feature: any): WeatherStation | null {
  const props = feature?.properties ?? {};
  const wigosId = getStationIdentifier(props);
  const coordinates = getCoordinates(feature);
  if (!wigosId || !coordinates) return null;

  const catalog = SENAMHI_STATIONS.find(station => station.wigosId?.toUpperCase() === wigosId);
  const officialName = catalog?.name ?? String(props?.station_name ?? props?.stationName ?? wigosId);
  const department = catalog?.department ?? String(props?.department ?? props?.departamento ?? 'Perú');
  const matched = catalog?.gotitaId
    ? PERU_STATIONS.find(station => station.id === catalog.gotitaId)
    : null;

  return {
    ...(matched ?? {}),
    id: matched?.id ?? `senamhi-${wigosId}`,
    name: matched?.name ?? `Estación SENAMHI ${officialName}`,
    department: matched?.department ?? department,
    province: matched?.province ?? '—',
    region: matched?.region ?? regionFor(department, coordinates.lat, coordinates.lng),
    lat: matched?.lat ?? coordinates.lat,
    lng: matched?.lng ?? coordinates.lng,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: null,
    basin: matched?.basin ?? 'No especificada',
    thresholdRedMm: UMBRAL_ROJO_MM,
    senamhiCode: catalog?.code ?? null,
    senamhiName: officialName,
    senamhiVerified: true,
    senamhiType: catalog?.type ?? 'meteorologica',
    wigosId,
    dataStatus: 'observado',
    riskObservation: 'sin-datos',
  };
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
    const station = stationFromObservation(feature);
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
  return Array.from(byStation.values()).map(rows => {
    rows.sort((a, b) => a.time - b.time);
    const latest = rows.at(-1)!;
    const station = latest.station;
    const rainRows = rows.filter(row => row.precipitation !== null);
    const sumWithin = (hours: number) => rainRows
      .filter(row => row.time >= now - hours * 60 * 60 * 1000)
      .reduce((sum, row) => sum + (row.precipitation ?? 0), 0);
    const rain24 = rainRows.length ? Math.round(sumWithin(24) * 10) / 10 : null;
    const risk = rain24 === null ? 'BAJO' : riskFor(rain24);

    return {
      ...station,
      precipitationMm: rain24 ?? 0,
      riskLevel: risk,
      thresholdRedMm: UMBRAL_ROJO_MM,
      updatedMinutesAgo: Math.max(0, Math.round((now - latest.time) / 60000)),
      current: {
        temperatureC: latest.temperature,
        precipitationMm: latest.precipitation,
        rainMm: latest.precipitation,
        windKmh: latest.windKmh,
        time: new Date(latest.time).toISOString(),
      },
      source: 'SENAMHI WIS2',
      dataStatus: 'observado',
      precipitation1hMm: rainRows.length ? Math.round(sumWithin(1) * 10) / 10 : null,
      precipitation6hMm: rainRows.length ? Math.round(sumWithin(6) * 10) / 10 : null,
      precipitation24hMm: rain24,
      riskObservation: rain24 === null ? 'sin-datos' : 'observado',
    } as WeatherStation;
  });
}

async function obtenerSENAMHI(): Promise<WeatherStation[] | null> {
  try {
    const end = new Date();
    const observations = await consultarSENAMHI(new Date(end.getTime() - 24 * 60 * 60 * 1000), end);
    if (!observations.length) return null;
    const official = buildOfficialStations(observations);
    return official.length ? official : null;
  } catch {
    return null;
  }
}

async function obtenerOpenMeteo(): Promise<WeatherStation[]> {
  const url = `https://api.open-meteo.com/v1/forecast?${queryCoords()}&current=temperature_2m,precipitation,rain,wind_speed_10m&hourly=precipitation&past_hours=24&forecast_hours=0&timezone=America%2FLima`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Open-Meteo respondió ${response.status}`);
  const raw = await response.json();
  const rows = Array.isArray(raw) ? raw : [raw];
  return PERU_STATIONS.map((station, i) => {
    const row = rows[i];
    const hourly = Array.isArray(row?.hourly?.precipitation) ? row.hourly.precipitation : [];
    const validHourly = hourly.some((value: unknown) => numeric(value) !== null);
    const rain24 = validHourly ? hourly.reduce((sum: number, value: unknown) => sum + (numeric(value) ?? 0), 0) : null;
    const currentTime = row?.current?.time ? new Date(row.current.time).getTime() : null;
    const currentRain = numeric(row?.current?.precipitation);
    return {
      ...station,
      ...(rain24 === null ? {} : { precipitationMm: Math.round(rain24 * 10) / 10, riskLevel: riskFor(rain24) }),
      thresholdRedMm: UMBRAL_ROJO_MM,
      updatedMinutesAgo: currentTime === null ? null : Math.max(0, Math.round((Date.now() - currentTime) / 60000)),
      current: {
        temperatureC: numeric(row?.current?.temperature_2m),
        precipitationMm: currentRain,
        rainMm: numeric(row?.current?.rain),
        windKmh: numeric(row?.current?.wind_speed_10m),
        time: row?.current?.time ?? null,
      },
      source: 'Open-Meteo (respaldo)',
      dataStatus: rain24 === null ? 'sin-datos' : 'respaldo',
      precipitation1hMm: currentRain,
      precipitation6hMm: null,
      precipitation24hMm: rain24 === null ? null : Math.round(rain24 * 10) / 10,
      wigosId: null,
      riskObservation: rain24 === null ? 'sin-datos' : 'observado',
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
      note: 'Se muestran únicamente estaciones que tienen observaciones reales de SENAMHI WIS2. La ubicación proviene de la geometría de la observación y el WIGOS identifica la estación.',
    };
    return cache;
  }
  const fallback = await obtenerOpenMeteo();
  cache = {
    at: Date.now(),
    stations: fallback,
    source: 'Open-Meteo (respaldo)',
    note: 'No se encontraron observaciones SENAMHI disponibles en esta consulta. Los valores proceden de Open-Meteo y no son observaciones SENAMHI.',
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
    if (ruta.endsWith('/weather/stations')) return { status: 200, body: JSON.stringify(await obtenerEstaciones()) };
    if (ruta.endsWith('/weather/outlook')) return { status: 200, body: JSON.stringify(await obtenerPronostico()) };
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
