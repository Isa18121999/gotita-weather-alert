import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WeatherStation } from '../data/stations';

export function PeruMap({ stations, onSelect }: { stations: WeatherStation[]; onSelect?: (station: WeatherStation) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current).setView([-9.2, -75.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    stations.forEach(station => {
      const hasObservedRisk = (station as any).riskObservation !== 'sin-datos';
      const color = !hasObservedRisk ? '#64748B' : station.riskLevel === 'ALTO' ? '#EF4444' : station.riskLevel === 'MEDIO' ? '#F59E0B' : '#22C55E';
      const marker = L.circleMarker([station.lat, station.lng], { radius: 8, color, fillColor: color, fillOpacity: 0.85 }).addTo(map);
      const rain = (station as any).precipitation24hMm;
      const rainLabel = rain == null ? 'Sin dato acumulado 24 h' : `Lluvia 24 h: ${Number(rain).toFixed(1)} mm`;
      marker.bindPopup(`<b>${station.name}</b><br/>${station.department}<br/>${rainLabel}<br/>Riesgo: ${hasObservedRisk ? station.riskLevel : 'Sin datos'}<br/>Fuente: ${station.source ?? 'No indicada'}`);
      marker.on('click', () => onSelect?.(station));
    });
    return () => { map.remove(); };
  }, [stations, onSelect]);
  return <div ref={ref} className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#BBDEFB]" />;
}
