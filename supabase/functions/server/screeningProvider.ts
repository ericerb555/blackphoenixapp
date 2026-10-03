/**
 * Where a screening report actually comes from.
 *
 * WHY AN INTERFACE BEFORE THERE IS A PROVIDER
 *
 * Because there is no consumer reporting agency agreement yet, and there was a
 * choice between waiting for one and building the flow against something
 * honest. Writing the provider's name through the routes and swapping it later
 * means touching every route when the real one arrives; one interface means the
 * routes never learn who the provider is. The whole of phase 1 is therefore
 * testable today, and phase 3 adds a file rather than editing twelve places.
 *
 * It also keeps the property that matters legally. Each provider owns its own
 * identity collection — the applicant types their Social Security number on the
 * agency's page, never on ours — so `createOrder` takes a name and an email and
 * returns somewhere to send the applicant. There is deliberately nowhere in this
 * interface to pass an SSN, because there is nowhere in this system that should
 * be able to hold one.
 *
 * WHAT A PROVIDER MAY NOT DO
 *
 * Return a score, a band, a recommendation, or any part of the report body. It
 * returns a reference and a URL. We do not store reports and we do not decide
 * tenancies; see the closing section of `tasks/tenant-screening.md` for why the
 * second half of that is a fair-housing matter and not a design preference.
 */

import type { ScreeningState, AgencyDisclosure } from './screeningOrder.ts';

export interface CreateOrderInput {
  orderId: string;
  applicantName: string;
  applicantEmail: string;
  /** Where the applicant should land after the provider's flow. */
  returnUrl?: string;
}

export interface CreateOrderResult {
  /** The provider's own handle for this screening. Stored; never shown. */
  providerRef: string;
  /** Where to send the applicant to prove who they are. */
  inviteUrl: string;
  /** When that invitation stops working, if the provider says. */
  inviteExpiresAt?: string | null;
}

export interface ProviderStatus {
  /** Mapped to our own vocabulary by the provider, not by the caller. */
  status: ScreeningState;
  /** Set only when the provider explains a failure. */
  failureReason?: string | null;
}

export interface ScreeningProvider {
  readonly name: string;
  /** Whether this provider can be used for real work. */
  readonly live: boolean;
  /**
   * Who to name on an adverse-action notice, or `null` when not known.
   *
   * Belongs to the provider because it is a fact about who furnished the
   * report. Null is not a gap to paper over: a notice that names no agency
   * cannot tell somebody where their file is, which is the only thing it is
   * for, so the notice is refused rather than issued incomplete.
   */
  readonly agency: AgencyDisclosure | null;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  fetchStatus(providerRef: string): Promise<ProviderStatus>;
  /**
   * A short-lived link to the report, for a landlord who may see it.
   *
   * Short-lived is the provider's job and we do not cache the result: a stored
   * report URL is a stored report, reachable by anybody who finds the string.
   */
  reportUrl(providerRef: string): Promise<string | null>;
}

/**
 * The manual provider — a test harness, and plainly labelled as one.
 *
 * It issues no invitation anybody can use and produces no report. Its purpose is
 * that the order flow, the state machine, the ownership checks and the landlord
 * and applicant screens can all be exercised end to end before any agreement
 * exists, which is the only way phase 1 could be verified at all.
 *
 * `live` is false, and the routes refuse to hand out a report link from a
 * provider that is not live. That matters more than it looks: without it, a
 * landlord could advance a manual order to `complete` and be shown something
 * that resembles a screening report and is not one. A fake report is worse than
 * no report, because somebody would act on it.
 */
export const manualProvider: ScreeningProvider = {
  name: 'manual',
  live: false,
  // No agency, because no agency furnished anything. A manual order therefore
  // cannot produce an adverse-action notice, which is correct: there is no
  // report for one to be about.
  agency: null,

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    return {
      providerRef: `manual_${input.orderId}`,
      inviteUrl: '',
      inviteExpiresAt: null,
    };
  },

  async fetchStatus(): Promise<ProviderStatus> {
    // A manual order never advances on its own. Staff move it, through the
    // test-harness route, and nothing else does.
    return { status: 'invited' };
  },

  async reportUrl(): Promise<string | null> {
    return null;
  },
};

const PROVIDERS: Readonly<Record<string, ScreeningProvider>> = {
  manual: manualProvider,
};

/**
 * The provider for a name, or `null`.
 *
 * Null rather than a fallback to `manual`: silently substituting a provider that
 * cannot produce a report would turn a configuration mistake into an order that
 * sits in `invited` for ever with nobody able to say why.
 */
export function providerFor(name: string | null | undefined): ScreeningProvider | null {
  return PROVIDERS[String(name ?? '').trim().toLowerCase()] ?? null;
}

/** The provider new orders are created with, until a real one is configured. */
export const DEFAULT_PROVIDER = 'manual';
