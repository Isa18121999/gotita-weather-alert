import type React from 'react';
import { CloudRain, Map, ShieldAlert, Wind, Activity, Radio, CheckCircle2, Clock3, ChevronRight } from 'lucide-react';
import type { WeatherStation } from '../data/stations';

const PLUVIX_MEDIA = 'https://raw.githubusercontent.com/Alex-Perales/pluvix/main/public/media';

export function InicioPage({ stations, selectedStation, onSelectStation, dataStatus, onRetry, onNavigate }: {
  stations: WeatherStation[];
  selectedStation: WeatherStation;
  onSelectStation: (station: WeatherStation) => void;
  dataStatus: string;
  onRetry: () => void;
  onNavigate: (page: 'mapa' | 'alertas' | 'noticias' | 'inicio') => void;
}) {
  const isOfficial = selectedStation.source?.includes('SENAMHI') ?? false;
  const rainfall = selectedStation.precipitation24hMm ?? (isOfficial ? null : selectedStation.precipitationMm);
  const rain = rainfall == null || !Number.isFinite(Number(rainfall)) ? null : Number(rainfall);
  const hasRisk = selectedStation.riskObservation !== 'sin-datos' && (rain !== null || selectedStation.current?.precipitationMm != null);
  const risk = hasRisk ? selectedStation.riskLevel : 'SIN DATOS';
  const riskClass = risk === 'ALTO'
    ? 'border-red-400 bg-red-50 text-red-700'
    : risk === 'MEDIO'
      ? 'border-amber-400 bg-amber-50 text-amber-700'
      : risk === 'BAJO'
        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
        : 'border-slate-300 bg-slate-50 text-slate-600';
  const threshold = selectedStation.thresholdRedMm || 35;
  const progress = rain === null ? 0 : Math.min(100, Math.max(0, rain / threshold * 100));
  const updated = selectedStation.updatedMinutesAgo;

  return <>
    {/* Portada: misma composición visual del frontend original de Pluvix */}
    <section className="relative w-full h-svh min-h-[520px] overflow-hidden bg-[#000]">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${PLUVIX_MEDIA}/portada-lluvia.mp4`}
        poster={`${PLUVIX_MEDIA}/portada.jpg`}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 px-4 sm:px-8 flex flex-col justify-center items-center text-center text-white pt-16">
        <img
          src={`${PLUVIX_MEDIA}/logo-pluvix.png`}
          alt=""
          className="h-16 sm:h-20 w-auto mb-5"
        />
        <h1 className="text-white font-bold text-[3rem] leading-none sm:text-[4.5rem] lg:text-[5.5rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
          GÓTITA
        </h1>
        <p className="mt-4 sm:mt-5 text-white text-[1.25rem] leading-snug sm:text-[1.25rem] md:text-[1.5rem] lg:text-[1.875rem] xl:text-[2.25rem] drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
          Plataforma de alerta temprana ante el Fenómeno de El Niño
        </p>
        <p className="mt-3 text-white text-base leading-relaxed sm:text-xl lg:text-[1.5rem] drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
          <span className="sm:block">Monitoreamos las lluvias en Costa, Sierra y Selva del Perú</span>
          <span className="sm:block">y te avisamos a tiempo.</span>
        </p>
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onNavigate('mapa')}
            className="w-full max-w-xs sm:w-auto sm:max-w-none px-7 py-4 rounded-lg bg-[#1E88E5] hover:bg-[#1976D2] text-white text-base sm:text-lg font-semibold transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Map className="w-5 h-5" />
            <span>Explorar Mapa Interactivo</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('alertas')}
            className="w-full max-w-xs sm:w-auto sm:max-w-none px-7 py-4 rounded-lg bg-white hover:bg-[#E3F2FD] text-[#111827] text-base sm:text-lg font-semibold transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2.5"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Ver Alertas Vigentes</span>
          </button>
        </div>
      </div>
    </section>

    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 pb-5 border-b border-[#E3F2FD]">
        <div>
          <p className="text-sm text-[#1565C0] font-bold tracking-[.12em]">INDICADORES POR ESTACIÓN</p>
          <h2 className="text-2xl md:text-3xl font-bold mt-1">¿Cómo está la lluvia en {selectedStation.department}?</h2>
          <p className="text-sm text-[#111827] mt-1">{selectedStation.name} · {selectedStation.basin} · {updated == null ? 'Antigüedad de observación no disponible' : updated === 0 ? 'Actualizado recientemente' : `Actualizado hace ${updated} min`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={selectedStation.id} onChange={e => { const station = stations.find(item => item.id === e.target.value); if (station) onSelectStation(station); }} className="border border-[#90CAF9] rounded-lg px-3 py-2 bg-white text-sm" aria-label="Cambiar estación">
            {stations.map(station => <option key={station.id} value={station.id}>{station.department} ({station.region})</option>)}
          </select>
          <button onClick={onRetry} className="px-4 py-2 rounded-lg border border-[#90CAF9] bg-white hover:bg-[#E3F2FD]">Actualizar</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Activity />} title="Nivel de riesgo" value={risk} subtitle={risk === 'SIN DATOS' ? 'No hay observación válida para calcular el nivel.' : risk === 'BAJO' ? 'Nivel calculado por umbrales experimentales de GÓTITA.' : risk === 'MEDIO' ? 'Vigilancia experimental: revisa avisos oficiales.' : 'Indicador experimental alto: revisa avisos oficiales.'} className={riskClass} />
        <MetricCard icon={<CloudRain />} title={isOfficial ? 'Precipitación observada' : 'Lluvia estimada 24 h'} value={rain === null ? 'Sin datos' : `${rain.toFixed(1)} mm`} subtitle={rain === null ? 'No se dispone de un acumulado válido.' : `Umbral rojo experimental: ${threshold.toFixed(1)} mm`}>
          {rain !== null && <><div className="mt-3 h-2 bg-[#E3F2FD] rounded-full overflow-hidden"><div className="h-full bg-[#42A5F5] rounded-full" style={{ width: `${progress}%` }} /></div><p className="text-xs text-slate-500 mt-2">Quedan {Math.max(0, threshold - rain).toFixed(1)} mm para ese umbral de referencia.</p></>}
        </MetricCard>
        <MetricCard icon={<Radio />} title="Caudal del río" value="— m³/s" subtitle={`${selectedStation.basin}. Sin dato hidrológico integrado en esta estación.`} />
        <MetricCard icon={<Wind />} title="Contexto El Niño" value="Consultar ENFEN" subtitle="El estado oficial del fenómeno se consulta en los comunicados de ENFEN." />
      </div>

      <div className="mt-5 rounded-lg bg-[#E3F2FD] border border-[#BBDEFB] p-4 text-sm text-[#111827] flex flex-wrap items-center justify-between gap-3">
        <span>Fuente meteorológica: <strong>{selectedStation.source || 'Fuente no disponible'}</strong></span>
        <span className="inline-flex items-center gap-1"><Clock3 className="w-4" />Estado de datos: {dataStatus}</span>
      </div>
    </section>

    <section className="bg-[#E3F2FD] border-y border-[#BBDEFB]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-[#1565C0] font-bold tracking-[.12em]">PREVENCIÓN NACIONAL</p>
          <h2 className="text-2xl md:text-3xl font-bold mt-1">¿Cómo funciona la alerta temprana?</h2>
          <p className="text-sm text-slate-600 mt-2">Tres fases coordinadas entre monitoreo, evaluación y respuesta. GÓTITA orienta; los avisos oficiales determinan las acciones.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            ['FASE 1', 'Monitoreo de lluvias', 'Las estaciones registran la lluvia observada y sus variaciones.', true],
            ['FASE 2', 'Evaluación de umbrales', 'Se comparan lluvia y riesgo con umbrales de vigilancia.', false],
            ['FASE 3', 'Alerta y evacuación', 'Ante un aviso oficial, sigue las indicaciones de las autoridades.', false],
          ].map(([phase, title, text, current], i) => (
            <div key={phase as string} className={`rounded-lg border p-6 bg-white ${current ? 'border-[#42A5F5] ring-1 ring-[#BBDEFB]' : 'border-[#BBDEFB]'}`}>
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{phase as string}</span>{current && <span className="text-xs bg-[#1565C0] text-white px-2 py-1 rounded">Fase actual</span>}</div>
              <div className="flex items-center gap-3 mt-4"><span className="w-9 h-9 rounded-full bg-[#E3F2FD] text-[#1565C0] flex items-center justify-center">{i === 0 ? <CloudRain className="w-5" /> : i === 1 ? <Activity className="w-5" /> : <ShieldAlert className="w-5" />}</span><h3 className="font-bold text-lg">{title as string}</h3></div>
              <p className="text-sm text-slate-600 mt-3">{text as string}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-6 text-sm text-slate-500">{selectedStation.department}: {risk === 'SIN DATOS' ? 'sin datos suficientes para calcular el riesgo.' : `nivel calculado ${risk.toLowerCase()} (umbral experimental).`}</div>
      </div>
    </section>

    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-3 gap-5">
        <InfoCard title="Seguimiento ENFEN" text="Consulta comunicados oficiales sobre el Fenómeno El Niño." action="Ver noticias" onClick={() => onNavigate('noticias')} />
        <InfoCard title="Mapa de riesgo" text="Filtra estaciones por región natural y nivel de riesgo." action="Abrir mapa" onClick={() => onNavigate('mapa')} />
        <InfoCard title="Centro de alertas" text="Revisa alertas vigentes y registros oficiales de INDECI disponibles." action="Ver alertas" onClick={() => onNavigate('alertas')} />
      </div>
      <div className="mt-6 rounded-lg border border-[#BBDEFB] p-5 bg-white">
        <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="text-[#1565C0]" /> GÓTITA no reemplaza los avisos oficiales</div>
        <p className="text-sm text-slate-600 mt-2">SENAMHI, ANA, ENFEN e INDECI son las fuentes institucionales de referencia. Los indicadores de GÓTITA sirven para visualizar y anticipar la información.</p>
      </div>
    </section>
  </>;
}

function MetricCard({ icon, title, value, subtitle, className = '', children }: { icon: React.ReactNode; title: string; value: string; subtitle: string; className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-lg border p-5 bg-white shadow-sm ${className}`}><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{title}</span><span className="text-[#1565C0]">{icon}</span></div><div className="text-3xl font-bold mt-2">{value}</div><p className="text-xs text-slate-500 mt-2">{subtitle}</p>{children}</div>;
}

function InfoCard({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return <div className="rounded-lg border border-[#BBDEFB] p-6 bg-white hover:shadow-md transition-shadow"><h3 className="font-bold text-xl">{title}</h3><p className="text-sm text-slate-600 mt-2">{text}</p><button onClick={onClick} className="mt-4 text-[#1565C0] font-semibold inline-flex items-center gap-1">{action}<ChevronRight className="w-4" /></button></div>;
}
