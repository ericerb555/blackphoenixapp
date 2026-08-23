/**
 * The settings panel every portal opens.
 *
 * WHY ONE COMPONENT FOR NINE PORTALS
 *
 * Each portal reaches different parts of the platform, but the questions a
 * person has about their own account are the same everywhere: how do you reach
 * me, what am I allowed to do here, and what would I get if I paid more. What
 * differs per portal is the answers, and those already come from the server
 * per user — the notification event list, the entitlements and the upgrade
 * options are all resolved from who is signed in. So one panel adapts on its
 * own, and there are no nine variants to keep in step.
 *
 * WHAT THIS REPLACES
 *
 * Seven of these gears had no click handler at all, and three portals had a
 * save button wired to `toast.success('Settings saved!')` that wrote nothing
 * anywhere — telling somebody their preferences were saved when they were not.
 *
 * Notification preferences are saved to the server through /me/notification-prefs
 * rather than to localStorage, so a vendor who sets them on a laptop still has
 * them on the phone they actually work from.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  X, Bell, User, ShieldCheck, Sparkles, LogOut, Loader2, Check, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';
import { authedHeaders } from '../../utils/authHeaders';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Section = 'account' | 'notifications' | 'access' | 'upgrade';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Which section to land on. The bell opens straight to notifications. */
  initialSection?: Section;
  /** Portal label, shown so somebody with several portals knows where they are. */
  portalName?: string;
  accent?: string;
}

interface PrefEvent { email: boolean; sms: boolean; inApp: boolean }

export default function PortalSettings({
  open, onClose, initialSection = 'account', portalName = 'Portal', accent = '#ea580c',
}: Props) {
  const [section, setSection] = useState<Section>(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [events, setEvents] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<Record<string, PrefEvent>>({});
  const [entitlements, setEntitlements] = useState<any>(null);
  const [upgrade, setUpgrade] = useState<{ plans: any[]; addOns: any[]; current: any } | null>(null);

  useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authedHeaders();
      const { data: { user } } = await supabase.auth.getUser();
      setProfile({
        name: String(user?.user_metadata?.full_name || ''),
        email: String(user?.email || ''),
        phone: String(user?.user_metadata?.phone || ''),
      });

      // Each of these answers a different question and any one of them can fail
      // without making the others useless, so they are settled independently
      // rather than with a single await that loses all three on one bad call.
      const [prefsRes, entRes, upgRes] = await Promise.allSettled([
        fetch(`${SERVER}/me/notification-prefs`, { headers }).then(r => r.json()),
        fetch(`${SERVER}/me/entitlements`, { headers }).then(r => r.json()),
        fetch(`${SERVER}/me/upgrade-options`, { headers }).then(r => r.json()),
      ]);

      if (prefsRes.status === 'fulfilled' && prefsRes.value?.success) {
        const v = prefsRes.value;
        setEvents(Array.isArray(v.events) ? v.events : []);
        setLabels(v.labels || {});
        setPrefs(v.prefs?.events || {});
        if (v.prefs?.phone) setProfile(p => ({ ...p, phone: v.prefs.phone }));
      }
      if (entRes.status === 'fulfilled' && entRes.value?.success) setEntitlements(entRes.value.entitlements);
      if (upgRes.status === 'fulfilled' && upgRes.value?.success) {
        setUpgrade({ plans: upgRes.value.plans || [], addOns: upgRes.value.addOns || [], current: upgRes.value.current });
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load your settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const toggle = (event: string, channel: keyof PrefEvent) => {
    setPrefs(prev => {
      const current = prev[event] || { email: true, sms: true, inApp: true };
      return { ...prev, [event]: { ...current, [channel]: !current[channel] } };
    });
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/me/notification-prefs`, {
        method: 'PUT',
        headers: await authedHeaders(),
        body: JSON.stringify({ phone: profile.phone, events: prefs }),
      });
      const data = await res.json().catch(() => ({}));
      // Only claim success when the server actually said so. The buttons this
      // replaces announced "Settings saved!" unconditionally.
      if (!res.ok || data.success === false) throw new Error(data.error || 'Could not save your notification settings.');
      toast.success('Notification settings saved.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save your notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const startCheckout = async (option: { type: string; plan: string; amount: number }) => {
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/subscriptions/checkout`, {
        method: 'POST',
        headers: await authedHeaders(),
        // The amount is sent because the route requires it, and the route checks
        // it against its own catalogue — the price is not decided here.
        body: JSON.stringify({ type: option.type, plan: option.plan, amount: option.amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.checkoutUrl) {
        throw new Error(data.error || 'Could not start checkout.');
      }
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      toast.error(e?.message || 'Could not start checkout.');
      setSaving(false);
    }
  };

  if (!open) return null;

  const TABS: Array<{ id: Section; label: string; icon: any }> = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'access', label: 'Your access', icon: ShieldCheck },
    { id: 'upgrade', label: 'Plans & add-ons', icon: Sparkles },
  ];

  return (
    <div className="bpset-scrim" onClick={onClose}>
      <style>{CSS}</style>
      <div className="bpset" role="dialog" aria-label="Settings" onClick={e => e.stopPropagation()}>
        <header className="bpset-head">
          <div>
            <h2>Settings</h2>
            <p>{portalName}</p>
          </div>
          <button className="bpset-x" onClick={onClose} aria-label="Close settings"><X size={19} /></button>
        </header>

        <nav className="bpset-tabs">
          {TABS.map(t => (
            <button key={t.id} data-on={section === t.id} onClick={() => setSection(t.id)}
              style={section === t.id ? { borderColor: accent, color: accent } : undefined}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="bpset-body">
          {loading ? (
            <div className="bpset-center"><Loader2 size={20} className="animate-spin" /> Loading your settings…</div>
          ) : error ? (
            <div className="bpset-warn"><AlertTriangle size={16} /> {error}</div>
          ) : (
            <>
              {section === 'account' && (
                <div className="bpset-stack">
                  <Field label="Name"><input className="bpset-input" value={profile.name} readOnly /></Field>
                  <Field label="Email"><input className="bpset-input" value={profile.email} readOnly /></Field>
                  <Field label="Mobile — used for text alerts">
                    <input className="bpset-input" value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="603-555-0100" inputMode="tel" />
                  </Field>
                  <p className="bpset-hint">
                    Your name and email come from your sign-in and are changed there. The
                    mobile number is saved with your notification settings.
                  </p>
                  <button className="bpset-btn bpset-primary" style={{ background: accent }}
                    onClick={saveNotifications} disabled={saving}>
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save
                  </button>
                  <button className="bpset-btn bpset-danger" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}

              {section === 'notifications' && (
                <div className="bpset-stack">
                  {events.length === 0 ? (
                    <p className="bpset-hint">No notification types are configured for your account yet.</p>
                  ) : (
                    <>
                      <div className="bpset-prefhead"><span>What happens</span><span>Email</span><span>Text</span><span>In app</span></div>
                      {events.map(ev => {
                        const p = prefs[ev] || { email: true, sms: true, inApp: true };
                        return (
                          <div key={ev} className="bpset-prefrow">
                            <span className="bpset-prefname">{labels[ev] || ev}</span>
                            {(['email', 'sms', 'inApp'] as const).map(ch => (
                              <button key={ch} className="bpset-toggle" data-on={p[ch]}
                                onClick={() => toggle(ev, ch)}
                                aria-label={`${labels[ev] || ev} by ${ch}`}
                                style={p[ch] ? { borderColor: accent, background: accent } : undefined}>
                                {p[ch] && <Check size={13} />}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      <button className="bpset-btn bpset-primary" style={{ background: accent }}
                        onClick={saveNotifications} disabled={saving}>
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save notification settings
                      </button>
                    </>
                  )}
                </div>
              )}

              {section === 'access' && (
                <div className="bpset-stack">
                  {!entitlements ? (
                    <p className="bpset-hint">Your access could not be loaded.</p>
                  ) : (
                    <>
                      <Row k="Access level" v={entitlements.admin ? 'Full — administrator' : String(entitlements.level || 'standard')} />
                      {entitlements.trialActive && (
                        <Row k="Trial" v={`Active${entitlements.daysLeft != null ? ` — ${entitlements.daysLeft} days left` : ''}`} tone="#34d399" />
                      )}
                      {entitlements.needsPlan && (
                        <div className="bpset-warn">
                          <AlertTriangle size={16} />
                          Your trial has ended. Choose a plan under Plans &amp; add-ons to keep full access.
                        </div>
                      )}
                      {entitlements.portalType && <Row k="Portal" v={String(entitlements.portalType).replace(/_/g, ' ')} />}
                      <p className="bpset-hint">
                        This is what your account is entitled to. Different portals reach
                        different parts of the platform, and this is the list for yours.
                      </p>
                    </>
                  )}
                </div>
              )}

              {section === 'upgrade' && (
                <div className="bpset-stack">
                  {!upgrade || (upgrade.plans.length === 0 && upgrade.addOns.length === 0) ? (
                    <p className="bpset-hint">
                      There are no plans available for your account type. If you were expecting
                      one, tell us and we will sort it out.
                    </p>
                  ) : (
                    <>
                      {upgrade.current?.plan && (
                        <Row k="Current plan" v={`${upgrade.current.plan}${upgrade.current.status ? ` — ${upgrade.current.status}` : ''}`} />
                      )}
                      {upgrade.plans.length > 0 && <h3 className="bpset-h3">Plans</h3>}
                      {upgrade.plans.map(p => (
                        <PlanRow key={p.plan} option={p} accent={accent} busy={saving} onPick={startCheckout} />
                      ))}
                      {upgrade.addOns.length > 0 && <h3 className="bpset-h3">Add-ons</h3>}
                      {upgrade.addOns.map(p => (
                        <PlanRow key={p.plan} option={p} accent={accent} busy={saving} onPick={startCheckout} />
                      ))}
                      <p className="bpset-hint">
                        Payment is taken by Stripe. Prices come from the server, so what you
                        see here is what you are charged.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanRow({ option, accent, busy, onPick }: {
  option: { type: string; plan: string; amount: number; label: string };
  accent: string; busy: boolean; onPick: (o: any) => void;
}) {
  return (
    <div className="bpset-plan">
      <div>
        <div className="bpset-planname">{option.label || option.plan}</div>
        <div className="bpset-planprice">${option.amount}<span> / month</span></div>
      </div>
      <button className="bpset-btn bpset-primary" style={{ background: accent }}
        onClick={() => onPick(option)} disabled={busy}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={14} />} Choose
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="bpset-field"><span>{label}</span>{children}</label>;
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="bpset-row">
      <span>{k}</span>
      <strong style={tone ? { color: tone } : undefined}>{v}</strong>
    </div>
  );
}

/**
 * Spacing is real CSS, not p-* / m-* utilities: the global reset in globals.css
 * is deliberately unlayered, which leaves those utilities computing to 0px
 * across the whole application. A class selector out-specifies a bare `*`, so
 * these rules apply.
 */
const CSS = `
.bpset-scrim { position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:60;
  display:flex; justify-content:flex-end; }
.bpset { width:100%; max-width:520px; height:100%; background:#141414; color:#f4f4f5;
  border-left:1px solid #2A2A2A; display:flex; flex-direction:column;
  font:14px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (max-width:560px){ .bpset { max-width:100%; } }

.bpset-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
  padding:20px 20px 16px; border-bottom:1px solid #2A2A2A; }
.bpset-head h2 { margin:0; font-size:18px; font-weight:800; letter-spacing:-.02em; }
.bpset-head p { margin:2px 0 0; font-size:12.5px; color:#9ca3af; text-transform:capitalize; }
.bpset-x { width:40px; height:40px; display:grid; place-items:center; border-radius:10px;
  border:1px solid #2A2A2A; background:transparent; color:#9ca3af; cursor:pointer; }

/* Wrapping rather than scrolling: four tabs do not fit the panel width, and a
   horizontal scroller left the active one clipped against the edge, which reads
   as broken rather than scrollable. */
.bpset-tabs { display:flex; flex-wrap:wrap; gap:6px; padding:14px 16px; border-bottom:1px solid #2A2A2A; }
.bpset-tabs button { min-height:40px; padding:0 12px; border-radius:11px;
  border:1px solid #2A2A2A; background:#1A1A1A; color:#9ca3af; font-size:13px; font-weight:650;
  cursor:pointer; display:inline-flex; align-items:center; gap:7px; white-space:nowrap; }
@media (pointer:coarse){ .bpset-tabs button { min-height:44px; } .bpset-x { width:44px; height:44px; } }

.bpset-body { flex:1; overflow-y:auto; padding:20px; }
.bpset-stack { display:flex; flex-direction:column; gap:14px; }
.bpset-center { display:flex; align-items:center; justify-content:center; gap:10px;
  padding:40px 0; color:#9ca3af; }

.bpset-field { display:flex; flex-direction:column; gap:7px; }
.bpset-field > span { font-size:10.5px; letter-spacing:.09em; text-transform:uppercase;
  color:#6b7280; font-weight:700; }
.bpset-input { width:100%; min-height:44px; padding:11px 13px; border-radius:11px;
  background:#0F0F0F; border:1px solid #2A2A2A; color:#f4f4f5; font-size:14px; outline:none; }
.bpset-input:read-only { color:#9ca3af; }

.bpset-hint { margin:0; font-size:12.5px; color:#6b7280; line-height:1.6; }
.bpset-h3 { margin:6px 0 0; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:#6b7280; }

.bpset-btn { min-height:44px; padding:0 16px; border-radius:11px; border:1px solid #2A2A2A;
  background:#1A1A1A; color:#f4f4f5; font-size:13.5px; font-weight:700; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center; gap:8px; }
.bpset-btn:disabled { opacity:.5; cursor:default; }
.bpset-primary { border:none; color:#fff; }
.bpset-danger { color:#f87171; border-color:rgba(248,113,113,.3); }

.bpset-prefhead, .bpset-prefrow { display:grid; grid-template-columns:1fr 54px 54px 54px;
  align-items:center; gap:8px; }
.bpset-prefhead { font-size:10.5px; letter-spacing:.06em; text-transform:uppercase;
  color:#6b7280; font-weight:700; padding-bottom:4px; border-bottom:1px solid #2A2A2A; }
.bpset-prefhead span:not(:first-child), .bpset-prefrow .bpset-toggle { justify-self:center; }
.bpset-prefrow { padding:8px 0; border-bottom:1px solid rgba(42,42,42,.6); }
.bpset-prefname { font-size:13.5px; }
.bpset-toggle { width:34px; height:34px; border-radius:9px; border:1px solid #2A2A2A;
  background:#0F0F0F; color:#fff; cursor:pointer; display:grid; place-items:center; }
@media (pointer:coarse){ .bpset-toggle { width:44px; height:44px; } }

.bpset-row { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:12px 14px; border:1px solid #2A2A2A; border-radius:11px; background:#1A1A1A; font-size:13.5px; }
.bpset-row > span { color:#9ca3af; }
.bpset-row > strong { text-transform:capitalize; }

.bpset-plan { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:14px; border:1px solid #2A2A2A; border-radius:13px; background:#1A1A1A; }
.bpset-planname { font-weight:700; font-size:14.5px; text-transform:capitalize; }
.bpset-planprice { font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; }
.bpset-planprice span { font-size:12px; font-weight:600; color:#6b7280; }

.bpset-warn { display:flex; align-items:flex-start; gap:9px; padding:13px 15px; border-radius:11px;
  background:rgba(251,191,36,.09); border:1px solid rgba(251,191,36,.3); color:#fcd34d; font-size:13px; }
`;
