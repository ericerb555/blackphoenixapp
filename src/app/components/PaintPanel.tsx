/**
 * Paint, on surfaces the app already knows the area of.
 *
 * WHY THIS IS A PANEL AND NOT A FIELD ON EVERY TRADE
 *
 * Because painting crosses trades. The walls of a room the kitchen tool is
 * laying out, the siding on an elevation, the trim around the openings — all
 * painted, none of them owned by one trade. Putting a colour field in each
 * would mean four places to choose paint and four chances for a job to be
 * quoted from whichever one somebody happened to open.
 *
 * So this reads the house, lists every surface it can compute an area for, and
 * lets a colour be chosen against each. The areas are not recomputed here: an
 * elevation's net wall area already subtracts its openings, and a room already
 * knows its perimeter and ceiling.
 *
 * WHAT IT REFUSES
 *
 * To offer a colour that is not in a vendor's catalogue. There is no built-in
 * palette and there is not going to be one — an invented paint code on an order
 * is somebody standing at a trade counter being told it does not exist. Until a
 * vendor uploads a deck the picker is honestly empty and says why.
 *
 * To let a screen stand in for a fan deck. Every swatch carries the vendor's
 * code and the caveat, because a customer who chooses from a monitor and is
 * disappointed on site is a real dispute and the render is more persuasive than
 * any small print under it.
 *
 * ON PRICING
 *
 * Only the vendor's published price per gallon is shown, because that is what a
 * customer may see. What Black Phoenix negotiates is not in the model this
 * reads from, so there is nothing here to leak.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Paintbrush, Loader2, Info, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import {
  type PaintColor, type PaintProduct, type PaintSurface,
  SURFACE_LABEL, DEFAULT_COATS, SCREEN_COLOUR_CAVEAT,
  paintLabel, safeHex, gallonsFor, paintCost, paintScopeLine, isOrderable,
} from '../lib/paintModel';
import type { House } from '../lib/houseModel';
import { netWallArea } from '../lib/houseModel';
import { elevationViews, roomViews } from '../lib/houseToTrades';
import type { ScopeLine } from '../lib/scopeModel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const field =
  'px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm '
  + 'focus:outline-none focus:border-[#ea580c]';

/** One thing that can be painted, with the area already worked out. */
interface Paintable {
  key: string;
  where: string;
  surface: PaintSurface;
  areaSqFt: number;
}

/**
 * Every surface the house can put a number against.
 *
 * A room contributes its walls and its ceiling; an elevation contributes its
 * siding, net of the openings it already knows about. Nothing is listed that
 * the app cannot measure — a surface with no area produces no quantity, and a
 * row that always says zero is a row that teaches people to ignore the panel.
 */
function paintables(house: House): Paintable[] {
  const out: Paintable[] = [];

  for (const r of roomViews(house)) {
    const length = Math.max(0, r.widthFt);
    const width = Math.max(0, Number(r.depthFt) || 0);
    const height = Math.max(0, r.heightFt);
    if (length > 0 && width > 0 && height > 0) {
      // Perimeter × height, less the openings this view knows about.
      const holes = r.openings.reduce((s, o) => s + Math.max(0, o.widthFt) * Math.max(0, o.heightFt), 0);
      const walls = Math.max(0, 2 * (length + width) * height - holes);
      out.push({ key: `${r.id}-walls`, where: r.name, surface: 'walls', areaSqFt: Math.round(walls * 10) / 10 });
      out.push({ key: `${r.id}-ceiling`, where: r.name, surface: 'ceiling', areaSqFt: Math.round(length * width * 10) / 10 });
    }
  }

  for (const e of elevationViews(house)) {
    const area = netWallArea(e);
    if (area > 0) {
      out.push({ key: `${e.id}-siding`, where: e.name, surface: 'siding', areaSqFt: Math.round(area * 10) / 10 });
    }
  }

  return out;
}

export default function PaintPanel({
  house,
  onAddToScope,
}: {
  house: House;
  onAddToScope: (lines: Array<Omit<ScopeLine, 'id'>>) => void;
}) {
  const [colors, setColors] = useState<PaintColor[]>([]);
  const [products, setProducts] = useState<PaintProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string, { colorId: string; productId: string; coats: number }>>({});
  const [added, setAdded] = useState(false);

  const surfaces = useMemo(() => paintables(house), [house]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await authedHeaders();
        const [cRes, pRes] = await Promise.all([
          fetch(`${SERVER}/paint/colors`, { headers }),
          fetch(`${SERVER}/paint/products`, { headers }),
        ]);
        if (!cRes.ok) throw new Error(`The colour catalogue responded ${cRes.status}`);
        const cJson = await cRes.json();
        const pJson = pRes.ok ? await pRes.json().catch(() => ({})) : {};
        if (cancelled) return;
        // Anything that is not orderable is dropped on the way in rather than
        // rendered and then refused at the end.
        setColors((Array.isArray(cJson?.colors) ? cJson.colors : []).filter(isOrderable));
        setProducts(Array.isArray(pJson?.products) ? pJson.products : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load the colour catalogue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const set = useCallback((key: string, patch: Partial<{ colorId: string; productId: string; coats: number }>) => {
    setChoice(prev => ({
      ...prev,
      [key]: { colorId: '', productId: '', coats: DEFAULT_COATS, ...prev[key], ...patch },
    }));
    setAdded(false);
  }, []);

  const chosen = surfaces
    .map(s => {
      const c = choice[s.key];
      const color = colors.find(x => x.id === c?.colorId);
      const product = products.find(x => x.id === c?.productId);
      if (!color || !product) return null;
      const coats = c?.coats || DEFAULT_COATS;
      return {
        s, color, product, coats,
        gallons: gallonsFor(s.areaSqFt, product.coverageSqFtPerGal, coats),
      };
    })
    .filter(Boolean) as Array<{ s: Paintable; color: PaintColor; product: PaintProduct; coats: number; gallons: number }>;

  const addAll = () => {
    const lines = chosen
      .map(c => paintScopeLine({
        surface: c.s.surface, where: c.s.where, areaSqFt: c.s.areaSqFt,
        color: c.color, product: c.product, coats: c.coats,
      }))
      .filter(Boolean) as Array<Omit<ScopeLine, 'id'>>;
    if (!lines.length) return;
    onAddToScope(lines);
    setAdded(true);
    toast.success(`${lines.length} paint line${lines.length === 1 ? '' : 's'} added to the scope.`);
  };

  return (
    <div className={card}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
        <Paintbrush className="h-4 w-4 text-[#ea580c]" /> Paint
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Colours come from the vendors' own catalogues, so what is chosen here can be
        ordered by code. Quantities come from the areas the house already knows.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading colours…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">{error}</div>
      ) : colors.length === 0 ? (
        /* Honest rather than helpful-looking. A built-in palette here would
           produce paint codes that do not exist at any counter. */
        <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
          <p className="text-sm text-gray-300">No colours loaded yet.</p>
          <p className="mt-1 text-xs text-gray-500">
            Colours come from a paint vendor's own catalogue — Benjamin Moore,
            Sherwin-Williams or whoever is supplying the job. A vendor uploads their
            deck from their portal, or it arrives from their API. Nothing is invented
            here: an made-up paint code is somebody at a trade counter being told it
            does not exist.
          </p>
        </div>
      ) : surfaces.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nothing measured to paint yet. Capture a room or an elevation and its surfaces
          appear here with their areas.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {surfaces.map(s => {
              const c = choice[s.key];
              const color = colors.find(x => x.id === c?.colorId);
              const product = products.find(x => x.id === c?.productId);
              const coats = c?.coats || DEFAULT_COATS;
              const gallons = product ? gallonsFor(s.areaSqFt, product.coverageSqFtPerGal, coats) : 0;

              return (
                <div key={s.key} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {s.where} <span className="text-gray-500">— {SURFACE_LABEL[s.surface].toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-gray-500">{s.areaSqFt} sq ft</p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* The swatch is decoration beside the code, never instead
                        of it. `safeHex` is why a vendor-supplied string can go
                        in a style attribute at all. */}
                    <span
                      className="h-6 w-6 shrink-0 rounded border border-white/20"
                      style={{ background: safeHex(color?.hex) }}
                      title={paintLabel(color)}
                    />
                    <select
                      className={field}
                      value={c?.colorId || ''}
                      onChange={e => set(s.key, { colorId: e.target.value })}
                    >
                      <option value="">Choose a colour…</option>
                      {colors.map(col => (
                        <option key={col.id} value={col.id}>{paintLabel(col)}</option>
                      ))}
                    </select>

                    <select
                      className={field}
                      value={c?.productId || ''}
                      onChange={e => set(s.key, { productId: e.target.value })}
                    >
                      <option value="">Choose a product…</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.line} {p.sheen} — {p.coverageSqFtPerGal} sq ft/gal
                          {p.pricePerGal > 0 ? ` · $${p.pricePerGal.toFixed(2)}` : ''}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-1.5 text-xs text-gray-400">
                      Coats
                      <input
                        type="number" min={1} max={4}
                        className={`${field} w-16`}
                        value={coats}
                        onChange={e => set(s.key, { coats: Math.max(1, Math.min(4, Number(e.target.value) || 1)) })}
                      />
                    </label>

                    {gallons > 0 && (
                      <span className="text-xs font-semibold text-white">
                        {gallons} gal
                        {product && product.pricePerGal > 0 && (
                          <span className="ml-1 font-normal text-gray-500">
                            · ${paintCost(gallons, product).toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
            <p className="text-xs text-blue-200/80">{SCREEN_COLOUR_CAVEAT}</p>
          </div>

          {chosen.length > 0 && (
            added ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-400">
                <Check className="h-3.5 w-3.5" /> Added to the scope
              </p>
            ) : (
              <button
                onClick={addAll}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Add {chosen.length} paint line{chosen.length === 1 ? '' : 's'} to the scope
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
