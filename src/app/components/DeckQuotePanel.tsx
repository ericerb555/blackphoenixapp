/**
 * Pricing the deck that has just been designed.
 *
 * WHY THIS DID NOT EXIST
 *
 * `deckQuote.ts` has been here, complete and tested, and nothing ever called
 * it. The design centre could produce a framing plan, a permit packet and a
 * build specification — and no price. So a design had to be re-estimated
 * somewhere else by hand, which is how the drawing and the quote come to
 * disagree.
 *
 * WHERE THE NUMBERS COME FROM
 *
 * Quantities are exact: they fall out of `buildMembers`, the same function the
 * 3D view and the framing plan draw. There is no estimating step and nothing to
 * disagree with.
 *
 * Money comes from the same places as every other quote in this business —
 * labour from the trade rates, margin and tax from the pricing settings, and
 * material from the vendor catalogue, falling back to figures typed here for
 * the recurring lumber and hardware lines no vendor happens to publish.
 *
 * Which of those a line came from is shown, never blurred. A vendor's published
 * price and a number somebody typed are both real and are not the same claim,
 * and anything with neither is shown as unpriced rather than quietly left out
 * of the total.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign, Loader2, Save, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { DeckModel } from '../lib/deckModel';
import { buildQuoteLines, quoteTotals, DEFAULT_QUOTE_OPTIONS, type PriceBook, type QuoteOptions } from '../lib/deckQuote';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { publishDeckQuote } from '../lib/publishQuote';
import type { DesignLink } from './ProjectLinkPanel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

export default function DeckQuotePanel({ model, link, designId, designVersion, projectName }: {
  model: DeckModel;
  /** Who and which job. Without it there is nowhere for a quote to go. */
  link: DesignLink;
  designId: string | null;
  designVersion: number | null;
  projectName?: string;
}) {
  const [publishing, setPublishing] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceBook>({});
  const [opts, setOpts] = useState<QuoteOptions>(DEFAULT_QUOTE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  /** Which figures are the company's own and which are the standard table. */
  const [usingStandards, setUsingStandards] = useState(false);
  /** Where each material price came from, so the two kinds are never blurred. */
  const [sources, setSources] = useState<Record<string, { source: string; vendor: string; priceAsOf: string | null }>>({});
  const [catalogueSize, setCatalogueSize] = useState(0);

  /**
   * Everything the money side needs, pulled together in one go.
   *
   * The labour rate for a deck is the carpentry rate — a deck is carpentry, and
   * inventing a separate "deck rate" would mean two numbers to keep in step.
   */
  useEffect(() => {
    (async () => {
      try {
        const h = await headers();
        // Material prices are not fetched here any more — they come from the
        // pricing route below, which consults the vendor catalogue first.
        const [rateRes, cfgRes] = await Promise.all([
          fetch(`${SERVER}/labor-rates/get`, { headers: h }),
          fetch(`${SERVER}/pricing-config/get`, { headers: h }),
        ]);
        const rates = await rateRes.json().catch(() => ({}));
        const cfg = await cfgRes.json().catch(() => ({}));

        const carpentry = (rates?.laborRates || []).find((r: any) => String(r.id) === 'carpentry');
        const config = cfg?.config || {};
        setUsingStandards(Boolean(rates?.usingStandards || cfg?.usingStandards));
        setOpts(o => ({
          ...o,
          labourRate: Number(carpentry?.hourlyRate) || 0,
          marginPct: Number(config.profitMargin ?? 0) || 0,
          taxRatePct: Number(config.taxRate ?? 0) || 0,
        }));
      } catch {
        // A quote from quantities alone is still worth showing.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { lines, unpricedCount } = useMemo(
    () => buildQuoteLines(model, prices, opts),
    [model, prices, opts],
  );
  const totals = useMemo(() => quoteTotals(lines, opts), [lines, opts]);

  /**
   * Ask the server what these lines cost.
   *
   * The catalogue match runs there because that is where the matcher lives and
   * where work-request quotes already use it. A second matcher in the browser
   * would be how the same board comes to be priced two ways depending on which
   * screen asked.
   *
   * Keyed on the set of SKUs rather than on the lines themselves: dragging a
   * width slider changes every quantity and no SKU, and re-pricing on every
   * frame of that would be a request per pixel.
   */
  const skuKey = useMemo(() => lines.map(l => l.sku).sort().join('|'), [lines]);
  useEffect(() => {
    if (!skuKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/deck-quote/price`, {
          method: 'POST', headers: await headers(),
          body: JSON.stringify({
            lines: lines.filter(l => l.category !== 'Labour').map(l => ({ sku: l.sku, description: l.description })),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !json?.success) return;
        const next: PriceBook = {};
        const src: Record<string, { source: string; vendor: string; priceAsOf: string | null }> = {};
        for (const p of json.priced || []) {
          if (Number(p.unitPrice) > 0) next[p.sku] = Number(p.unitPrice);
          src[p.sku] = { source: p.source, vendor: p.vendor || '', priceAsOf: p.priceAsOf || null };
        }
        setPrices(next);
        setSources(src);
        setCatalogueSize(Number(json.catalogueSize) || 0);
      } catch {
        // Quantities are still worth showing when pricing is unreachable.
      }
    })();
    return () => { cancelled = true; };
  }, [skuKey]);

  const savePrices = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/deck-price-book`, {
        method: 'PUT', headers: await headers(), body: JSON.stringify({ prices }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error || 'Could not save prices.');
      setDirty(false);
      toast.success('Prices saved — every deck from now on uses them.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not save prices.');
    } finally {
      setSaving(false);
    }
  }, [prices]);

  /**
   * Send this to the pipeline and to the customer.
   *
   * The refusals live in `publishDeckQuote` rather than in the button's
   * disabled state, because a disabled button explains nothing. A quote that
   * cannot reach the customer should say which piece is missing.
   */
  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const result = await publishDeckQuote({
        link, lines, totals, unpricedCount, designId, designVersion, projectName,
        existingQuoteId: quoteId,
      });
      if (!result.ok) { toast.error(result.error || 'Could not create the quote.'); return; }
      setQuoteId(result.quoteId || null);
      if (result.error) toast.warning(result.error);
      else toast.success(link.jobId
        ? 'Quote created — it is on the pipeline and in their portal.'
        : 'Quote created and sent to their portal.');
    } finally {
      setPublishing(false);
    }
  }, [link, lines, totals, unpricedCount, designId, designVersion, projectName, quoteId]);

  const setPrice = (sku: string, value: string) => {
    const n = Number(value);
    setPrices(p => ({ ...p, [sku]: Number.isFinite(n) && n >= 0 ? n : 0 }));
    setDirty(true);
  };

  if (loading) {
    return (
      <div className={`${card} flex items-center gap-2 text-sm text-gray-400`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your rates and prices…
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className={card}>
        <p className="text-sm text-gray-400">Set a width and a depth and the quote builds itself from the framing.</p>
      </div>
    );
  }

  const byCategory = lines.reduce<Record<string, typeof lines>>((acc, l) => {
    (acc[l.category] ||= []).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <DollarSign className="h-4 w-4 text-[#ea580c]" /> Quote
          </h2>
          {dirty && (
            <button onClick={savePrices} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[#ea580c] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save prices
            </button>
          )}
        </div>

        {/*
          Said before the totals rather than after them. Somebody reading a
          number wants to know what is missing from it at the moment they read
          it, not once they have already quoted from it.
        */}
        {unpricedCount > 0 && (
          <p className="mb-3 flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 text-[11px] text-amber-500/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {unpricedCount} {unpricedCount === 1 ? 'line has' : 'lines have'} no price yet, so the total below is
            short by whatever they cost.{' '}
            {catalogueSize === 0
              ? 'No vendor has published a catalogue yet, so type a price against each one — it is saved and every deck after this uses it.'
              : 'Nothing in the vendor catalogue matches them. Type a price against each one, or publish them to a vendor catalogue where they carry a date.'}
          </p>
        )}

        {opts.labourRate <= 0 && (
          <p className="mb-3 text-[11px] text-amber-500/90">
            No carpentry rate is set, so labour is not in this total.
          </p>
        )}

        <div className="space-y-3">
          {Object.entries(byCategory).map(([category, group]) => (
            <div key={category}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">{category}</p>
              <div className="space-y-1">
                {group.map(l => (
                  <div key={l.sku} className="flex items-center gap-3 border-b border-white/5 pb-1 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-white">{l.description}</p>
                      <p className="truncate text-[10px] text-gray-600">
                        {l.qty} {l.unit}{l.basis ? ` · ${l.basis}` : ''}
                      </p>
                      {/*
                        A vendor's published price and a number somebody typed
                        are both real and are not the same claim. Which one this
                        is gets said on the line, not in a footnote.
                      */}
                      {sources[l.sku]?.source === 'catalogue' && (
                        <p className="truncate text-[10px] text-emerald-500/80">
                          {sources[l.sku].vendor || 'Vendor catalogue'}
                          {sources[l.sku].priceAsOf ? ` · ${String(sources[l.sku].priceAsOf).slice(0, 10)}` : ''}
                        </p>
                      )}
                      {sources[l.sku]?.source === 'your-price' && (
                        <p className="truncate text-[10px] text-gray-500">Your price</p>
                      )}
                    </div>
                    {l.category === 'Labour' ? (
                      <span className="shrink-0 text-xs font-semibold text-[#ea580c]">{money(l.total)}</span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <input
                          value={String(prices[l.sku] ?? '')}
                          onChange={e => setPrice(l.sku, e.target.value)}
                          inputMode="decimal" placeholder="price"
                          className={`w-20 rounded-md border bg-[#0a0a0a] px-2 py-1 text-right text-xs text-white placeholder-gray-600 focus:outline-none ${
                            l.unpriced ? 'border-amber-500/40' : 'border-[#2a2a2a] focus:border-[#ea580c]'
                          }`} />
                        <span className={`w-20 text-right text-xs font-semibold ${l.unpriced ? 'text-gray-600' : 'text-[#ea580c]'}`}>
                          {l.unpriced ? '—' : money(l.total)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <div className="space-y-1.5 text-sm">
          <Row label="Materials" value={money(totals.materials)} />
          <Row label={`Labour${opts.labourRate > 0 ? ` at ${money(opts.labourRate)}/hr` : ''}`} value={money(totals.labour)} />
          <Row label="Subtotal" value={money(totals.subtotal)} />
          <Row label={`Margin ${opts.marginPct}%`} value={money(totals.margin)} />
          <Row label={`Tax ${opts.taxRatePct}%`} value={money(totals.tax)} />
          <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-xl font-bold text-[#ea580c]">{money(totals.total)}</span>
          </div>
        </div>

        {/*
          The same distinction the repricing draws for work-request quotes: a
          standard figure is defensible and it is not this company's figure, and
          a quote should never let the two read alike.
        */}
        <p className="mt-3 text-[11px] text-gray-600">
          {unpricedCount > 0
            ? `Incomplete — ${unpricedCount} unpriced ${unpricedCount === 1 ? 'line' : 'lines'} are not in this total.`
            : usingStandards
              ? 'Priced from your material prices, with standard trade rates and markups. Save your own to make them yours.'
              : 'Priced from your own material prices, trade rates and markups.'}
        </p>

        {/*
          The point of the whole stage. Until this exists the design centre is a
          calculator, and a price that reaches nothing has to be retyped
          somewhere else — which is where a drawing and a quote start to
          disagree.
        */}
        <button onClick={publish} disabled={publishing}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {quoteId ? 'Update the quote' : 'Create the quote'}
        </button>

        <p className="mt-2 text-[11px] text-gray-600">
          {link.customerEmail
            ? <>Goes to the pipeline{link.jobId ? ' against this job' : ''} and to {link.customerName || 'the customer'}&apos;s portal as a draft.</>
            : <span className="text-amber-500/90">Pick a customer first — without their email a quote never reaches their portal.</span>}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
