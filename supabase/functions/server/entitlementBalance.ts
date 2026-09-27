/**
 * entitlementBalance — rebuilding a balance from the events that made it.
 *
 * WHY THIS EXISTS
 *
 * `recordEntitlementEvent` keeps a running balance and appends an entry for
 * every event. The running balance is what portals read, and it is a cache: it
 * is correct only for as long as every change goes through that function.
 *
 * Anything that writes a balance around the ledger — a route bumping
 * `plan.hours.used` on its own, a migration, a hand edit — leaves the cache
 * saying one thing and the events saying another, and nothing notices. A
 * customer's remaining hours then depend on which number somebody happened to
 * read.
 *
 * So this replays the entries and says what the balance SHOULD be. Comparing
 * the two is the second guard: the first stops the same event being applied
 * twice, and this catches anything that never went through the ledger at all.
 *
 * IT REPORTS, IT DOES NOT REPAIR
 *
 * Deliberately. Silently rewriting a balance hides the route that caused the
 * drift, and the drift comes back next week with nobody the wiser. Worse, it
 * rewrites a number somebody may have already been invoiced against. Drift is
 * a thing to be shown a person.
 *
 * THE REPLAY MUST MATCH THE WRITER EXACTLY
 *
 * Including the parts that look odd — hours are consumed against the balance as
 * it stood at that moment, so anything beyond it became overage then and stays
 * overage now, even if hours were granted afterwards. Reordering or
 * recalculating that would produce a "correct" number that disagrees with what
 * the customer was told at the time.
 */

export interface LedgerEntry {
  sourceType?: string;
  hoursDelta?: number;
  creditDelta?: number;
  amountDelta?: number;
  feature?: string;
  featureQuantity?: number;
  createdAt?: string;
}

export interface EntitlementBalance {
  hoursGranted: number;
  hoursUsed: number;
  hoursRemaining: number;
  overageHours: number;
  amountPaid: number;
  amountRefunded: number;
  creditsGranted: number;
  creditsRedeemed: number;
  creditsRemaining: number;
  features: Record<string, number>;
}

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function emptyBalance(): EntitlementBalance {
  return {
    hoursGranted: 0, hoursUsed: 0, hoursRemaining: 0, overageHours: 0,
    amountPaid: 0, amountRefunded: 0,
    creditsGranted: 0, creditsRedeemed: 0, creditsRemaining: 0,
    features: {},
  };
}

/**
 * The balance these entries add up to.
 *
 * Entries are replayed oldest first. An entry with no timestamp keeps its given
 * position rather than being sorted to the front, because an undated event is
 * of unknown age and guessing it was first would change every deduction after
 * it.
 */
export function recomputeBalance(entries: LedgerEntry[] | null | undefined): EntitlementBalance {
  const balance = emptyBalance();

  const ordered = [...(entries || [])].sort((a, b) => {
    const left = String(a?.createdAt || '');
    const right = String(b?.createdAt || '');
    if (!left || !right) return 0;
    return left.localeCompare(right);
  });

  for (const entry of ordered) {
    if (!entry) continue;

    const hours = num(entry.hoursDelta);
    if (hours > 0) balance.hoursGranted += hours;
    if (hours < 0) {
      const requested = Math.abs(hours);
      // Against the balance as it stood — see the note above.
      const covered = Math.min(balance.hoursRemaining, requested);
      balance.hoursUsed += covered;
      balance.overageHours += Math.max(0, requested - covered);
    }
    balance.hoursRemaining = Math.max(0, balance.hoursGranted - balance.hoursUsed);

    if (entry.sourceType === 'payment') balance.amountPaid += num(entry.amountDelta);
    if (entry.sourceType === 'refund') balance.amountRefunded += Math.abs(num(entry.amountDelta));

    const credit = num(entry.creditDelta);
    if (credit > 0) balance.creditsGranted += credit;
    if (credit < 0) balance.creditsRedeemed += Math.abs(credit);
    balance.creditsRemaining = balance.creditsGranted - balance.creditsRedeemed;

    if (entry.feature) {
      balance.features[entry.feature] =
        (balance.features[entry.feature] || 0) + (entry.featureQuantity === undefined ? 1 : num(entry.featureQuantity));
    }
  }

  return balance;
}

export interface Drift {
  field: string;
  stored: number;
  fromLedger: number;
  difference: number;
}

/** Every figure where the stored balance and the replayed one disagree. */
export function compareBalances(
  stored: Partial<EntitlementBalance> | null | undefined,
  fromLedger: EntitlementBalance,
): Drift[] {
  const fields: Array<keyof EntitlementBalance> = [
    'hoursGranted', 'hoursUsed', 'hoursRemaining', 'overageHours',
    'amountPaid', 'amountRefunded',
    'creditsGranted', 'creditsRedeemed', 'creditsRemaining',
  ];

  const drift: Drift[] = [];
  for (const field of fields) {
    const a = num(stored?.[field]);
    const b = num(fromLedger[field]);
    /**
     * A hundredth is the tolerance, because money and hours are both carried as
     * floating point here and 0.1 + 0.2 is famously not 0.3. Anything larger is
     * a real disagreement rather than an artefact of addition.
     */
    if (Math.abs(a - b) > 0.005) {
      drift.push({ field, stored: a, fromLedger: b, difference: Math.round((a - b) * 100) / 100 });
    }
  }
  return drift;
}
