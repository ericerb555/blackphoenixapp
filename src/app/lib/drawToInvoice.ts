/**
 * A draw on the payment schedule, turned into an invoice.
 *
 * Eric: "the invoices should be built off the payment schedule." This is the
 * turning. One draw in, one invoice payload out, ready to POST.
 *
 * THE CONSTRAINT THAT DICTATES THE WHOLE SHAPE OF THIS FILE
 *
 * The server does not accept a total. It RECOMPUTES it:
 *
 *     subtotal = sum of the line amounts
 *     tax      = subtotal * rate
 *     total    = subtotal + tax - discount
 *
 * and if the posted total disagrees it logs the fact and uses its own. That
 * is correct — it stopped invoices being stored saying $50 while showing
 * $500 of lines — but it means an invoice cannot simply assert "this draw is
 * $4,390". The lines, the rate and the discount have to be arranged so the
 * server's own arithmetic arrives at the draw amount on its own.
 *
 * So the deposit already collected rides as the DISCOUNT, which is also the
 * honest description of it: the customer is being billed for a phase, less
 * the money they have already paid. And the discount is computed by running
 * the server's exact arithmetic here first, rather than by passing the
 * schedule's `depositCredit` — those two differ by a cent whenever the
 * phase's lines and the apportioned phase value round differently, and a
 * cent is enough to make the invoice disagree with the schedule it came from.
 *
 * WHY HIDDEN LINES ARE STILL SENT
 *
 * Every line of the phase goes into `line_items`, including the ones marked
 * `visible: false`, because the stored invoice is the OFFICE's record and
 * because the total is derived from the lines — dropping them here would
 * reduce the invoice by exactly the hidden amount. Withholding them from the
 * customer is the server projection's job, and it folds rather than deletes,
 * so the money survives the hiding. See `customerInvoiceView`.
 */
import type { Draw } from './paymentSchedule.ts';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface DrawInvoiceLine {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  phase?: string;
  /** Absent means shown. Carried so the customer projection can act on it. */
  visible?: boolean;
}

export interface DrawInvoicePayload {
  line_items: DrawInvoiceLine[];
  tax_rate: number;
  discount_amount: number;
  /** What the server will compute. Sent so a mismatch is logged, not hidden. */
  total_amount: number;
  /**
   * Does this invoice come to the draw amount?
   *
   * False means the quote has been repriced since the schedule was built, so
   * the phase's lines no longer add up to what the customer agreed to pay for
   * that stage. Raising it anyway is a decision somebody should make on
   * purpose, which is why this is surfaced rather than silently corrected.
   */
  matchesDraw: boolean;
  subtotal: number;
  notes: string;
  /** Written onto the invoice so it can be traced back to its draw. */
  drawId: string;
  quoteId?: string;
  phase?: string | null;
}

export interface DrawInvoiceOptions {
  quote: any;
  draw: Draw;
  /** Percentage, as the invoice record stores it — 8.75 not 0.0875. */
  taxRatePercent?: number;
}

/**
 * The quote's lines for one phase, in materials-then-labour order.
 *
 * Read straight off the quote rather than through `selectQuoteLines`,
 * because that marks withheld lines with "(hidden from customer)" in the
 * description — right for a rendered document, wrong for a stored record
 * that the customer projection will later read and fold.
 */
function phaseLines(quote: any, phase: string): DrawInvoiceLine[] {
  const out: DrawInvoiceLine[] = [];
  const match = (p: any) => String(p || '').trim() === phase;
  /**
   * A line taken off the quote is not billed.
   *
   * Absent means included. This has to agree with `recalculateTotals` in the
   * editor and with `selectQuoteLines`, because the draw amount was computed
   * from the phase subtotals those produce — if this disagreed, the invoice's
   * lines would not reconcile to the draw and the discount would clamp.
   */
  const onQuote = (line: any) => line?.included !== false;

  for (const m of Array.isArray(quote?.materials) ? quote.materials : []) {
    if (!match(m?.phase) || !onQuote(m)) continue;
    const quantity = Number(m?.quantity) || 0;
    const unit_price = Number(m?.unitCost) || 0;
    out.push({
      line_number: out.length + 1,
      description: [m?.name, m?.description].filter(Boolean).join(' — ') || 'Material',
      quantity,
      unit_price,
      amount: round2(quantity * unit_price),
      phase,
      ...(m?.visible === false ? { visible: false } : {}),
    });
  }

  for (const l of Array.isArray(quote?.labor) ? quote.labor : []) {
    if (!match(l?.phase) || !onQuote(l)) continue;
    const quantity = Number(l?.hours) || 0;
    const unit_price = Number(l?.hourlyRate) || 0;
    out.push({
      line_number: out.length + 1,
      description: [l?.role, l?.description].filter(Boolean).join(' — ') || 'Labour',
      quantity,
      unit_price,
      amount: round2(quantity * unit_price),
      phase,
      ...(l?.visible === false ? { visible: false } : {}),
    });
  }

  return out.map((line, i) => ({ ...line, line_number: i + 1 }));
}

/**
 * Build the invoice payload for one draw.
 *
 * A deposit or balance draw has no phase to itemise, so it bills as a single
 * line at its own amount with no tax applied — the deposit is a percentage
 * of the TAX-INCLUSIVE contract, so adding tax on top of it would charge the
 * tax twice. The tax on a deposit is collected as part of the phase draws,
 * which is where it belongs.
 */
export function drawToInvoice(options: DrawInvoiceOptions): DrawInvoicePayload {
  const { quote, draw, taxRatePercent } = options;

  const drawAmount = round2(draw?.amount);
  const quoteId = quote?.id ? String(quote.id) : undefined;

  /* ── a deposit or a balance: one line, no tax, no discount ───────────── */
  if (!draw?.phase) {
    return {
      line_items: [{
        line_number: 1,
        description: draw?.label || 'Payment',
        quantity: 1,
        unit_price: drawAmount,
        amount: drawAmount,
      }],
      tax_rate: 0,
      discount_amount: 0,
      total_amount: drawAmount,
      matchesDraw: true,
      subtotal: drawAmount,
      notes: draw?.trigger || '',
      drawId: String(draw?.id || ''),
      quoteId,
      phase: null,
    };
  }

  /* ── a phase draw: the phase's lines, taxed, less the deposit ────────── */
  const lines = phaseLines(quote, draw.phase);
  const rate = Number.isFinite(Number(taxRatePercent))
    ? Number(taxRatePercent)
    : normalisedTaxRate(quote);

  // Exactly the server's arithmetic, in the server's order.
  const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const tax = round2(subtotal * (rate / 100));

  /**
   * Whatever it takes to land on the draw.
   *
   * Normally this is the deposit credited against this phase. It is derived
   * rather than copied so that the invoice total equals the draw to the
   * cent even when the phase's own lines and the apportioned phase value
   * round apart — which they do, because one is summed from line items and
   * the other is a share of the contract.
   */
  const wanted = round2(subtotal + tax - drawAmount);

  /**
   * A NEGATIVE DISCOUNT IS ALLOWED, BUT ONLY BY PENNIES.
   *
   * The schedule apportions a TAX-INCLUSIVE contract total using the phases'
   * PRE-TAX subtotals as weights, so a phase's allocated share and the figure
   * its own lines produce can land a few cents apart. They are two correct
   * answers to slightly different questions, and neither is wrong.
   *
   * Something has to absorb that, and the discount is the right place: it is
   * already the reconciliation line. Letting it go a few cents negative keeps
   * the invoice equal to the draw the customer agreed to, which is the
   * property that actually matters — nobody has ever queried a 5c
   * apportionment residue, and everybody notices an invoice that does not
   * match the schedule it came from.
   *
   * Beyond the band it is not rounding, it is a schedule that has drifted
   * from the quote — a phase repriced, a line deleted. Then the discount
   * clamps at zero and the invoice bills what the lines are honestly worth,
   * so the disagreement is visible rather than papered over by an invented
   * negative discount of several hundred dollars.
   */
  const ROUNDING_BAND = 2;
  const discount = wanted < 0 && wanted >= -ROUNDING_BAND ? wanted : Math.max(0, wanted);
  const total = round2(subtotal + tax - discount);

  return {
    line_items: lines,
    tax_rate: rate,
    discount_amount: discount,
    total_amount: total,
    /** False when the invoice will not equal its draw — the UI must say so. */
    matchesDraw: total === drawAmount,
    subtotal,
    notes: draw.trigger || '',
    drawId: String(draw.id || ''),
    quoteId,
    phase: draw.phase,
  };
}

/**
 * The quote's tax rate as a percentage.
 *
 * Quotes have stored it both ways over time — 0.0875 and 8.75 — so a value
 * at or below 1 is read as a fraction. A 1% construction tax does not exist
 * here, and reading 0.0875 as "0.09%" would undercharge the tax by a factor
 * of a hundred on every invoice, silently.
 */
export function normalisedTaxRate(quote: any): number {
  const raw = Number(quote?.taxRate);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw <= 1 ? round2(raw * 100) : round2(raw);
}
