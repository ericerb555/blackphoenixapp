/**
 * A siding job, counted.
 *
 * WHY THE ELEVATIONS ARE TYPED IN
 *
 * Siding is sold by the square and a fifteen percent error in facade area is
 * real money, so the quantities have to come from somewhere trustworthy. A
 * photograph is not that: the analysis in the design centre reads one wall of a
 * house and reports its own confidence about the numbers it took from it.
 *
 * So this asks for the walls. Four numbers a wall — how long, how tall, how far
 * the gable rises, how many storeys — is a few minutes with a tape and produces
 * an order somebody can actually place. Each wall records where its numbers came
 * from, and the takeoff is only ever as good as its weakest one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Home, Info, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Elevation, ExteriorModel, SidingMaterial, DimensionSource } from '../lib/exteriorModel';
import { DEFAULT_EXTERIOR } from '../lib/exteriorModel';
import { buildSidingQuote, DEFAULT_SIDING_OPTIONS } from '../lib/sidingQuote';
import { exteriorFromCapture, captureSummary } from '../lib/sidingFromCapture';
import { priceSiding, tradeRatesFrom, type TradeRates } from '../lib/sidingPricing';
import { DEFAULT_QUOTE_OPTIONS, type QuoteOptions } from '../lib/deckQuote';
import { publishDeckQuote } from '../lib/publishQuote';
import ProjectLinkPanel, { type DesignLink } from './ProjectLinkPanel';
import { fileToDataUrl, framesFromVideo, dataUrlBytes } from '../lib/imageCapture';
import { isVideoFile } from '../lib/localFolder';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}
/** Comfortably inside the edge request limit, same budget the house capture uses. */
const MAX_PAYLOAD_BYTES = 4_000_000;
const MAX_IMAGES = 12;

const MATERIALS: Array<{ id: SidingMaterial; label: string }> = [
  { id: 'vinyl', label: 'Vinyl' },
  { id: 'fibre-cement', label: 'Fibre cement' },
  { id: 'wood', label: 'Cedar' },
  { id: 'engineered-wood', label: 'Engineered wood' },
];

const SOURCES: Array<{ id: DimensionSource; label: string; hint: string }> = [
  { id: 'measured', label: 'Measured', hint: 'Someone put a tape on it.' },
  { id: 'scaled', label: 'Scaled', hint: 'Taken from a photo with a known-size object in it.' },
  { id: 'estimated', label: 'Estimated', hint: 'Assumed from typical construction. Not an order.' },
];

const blankWall = (n: number): Elevation => ({
  id: `wall-${n}`,
  label: ['Front', 'Back', 'Left', 'Right'][n - 1] || `Wall ${n}`,
  widthFt: 0,
  heightFt: 9,
  gableRiseFt: 0,
  openings: [],
  storeys: 1,
  source: 'measured',
});

const field = 'w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ea580c]';
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

/**
 * `initial` exists so a capture can seed the walls rather than making somebody
 * type what has already been read off a photograph. Nothing passes it yet; it
 * is the seam the interior and exterior captures plug into.
 */
export default function SidingTakeoff({ initial }: { initial?: Partial<ExteriorModel> } = {}) {
  const [model, setModel] = useState<ExteriorModel>({
    ...DEFAULT_EXTERIOR,
    elevations: [blankWall(1), blankWall(2), blankWall(3), blankWall(4)],
    ...initial,
  });
  const [includeTearOff, setIncludeTearOff] = useState(true);
  const [reading, setReading] = useState<string | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);
  // Whether a sheet of paper was put in the shot. It is the difference between
  // walls that are scaled and walls that are guessed, so it is asked plainly
  // rather than inferred.
  const [usedScaleSheet, setUsedScaleSheet] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  /**
   * Read the walls off photographs.
   *
   * Video is welcome and is turned into frames here, because walking the
   * building is how somebody naturally captures four elevations, and parallax
   * across those frames is most of what makes a wall length recoverable at all.
   */
  const readFromPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setReading('Reading the photos');
    setReadNote(null);
    try {
      const shots: string[] = [];
      for (const f of Array.from(files)) {
        if (shots.length >= MAX_IMAGES) break;
        if (isVideoFile(f)) {
          const room = MAX_IMAGES - shots.length;
          shots.push(...await framesFromVideo(f, Math.min(6, room)));
        } else {
          shots.push(await fileToDataUrl(f));
        }
      }
      if (!shots.length) throw new Error('Nothing in that selection could be read.');

      // Trim from the end rather than failing the request outright.
      let send = shots;
      while (send.length > 1 && send.reduce((n, p) => n + dataUrlBytes(p), 0) > MAX_PAYLOAD_BYTES) {
        send = send.slice(0, -1);
      }

      setReading('Working out the walls');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/house-capture/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: send,
          subject: 'siding',
          scaleRefs: usedScaleSheet ? [{ object: 'letter', placement: 'wall' }] : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Could not read those photos (${res.status}).`);

      const seeded = exteriorFromCapture(json.analysis || {});
      if (!seeded.elevations?.length) {
        toast.error('No walls could be read from those photos.');
        setReadNote(captureSummary(seeded));
        return;
      }
      // Merged over what is already set, so the corner count and waste factor
      // somebody has adjusted are not thrown away by a re-read.
      setModel(m => ({ ...m, ...seeded }));
      setReadNote(captureSummary(seeded));
      toast.success(`${seeded.elevations.length} walls read from the photos.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not read those photos.');
    } finally {
      setReading(null);
    }
  };

  const patch = (i: number, p: Partial<Elevation>) =>
    setModel(m => ({ ...m, elevations: m.elevations.map((e, n) => (n === i ? { ...e, ...p } : e)) }));

  const quote = useMemo(
    () => buildSidingQuote(model, { ...DEFAULT_SIDING_OPTIONS, includeTearOff }),
    [model, includeTearOff],
  );

  /* ── money ──────────────────────────────────────────────────────────────
     Prices and rates from the same places every other quote in this business
     uses. Nothing about siding is priced by arithmetic of its own. */
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<TradeRates>({});
  const [opts, setOpts] = useState<QuoteOptions>(DEFAULT_QUOTE_OPTIONS);
  const [link, setLink] = useState<DesignLink>({ customerId: '', customerName: '', jobId: '', jobTitle: '' });
  const [publishing, setPublishing] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await headers();
        const [rateRes, cfgRes] = await Promise.all([
          fetch(`${SERVER}/labor-rates/get`, { headers: h }),
          fetch(`${SERVER}/pricing-config/get`, { headers: h }),
        ]);
        const r = await rateRes.json().catch(() => ({}));
        const cfg = await cfgRes.json().catch(() => ({}));
        setRates(tradeRatesFrom(r?.laborRates || []));
        const config = cfg?.config || {};
        setOpts(o => ({
          ...o,
          marginPct: Number(config.profitMargin ?? 0) || 0,
          taxRatePct: Number(config.taxRate ?? 0) || 0,
        }));
      } catch { /* quantities are still worth showing */ }
    })();
  }, []);

  // Keyed on the SKUs, not the quantities — changing a wall length changes
  // every quantity and no SKU, and pricing on each keystroke would be a request
  // per character.
  const skuKey = useMemo(() => quote.lines.map(l => l.sku).sort().join('|'), [quote.lines]);
  useEffect(() => {
    if (!skuKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/quote/price-lines`, {
          method: 'POST', headers: await headers(),
          body: JSON.stringify({
            lines: quote.lines.filter(l => l.category !== 'Labour')
              .map(l => ({ sku: l.sku, description: l.description })),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json?.success) return;
        const next: Record<string, number> = {};
        for (const p of json.priced || []) if (Number(p.unitPrice) > 0) next[p.sku] = Number(p.unitPrice);
        setMaterialPrices(next);
      } catch { /* leaves lines unpriced, which is said out loud below */ }
    })();
    return () => { cancelled = true; };
  }, [skuKey]);

  const priced = useMemo(
    () => priceSiding(quote.lines, materialPrices, rates, opts),
    [quote.lines, materialPrices, rates, opts],
  );

  /**
   * Send it down the same path a deck quote takes.
   *
   * Same publisher, same two writes, same refusals. A siding quote that reached
   * the pipeline by some other route would be the island all over again.
   */
  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const result = await publishDeckQuote({
        link, lines: priced.lines, totals: priced.totals,
        unpricedCount: priced.unpricedCount,
        designId: null, designVersion: null,
        kind: 'siding', fallbackTitle: 'Siding',
        existingQuoteId: quoteId,
      });
      if (!result.ok) { toast.error(result.error || 'Could not create the quote.'); return; }
      setQuoteId(result.quoteId || null);
      if (result.error) toast.warning(result.error);
      else toast.success('Siding quote created — on the pipeline and in their portal.');
    } finally {
      setPublishing(false);
    }
  }, [link, priced, quoteId]);

  // Nothing is worth showing until at least one wall has a size.
  const ready = model.elevations.some(e => Number(e.widthFt) > 0 && Number(e.heightFt) > 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Home className="h-6 w-6 text-[#ea580c]" /> Siding takeoff
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Measure each wall once. Quantities and hours come out the other side.
          </p>
        </div>

        {/* ── read the walls off photos ───────────────────────────────── */}
        <div className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => photoInput.current?.click()} disabled={!!reading}
              className="flex items-center gap-2 rounded-xl border border-[#ea580c]/40 bg-[#ea580c]/10 px-4 py-2.5 text-sm font-bold text-[#ea580c] transition hover:bg-[#ea580c]/20 disabled:opacity-40">
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {reading || 'Read the walls from photos'}
            </button>
            <input ref={photoInput} type="file" multiple accept="image/*,video/*" className="hidden"
              onChange={e => { readFromPhotos(e.target.files); e.currentTarget.value = ''; }} />

            {/*
              Asked rather than assumed. A sheet of paper taped to the wall is
              the difference between walls that are scaled against something
              real and walls guessed from typical construction, and claiming the
              first when it was the second is the one thing this must not do.
            */}
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" checked={usedScaleSheet} onChange={e => setUsedScaleSheet(e.target.checked)}
                className="h-4 w-4 accent-[#ea580c]" />
              A sheet of printer paper is taped to the wall in these photos
            </label>
          </div>

          <p className="mt-2 text-[11px] text-gray-600">
            Walk the building — photos or a video of each side. Nothing read from a photograph is
            ever treated as measured; tape a sheet of paper to the wall and it can at least be
            scaled against something real.
          </p>

          {readNote && (
            <p className="mt-2 flex gap-2 text-[11px] text-amber-500/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {readNote}
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {/* ── the walls ─────────────────────────────────────────────── */}
          <div className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">The walls</h2>
              <button
                onClick={() => setModel(m => ({ ...m, elevations: [...m.elevations, blankWall(m.elevations.length + 1)] }))}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5">
                <Plus className="h-3.5 w-3.5" /> Add a wall
              </button>
            </div>

            <div className="space-y-3">
              {model.elevations.map((e, i) => (
                <div key={e.id} className="rounded-xl border border-[#242424] bg-[#0d0d0d] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input value={e.label} onChange={ev => patch(i, { label: ev.target.value })}
                      className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none" />
                    {model.elevations.length > 1 && (
                      <button onClick={() => setModel(m => ({ ...m, elevations: m.elevations.filter((_, n) => n !== i) }))}
                        className="text-gray-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {([
                      ['widthFt', 'Length ft', e.widthFt],
                      ['heightFt', 'To eave ft', e.heightFt],
                      ['gableRiseFt', 'Gable rise ft', e.gableRiseFt || 0],
                      ['storeys', 'Storeys', e.storeys || 1],
                    ] as const).map(([key, label, value]) => (
                      <label key={key} className="block">
                        <span className="text-[10px] font-semibold text-gray-500">{label}</span>
                        <input value={String(value)} inputMode="decimal"
                          onChange={ev => patch(i, { [key]: Number(ev.target.value) || 0 } as any)}
                          className={`${field} mt-0.5`} />
                      </label>
                    ))}
                  </div>

                  {/* Openings, kept simple: how many and what size. Trim follows
                      every one of them; only the big ones come off the area. */}
                  <div className="mt-2 flex items-end gap-2">
                    <label className="flex-1">
                      <span className="text-[10px] font-semibold text-gray-500">Windows &amp; doors — count</span>
                      <input value={String(e.openings[0]?.count ?? 0)} inputMode="numeric"
                        onChange={ev => patch(i, {
                          openings: [{
                            kind: 'window',
                            widthFt: e.openings[0]?.widthFt || 3,
                            heightFt: e.openings[0]?.heightFt || 4,
                            count: Number(ev.target.value) || 0,
                          }],
                        })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-semibold text-gray-500">each, ft wide</span>
                      <input value={String(e.openings[0]?.widthFt ?? 3)} inputMode="decimal"
                        onChange={ev => patch(i, {
                          openings: [{ kind: 'window', widthFt: Number(ev.target.value) || 0, heightFt: e.openings[0]?.heightFt || 4, count: e.openings[0]?.count || 0 }],
                        })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-semibold text-gray-500">ft tall</span>
                      <input value={String(e.openings[0]?.heightFt ?? 4)} inputMode="decimal"
                        onChange={ev => patch(i, {
                          openings: [{ kind: 'window', widthFt: e.openings[0]?.widthFt || 3, heightFt: Number(ev.target.value) || 0, count: e.openings[0]?.count || 0 }],
                        })}
                        className={`${field} mt-0.5`} />
                    </label>
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    {SOURCES.map(s => (
                      <button key={s.id} onClick={() => patch(i, { source: s.id })} title={s.hint}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                          e.source === s.id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-400 hover:bg-white/5'
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── the job ───────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className={card}>
              <h2 className="mb-3 text-sm font-bold text-white">The job</h2>

              <div className="mb-3 grid grid-cols-4 gap-1.5">
                {MATERIALS.map(m => (
                  <button key={m.id} onClick={() => setModel(v => ({ ...v, material: m.id }))}
                    className={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                      model.material === m.id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-300 hover:bg-white/5'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  ['outsideCorners', 'Outside corners'],
                  ['insideCorners', 'Inside corners'],
                  ['cornerHeightFt', 'Corner height ft'],
                  ['wasteFactorPct', 'Waste %'],
                  ['minDeductSqFt', 'Deduct over sq ft'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-[10px] font-semibold text-gray-500">{label}</span>
                    <input value={String((model as any)[key])} inputMode="decimal"
                      onChange={ev => setModel(m => ({ ...m, [key]: Number(ev.target.value) || 0 }))}
                      className={`${field} mt-0.5`} />
                  </label>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={model.includeWrap}
                    onChange={e => setModel(m => ({ ...m, includeWrap: e.target.checked }))}
                    className="h-4 w-4 accent-[#ea580c]" />
                  House wrap
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={includeTearOff}
                    onChange={e => setIncludeTearOff(e.target.checked)}
                    className="h-4 w-4 accent-[#ea580c]" />
                  Strip the existing siding and skip it
                </label>
              </div>
            </div>

            {ready && (
              <>
                <div className={card}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Gross wall" value={`${quote.takeoff.grossSqFt} sq ft`} />
                    <Stat label="Openings out" value={`${quote.takeoff.deductedSqFt} sq ft`} />
                    <Stat label="Covered" value={`${quote.takeoff.netSqFt} sq ft`} />
                    <Stat label="Order" value={`${quote.takeoff.squares} squares`} accent />
                  </div>
                  {/*
                    The note travels with the numbers, because a quote is exactly
                    where somebody forgets the walls were never measured.
                  */}
                  <p className={`mt-3 flex gap-2 text-[11px] ${
                    quote.basis === 'measured' ? 'text-gray-500' : 'text-amber-500/90'
                  }`}>
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {quote.note}
                  </p>
                </div>

                <div className={card}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-sm font-bold text-white">Materials and labour</h2>
                    <span className="text-xs text-gray-500">{quote.totalHours} hours</span>
                  </div>
                  <div className="space-y-1.5">
                    {quote.lines.map(l => (
                      <div key={l.sku} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-0">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-white">{l.description}</p>
                          <p className="truncate text-[10px] text-gray-600">{l.basis}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-[#ea580c]">
                          {l.qty} {l.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-gray-600">
                    Priced from the vendor catalogue and your trade rates, the same as every other
                    quote. Each trade is charged at its own rate — hanging at the siding rate, a
                    tear-out at the labouring rate.
                  </p>
                </div>

                {/* ── the quote ─────────────────────────────────────────── */}
                <div className={card}>
                  <h2 className="mb-3 text-sm font-bold text-white">Quote</h2>
                  <div className="space-y-1.5 text-sm">
                    <Stat label="Materials" value={`$${priced.totals.materials.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                    <Stat label="Labour" value={`$${priced.totals.labour.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                    <Stat label={`Margin ${opts.marginPct}%`} value={`$${priced.totals.margin.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                    <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-xl font-bold text-[#ea580c]">
                        ${priced.totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {priced.unpricedCount > 0 && (
                    <p className="mt-3 flex gap-2 text-[11px] text-amber-500/90">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {priced.unpricedCount} {priced.unpricedCount === 1 ? 'line has' : 'lines have'} no
                      price, so this total is short by whatever they cost.
                    </p>
                  )}

                  <button onClick={publish} disabled={publishing}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {quoteId ? 'Update the quote' : 'Create the quote'}
                  </button>
                  <p className="mt-2 text-[11px] text-gray-600">
                    {link.customerEmail
                      ? <>Goes to the pipeline{link.jobId ? ' against this job' : ''} and to {link.customerName || 'the customer'}&apos;s portal.</>
                      : <span className="text-amber-500/90">Pick a customer below — without their email a quote never reaches their portal.</span>}
                  </p>
                </div>

                {/* Who it is for. The same panel the deck designer uses, so a
                    siding job attaches to a customer and a work request exactly
                    as a deck does. */}
                <PanelWrap>
                  <ProjectLinkPanel designId={null} link={link} onLink={setLink} />
                </PanelWrap>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Keeps a borrowed panel from inheriting this page's card padding twice. */
function PanelWrap({ children }: { children: any }) {
  return <div className="[&>div]:!bg-[#111]">{children}</div>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${accent ? 'text-[#ea580c]' : 'text-white'}`}>{value}</p>
    </div>
  );
}
