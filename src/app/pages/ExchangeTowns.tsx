/**
 * Phoenix Exchange — the towns, and opening new ones.
 *
 * Staff only, and deliberately NOT in App's public route list. Every route
 * behind it refuses a non-staff caller server-side, so this screen's job is to
 * explain rather than to protect.
 *
 * WHY IT EXISTS
 *
 * Opening a town used to be three steps across two tools: hand-written SQL for
 * the territory, a curl call with a staff session for the ingest, and more SQL
 * to make it visible. Two of those need database access and one needs a staff
 * session, and nothing has both — so in practice nobody could do the whole job
 * alone. This is the whole job in one place.
 *
 * THE ORDER OF THE BUTTONS IS THE ORDER OF THE WORK
 *
 *   look it up    where is it, and is it actually a town
 *   open it       create it HIDDEN — residents see nothing yet
 *   see what it would find    a dry run, which writes nothing
 *   compile it    the ingest, for real
 *   show it       promote to active once it is worth visiting
 *
 * Nothing skips ahead. A town is hidden from the moment it is created until
 * somebody looks at what the ingest found and decides it is worth a resident's
 * time — a town with nine businesses reads as a broken product rather than a
 * new one, and that is a judgement rather than a threshold.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, MapPin, Search, Plus, Eye, EyeOff,
  Download, ShieldCheck,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Territory {
  slug: string;
  name: string;
  state: string | null;
  postcodes: string[];
  center: { lat: number; lng: number } | null;
  status: string;
  listings: number;
}

interface Match {
  label: string;
  kind: string;
  center: { lat: number; lng: number };
  postcode: string | null;
}

export default function ExchangeTowns() {
  const [towns, setTowns] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refused, setRefused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);

  const [name, setName] = useState('');
  const [state, setState] = useState('NH');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [chosen, setChosen] = useState<Match | null>(null);
  const [postcodes, setPostcodes] = useState('');

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRefused(false);
    try {
      const token = await auth();
      if (!token) { setRefused(true); return; }
      const res = await fetch(`${SERVER}/exchange/admin/territories`, { headers: { Authorization: token } });
      if (res.status === 403) { setRefused(true); return; }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) { setError(body?.error || 'We could not read the towns.'); return; }
      setTowns(Array.isArray(body.territories) ? body.territories : []);
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { void load(); }, [load]);

  const call = useCallback(async (path: string, init: RequestInit, label: string) => {
    setBusy(label);
    setSaid(null);
    try {
      const token = await auth();
      if (!token) { setSaid({ ok: false, text: 'Sign in first.' }); return null; }
      const res = await fetch(`${SERVER}${path}`, {
        ...init,
        headers: { Authorization: token, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setSaid({ ok: false, text: body?.error || 'That did not work.' });
        return null;
      }
      return body;
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
      return null;
    } finally {
      setBusy(null);
    }
  }, [auth]);

  const lookUp = useCallback(async () => {
    setMatches(null);
    setChosen(null);
    const body = await call('/exchange/admin/territories/lookup', {
      method: 'POST', body: JSON.stringify({ name, state }),
    }, 'lookup');
    if (body?.matches) {
      setMatches(body.matches);
      if (body.matches.length === 1) {
        setChosen(body.matches[0]);
        if (body.matches[0].postcode) setPostcodes(body.matches[0].postcode);
      }
    }
  }, [call, name, state]);

  const open = useCallback(async () => {
    if (!chosen) return;
    const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${state.toLowerCase()}`;
    const body = await call('/exchange/admin/territories', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(), state, slug,
        lat: chosen.center.lat, lng: chosen.center.lng,
        postcodes: postcodes.split(',').map((p) => p.trim()).filter(Boolean),
      }),
    }, 'open');
    if (body) {
      setSaid({ ok: true, text: `${name.trim()} is open and hidden. Compile it, then show it when it is worth visiting.` });
      setName(''); setMatches(null); setChosen(null); setPostcodes('');
      await load();
    }
  }, [call, chosen, name, state, postcodes, load]);

  const ingest = useCallback(async (slug: string, apply: boolean) => {
    const body = await call(`/exchange/ingest/${encodeURIComponent(slug)}`, {
      method: 'POST', body: JSON.stringify(apply ? { apply: true } : {}),
    }, `${apply ? 'compile' : 'dry'}:${slug}`);
    if (body?.outcome) {
      const o = body.outcome;
      setSaid({
        ok: true,
        text: `${apply ? 'Compiled' : 'A dry run of'} ${slug}: ${o.created ?? 0} new, ${o.filled ?? 0} filled in, `
          + `${o.untouched ?? 0} left alone, ${o.uncategorised ?? 0} with no category`
          + (o.truncated?.length ? `. Overpass capped: ${o.truncated.join(', ')}` : ''),
      });
      if (apply) await load();
    }
  }, [call, load]);

  const setStatus = useCallback(async (slug: string, status: string) => {
    const body = await call(`/exchange/admin/territories/${encodeURIComponent(slug)}/status`, {
      method: 'POST', body: JSON.stringify({ status }),
    }, `status:${slug}`);
    if (body) { setSaid({ ok: true, text: `${slug} is now ${status}.` }); await load(); }
  }, [call, load]);

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{BROWSE_CSS}</style>

      <div className="bpx-shell">
        <a className="bpxb-crumb" href="/exchange"><ChevronLeft size={14} /> All of Phoenix Exchange</a>

        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><MapPin size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Towns</div>
                <div className="bpxb-section-tag">Where the Exchange operates, and opening somewhere new</div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bpx-empty">
            <Loader2 size={24} className="animate-spin" color="#9ca3af" />
            <div className="bpx-desc">Looking…</div>
          </div>
        )}

        {!loading && refused && (
          <div className="bpx-empty">
            <ShieldCheck size={26} color="#9ca3af" />
            <div className="bpx-card-title">Company access is required</div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>
              Opening a town compiles hundreds of real businesses, so it is kept
              to staff. If you need it, ask an administrator.
            </div>
          </div>
        )}

        {!loading && !refused && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <button className="bpx-btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {!loading && !refused && !error && (
          <>
            {said && <div className={said.ok ? 'bpxb-said' : 'bpxb-failed'}>{said.text}</div>}

            {/* ── open a new one ──────────────────────────────────────── */}
            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">Open a town</div>
                <div className="bpxb-section-tag">it starts hidden</div>
              </div>

              <div className="bpxb-form">
                <div className="bpxb-form-row">
                  <label>
                    Town
                    <input type="text" value={name} placeholder="Windham"
                      onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label style={{ flex: '0 0 90px' }}>
                    State
                    <input type="text" value={state} maxLength={2}
                      onChange={(e) => setState(e.target.value.toUpperCase())} />
                  </label>
                </div>

                <button className="bpx-btn" disabled={busy === 'lookup' || name.trim().length < 2}
                  onClick={() => void lookUp()}>
                  {busy === 'lookup' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  Look it up
                </button>

                {/*
                  The matches, with what KIND of place each is. Asking for
                  "Merrimack, New Hampshire" offers the county, forty-five miles
                  from the town — so the kind is shown rather than assumed, and
                  the server refuses a county outright.
                */}
                {matches && matches.map((m) => (
                  <button
                    key={m.label}
                    className="bpx-btn"
                    data-on={chosen?.label === m.label}
                    style={{ textAlign: 'left', height: 'auto', minHeight: 44 }}
                    onClick={() => { setChosen(m); if (m.postcode) setPostcodes(m.postcode); }}
                  >
                    <MapPin size={14} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>{m.label}</span>
                      <span className="bpxb-note">
                        {m.kind} · {m.center.lat.toFixed(4)}, {m.center.lng.toFixed(4)}
                        {m.postcode ? ` · ${m.postcode}` : ''}
                      </span>
                    </span>
                  </button>
                ))}

                {chosen && (
                  <>
                    <label>
                      Postcodes, comma separated
                      <input type="text" value={postcodes} placeholder="03087"
                        onChange={(e) => setPostcodes(e.target.value)} />
                    </label>
                    <div className="bpxb-note">
                      These bound the town. Without them the compile cannot tell
                      this town from the next one — and from Pelham the next one
                      is sometimes in Massachusetts.
                    </div>
                    <button className="bpx-btn bpx-btn-primary"
                      disabled={busy === 'open' || !postcodes.trim()}
                      onClick={() => void open()}>
                      {busy === 'open' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      Open {name.trim()}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── what we cover ───────────────────────────────────────── */}
            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">Where the Exchange operates</div>
                <div className="bpxb-section-tag">{towns.length} towns</div>
              </div>

              <div className="bpx-list">
                {towns.map((t) => (
                  <div key={t.slug} className="bpx-card">
                    <div className="bpx-card-body bpxb-biz">
                      <div className="bpxb-biz-top">
                        <div style={{ minWidth: 0 }}>
                          <div className="bpxb-biz-name">{t.name}{t.state ? `, ${t.state}` : ''}</div>
                          <div className="bpxb-note">
                            {t.listings} listing{t.listings === 1 ? '' : 's'}
                            {t.postcodes.length ? ` · ${t.postcodes.join(', ')}` : ' · no postcodes'}
                            {t.center ? ` · ${t.center.lat.toFixed(3)}, ${t.center.lng.toFixed(3)}` : ' · no centre'}
                          </div>
                        </div>
                        <span className={`bpx-pill ${t.status === 'active' ? 'bpxb-pill-claimed' : 'bpxb-pill-listed'}`}>
                          {t.status === 'active' ? 'Residents see it' : 'Hidden'}
                        </span>
                      </div>

                      <div className="bpxb-contact">
                        <button className="bpx-btn" disabled={busy === `dry:${t.slug}`}
                          onClick={() => void ingest(t.slug, false)}>
                          {busy === `dry:${t.slug}` ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                          See what it would find
                        </button>
                        <button className="bpx-btn" disabled={busy === `compile:${t.slug}`}
                          onClick={() => void ingest(t.slug, true)}>
                          {busy === `compile:${t.slug}` ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          Compile it
                        </button>
                        {t.status === 'active' ? (
                          <button className="bpx-btn" onClick={() => void setStatus(t.slug, 'hidden')}>
                            <EyeOff size={13} /> Hide it
                          </button>
                        ) : (
                          <button className="bpx-btn bpx-btn-primary" onClick={() => void setStatus(t.slug, 'active')}>
                            <Eye size={13} /> Show it to residents
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bpxb-note">
                A dry run writes nothing. Compiling fills empty fields and adds
                businesses it has not seen — it never overwrites a claimed
                listing, and never replaces a detail we already hold.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
