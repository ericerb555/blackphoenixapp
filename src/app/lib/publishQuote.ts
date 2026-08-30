/**
 * Turning a priced design into a quote the rest of the business can see.
 *
 * WHY THIS EXISTS
 *
 * The design centre could produce a framing plan, a permit packet and a total,
 * and none of it reached the pipeline. A price that is displayed and stored
 * nowhere has to be retyped somewhere else, and the moment it is retyped the
 * drawing and the quote can disagree.
 *
 * TWO WRITES, NOT ONE
 *
 * A quote lives in two places and both matter:
 *
 *   `quote:{id}`            — what the customer's portal reads, scoped to them
 *                             by `ownsQuote` matching on their email
 *   `pipeline/items/{id}`   — what the board shows, carrying the stage
 *
 * Writing only the first leaves the pipeline unaware. Writing only the second
 * leaves the customer unable to see their own quote. The existing auto-generate
 * flow does both, and so does this.
 *
 * THE FAILURE WORTH GUARDING
 *
 * Without the customer's email a quote is stored successfully, looks correct on
 * the board, and is invisible in their portal forever, with nothing anywhere to
 * say why. So it is refused rather than written, and refused loudly.
 */

import { supabase } from './supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { QuoteLine, QuoteTotals } from './deckQuote';
import type { DesignLink } from '../components/ProjectLinkPanel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function authed() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

export interface PublishInput {
  link: DesignLink;
  lines: QuoteLine[];
  totals: QuoteTotals;
  unpricedCount: number;
  designId: string | null;
  /** Bumped every save, so a quote can say which design it was made from. */
  designVersion: number | null;
  projectName?: string;
  /** An existing quote to revise rather than duplicate. */
  existingQuoteId?: string | null;
}

export interface PublishResult {
  ok: boolean;
  error?: string;
  quoteId?: string;
}

/** Human-readable, and stable enough to search for on a phone. */
function quoteNumber(): string {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `Q-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Why this quote must not be written, if it must not be.
 *
 * Pure and separate from the writing, because these are the conditions under
 * which a quote is worse than no quote, and each fails silently if it is not
 * checked: a quote with no email is stored, looks right on the board, and never
 * appears in the customer's portal; a quote missing priced lines is a number in
 * front of a customer that is short by whatever they cost.
 */
export function quoteRefusalReason(
  link: { customerEmail?: string },
  lineCount: number,
  unpricedCount: number,
): string | null {
  if (!String(link?.customerEmail || '').trim()) {
    return 'This design has no customer email, so a quote would never reach their portal. Pick the customer first.';
  }
  if (lineCount <= 0) return 'There is nothing to quote yet.';
  if (unpricedCount > 0) {
    return `${unpricedCount} ${unpricedCount === 1 ? 'line has' : 'lines have'} no price, so this total is short. Price them before quoting.`;
  }
  return null;
}

export async function publishDeckQuote(input: PublishInput): Promise<PublishResult> {
  const { link, lines, totals, unpricedCount, designId, designVersion } = input;

  const refusal = quoteRefusalReason(link, lines.length, unpricedCount);
  if (refusal) return { ok: false, error: refusal };

  const email = String(link.customerEmail || '').trim();
  const id = input.existingQuoteId || `quote_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Materials and labour kept apart, because that is how the pipeline's quote
  // editor and the customer's portal both present a quote.
  const materials = lines.filter(l => l.category !== 'Labour').map(l => ({
    sku: l.sku, name: l.description, quantity: l.qty, unit: l.unit,
    unitPrice: l.unitPrice, total: l.total,
  }));
  const labor = lines.filter(l => l.category === 'Labour').map(l => ({
    sku: l.sku, name: l.description, quantity: l.qty, unit: l.unit,
    unitPrice: l.unitPrice, total: l.total,
  }));

  const quote = {
    id,
    number: quoteNumber(),
    status: 'draft',
    // Every spelling `ownsQuote` looks at. Belt and braces on the one field
    // whose absence makes a quote invisible.
    clientEmail: email,
    customerEmail: email,
    clientName: link.customerName || '',
    customerName: link.customerName || '',
    customerId: link.customerId || '',
    workRequestId: link.jobId || '',
    // What this quote was made from, so it can later be shown as out of date
    // when the design moves past it.
    designId: designId || '',
    designVersion: designVersion ?? null,
    // Cleared here rather than anywhere else: the quote is being rewritten from
    // the design as it stands, so by definition it is no longer behind it. The
    // server sets this flag on save; bringing the quote up to date is the only
    // thing that clears it.
    designStale: false,
    designStaleAt: null,
    designKind: 'decks',
    title: input.projectName || link.jobTitle || 'Deck',
    address: link.jobAddress || '',
    items: [...materials, ...labor],
    materials,
    labor,
    materialsSubtotal: totals.materials,
    laborSubtotal: totals.labour,
    subtotal: totals.subtotal,
    margin: totals.margin,
    taxAmount: totals.tax,
    total: totals.total,
    totalCost: totals.total,
    issueDate: now,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const res = await fetch(`${SERVER}/quotes`, {
      method: 'POST', headers: await authed(), body: JSON.stringify(quote),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.error || `Could not save the quote (${res.status}).` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Could not save the quote.' };
  }

  // The board. Best effort on purpose: the quote itself is written and the
  // customer can see it, so failing here is worth reporting but is not worth
  // discarding a saved quote over.
  if (link.jobId) {
    try {
      const h = await authed();
      const listRes = await fetch(`${SERVER}/pipeline/items`, { headers: h });
      const listJson = await listRes.json().catch(() => ({}));
      const existing = (listJson?.items || []).find((i: any) => String(i.id) === String(link.jobId));

      const item = {
        ...(existing || { id: link.jobId, customerName: link.customerName || '', customerEmail: email }),
        // Only ever forward. A job already at contract or invoice must not be
        // dragged back to a draft because somebody re-priced the deck.
        stage: existing && ['contract', 'invoice', 'payment', 'quote-approved', 'quote-sent'].includes(existing.stage)
          ? existing.stage
          : 'quote-draft',
        quote: {
          id, quoteNumber: quote.number, materials, labor,
          materialsSubtotal: totals.materials, laborSubtotal: totals.labour,
          taxAmount: totals.tax, totalCost: totals.total,
          // Cleared on the board as well as on the quote — this copy is the one
          // the pipeline card reads.
          designStale: false, designVersion: designVersion ?? null,
        },
        estimatedValue: totals.total,
        lastModified: now,
      };

      let put = await fetch(`${SERVER}/pipeline/items/${encodeURIComponent(String(link.jobId))}`, {
        method: 'PUT', headers: h, body: JSON.stringify(item),
      });
      if (put.status === 404) {
        await fetch(`${SERVER}/pipeline/items`, { method: 'POST', headers: h, body: JSON.stringify(item) });
      }
    } catch {
      return { ok: true, quoteId: id, error: 'Quote saved, but the pipeline board could not be updated.' };
    }
  }

  return { ok: true, quoteId: id };
}
