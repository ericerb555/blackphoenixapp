/**
 * Phoenix Exchange — claiming your listing.
 *
 * The screen the whole claim system was missing. Engine, schema, routes and
 * the review queue were all built and deployed, and the button on the listing
 * page was inert — so no business could actually start.
 *
 * STARTING IS AN EXPLICIT ACT, NEVER SOMETHING A PAGE LOAD DOES
 *
 * `POST /exchange/claim/start` is idempotent and would have made a convenient
 * "get or create" on mount. It is not called that way, because on a listing
 * somebody already holds it opens a DISPUTE and emails the current owner. A
 * page that emails a stranger's business because somebody opened a URL is
 * indefensible, so the claim starts when a person presses a button, and the
 * dispute case says plainly what pressing it will do before they do.
 *
 * The claim id is kept in session storage so a refresh resumes through
 * `GET /exchange/claim/:id` rather than posting start again. That is a
 * convenience and nothing more — the server checks the claim belongs to the
 * caller and answers 404 if it does not, so a copied id gets nothing.
 *
 * WHAT THIS SCREEN WILL NOT DO
 *
 * It never says which factors would be enough, beyond what the server returns
 * as outstanding, and it never shows a contact detail the listing does not
 * already show — targets arrive masked and are rendered as they arrive. The
 * registry contact is not always the public one, and this screen must not
 * become a way to read it.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. This page names its own classes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Loader2, AlertCircle, CheckCircle2, Clock, LogIn,
  Phone, Mail, Globe, FileText, ArrowRight, Store,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { CLAIM_CSS } from './exchangeClaimStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface FactorOption {
  factor: string;
  category: string;
  label: string;
  manual: boolean;
  available: boolean;
  target: string | null;
}

interface ClaimView {
  id: string;
  state: string;
  business: { slug: string | null; name: string | null };
  proven: string[];
  outstanding: string[];
  reason: string;
  isDispute: boolean;
  disputeDecidesAfter: string | null;
  options: FactorOption[];
}

/** What each factor asks of the person, in their words rather than ours. */
const FACTOR_ICON: Record<string, typeof Phone> = {
  phone_code: Phone,
  email_code: Mail,
  domain_email: Globe,
  dns_token: Globe,
  licence_match: FileText,
  documents: FileText,
};

const CATEGORY_WORDS: Record<string, string> = {
  contact: 'the contact on the public record',
  web: 'control of the business’s website',
  premises: 'the business premises',
  credential: 'a licence or documents',
};

export default function ExchangeClaim() {
  const slug = useMemo(
    () => new URLSearchParams(window.location.search).get('slug') || '',
    [],
  );

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [claim, setClaim] = useState<ClaimView | null>(null);
  const [listingName, setListingName] = useState<string>('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-factor working state.
  const [busyFactor, setBusyFactor] = useState<string | null>(null);
  const [issued, setIssued] = useState<Record<string, { sentTo: string | null; instruction: string | null }>>({});
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [domainEmail, setDomainEmail] = useState('');
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);

  const storageKey = `bpx_claim:${slug}`;

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${publicAnonKey}`;
  }, []);

  /** The listing, so the page can name the business before a claim exists. */
  const loadListing = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/exchange/listing/${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success && body.listing) {
        setListingName(String(body.listing.name || ''));
        setAlreadyClaimed(Boolean(body.listing.claimed));
      }
    } catch { /* the claim can still proceed without the name */ }
  }, [slug]);

  const loadClaim = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${SERVER}/exchange/claim/${encodeURIComponent(id)}`, {
        headers: { Authorization: await authHeader() },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        setClaim(body.claim);
        return true;
      }
      // A claim that is not ours, or is gone. Forget it and start over.
      try { sessionStorage.removeItem(storageKey); } catch { /* nothing to forget */ }
      return false;
    } catch {
      return false;
    }
  }, [authHeader, storageKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!slug) { setError('No business was named.'); setLoading(false); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSignedIn(Boolean(session?.access_token));

        await loadListing();
        if (cancelled) return;

        if (session?.access_token) {
          let existing = '';
          try { existing = sessionStorage.getItem(storageKey) || ''; } catch { existing = ''; }
          if (existing) await loadClaim(existing);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug, loadListing, loadClaim, storageKey]);

  /**
   * Start. Only ever from a press, and only after the dispute warning has been
   * shown for a listing somebody already holds.
   */
  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/exchange/claim/start`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setError(body?.error || 'We could not start that claim.');
        return;
      }
      setClaim(body.claim);
      try { sessionStorage.setItem(storageKey, body.claim.id); } catch { /* resume is a convenience */ }
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setStarting(false);
    }
  }, [authHeader, slug, storageKey]);

  /** Ask for a code, a token, or a human review. */
  const request = useCallback(async (option: FactorOption) => {
    if (!claim) return;
    setBusyFactor(option.factor);
    setSaid(null);
    try {
      const payload: Record<string, unknown> = { factor: option.factor };
      if (option.factor === 'domain_email') payload.email = domainEmail.trim();

      const res = await fetch(`${SERVER}/exchange/claim/${claim.id}/factor`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setSaid({ ok: false, text: body?.error || 'That did not go through.' });
        return;
      }
      setIssued((m) => ({
        ...m,
        [option.factor]: { sentTo: body.sentTo ?? null, instruction: body.instruction ?? null },
      }));
      if (body.manual) {
        setSaid({ ok: true, text: body.instruction || 'A reviewer will be in touch.' });
        await loadClaim(claim.id);
      }
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setBusyFactor(null);
    }
  }, [claim, domainEmail, authHeader, loadClaim]);

  /** Answer one. */
  const answer = useCallback(async (option: FactorOption) => {
    if (!claim) return;
    setBusyFactor(option.factor);
    setSaid(null);
    try {
      const res = await fetch(`${SERVER}/exchange/claim/${claim.id}/answer`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ factor: option.factor, code: codes[option.factor] || '' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        const left = typeof body?.attemptsLeft === 'number' ? ` ${body.attemptsLeft} attempt(s) left.` : '';
        setSaid({ ok: false, text: `${body?.error || 'That did not go through.'}${left}` });
        return;
      }
      setClaim(body.claim);
      setCodes((c) => ({ ...c, [option.factor]: '' }));
      setSaid({ ok: true, text: 'Proven.' });
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setBusyFactor(null);
    }
  }, [claim, codes, authHeader]);

  const listingHref = slug ? `/exchange-listing?slug=${encodeURIComponent(slug)}` : '/exchange';

  /* ── shells ─────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="bpx">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-center"><Loader2 size={26} className="animate-spin" color="#9ca3af" /></div>
      </div>
    );
  }

  if (error && !claim) {
    return (
      <div className="bpx">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-center">
          <div className="bpx-panel">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <a className="bpx-btn" href={listingHref}>Back to the listing</a>
          </div>
        </div>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <div className="bpx">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-center">
          <div className="bpx-panel">
            <LogIn size={26} color="#9ca3af" />
            <div className="bpx-card-title">Sign in to claim this listing</div>
            <div className="bpx-desc">
              A claim has to belong to an account, because claiming puts you in
              control of what the public sees about {listingName || 'this business'}.
            </div>
            <a className="bpx-btn bpx-btn-primary" href="/login">Sign in</a>
            <a className="bpx-btn" href={listingHref}>Back to the listing</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{BROWSE_CSS}</style>
      <style>{CLAIM_CSS}</style>

      <div className="bpx-shell">
        <a className="bpxb-crumb" href={listingHref}>
          <Store size={14} /> {listingName || 'The listing'}
        </a>

        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><ShieldCheck size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Claim {listingName || 'this listing'}</div>
                <div className="bpxb-section-tag">
                  Prove you control the business, and the listing becomes yours
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── not started ─────────────────────────────────────────────── */}
        {!claim && (
          <div className="bpx-card">
            <div className="bpx-card-body bpxc-block">
              <div className="bpx-card-title">What this involves</div>
              <div className="bpx-desc">
                We ask you to prove two different kinds of control — for example a
                code sent to the phone number on the public record, and an email
                address at the business’s own domain. Two of the same kind does
                not count, because one of them could belong to anybody.
              </div>

              {alreadyClaimed && (
                <div className="bpxc-warn">
                  <AlertCircle size={15} />
                  <div>
                    <strong>This listing is already claimed by another account.</strong>
                    <div>
                      Starting here opens a dispute rather than a claim. The current
                      holder is told straight away, nothing changes while it is looked
                      at, and a person decides. If you are the owner and somebody else
                      has taken your listing, this is the right thing to do.
                    </div>
                  </div>
                </div>
              )}

              <button
                className="bpx-btn bpx-btn-primary"
                style={{ alignSelf: 'flex-start' }}
                disabled={starting}
                onClick={() => void start()}
              >
                {starting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {alreadyClaimed ? 'Open a dispute' : 'Start the claim'}
              </button>
            </div>
          </div>
        )}

        {/* ── decided ─────────────────────────────────────────────────── */}
        {claim && claim.state === 'granted' && (
          <div className="bpx-empty">
            <CheckCircle2 size={28} color="#86efac" />
            <div className="bpx-card-title">The listing is yours</div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>
              {claim.reason} Your six-month trial has started, and the contact on
              the public record has been told the listing was claimed.
            </div>
            <a className="bpx-btn bpx-btn-primary" href={listingHref}>See your listing</a>
          </div>
        )}

        {claim && (claim.state === 'needs_review' || claim.state === 'disputed') && (
          <div className="bpx-empty">
            <Clock size={28} color="#fdba74" />
            <div className="bpx-card-title">
              {claim.state === 'disputed' ? 'A person is looking at this' : 'Waiting on a person'}
            </div>
            <div className="bpx-desc" style={{ maxWidth: 460 }}>{claim.reason}</div>
            {claim.disputeDecidesAfter && (
              <div className="bpxb-note">
                The current holder has until{' '}
                {new Date(claim.disputeDecidesAfter).toLocaleDateString()} to respond.
              </div>
            )}
          </div>
        )}

        {claim && claim.state === 'refused' && (
          <div className="bpx-empty">
            <AlertCircle size={28} color="#fca5a5" />
            <div className="bpx-card-title">This claim was refused</div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>{claim.reason}</div>
          </div>
        )}

        {/* ── in progress ─────────────────────────────────────────────── */}
        {claim && claim.state === 'open' && (
          <>
            <div className="bpxc-progress">
              <div className="bpxc-progress-line">{claim.reason}</div>
              <div className="bpx-row">
                {claim.proven.map((c) => (
                  <span key={c} className="bpx-pill bpxb-pill-claimed">
                    <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {CATEGORY_WORDS[c] || c}
                  </span>
                ))}
                {claim.outstanding.map((c) => (
                  <span key={c} className="bpx-pill bpxb-pill-listed">
                    still needed: {CATEGORY_WORDS[c] || c}
                  </span>
                ))}
              </div>
            </div>

            <div className="bpx-list">
              {claim.options.filter((o) => o.available).map((option) => {
                const Icon = FACTOR_ICON[option.factor] || ShieldCheck;
                const here = issued[option.factor];
                const working = busyFactor === option.factor;
                const done = claim.proven.includes(option.category);

                return (
                  <div key={option.factor} className="bpx-card">
                    <div className="bpx-card-body bpxc-factor" data-done={done}>
                      <div className="bpxc-factor-head">
                        <span className="bpxc-factor-label">
                          <Icon size={15} /> {option.label}
                        </span>
                        {done && (
                          <span className="bpx-pill bpxb-pill-claimed">Proven</span>
                        )}
                      </div>

                      {option.target && (
                        <div className="bpxb-note">We would use {option.target}</div>
                      )}

                      {!done && option.factor === 'domain_email' && !here && (
                        <input
                          className="bpxc-input"
                          type="email"
                          placeholder={`you@${option.target || 'yourdomain.com'}`}
                          value={domainEmail}
                          onChange={(e) => setDomainEmail(e.target.value)}
                        />
                      )}

                      {here?.instruction && (
                        <div className="bpxc-instruction">{here.instruction}</div>
                      )}
                      {here?.sentTo && (
                        <div className="bpxb-note">Sent to {here.sentTo}. It expires in ten minutes.</div>
                      )}

                      {!done && (
                        <div className="bpx-row">
                          <button
                            className="bpx-btn"
                            disabled={working}
                            onClick={() => void request(option)}
                          >
                            {working ? <Loader2 size={14} className="animate-spin" /> : null}
                            {here ? 'Send again' : option.manual ? 'Ask for a review' : 'Send'}
                          </button>

                          {here && !option.manual && option.factor !== 'dns_token' && (
                            <>
                              <input
                                className="bpxc-input bpxc-input-code"
                                inputMode="numeric"
                                placeholder="6-digit code"
                                maxLength={6}
                                value={codes[option.factor] || ''}
                                onChange={(e) => setCodes((c) => ({ ...c, [option.factor]: e.target.value }))}
                              />
                              <button
                                className="bpx-btn bpx-btn-primary"
                                disabled={working || !(codes[option.factor] || '').trim()}
                                onClick={() => void answer(option)}
                              >
                                Check
                              </button>
                            </>
                          )}

                          {here && option.factor === 'dns_token' && (
                            <button
                              className="bpx-btn bpx-btn-primary"
                              disabled={working}
                              onClick={() => void answer(option)}
                            >
                              Check the record
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {said && (
              <div className={said.ok ? 'bpxb-said' : 'bpxb-failed'}>{said.text}</div>
            )}

            <div className="bpxb-note">
              Codes last ten minutes and allow five attempts. There is a limit on
              how many we will send for one listing in a day, so that this cannot
              be used to bother a business that has not asked to hear from us.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
