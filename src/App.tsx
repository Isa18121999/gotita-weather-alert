import { useState } from 'react';
import { Map, ShieldAlert } from 'lucide-react';
import { useLiveStations } from './data/weather';
import { Navbar, NavPage, Footer } from './components/Layout';
import { AlertasPage } from './pages/Alertas';
import { InicioPage } from './pages/Inicio';
import { MapaPage } from './pages/Mapa';
import { NoticiasPage } from './pages/Noticias';
import { CoverPage } from './pages/CoverPage';

const PLUVIX_MEDIA = 'https://raw.githubusercontent.com/Alex-Perales/pluvix/main/public/media';

export function App() {
  const [showCover, setShowCover] = useState(true);
  const [activePage, setActivePage] = useState<NavPage>('inicio');
  const { stations, status: dataStatus, reload: reloadStations } = useLiveStations();
  const [selectedStationId, setSelectedStationId] = useState('');
  const selectedStation = stations.find(station => station.id === selectedStationId) ?? stations[0];
  const handleNavigate = (page: NavPage) => { setActivePage(page); window.scrollTo({ top: 0 }); };

  if (showCover) {
    return <CoverPage onEnter={() => setShowCover(false)} />;
  }

  const weatherUnavailable = dataStatus !== 'en-vivo' || !selectedStation;

  return <div className="min-h-screen bg-white text-[#111827] flex flex-col">
    <Navbar activePage={activePage} onNavigate={handleNavigate} />

    <main className={`flex-1 bg-white ${activePage === 'inicio' ? '' : 'pt-24'}`}>
      {dataStatus === 'cargando' && (
        <div className="max-w-6xl mx-auto px-5 pt-4" role="status">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Consultando estaciones y fuente meteorológica…
          </div>
        </div>
      )}

      {dataStatus === 'sin-conexion' && (
        <div className="max-w-6xl mx-auto px-5 pt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <b>No hay conexión con la API meteorológica.</b>
                <p className="text-sm mt-1">No se mostrarán estaciones de ejemplo como si fueran observaciones en vivo.</p>
              </div>
              <button className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-amber-100" onClick={reloadStations}>
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {dataStatus === 'en-vivo' && stations.length === 0 && (
        <div className="max-w-6xl mx-auto px-5 pt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            La API respondió, pero no hay estaciones disponibles. Consulta las fuentes oficiales.
          </div>
        </div>
      )}

      {activePage === 'inicio' && !weatherUnavailable && (
        <InicioPage
          dataStatus={dataStatus}
          onRetry={reloadStations}
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={s => setSelectedStationId(s.id)}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'inicio' && weatherUnavailable && (
        <InicioUnavailablePage onNavigate={handleNavigate} onRetry={reloadStations} />
      )}

      {activePage === 'mapa' && !weatherUnavailable && (
        <MapaPage
          dataStatus={dataStatus}
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={s => setSelectedStationId(s.id)}
        />
      )}

      {activePage === 'mapa' && weatherUnavailable && (
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800">Mapa meteorológico no disponible</h1>
            <p className="mt-2 text-slate-600">No hay estaciones en vivo para mostrar en el mapa en este momento.</p>
            <button className="mt-5 rounded-lg bg-[#1976D2] px-5 py-2.5 font-semibold text-white hover:bg-[#1565C0]" onClick={reloadStations}>
              Reintentar conexión
            </button>
          </div>
        </div>
      )}

      {activePage === 'alertas' && (
        <AlertasPage
          stations={stations}
          dataStatus={dataStatus}
          onRefreshStations={reloadStations}
          onViewStationOnMap={s => { setSelectedStationId(s.id); handleNavigate('mapa'); }}
        />
      )}

      {activePage === 'noticias' && <NoticiasPage />}
    </main>

    <Footer onNavigate={handleNavigate} />
  </div>;
}

function InicioUnavailablePage({ onNavigate, onRetry }: { onNavigate: (page: NavPage) => void; onRetry: () => void }) {
  return <>
    <section className="relative w-full h-svh min-h-[560px] overflow-hidden bg-black">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${PLUVIX_MEDIA}/portada-lluvia.mp4`}
        poster={`${PLUVIX_MEDIA}/portada.jpg`}
        autoPlay muted loop playsInline aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 px-4 sm:px-8 flex flex-col justify-center items-center text-center text-white pt-16">
        <img src={`${PLUVIX_MEDIA}/logo-pluvix.png`} alt="" className="h-16 sm:h-20 w-auto mb-5" />
        <h1 className="text-white font-bold text-[3rem] leading-none sm:text-[4.5rem] lg:text-[5.5rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">GÓTITA</h1>
        <p className="mt-4 sm:mt-5 text-white text-[1.25rem] leading-snug sm:text-xl md:text-2xl lg:text-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
          Plataforma de alerta temprana ante el Fenómeno de El Niño
        </p>
        <p className="mt-3 text-white text-base leading-relaxed sm:text-xl lg:text-2xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
          Monitoreamos las lluvias en Costa, Sierra y Selva del Perú y te avisamos a tiempo.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button type="button" onClick={() => onNavigate('mapa')} className="w-full max-w-xs sm:w-auto px-7 py-4 rounded-lg bg-[#1E88E5] hover:bg-[#1976D2] text-white text-base sm:text-lg font-semibold shadow-lg flex items-center justify-center gap-2.5">
            <Map className="w-5 h-5" /> Explorar Mapa Interactivo
          </button>
          <button type="button" onClick={() => onNavigate('alertas')} className="w-full max-w-xs sm:w-auto px-7 py-4 rounded-lg bg-white hover:bg-[#E3F2FD] text-[#111827] text-base sm:text-lg font-semibold shadow-lg flex items-center justify-center gap-2.5">
            <ShieldAlert className="w-5 h-5" /> Ver Alertas Vigentes
          </button>
        </div>
      </div>
    </section>

    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-amber-900">
        <h2 className="text-xl font-bold">Datos meteorológicos no disponibles en este momento</h2>
        <p className="mt-2 text-sm">La portada y las demás secciones de GÓTITA siguen disponibles. No mostraremos datos simulados mientras la API no responda.</p>
        <button onClick={onRetry} className="mt-5 rounded-lg bg-[#1976D2] px-5 py-2.5 font-semibold text-white hover:bg-[#1565C0]">Reintentar conexión</button>
      </div>
    </section>

    <section className="bg-[#E3F2FD] border-y border-[#BBDEFB]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-[#1565C0] font-bold tracking-[.12em]">PREVENCIÓN NACIONAL</p>
        <h2 className="text-2xl md:text-3xl font-bold mt-1">¿Cómo funciona la alerta temprana?</h2>
        <p className="text-sm text-slate-600 mt-2">GÓTITA orienta; los avisos oficiales determinan las acciones.</p>
      </div>
    </section>
  </>;
}

export default App;
