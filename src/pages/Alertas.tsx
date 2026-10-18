import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCw, Search, MapPin } from 'lucide-react';
import type { WeatherStation } from '../data/stations';
import { API_URL } from '../data/weather';

type IndeciFeature = { properties?: { IDE_SINPAD?: string | number; FENOMENO?: string; DES_GRUPAL_FENOMENO?: string; DEPARTAMENTO?: string; PROVINCIA?: string; DISTRITO?: string; REGION?: string; FECHA?: string } };

export function AlertasPage({ stations, onViewStationOnMap, onRefreshStations, dataStatus }: {
  stations: WeatherStation[]; dataStatus: string; onRefreshStations: () => void; onViewStationOnMap: (s: WeatherStation) => void;
}) {
  const [features, setFeatures] = useState<IndeciFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('Todas');
  const [historySearch, setHistorySearch] = useState('');
  const loadIndeci = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/indeci/emergencias`);
      if (!response.ok) throw new Error('No se pudo consultar INDECI');
      const json = await response.json();
      setFeatures(json.features ?? []);
    } catch { setFeatures([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadIndeci(); }, []);
  const filteredIndeci = useMemo(() => features.filter(feature => {
    const p = feature.properties || {};
    const q = `${p.FENOMENO || ''} ${p.DEPARTAMENTO || ''} ${p.PROVINCIA || ''} ${p.DISTRITO || ''}`.toLowerCase();
    const regionOk = region === 'Todas' || String(p.REGION || '').toLowerCase() === region.toLowerCase();
    return regionOk && (!search || q.includes(search.toLowerCase()));
  }), [features, search, region]);
  const stationAlerts = stations.filter(s => s.riskLevel !== 'BAJO' && s.riskObservation !== 'sin-datos');
  const exportCsv = () => {
    const rows = [['Fecha', 'Región', 'Tipo de alerta', 'Fuente'], ...filteredIndeci.map(feature => {
      const p = feature.properties || {};
      return [p.FECHA || 'Sin fecha', `${p.DEPARTAMENTO || ''} · ${p.PROVINCIA || ''}`, p.FENOMENO || 'Emergencia hidrometeorológica', 'INDECI SINPAD'];
    })];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gotita-alertas-indeci.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  return <section className="max-w-6xl mx-auto px-5 py-10">
    <div className="rounded-3xl bg-gradient-to-r from-[#421d1d] to-[#8b2c24] text-white p-7"><p className="text-red-300 text-sm font-bold tracking-widest">⚠ AVISOS HIDROMETEOROLÓGICOS</p><h1 className="text-3xl md:text-4xl font-bold mt-2">Centro de Alertas</h1><p className="text-slate-300 mt-2">Indicadores experimentales GÓTITA y registros oficiales de emergencias de INDECI.</p></div>
    <div className="flex flex-wrap gap-2 mt-6"><span className="px-3 py-2 rounded-full bg-red-50 text-red-700 font-semibold">{stationAlerts.filter(s => s.riskLevel === 'ALTO').length} riesgo alto</span><span className="px-3 py-2 rounded-full bg-amber-50 text-amber-700 font-semibold">{stationAlerts.filter(s => s.riskLevel === 'MEDIO').length} riesgo medio</span><span className="px-3 py-2 rounded-full bg-slate-100 text-slate-600">INDECI: {loading ? 'consultando…' : `${filteredIndeci.length} registros hidrometeorológicos`}</span><span className="px-3 py-2 rounded-full bg-slate-100 text-slate-600">Datos meteorológicos: {dataStatus}</span></div>
    <div className="mt-8 flex items-center justify-between gap-3"><div><p className="text-xs text-[#286b2b] font-bold tracking-widest">VIGILANCIA HIDROMETEOROLÓGICA</p><h2 className="text-2xl font-bold">Indicadores experimentales GÓTITA</h2></div><button onClick={() => { onRefreshStations(); void loadIndeci(); }} className="px-4 py-2 border rounded-xl inline-flex items-center gap-2"><RefreshCw className="w-4"/>Actualizar</button></div>
    <p className="text-sm text-slate-500 mt-2">Los niveles de GÓTITA son experimentales y no representan avisos oficiales de SENAMHI.</p>
    <div className="mt-4 space-y-3">{stationAlerts.length === 0 ? <div className="rounded-2xl bg-[#f4f8f0] p-6"><b>No hay observaciones suficientes para presentar un indicador GÓTITA medio o alto.</b><p className="text-sm text-slate-600 mt-1">Esto no significa que no existan avisos oficiales. Consulta SENAMHI e INDECI.</p></div> : stationAlerts.map(station => <article key={station.id} className={`rounded-2xl border-l-4 ${station.riskLevel === 'ALTO' ? 'border-red-500' : 'border-amber-500'} border border-slate-200 p-5 bg-white shadow-sm`}><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><p className={`text-xs font-bold ${station.riskLevel === 'ALTO' ? 'text-red-600' : 'text-amber-600'}`}>RIESGO {station.riskLevel} · INDICADOR GÓTITA</p><h3 className="font-bold text-lg mt-1">Monitoreo de precipitaciones en {station.department}</h3><p className="text-sm text-slate-600 mt-2">Estación {station.name}. Precipitación: {station.precipitation24hMm == null ? 'sin acumulado válido de 24 h' : `${Number(station.precipitation24hMm).toFixed(1)} mm`}.</p><p className="text-xs text-slate-500 mt-3">Cuenca: {station.basin} · Región: {station.region} · Fuente: {station.source || 'no indicada'}</p></div><button onClick={() => onViewStationOnMap(station)} className="px-3 py-2 rounded-lg bg-[#286b2b] text-white text-sm">Ver en mapa</button></div></article>)}</div>

    <div className="mt-5 rounded-2xl border p-5"><div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><h3 className="font-bold">Emergencias INDECI · SINPAD</h3><p className="text-xs text-slate-500">Registros oficiales de emergencias hidrometeorológicas consultados desde SINPAD.</p></div><a href="https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias" target="_blank" rel="noreferrer" className="text-[#286b2b] text-sm inline-flex items-center gap-1">Fuente oficial <ExternalLink className="w-3"/></a></div>
    <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 mt-4"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fenómeno, departamento o distrito" className="w-full border rounded-xl pl-9 pr-3 py-2"/></div><select value={region} onChange={e => setRegion(e.target.value)} className="border rounded-xl px-3 py-2"><option>Todas</option><option>Costa</option><option>Sierra</option><option>Selva</option></select><button onClick={exportCsv} className="px-3 py-2 rounded-xl border inline-flex items-center gap-1"><Download className="w-4"/>Exportar CSV</button></div>
    <div className="mt-3 max-h-64 overflow-auto space-y-2">{filteredIndeci.length ? filteredIndeci.slice(0, 20).map((feature, i) => { const p = feature.properties || {}; return <div key={String(p.IDE_SINPAD || i)} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-start gap-2"><MapPin className="w-4 text-[#1565C0] mt-0.5"/><div><b>{p.FENOMENO || 'Emergencia hidrometeorológica'}</b><p className="text-xs text-slate-500">{p.DEPARTAMENTO || 'Perú'} · {p.PROVINCIA || ''} · {p.DISTRITO || ''} · {p.FECHA || ''}</p></div></div></div>; }) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{loading ? 'Consultando SINPAD…' : 'INDECI no devolvió registros hidrometeorológicos en esta consulta.'}</div>}</div></div>

    <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4"><div><p className="text-xs text-[#1565C0] font-bold tracking-widest">BASE DE DATOS HISTÓRICA</p><h2 className="text-2xl font-bold">Historial de Alertas</h2><p className="text-xs text-slate-500 mt-1">Historial oficial: los registros se muestran cuando INDECI los devuelve.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 text-slate-400"/><input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Buscar en historial…" className="border rounded-xl pl-9 pr-3 py-2"/></div><button onClick={exportCsv} className="px-3 py-2 rounded-xl border inline-flex items-center gap-1"><Download className="w-4"/>Exportar CSV</button></div></div>
    <div className="mt-4 overflow-x-auto rounded-2xl border"><table className="w-full text-sm"><thead className="bg-[#E3F2FD]"><tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Región</th><th className="text-left p-3">Tipo de alerta</th><th className="text-left p-3">Fuente</th></tr></thead><tbody>{filteredIndeci.filter(feature => { const p = feature.properties || {}; return !historySearch || `${p.FENOMENO || ''} ${p.DEPARTAMENTO || ''} ${p.PROVINCIA || ''} ${p.DISTRITO || ''}`.toLowerCase().includes(historySearch.toLowerCase()); }).slice(0, 50).map((feature, i) => { const p = feature.properties || {}; return <tr key={String(p.IDE_SINPAD || i)} className="border-t"><td className="p-3">{p.FECHA || 'Sin fecha'}</td><td className="p-3">{p.DEPARTAMENTO || 'Perú'} · {p.PROVINCIA || ''}</td><td className="p-3">{p.FENOMENO || 'Emergencia'}</td><td className="p-3 font-semibold text-[#1565C0]">INDECI SINPAD</td></tr>; })}</tbody></table>{!filteredIndeci.length && !loading && <div className="p-5 text-sm text-slate-500">No hay registros oficiales disponibles para mostrar en este momento.</div>}</div>
  </section>;
}
