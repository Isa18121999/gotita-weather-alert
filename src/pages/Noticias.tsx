import { useEffect, useState } from 'react';
import { OFFICIAL_SOURCES } from '../data/officialSources';

type Item = { title: string; date?: string; source?: string; summary?: string; url?: string };
type Feed = { id: string; name: string; connected: boolean; dataUrl: string; role: string };

export function NoticiasPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string>();

  const load = async () => {
    setLoading(true);
    const [news, sources] = await Promise.allSettled([fetch('/api/noticias').then(r => r.json()), fetch('/api/fuentes-oficiales').then(r => r.json())]);
    if (news.status === 'fulfilled') setItems(news.value.items ?? []);
    if (sources.status === 'fulfilled') { setFeeds(sources.value.feeds ?? []); setCheckedAt(sources.value.checkedAt); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return <section className="max-w-6xl mx-auto px-5 py-10">
    <div className="rounded-3xl bg-[#E3F2FD] p-8">
      <p className="text-[#1565C0] font-bold tracking-wide">GÓTITA · FUENTES OFICIALES</p>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">Noticias y Comunicados Oficiales</h1>
      <p className="mt-3 max-w-3xl text-slate-700">Consulta la información publicada por las instituciones que alimentan el contexto meteorológico, hidrológico, climático y de emergencias de GÓTITA.</p>
    </div>

    <div className="grid md:grid-cols-4 gap-4 mt-8">
      {OFFICIAL_SOURCES.map(source => {
        const feed = feeds.find(f => f.id === source.id);
        return <article key={source.id} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><span className="font-bold">{source.name}</span><span className={`text-xs px-2 py-1 rounded-full ${feed?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{feed?.connected ? 'Conectado' : 'Fuente oficial'}</span></div>
          <p className="text-sm text-slate-500 mt-2">{source.role}</p>
          <p className="text-sm mt-3">{source.description}</p>
          <a className="text-[#1565C0] text-sm mt-4 inline-block underline" href={source.dataUrl} target="_blank" rel="noreferrer">Abrir fuente oficial ↗</a>
        </article>;
      })}
    </div>

    <div className="flex items-center justify-between mt-10 mb-4"><div><h2 className="text-2xl font-bold">Publicaciones</h2><p className="text-sm text-slate-500">Enlaces a publicaciones oficiales disponibles para consulta.</p></div><button onClick={load} className="px-4 py-2 rounded-xl border bg-white">Actualizar</button></div>
    {checkedAt && <p className="text-xs text-slate-500 mb-4">Última comprobación de fuentes: {new Date(checkedAt).toLocaleString('es-PE')}</p>}
    {loading ? <p>Cargando…</p> : <div className="grid md:grid-cols-2 gap-5">{items.length ? items.map((n, i) => <article key={i} className="rounded-2xl border p-5"><span className="text-sm text-[#1565C0]">{n.source ?? 'Fuente oficial'}</span><h2 className="font-bold mt-2">{n.title}</h2><p className="mt-2 text-sm text-slate-600">{n.summary}</p>{n.url && <a className="text-[#1565C0] text-sm mt-3 inline-block underline" href={n.url} target="_blank" rel="noreferrer">Ver publicación</a>}</article>) : <div className="rounded-2xl bg-slate-50 p-6">No hay publicaciones cargadas en este momento.</div>}</div>}
  </section>;
}
