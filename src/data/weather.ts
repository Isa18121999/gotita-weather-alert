import { useCallback, useEffect, useState } from 'react';
import { PERU_STATIONS, WeatherStation } from './stations';

// Render hosts only the frontend. The backend remains on AWS API Gateway.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'https://1v9e21ic97.execute-api.us-east-1.amazonaws.com/api').replace(/\/$/, '');
export type LiveStatus = 'cargando' | 'en-vivo' | 'sin-conexion';
const REFRESH_MS = 15 * 60 * 1000;

interface StationsResponse { stations: WeatherStation[]; source: string; generatedAt: string; }

async function fetchLiveStations(): Promise<WeatherStation[]> {
  const res = await fetch(`${API_URL}/weather/stations`);
  if (!res.ok) throw new Error(`API meteorológica respondió ${res.status}`);
  const data = await res.json() as StationsResponse;
  return data.stations;
}

export function useLiveStations() {
  const [stations, setStations] = useState<WeatherStation[]>(PERU_STATIONS);
  const [status, setStatus] = useState<LiveStatus>('cargando');
  const reload = useCallback(async () => {
    try { setStations(await fetchLiveStations()); setStatus('en-vivo'); }
    catch { setStatus(prev => prev === 'en-vivo' ? prev : 'sin-conexion'); }
  }, []);
  useEffect(() => { void reload(); const timer = setInterval(() => void reload(), REFRESH_MS); return () => clearInterval(timer); }, [reload]);
  return { stations, status, reload };
}

export interface DayRain { date: string; mm: number }
export interface StationOutlook { past: DayRain[]; forecast: DayRain[] }
export type OutlookStatus = 'cargando' | 'listo' | 'error';

export function useRainOutlook() {
  const [outlook, setOutlook] = useState<Record<string, StationOutlook>>({});
  const [status, setStatus] = useState<OutlookStatus>('cargando');
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/weather/outlook`);
      if (!res.ok) throw new Error();
      const data = await res.json() as { outlook: Record<string, StationOutlook> };
      setOutlook(data.outlook); setStatus('listo');
    } catch { setStatus(prev => prev === 'listo' ? prev : 'error'); }
  }, []);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), REFRESH_MS); return () => clearInterval(timer); }, [load]);
  return { outlook, status, reload: load };
}
