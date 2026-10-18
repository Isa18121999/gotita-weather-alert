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

  return <div className="min-h-screen bg-white text-[#111827] flex flex-col">
    <Navbar activePage={activePage} onNavigate={handleNavigate} />
    <main className={`flex-1 bg-white ${activePage === 'inicio' ? '' : 'pt-24'}`}>
      {dataStatus === 'cargando' && <div className="max-w-6xl mx-auto px-5 py-10 text-slate-600" role="status">Consultando estaciones y fuente meteorológica…</div>}
      {dataStatus === 'sin-conexion' && <div className="max-w-6xl mx-auto px-5 py-10"><div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900"><b>No hay conexión con la API meteorológica.</b><p className="text-sm mt-1">No se mostrarán estaciones de ejemplo como si fueran observaciones en vivo.</p><button className="mt-3 rounded-lg border px-4 py-2 bg-white" onClick={reloadStations}>Reintentar</button></div></div>}
      {dataStatus === 'en-vivo' && stations.length === 0 && <div className="max-w-6xl mx-auto px-5 py-10 text-slate-600">La API respondió, pero no hay estaciones disponibles. Consulta las fuentes oficiales.</div>}
      {dataStatus === 'en-vivo' && selectedStation && activePage === 'inicio' && <InicioPage dataStatus={dataStatus} onRetry={reloadStations} stations={stations} selectedStation={selectedStation} onSelectStation={s => setSelectedStationId(s.id)} onNavigate={handleNavigate} />}
      {dataStatus === 'en-vivo' && selectedStation && activePage === 'mapa' && <MapaPage dataStatus={dataStatus} stations={stations} selectedStation={selectedStation} onSelectStation={s => setSelectedStationId(s.id)} />}
      {dataStatus === 'en-vivo' && activePage === 'alertas' && <AlertasPage stations={stations} dataStatus={dataStatus} onRefreshStations={reloadStations} onViewStationOnMap={s => { setSelectedStationId(s.id); handleNavigate('mapa'); }} />}
      {activePage === 'noticias' && <NoticiasPage />}
    </main>
    <Footer onNavigate={handleNavigate} />
  </div>;
}
export default App;
