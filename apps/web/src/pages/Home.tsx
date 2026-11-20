import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { BookingModal } from '../components/BookingModal';
import { formatDuration } from '../lib/format';
import { apiFetch } from '../api/client';
import type { CatalogService, CatalogEffect, NailLength, QuoteResult } from '../types/catalog';
import {
  CATEGORY_LABELS,
  type ServiceCategory,
} from '../types/catalog';

const CATEGORIES: Array<ServiceCategory | 'ALL'> = ['ALL', 'ACRYLIC', 'SOFT_GEL', 'SEMI_PERMANENT', 'NAIL_ART'];

export function Home() {
  const [services, setServices] = useState<CatalogService[]>([]);
  const [effects, setEffects] = useState<CatalogEffect[]>([]);
  const [lengths, setLengths] = useState<NailLength[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'ALL'>('ALL');

  // quoter state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedLength, setSelectedLength] = useState<string>('M');
  const [selectedEffectIds, setSelectedEffectIds] = useState<string[]>([]);
  const [includeRemoval, setIncludeRemoval] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, eRes, lRes] = await Promise.all([
          apiFetch('/catalog/services'),
          apiFetch('/catalog/effects'),
          apiFetch('/catalog/lengths'),
        ]);
        if (!sRes.ok || !eRes.ok || !lRes.ok) throw new Error('Error al cargar catálogo');
        const sJson = (await sRes.json()) as { data: CatalogService[] };
        const eJson = (await eRes.json()) as { data: CatalogEffect[] };
        const lJson = (await lRes.json()) as { data: NailLength[] };
        if (cancelled) return;
        setServices(sJson.data ?? []);
        setEffects(eJson.data ?? []);
        setLengths(lJson.data ?? []);
        if (sJson.data?.length) setSelectedServiceId(sJson.data[0].id);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredServices = useMemo(
    () => (activeCategory === 'ALL' ? services : services.filter((s) => s.category === activeCategory)),
    [services, activeCategory],
  );

  const extraEffects = useMemo(() => effects.filter((e) => e.type === 'EFFECT'), [effects]);

  // live quote
  useEffect(() => {
    if (!selectedServiceId) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setQuoting(true);
      try {
        const res = await apiFetch('/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: selectedServiceId,
            length: selectedLength,
            effectIds: selectedEffectIds,
            includeRemoval,
          }),
        });
        if (!res.ok) throw new Error('Error al cotizar');
        const json = (await res.json()) as { data: QuoteResult };
        if (!cancelled) setQuote(json.data);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedServiceId, selectedLength, selectedEffectIds, includeRemoval]);

  const toggleEffect = (id: string) => {
    setSelectedEffectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="min-h-full bg-brand-cream overflow-x-hidden">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-nude via-brand-cream to-brand-pearl border border-brand-gold/30 shadow-soft p-8 md:p-12">
          <div className="max-w-2xl">
            <p className="text-[#3E2723]/70 font-medium mb-2">Nb_nails Estudio de Uñas</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#3E2723] mb-4">
              Arte y elegancia en cada detalle
            </h1>
            <p className="text-[#3E2723]/80 mb-6">
              Diseños únicos y personalizados. Cotiza tu servicio en vivo y reserva tu cita.
            </p>
            <a
              href="#cotizador"
              className="inline-block bg-[#C59B76] text-white font-semibold px-6 py-3 rounded-lg shadow-soft hover:bg-[#B8895E] transition min-h-[44px]"
            >
              Ir al Cotizador
            </a>
          </div>
        </section>

        {/* Catalogo */}
        <section id="catalogo" className="space-y-4">
          <h2 className="text-2xl font-bold text-[#3E2723]">Catálogo de servicios</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const label = c === 'ALL' ? 'Todos' : CATEGORY_LABELS[c];
              const active = activeCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition min-h-[44px] ${
                    active
                      ? 'bg-[#C59B76] text-white border-[#C59B76] hover:bg-[#B8895E]'
                      : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {loading && <p className="text-[#3E2723]/70">Cargando catálogo...</p>}
          {error && <p className="text-red-600">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((s) => (
              <article
                key={s.id}
                className="bg-[#FDF9F6] rounded-2xl shadow-soft border border-[#E6D2C1] overflow-hidden flex flex-col"
              >
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect fill='%23FAF5F0' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%235D4742' font-size='18'>NailStudio</text></svg>";
                    }}
                  />
                ) : (
                  <div className="w-full h-40 bg-brand-cream flex items-center justify-center text-[#3E2723]/60">
                    NailStudio
                  </div>
                )}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#3E2723]">{s.name}</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#F2DFD8] text-[#3E2723] font-medium">
                      {CATEGORY_LABELS[s.category]}
                    </span>
                  </div>
                  {s.description && <p className="text-sm text-[#3E2723]/70">{s.description}</p>}
                  <div className="flex items-center justify-between text-sm mt-auto pt-2">
                    <span className="text-[#3E2723]/70">{formatDuration(s.baseDurationMin)}</span>
                    <span className="font-bold text-[#C59B76]">${s.basePrice.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedServiceId(s.id);
                      document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-3 w-full bg-[#C59B76] hover:bg-[#B8895E] text-white text-sm font-semibold py-2.5 rounded-lg shadow-soft transition-colors duration-200 min-h-[44px]"
                  >
                    Cotizar este diseño
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Cotizador */}
        <section id="cotizador" className="space-y-4">
          <h2 className="text-2xl font-bold text-[#3E2723]">Cotizador dinámico</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="bg-brand-pearl rounded-xl2 shadow-soft border border-brand-gold/30 p-4">
                <h3 className="font-semibold text-[#3E2723] mb-3">Paso 1: Técnica base</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedServiceId(s.id)}
                      className={`text-left p-3 rounded-lg border transition min-h-[44px] ${
                        selectedServiceId === s.id
                          ? 'border-[#C59B76] bg-[#C59B76] text-white'
                          : 'border-[#C59B76]/40 bg-[#F2DFD8] text-[#3E2723] hover:bg-[#E8D0C8]'
                      }`}
                    >
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs opacity-80">${s.basePrice.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-brand-pearl rounded-xl2 shadow-soft border border-brand-gold/30 p-4">
                <h3 className="font-semibold text-[#3E2723] mb-3">Paso 2: Largo de uña</h3>
                <div className="flex flex-wrap gap-2">
                  {lengths.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setSelectedLength(l.code)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition min-h-[44px] ${
                        selectedLength === l.code
                          ? 'bg-[#C59B76] text-white border-[#C59B76] hover:bg-[#B8895E]'
                          : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8]'
                      }`}
                    >
                      {l.label} ({l.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-brand-pearl rounded-xl2 shadow-soft border border-brand-gold/30 p-4">
                <h3 className="font-semibold text-[#3E2723] mb-3">Paso 3: Extras & Nail Art</h3>
                <div className="flex flex-wrap gap-2">
                  {extraEffects.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => toggleEffect(e.id)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition min-h-[44px] ${
                        selectedEffectIds.includes(e.id)
                          ? 'bg-[#C59B76] text-white border-[#C59B76] hover:bg-[#B8895E]'
                          : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8]'
                      }`}
                    >
                      {e.name} (+${e.price.toFixed(2)})
                    </button>
                  ))}
                  <button
                    onClick={() => setIncludeRemoval(false)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition min-h-[44px] ${
                      !includeRemoval
                        ? 'bg-[#C59B76] text-white border-[#C59B76] hover:bg-[#B8895E]'
                        : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8]'
                    }`}
                  >
                    Sin retiro
                  </button>
                  <button
                    onClick={() => setIncludeRemoval(true)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition min-h-[44px] ${
                      includeRemoval
                        ? 'bg-[#C59B76] text-white border-[#C59B76] hover:bg-[#B8895E]'
                        : 'bg-[#F2DFD8] text-[#3E2723] border-[#C59B76] hover:bg-[#E8D0C8]'
                    }`}
                  >
                    Con retiro (+30 min)
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-brand-pearl rounded-xl2 shadow-soft border border-brand-gold/30 p-6 h-fit sticky top-24">
              <h3 className="font-semibold text-[#3E2723] mb-4">Resumen</h3>
              {quoting && <p className="text-sm text-[#3E2723]/60">Calculando...</p>}
              {quote && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-[#3E2723]/80">
                    <span>Base</span>
                    <span>${quote.breakdown.base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#3E2723]/80">
                    <span>Largo</span>
                    <span>${quote.breakdown.length.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#3E2723]/80">
                    <span>Extras</span>
                    <span>${quote.breakdown.effects.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#3E2723]/80">
                    <span>Retiro</span>
                    <span>${quote.breakdown.removal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-brand-gold/30 pt-3 flex justify-between font-bold text-[#3E2723]">
                    <span>Total</span>
                    <span className="text-[#C59B76]">${quote.priceTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#3E2723]/70">
                    <span>Duración estimada</span>
                    <span>{formatDuration(quote.durationMin)}</span>
                  </div>
                </div>
              )}
              <button
                className="mt-6 w-full bg-[#C59B76] text-white font-semibold py-2.5 rounded-lg shadow-soft hover:bg-[#B8895E] transition min-h-[44px] disabled:opacity-50"
                onClick={() => setBookingOpen(true)}
                disabled={!quote || !selectedServiceId}
              >
                Reservar
              </button>
            </div>
          </div>
        </section>
      </main>
      {selectedServiceId && (
        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          serviceId={selectedServiceId}
          serviceName={services.find((s) => s.id === selectedServiceId)?.name ?? 'Servicio'}
          length={selectedLength}
          effectIds={selectedEffectIds}
          includeRemoval={includeRemoval}
          durationMin={quote?.durationMin ?? 0}
          priceTotal={quote?.priceTotal ?? 0}
        />
      )}
    </div>
  );
}