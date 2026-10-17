import { useCallback, useEffect, useState } from 'react';
import type { WeatherStation } from './stations';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'https://1v9e21ic97.execute-api.us-east-1.amazonaws.com/api').replace(/\/$/, '');
export type LiveStatus = 'cargando' | 'en-vivo' | 'sin-conexion';
const REFRESH_MS = 15 * 60 * 1000;
interface StationsResponse { stations: WeatherStation[]; source: string; generatedAt: string; note?: string; }

async function fetchLiveStations(): Promise<WeatherStation[]> {
  const response = await fetch(`${API_URL}/weather/stations`);
  if (!response.ok) throw new Error(`API meteorológica respondió ${response.status}`);
  const data = await response.json() as StationsResponse;
  return Array.isArray(data.stations) ? data.stations : [];
}

export function useLiveStations() {
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [status, setStatus] = useState<LiveStatus>('cargando');
  const reload = useCallback(async () => {
    try {
      setStations(await fetchLiveStations());
      setStatus('en-vivo');
    } catch {
      setStations([]);
      setStatus('sin-conexion');
    }
  }, []);
  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);
  return { stations, status, reload };
}

export interface DayRain { date: string; mm: number | null }
export interface StationOutlook { past: DayRain[]; forecast: DayRain[] }
export type OutlookStatus = 'cargando' | 'listo' | 'error';

export function useRainOutlook() {
  const [outlook, setOutlook] = useState<Record<string, StationOutlook>>({});
  const [status, setStatus] = useState<OutlookStatus>('cargando');
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/weather/outlook`);
      if (!response.ok) throw new Error('No se pudo consultar el pronóstico');
      const data = await response.json() as { outlook: Record<string, StationOutlook> };
      setOutlook(data.outlook);
      setStatus('listo');
    } catch {
      setStatus(previous => previous === 'listo' ? previous : 'error');
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);
  return { outlook, status, reload: load };
}
