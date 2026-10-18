import { ArrowRight } from 'lucide-react';

const COVER_IMAGE = 'https://images.pexels.com/photos/17370961/pexels-photo-17370961.jpeg?cs=srgb&dl=pexels-vee-pix-gallery-455893942-17370961.jpg&fm=jpg';

export function CoverPage({ onEnter }: { onEnter: () => void }) {
  return (
    <main
      className="relative min-h-screen w-full overflow-hidden bg-slate-950 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${COVER_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/70" aria-hidden="true" />

      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-5xl">
          <p className="mb-5 text-sm md:text-base font-semibold tracking-[0.28em] uppercase text-white/90">
            GÓTITA · tu alerta antes de la lluvia
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold uppercase leading-[1.08] text-white drop-shadow-2xl">
            Plataforma de alerta temprana
            <br />
            Fenómeno de El Niño
          </h1>

          <button
            type="button"
            onClick={onEnter}
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[#286b2b] px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-[#1d5120] hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-white/60"
            aria-label="Ingresar a GÓTITA"
          >
            Ingresar
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}
