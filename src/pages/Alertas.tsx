import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCw, Search, MapPin, ShieldAlert, Clock } from 'lucide-react';
import type { WeatherStation } from '../data/stations';
import { API_URL } from '../data/weather';

type IndeciFeature = { properties?: { IDE_SINPAD?: string | number; FENOMENO?: string; DES_GRUPAL_FENOMENO?: string; DEPARTAMENTO?: string; PROVINCIA?: string; DISTRITO?: string; REGION?: string | null; FECHA?: string | number } };

// ArcGIS normalmente devuelve FECHA como epoch en milisegundos.
// Se tratan cadenas numéricas de 10 dígitos como segundos y de 13 dígitos como milisegundos.
function parseIndeciDate(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;

  // Si ArcGIS entrega un número, se interpreta en milisegundos, su formato estándar.
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = value.trim();
  if (!text) return null;

  // Algunas capas serializan el epoch como una cadena numérica.
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text);
    const epochMs = text.length === 10 ? numeric * 1000 : numeric;
    const date = new Date(epochMs);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Formato común de ArcGIS Date: YYYY-MM-DD HH:mm:ss (sin zona horaria).
  const arcGisDateTime = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (arcGisDateTime) {
    const [, year, month, day, hour, minute, second = '0'] = arcGisDateTime;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIndeciDate(value: string | number | undefined): string {
  const date = parseIndeciDate(value);
  if (!date) return value === undefined || value === null || value === '' ? 'Sin fecha' : 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(date);
}

function formatQueryDate(value: string | undefined): string {
  if (!value) return 'No disponible';
  return formatIndeciDate(value);
}

export function AlertasPage({ stations, onViewStationOnMap, onRefreshStations, dataStatus }: {
  stations: WeatherStation[]; dataStatus: string; onRefreshStations: () => void; onViewStationOnMap: (s: WeatherStation) => void;
}) {
  const [features, setFeatures] = useState<IndeciFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [indeciError, setIndeciError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('Todas');
  const [historySearch, setHistorySearch] = useState('');

  const loadIndeci = async () => {
    setLoading(true);
    setIndeciError('');
    try {
      const response = await fetch(`${API_URL}/indeci/emergencias`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`INDECI respondió ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json.features)) throw new Error('La respuesta de INDECI no contiene la lista esperada.');
      setFeatures(json.features);
      setLastUpdated(json.generatedAt || new Date().toISOString());
    } catch (error) {
      setFeatures([]);
      setIndeciError(error instanceof Error ? error.message : 'No se pudo consultar INDECI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadIndeci(); }, []);

  const filteredIndeci = useMemo(() => features.filter(feature => {
    const p = feature.properties || {};
    const q = `${p.FENOMENO || ''} ${p.DEPARTAMENTO || ''} ${p.PROVINCIA || ''} ${p.DISTRITO || ''}`.toLowerCase();
    const regionOk = region === 'Todas' || String(p.REGION || '').toLowerCase() === region.toLowerCase();
    return regionOk && (!search || q.includes(search.toLowerCase()));
  }), [features, search, region]);

  const filteredHistory = useMemo(() => filteredIndeci.filter(feature => {
    const p = feature.properties || {};
    return !historySearch || `${p.FENOMENO || ''} ${p.DEPARTAMENTO || ''} ${p.PROVINCIA || ''} ${p.DISTRITO || ''}`.toLowerCase().includes(historySearch.toLowerCase());
  }), [filteredIndeci, historySearch]);

  const stationAlerts = stations.filter(s => s.riskLevel !== 'BAJO' && s.riskObservation !== 'sin-datos');

  const exportCsv = () => {
    const rows = [['Fecha', 'Departamento', 'Provincia', 'Distrito', 'Tipo de alerta', 'Fuente'],
      ...filteredHistory.map(feature => {
        const p = feature.properties || {};
        return [formatIndeciDate(p.FECHA), p.DEPARTAMENTO || 'Perú', p.PROVINCIA || '', p.DISTRITO || '', p.FENOMENO || 'Emergencia hidrometeorológica', 'INDECI SINPAD'];
      })];
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = 'gotita-alertas-indeci.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return <section className="max-w-6xl mx-auto px-5 py-10">
    <div className="rounded-3xl bg-gradient-to-r from-[#0D47A1] to-[#1565C0] text-white p-7"><p className="text-[#BBDEFB] text-sm font-bold tracking-widest">⚠ AVISOS HIDROMETEOROLÓGICOS</p><h1 className="text-3xl md:text-4xl font-bold mt-2">Centro de Alertas</h1><p className="text-white/85 mt-2">Indicadores experimentales GÓTITA y registros oficiales de emergencias de INDECI.</p></div>

    <div className="flex flex-wrap gap-2 mt-6"><span className="px-3 py-2 rounded-full bg-red-50 text-red-700 font-semibold">{stationAlerts.filter(s => s.riskLevel === 'ALTO').length} riesgo alto</span><span className="px-3 py-2 rounded-full bg-amber-50 text-amber-700 font-semibold">{stationAlerts.filter(s => s.riskLevel === 'MEDIO').length} riesgo medio</span><span className="px-3 py-2 rounded-full bg-[#E3F2FD] text-[#1565C0]">INDECI: {loading ? 'consultando…' : `${filteredIndeci.length} registros consultados`}</span><span className="px-3 py-2 rounded-full bg-slate-100 text-slate-600">Datos meteorológicos: {dataStatus}</span></div>

    <div className="mt-5 rounded-2xl border border-[#BBDEFB] bg-[#E3F2FD] p-5"><div className="flex items-start gap-3"><ShieldAlert className="w-6 h-6 text-[#1565C0] shrink-0"/><div className="w-full"><h2 className="font-bold text-lg text-[#0D47A1]">Alertas oficiales vigentes</h2><p className="text-sm text-slate-700 mt-1">Para no confundir una emergencia histórica con una alerta vigente, GÓTITA solo marcará una alerta como activa cuando la fuente oficial proporcione su estado. SENAMHI publica sus avisos meteorológicos vigentes y SINPAD permite consultar emergencias por estado ACTIVO o CERRADO.</p><div className="grid md:grid-cols-2 gap-3 mt-4"><a href="https://www.senamhi.gob.pe/?p=aviso-meteorologico" target="_blank" rel="noreferrer" className="rounded-xl bg-white border border-[#90CAF9] p-4 hover:bg-white/80"><b className="text-[#0D47A1]">SENAMHI · Avisos meteorológicos</b><p className="text-xs text-slate-600 mt-1">Consultar los avisos meteorológicos vigentes publicados oficialmente.</p><span className="text-xs font-semibold text-[#1565C0] inline-flex items-center gap-1 mt-2">Abrir fuente oficial <ExternalLink className="w-3"/></span></a><a href="https://sinpad2.indeci.gob.pe/sinpad2/faces/public/listSinpadEnviadosPubli.xhtml" target="_blank" rel="noreferrer" className="rounded-xl bg-white border border-[#90CAF9] p-4 hover:bg-white/80"><b className="text-[#0D47A1]">INDECI · SINPAD v2</b><p className="text-xs text-slate-600 mt-1">Consultar emergencias y filtrar oficialmente por estado ACTIVO o CERRADO.</p><span className="text-xs font-semibold text-[#1565C0] inline-flex items-center gap-1 mt-2">Abrir SINPAD <ExternalLink className="w-3"/></span></a></div><p className="text-xs text-slate-600 mt-3"><b>Estado integrado en GÓTITA:</b> todavía no se asigna ACTIVA/CERRADA a los registros de la tabla porque el servicio ArcGIS que consume el backend no expone ese campo de estado.</p></div></div></div>

    <div className="mt-8 flex items-center justify-between gap-3"><div><p className="text-xs text-[#1565C0] font-bold tracking-widest">VIGILANCIA HIDROMETEOROLÓGICA</p><h2 className="text-2xl font-bold">Indicadores experimentales GÓTITA</h2></div><button onClick={() => { onRefreshStations(); void loadIndeci(); }} disabled={loading} className="px-4 py-2 border border-[#90CAF9] rounded-lg inline-flex items-center gap-2 hover:bg-[#E3F2FD] disabled:opacity-60"><RefreshCw className={`w-4 ${loading ? 'animate-spin' : ''}`}/>{loading ? 'Actualizando…' : 'Actualizar'}</button></div>
    <p className="text-sm text-slate-500 mt-2">Los niveles de GÓTITA son experimentales y no representan avisos oficiales de SENAMHI.</p>
    <div className="mt-4 space-y-3">{stationAlerts.length === 0 ? <div className="rounded-lg bg-[#E3F2FD] border border-[#BBDEFB] p-6"><b>No hay observaciones suficientes para presentar un indicador GÓTITA medio o alto.</b><p className="text-sm text-slate-600 mt-1">Esto no significa que no existan avisos oficiales. Consulta SENAMHI e INDECI.</p></div> : stationAlerts.map(station => <article key={station.id} className={`rounded-lg border-l-4 ${station.riskLevel === 'ALTO' ? 'border-red-500' : 'border-amber-500'} border border-slate-200 p-5 bg-white shadow-sm`}><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4"><div><p className={`text-xs font-bold ${station.riskLevel === 'ALTO' ? 'text-red-600' : 'text-amber-600'}`}>RIESGO {station.riskLevel} · INDICADOR GÓTITA</p><h3 className="font-bold text-lg mt-1">Monitoreo de precipitaciones en {station.department}</h3><p className="text-sm text-slate-600 mt-2">Estación {station.name}. Precipitación: {station.precipitation24hMm == null ? 'sin acumulado válido de 24 h' : `${Number(station.precipitation24hMm).toFixed(1)} mm`}.</p><p className="text-xs text-slate-500 mt-3">Cuenca: {station.basin} · Región: {station.region} · Fuente: {station.source || 'no indicada'}</p></div><button onClick={() => onViewStationOnMap(station)} className="px-3 py-2 rounded-lg bg-[#1565C0] hover:bg-[#0D47A1] text-white text-sm">Ver en mapa</button></div></article>)}</div>

    <div className="mt-5 rounded-lg border border-[#BBDEFB] p-5"><div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><h3 className="font-bold">Emergencias INDECI · SINPAD</h3><p className="text-xs text-slate-500">Registros oficiales consultados en la respuesta actual del servicio SINPAD. No implica que cada registro sea una alerta activa.</p></div><a href="https://geosinpad.indeci.gob.pe/indeci/rest/services/Emergencias" target="_blank" rel="noreferrer" className="text-[#1565C0] text-sm inline-flex items-center gap-1">Fuente oficial <ExternalLink className="w-3"/></a></div>
    <div className="grid md:grid-cols-[1fr_auto_auto] gap-2 mt-4"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fenómeno, departamento o distrito" className="w-full border border-[#BBDEFB] rounded-lg pl-9 pr-3 py-2"/></div><select value={region} onChange={e => setRegion(e.target.value)} className="border border-[#BBDEFB] rounded-lg px-3 py-2"><option>Todas</option><option>Costa</option><option>Sierra</option><option>Selva</option></select><button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-[#90CAF9] inline-flex items-center gap-1 hover:bg-[#E3F2FD]"><Download className="w-4"/>Exportar CSV</button></div>
    <div className="mt-3 max-h-64 overflow-auto space-y-2">{filteredIndeci.length ? filteredIndeci.slice(0, 20).map((feature, i) => { const p = feature.properties || {}; return <div key={String(p.IDE_SINPAD || i)} className="rounded-lg bg-[#E3F2FD] p-3 text-sm"><div className="flex items-start gap-2"><MapPin className="w-4 text-[#1565C0] mt-0.5"/><div><b>{p.FENOMENO || 'Emergencia hidrometeorológica'}</b><p className="text-xs text-slate-500">{p.DEPARTAMENTO || 'Perú'} · {p.PROVINCIA || ''} · {p.DISTRITO || ''} · {formatIndeciDate(p.FECHA)}</p></div></div></div>; }) : <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{loading ? 'Consultando SINPAD…' : indeciError ? `No se pudo consultar SINPAD: ${indeciError}` : 'INDECI no devolvió registros hidrometeorológicos en esta consulta.'}</div>}</div><div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock className="w-3.5"/>Última consulta a INDECI: {formatQueryDate(lastUpdated)}</div></div>

    <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4"><div><p className="text-xs text-[#1565C0] font-bold tracking-widest">REGISTROS DEVUELTOS POR SINPAD</p><h2 className="text-2xl font-bold">Historial de Alertas</h2><p className="text-xs text-slate-500 mt-1">Registros hidrometeorológicos devueltos por la consulta actual de INDECI/SINPAD. Es un historial de emergencias registradas, no una lista de alertas activas.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 text-slate-400"/><input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Buscar en historial…" className="border border-[#BBDEFB] rounded-lg pl-9 pr-3 py-2"/></div><button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-[#90CAF9] inline-flex items-center gap-1 hover:bg-[#E3F2FD]"><Download className="w-4"/>Exportar CSV</button></div></div>
    <div className="mt-4 overflow-x-auto rounded-lg border border-[#BBDEFB]"><table className="w-full text-sm"><thead className="bg-[#E3F2FD]"><tr><th className="text-left p-3">Fecha</th><th className="text-left p-3">Región / provincia</th><th className="text-left p-3">Tipo de alerta</th><th className="text-left p-3">Fuente</th></tr></thead><tbody>{filteredHistory.slice(0, 50).map((feature, i) => { const p = feature.properties || {}; return <tr key={String(p.IDE_SINPAD || i)} className="border-t"><td className="p-3 whitespace-nowrap">{formatIndeciDate(p.FECHA)}</td><td className="p-3">{p.DEPARTAMENTO || 'Perú'} · {p.PROVINCIA || ''}</td><td className="p-3">{p.FENOMENO || 'Emergencia'}</td><td className="p-3 font-semibold text-[#1565C0]">INDECI SINPAD</td></tr>; })}</tbody></table>{!filteredHistory.length && !loading && <div className="p-5 text-sm text-slate-500">{indeciError || 'No hay registros oficiales disponibles para mostrar en este momento.'}</div>}</div>
  </section>;
}
