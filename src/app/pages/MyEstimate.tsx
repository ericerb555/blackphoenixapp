/**
 * The junk job, as the person who asked about it sees it.
 *
 * Eric, 2026-11-20: *"give them a portal on confirmation a customer portal"*.
 *
 * Reached at `/my-estimate/<token>` with no account and no password —
 * possession of the link is the authorisation, the way it already is for
 * `/junk-quote`, architect reviews and returns. `estimatePortal.ts` sets out
 * why it cannot be a login: the contact details on one of these are
 * unverified, and `confirm-anonymous` refuses to treat them as ownership for
 * exactly that reason.
 *
 * READ-ONLY, DELIBERATELY. No signing, approving or scheduling. A link that
 * arrives by text gets forwarded and screenshotted — a window survives that,
 * a button that commits somebody to a thousand pounds of work does not.
 *
 * A dead link says one thing however it died. Telling a stranger "expired"
 * confirms it was once real.
 */
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';
import { publicAnonKey } from '../utils/supabase/info';

const money = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${Math.round(v).toLocaleString()}` : '—';
};

export default function MyEstimate() {
  const [state, setState] = useState<'loading' | 'ok' | 'gone'>('loading');
  const [estimate, setEstimate] = useState<any>(null);

  useEffect(() => { document.title = 'Your junk removal estimate | Black Phoenix'; }, []);

  useEffect(() => {
    /*
     * The token is the last path segment. A bare path rather than a query
     * string for the same reason `junkLinks` uses one: a text message client
     * will truncate two parameters sooner or later.
     */
    const token = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
    if (!token || token === 'my-estimate') { setState('gone'); return; }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/make-server-3eae23a6/trash-estimator/portal/${encodeURIComponent(token)}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } },
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.success || !data.estimate) { setState('gone'); return; }
        setEstimate(data.estimate);
        setState('ok');
      } catch {
        if (!cancelled) setState('gone');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-10">
        <p className="mx-auto max-w-2xl text-sm text-gray-400">Looking that up…</p>
      </div>
    );
  }

  if (state === 'gone') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl p-5"
             style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
          <p className="text-sm font-black text-white">This link is not available</p>
          <p className="mt-2 text-sm text-gray-400">
            Links stop working after a while, and they sometimes get cut short when
            they are forwarded. Open the one we sent you directly from the original
            message, or call us and we will pull it up.
          </p>
        </div>
      </div>
    );
  }

  const e = estimate;
  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Your junk removal estimate</h1>
          {e.name && <p className="mt-1 text-sm text-gray-400">For {e.name}</p>}
        </header>

        <section className="rounded-xl p-4"
                 style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)' }}>
          <p className="text-sm font-black text-white">{e.says}</p>
          {e.requestedAt && (
            <p className="mt-1 text-xs text-gray-400">
              You asked us on {new Date(e.requestedAt).toLocaleDateString()}.
            </p>
          )}
        </section>

        {e.cost && (
          <section className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-3xl font-black text-white">{money(e.cost.likely)}</p>
            <p className="mt-1 text-sm text-gray-400">
              Between {money(e.cost.low)} and {money(e.cost.high)}
              {e.volumeCuYd?.likely ? ` · about ${e.volumeCuYd.likely} cu yd` : ''}
              {e.loads ? ` in ${e.loads} load${e.loads === 1 ? '' : 's'}` : ''}
            </p>
          </section>
        )}

        {e.needsSiteVisit && e.siteVisitReasons?.length > 0 && (
          <section className="rounded-xl p-4"
                   style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)' }}>
            <p className="text-sm font-black text-white">Why we want to see it first</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
              {e.siteVisitReasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </section>
        )}

        {e.scope && (
          <section className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-sm font-black text-white">What you asked us to take</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{e.scope}</p>
            {e.access && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-400">{e.access}</p>}
          </section>
        )}

        {e.excluded?.length > 0 && (
          <section className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-sm font-black text-white">Staying put</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
              {e.excluded.map((x: any, i: number) => <li key={i}>{x?.name || String(x)}</li>)}
            </ul>
          </section>
        )}

        {e.refused?.length > 0 && (
          <section className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-sm font-black text-white">What we cannot carry</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-300">
              {e.refused.map((r: any, i: number) => <li key={i}>{r?.why || String(r)}</li>)}
            </ul>
          </section>
        )}

        <p className="pt-2 text-xs text-gray-500">
          This is an estimate made from photographs, not a visit. If what we find is
          different we will show you the difference and what it costs before any
          extra work is done.
        </p>
      </div>
    </div>
  );
}
