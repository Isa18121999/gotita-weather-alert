import { useState } from 'react';
import { useLiveStations } from './data/weather';
import { Navbar, NavPage, Footer } from './components/Layout';
import { AlertasPage } from './pages/Alertas';
import { InicioPage } from './pages/Inicio';
import { MapaPage } from './pages/Mapa';
import { NoticiasPage } from './pages/Noticias';
import { CoverPage } from './pages/CoverPage';

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

  const showWeatherUnavailable = dataStatus !== 'en-vivo' || !selectedStation;

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

      {activePage === 'inicio' && selectedStation && dataStatus === 'en-vivo' && (
        <InicioPage
          dataStatus={dataStatus}
          onRetry={reloadStations}
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={s => setSelectedStationId(s.id)}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'inicio' && showWeatherUnavailable && (
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800">Datos meteorológicos no disponibles</h1>
            <p className="mt-2 text-slate-600">GÓTITA no mostrará datos simulados. Puedes reintentar la conexión cuando la API esté disponible.</p>
            <button className="mt-5 rounded-lg bg-[#1976D2] px-5 py-2.5 font-semibold text-white hover:bg-[#1565C0]" onClick={reloadStations}>
              Reintentar conexión
            </button>
          </div>
        </div>
      )}

      {activePage === 'mapa' && selectedStation && dataStatus === 'en-vivo' && (
        <MapaPage
          dataStatus={dataStatus}
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={s => setSelectedStationId(s.id)}
        />
      )}

      {activePage === 'mapa' && showWeatherUnavailable && (
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

export default App;
