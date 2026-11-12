/**
 * What an hour of labour actually costs, as opposed to what it pays.
 *
 * WHAT WAS MISSING
 *
 * `grep -ri burden` across this server and the pricing libraries returned
 * nothing. Every labour figure in the system — the estimator's, the editor's,
 * the invoice's — is `hours × hourlyRate`, and `hourlyRate` is a WAGE. The
 * money an employer spends to put somebody on site for an hour is larger than
 * the wage by payroll taxes, workers' compensation, liability insurance and
 * whatever benefits are paid, and in construction that gap is commonly a
 * quarter to a half of the wage again.
 *
 * So every quote this system has produced understates what its own labour
 * costs, and the margin calculated on top of it is a margin on an
 * understated base. That is wrong in the direction nobody notices: the job
 * looks profitable on the quote and is thinner in the bank.
 *
 * Eric: "start with the burden."
 *
 * ABSENT MEANS ZERO, AND THAT IS THE WHOLE SAFETY PROPERTY
 *
 * There is no sensible default burden rate. It depends on the state, the
 * trade, the comp classification and what the company actually pays, and a
 * guess would silently reprice every job. So an unset burden is zero and this
 * module is INERT until somebody stores a real rate — every figure comes out
 * exactly as it does today until that happens, which is what makes it safe to
 * ship before the rate is known.
 *
 * APPLIED EXACTLY ONCE
 *
 * The one way this hurts rather than helps is being applied twice — once into
 * a line's cost and again by something that re-reads the wage. Two rules make
 * that checkable:
 *
 *   1. A burdened figure is NEVER written back into `hourlyRate`. That field
 *      keeps its meaning — the wage — everywhere, forever. Burden travels as
 *      its own field beside it.
 *   2. Burden is computed from `wage`, never from a figure that might already
 *      carry it. `burdenedRate` takes a wage and returns a cost; there is no
 *      function here that takes a cost.
 *
 * `quoteMargins.ts` exists because two modules once disagreed about whether a
 * rate was 10 or 0.10 and shipped 40% overhead on every repriced quote. This
 * is the same class of arithmetic and gets the same treatment: one module,
 * dependency-free, below the Deno/browser line so the server and the browser
 * cannot hold different answers, and tested to the penny.
 */
import { asFraction } from "./quoteCustomerPrice.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The components, each a percentage of wage.
 *
 * Separate rather than one number because they are separately knowable and
 * separately argued about: a comp rate comes off the policy, payroll tax is
 * statutory, benefits are what the company chose. Somebody checking a quote
 * six months later can see which part they disagree with.
 *
 * A single `burdenPercent` is honoured too, for a company that knows its
 * blended rate and nothing else.
 */
export interface BurdenSettings {
  /** Employer payroll taxes — FICA, FUTA, SUTA. */
  payrollTaxPercent?: number;
  /** Workers' compensation premium. The one that varies most by trade. */
  workersCompPercent?: number;
  /** General liability and any umbrella attributable to payroll. */
  liabilityPercent?: number;
  /** Employer-paid benefits: health, retirement, holiday, training. */
  benefitsPercent?: number;
  /**
   * A blended rate, used INSTEAD of the components when it is set.
   *
   * Not added to them. A company that knows its blended burden should not
   * have to zero four other fields to stop them stacking on top of it, and
   * silently summing both would double what it believes it is paying.
   */
  burdenPercent?: number;
}

export interface Burden {
  payrollTax: number;
  workersComp: number;
  liability: number;
  benefits: number;
  /** The fraction of wage added. 0.35 means a $40 wage costs $54. */
  rate: number;
  /** `1 + rate`. Multiply a wage by this to get what the hour costs. */
  factor: number;
  /** True when a real rate is configured — false means this is doing nothing. */
  configured: boolean;
  /** Which shape the rate came from, for a screen that has to explain itself. */
  source: "blended" | "components" | "unset";
}

/**
 * A burden over 100% of wage is not a burden, it is a typo.
 *
 * Real construction burden runs roughly 20-60%. The ceiling is deliberately
 * generous rather than tight — a union shop in a high-comp trade can be high
 * — but it stops a percentage entered as 3500 from pricing a job at
 * thirty-six times its labour. `quoteMargins.pickFraction` caps for the same
 * reason and after the same kind of incident.
 */
const CEILING = 1;

const clamped = (value: unknown): number => {
  const f = asFraction(value);
  return f > CEILING ? CEILING : f;
};

/** The burden this company has configured, or nothing at all. */
export function burdenOf(settings: BurdenSettings | null | undefined): Burden {
  const blended = clamped(settings?.burdenPercent);
  if (blended > 0) {
    return {
      payrollTax: 0, workersComp: 0, liability: 0, benefits: 0,
      rate: blended, factor: 1 + blended, configured: true, source: "blended",
    };
  }

  const payrollTax = clamped(settings?.payrollTaxPercent);
  const workersComp = clamped(settings?.workersCompPercent);
  const liability = clamped(settings?.liabilityPercent);
  const benefits = clamped(settings?.benefitsPercent);
  const summed = payrollTax + workersComp + liability + benefits;
  /**
   * The SUM is capped as well as each part. Four plausible components can add
   * up to an implausible total, and the total is what multiplies the wage.
   */
  const rate = summed > CEILING ? CEILING : summed;

  return {
    payrollTax, workersComp, liability, benefits,
    rate,
    factor: 1 + rate,
    configured: rate > 0,
    source: rate > 0 ? "components" : "unset",
  };
}

/** What one hour of this wage costs the company. */
export function burdenedRate(wage: unknown, burden: Burden): number {
  const w = Number(wage);
  if (!Number.isFinite(w) || w <= 0) return 0;
  return round2(w * burden.factor);
}

/**
 * What a labour line costs, and what of that is burden.
 *
 * `cost` is the figure that belongs in a labour subtotal and therefore in the
 * base a margin is taken on. `burden` is reported separately so a quote can
 * say what it is carrying rather than only that it is carrying something.
 *
 * Rounding happens ONCE, on the product. Rounding the rate first and
 * multiplying by hours multiplies the rounding error by the hours, which on a
 * 160-hour line is cents of drift on a figure somebody will check.
 */
export function burdenedLabor(
  wage: unknown, hours: unknown, burden: Burden,
): { wage: number; hours: number; cost: number; burden: number; unburdened: number } {
  const w = Number(wage);
  const h = Number(hours);
  const safeWage = Number.isFinite(w) && w > 0 ? w : 0;
  const safeHours = Number.isFinite(h) && h > 0 ? h : 0;

  const unburdened = round2(safeWage * safeHours);
  const cost = round2(safeWage * safeHours * burden.factor);
  return {
    wage: safeWage,
    hours: safeHours,
    cost,
    burden: round2(cost - unburdened),
    unburdened,
  };
}

/**
 * The burden on a labour subtotal that was computed without it.
 *
 * For the reporting case — showing what the current, unburdened quotes are
 * missing — without touching what they charge. Takes an UNBURDENED subtotal,
 * which is what every stored quote currently holds.
 */
export function burdenOnSubtotal(unburdenedSubtotal: unknown, burden: Burden): number {
  const base = Number(unburdenedSubtotal);
  if (!Number.isFinite(base) || base <= 0) return 0;
  return round2(base * burden.rate);
}

/** "22% payroll tax + 9% comp" — what the figure is made of, for a screen. */
export function describeBurden(burden: Burden): string {
  if (!burden.configured) return "";
  if (burden.source === "blended") return `${round2(burden.rate * 100)}% labour burden`;
  const pct = (f: number) => `${round2(f * 100)}%`;
  const parts: string[] = [];
  if (burden.payrollTax > 0) parts.push(`${pct(burden.payrollTax)} payroll tax`);
  if (burden.workersComp > 0) parts.push(`${pct(burden.workersComp)} workers' comp`);
  if (burden.liability > 0) parts.push(`${pct(burden.liability)} liability`);
  if (burden.benefits > 0) parts.push(`${pct(burden.benefits)} benefits`);
  return parts.join(" + ");
}
