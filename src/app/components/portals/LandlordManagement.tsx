import { useEffect, useState, useCallback, useRef } from 'react';
import {
  DollarSign, TrendingUp, Home, Users, AlertTriangle, CalendarClock, CreditCard,
  FileText, FileSignature, Upload, Trash2, Plus, Check, X, RefreshCw, Send, Copy,
  Repeat, Loader2, Download, ExternalLink,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

function money(n: any) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function auth(session: any) {
  return { Authorization: `Bearer ${session?.access_token}` };
}
function jsonAuth(session: any) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` };
}

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm';
const btnTeal = 'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-[#2A2A2A] disabled:opacity-50';
const inputCls = 'w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] text-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
const labelCls = 'mb-1 block text-xs font-medium text-gray-400';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard metrics
// ─────────────────────────────────────────────────────────────────────────────
export function LandlordDashboardMetrics({ session }: { session: any }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/landlord/dashboard`, { headers: auth(session) });
        const data = await res.json();
        if (!live) return;
        if (!data.success) throw new Error(data.error || 'Failed to load metrics');
        setMetrics(data.metrics);
        setError('');
      } catch (e: any) {
        if (live) setError(e.message || 'Failed to load metrics');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [session]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…</div>;
  if (error) return <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{error}</div>;
  if (!metrics) return null;

  const stats = [
    { label: 'Occupancy', value: `${metrics.occupancyRate}%`, sub: `${metrics.occupiedUnits}/${metrics.totalUnits} units`, icon: Home, tone: 'text-teal-400 bg-teal-500/10' },
    { label: 'Monthly rent roll', value: `$${money(metrics.monthlyRentRoll)}`, sub: `${metrics.totalTenants} tenants`, icon: TrendingUp, tone: 'text-emerald-400 bg-emerald-50' },
    { label: 'Collected this month', value: `$${money(metrics.collectedThisMonth)}`, sub: 'received', icon: DollarSign, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Outstanding', value: `$${money(metrics.outstanding)}`, sub: 'unpaid charges', icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${card} p-4`}>
              <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}><Icon className="h-5 w-5" /></div>
              <div className="text-2xl font-semibold text-white">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
              <div className="mt-1 text-xs text-gray-500">{s.sub}</div>
            </div>
          );
        })}
      </div>
      {(metrics.vacantUnits > 0 || metrics.rentDueAlerts?.length > 0 || metrics.leaseExpirations?.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className={`${card} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><Home className="h-4 w-4 text-gray-500" /> Vacancies</div>
            <div className="text-3xl font-semibold text-white">{metrics.vacantUnits}</div>
            <div className="text-xs text-gray-400">vacant unit{metrics.vacantUnits === 1 ? '' : 's'} to fill</div>
          </div>
          <div className={`${card} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><CalendarClock className="h-4 w-4 text-gray-500" /> Lease expirations (90d)</div>
            {metrics.leaseExpirations?.length ? (
              <ul className="space-y-1 text-sm">
                {metrics.leaseExpirations.slice(0, 4).map((l: any) => (
                  <li key={l.tenantId} className="flex justify-between">
                    <span className="text-gray-300">{l.name}{l.unit ? ` · ${l.unit}` : ''}</span>
                    <span className={l.daysLeft <= 30 ? 'font-medium text-rose-600' : 'text-gray-400'}>{l.daysLeft}d</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-xs text-gray-500">None upcoming</div>}
          </div>
          <div className={`${card} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><AlertTriangle className="h-4 w-4 text-gray-500" /> Rent-due alerts</div>
            {metrics.rentDueAlerts?.length ? (
              <ul className="space-y-1 text-sm">
                {metrics.rentDueAlerts.slice(0, 4).map((a: any) => (
                  <li key={a.tenantId} className="flex justify-between">
                    <span className="text-gray-300">{a.name}{a.unit ? ` · ${a.unit}` : ''}</span>
                    <span className="font-medium text-rose-600">${money(a.rent)}</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-xs text-gray-500">All current</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rent collection (+ recurring auto-pay)
// ─────────────────────────────────────────────────────────────────────────────
export function LandlordRentCollection({ session, tenants = [], stripeReady }: { session: any; tenants: any[]; stripeReady: boolean }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chargeFor, setChargeFor] = useState<any>(null);
  const [autopayFor, setAutopayFor] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>(tenants);

  useEffect(() => { setRoster(tenants); }, [tenants]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/landlord/rent`, { headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load rent activity');
      setPayments(data.payments || []);
      setError('');
    } catch (e: any) { setError(e.message || 'Failed to load rent activity'); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Rent collection</h3>
          <p className="text-sm text-gray-400">Charge tenants, record payments, and set up automatic monthly rent.</p>
        </div>
        <button className={btnGhost} onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {!stripeReady && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Connect Stripe (in the Payments tab) to charge tenants online and enable auto-pay. You can still record manual payments below.
        </div>
      )}

      {/* Tenant roster with charge / auto-pay actions */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-[#2A2A2A] px-4 py-3 text-sm font-semibold text-white">Tenants</div>
        {roster.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No tenants yet. Add tenants from the Tenants tab.</div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {roster.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-white">{t.name}{t.unit ? <span className="text-gray-500"> · {t.unit}</span> : null}</div>
                  <div className="text-xs text-gray-400">
                    ${money(t.rent)}/mo
                    {t.autopay?.status === 'active' && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-400"><Repeat className="h-3 w-3" /> Auto-pay on</span>}
                    {t.autopay?.status === 'pending' && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">Auto-pay pending</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className={btnTeal} onClick={() => setChargeFor(t)}><CreditCard className="h-4 w-4" /> Charge</button>
                  <button className={btnGhost} onClick={() => setAutopayFor(t)} disabled={!stripeReady}><Repeat className="h-4 w-4" /> Auto-pay</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payment history */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-[#2A2A2A] px-4 py-3 text-sm font-semibold text-white">Payment activity</div>
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="px-4 py-4 text-sm text-rose-600">{error}</div>
        ) : payments.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No charges yet.</div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {payments.map((p) => (
              <PaymentRow key={p.id} p={p} session={session} onChange={load} />
            ))}
          </ul>
        )}
      </div>

      {chargeFor && <ChargeModal session={session} tenant={chargeFor} onClose={() => setChargeFor(null)} onDone={() => { setChargeFor(null); load(); }} />}
      {autopayFor && <AutoPayModal session={session} tenant={autopayFor} onClose={() => setAutopayFor(null)} onUpdated={(t) => { setRoster((cur) => cur.map((x) => (x.id === t.id ? t : x))); }} />}
    </div>
  );
}

function PaymentRow({ p, session, onChange }: { p: any; session: any; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const statusBadge: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-400',
    pending: 'bg-amber-500/10 text-amber-700',
    pending_confirmation: 'bg-amber-500/10 text-amber-700',
  };
  const markPaid = async (method: string) => {
    try {
      setBusy(true);
      const res = await fetch(`${API}/landlord/rent/${p.id}/mark-paid`, { method: 'PATCH', headers: jsonAuth(session), body: JSON.stringify({ method }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onChange();
    } catch (e: any) { alert(e.message || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-white">
          {p.tenantName || p.customerEmail}{p.unit ? <span className="text-gray-500"> · {p.unit}</span> : null}
        </div>
        <div className="text-xs text-gray-400">
          {p.chargeType || 'rent'}{p.memo ? ` — ${p.memo}` : ''}{p.dueDate ? ` · due ${p.dueDate}` : ''}
          {p.lateFee > 0 ? ` · incl. $${money(p.lateFee)} late fee` : ''}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">${money(p.amount)}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge[p.status] || 'bg-[#0A0A0A] text-gray-400'}`}>{p.status.replace('_', ' ')}</span>
        {p.status !== 'paid' && (
          <div className="flex gap-1">
            {p.checkoutUrl && <a href={p.checkoutUrl} target="_blank" rel="noreferrer" className={btnGhost}><ExternalLink className="h-3.5 w-3.5" /> Link</a>}
            <button className={btnGhost} disabled={busy} onClick={() => markPaid('cash')}><Check className="h-3.5 w-3.5" /> Mark paid</button>
          </div>
        )}
      </div>
    </li>
  );
}

function ChargeModal({ session, tenant, onClose, onDone }: { session: any; tenant: any; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(tenant.rent || ''));
  const [lateFee, setLateFee] = useState('');
  const [chargeType, setChargeType] = useState('rent');
  const [dueDate, setDueDate] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const submit = async () => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/landlord/tenants/${tenant.id}/charge`, {
        method: 'POST', headers: jsonAuth(session),
        body: JSON.stringify({ amount: Number(amount), lateFee: Number(lateFee) || 0, chargeType, dueDate, memo }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create charge');
      setResult(data);
    } catch (e: any) { setError(e.message || 'Failed to create charge'); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={`Charge ${tenant.name}`}>
      {result ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-300">
            Charge created for ${money(result.payment.amount)}.
            {result.onlineEnabled ? ' A secure pay link was emailed to the tenant.' : ' Online charging is not set up — record the payment when received.'}
          </div>
          {result.checkoutUrl && (
            <div className="flex items-center gap-2">
              <input readOnly className={inputCls} value={result.checkoutUrl} />
              <button className={btnGhost} onClick={() => navigator.clipboard.writeText(result.checkoutUrl)}><Copy className="h-4 w-4" /></button>
            </div>
          )}
          <button className={btnTeal} onClick={onDone}>Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={chargeType} onChange={(e) => setChargeType(e.target.value)}>
                <option value="rent">Rent</option>
                <option value="fee">Fee</option>
                <option value="deposit">Deposit</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount ($)</label>
              <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Late fee ($)</label>
              <input className={inputCls} type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Due date</label>
              <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Memo</label>
            <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Optional note for the tenant" />
          </div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={onClose}>Cancel</button>
            <button className={btnTeal} disabled={busy} onClick={submit}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Create charge</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AutoPayModal({ session, tenant, onClose, onUpdated }: { session: any; tenant: any; onClose: () => void; onUpdated: (t: any) => void }) {
  const [amount, setAmount] = useState(String(tenant.rent || ''));
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [setupUrl, setSetupUrl] = useState(tenant.autopay?.setupUrl || '');
  const status = tenant.autopay?.status;

  const enroll = async () => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/landlord/tenants/${tenant.id}/autopay`, {
        method: 'POST', headers: jsonAuth(session),
        body: JSON.stringify({ amount: Number(amount), dayOfMonth: Number(dayOfMonth) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to set up auto-pay');
      setSetupUrl(data.setupUrl);
      if (data.tenant) onUpdated(data.tenant);
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    try {
      setBusy(true);
      const res = await fetch(`${API}/landlord/tenants/${tenant.id}/autopay/status`, { method: 'POST', headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.tenant) onUpdated(data.tenant);
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm('Cancel this auto-pay subscription?')) return;
    try {
      setBusy(true);
      const res = await fetch(`${API}/landlord/tenants/${tenant.id}/autopay/cancel`, { method: 'POST', headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.tenant) onUpdated(data.tenant);
      onClose();
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={`Auto-pay · ${tenant.name}`}>
      <div className="space-y-3">
        {status === 'active' ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-300">
            Auto-pay is active — ${money(tenant.autopay.amount)}/mo is charged automatically.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400">Invite {tenant.name} to enroll in automatic monthly rent. They complete a one-time secure setup, then Stripe charges rent every month.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Monthly amount ($)</label>
                <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Day of month</label>
                <input className={inputCls} type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
            </div>
          </>
        )}
        {setupUrl && status !== 'active' && (
          <div>
            <label className={labelCls}>Setup link (emailed to tenant)</label>
            <div className="flex items-center gap-2">
              <input readOnly className={inputCls} value={setupUrl} />
              <button className={btnGhost} onClick={() => navigator.clipboard.writeText(setupUrl)}><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btnGhost} onClick={onClose}>Close</button>
          {(status === 'pending' || status === 'active') && <button className={btnGhost} disabled={busy} onClick={refresh}><RefreshCw className="h-4 w-4" /> Refresh status</button>}
          {status === 'active' ? (
            <button className={btnGhost + ' text-rose-600'} disabled={busy} onClick={cancel}>Cancel auto-pay</button>
          ) : (
            <button className={btnTeal} disabled={busy} onClick={enroll}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {setupUrl ? 'Resend invite' : 'Send invite'}</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lease renewals
// ─────────────────────────────────────────────────────────────────────────────
export function LandlordRenewals({ session, tenants = [], onTenantsChange }: { session: any; tenants: any[]; onTenantsChange?: (t: any[]) => void }) {
  const [roster, setRoster] = useState<any[]>(tenants);
  const [editing, setEditing] = useState<any>(null);
  const [offering, setOffering] = useState<any>(null);

  useEffect(() => { setRoster(tenants); }, [tenants]);

  const daysLeft = (end: string) => {
    if (!end) return null;
    const d = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(d) ? d : null;
  };
  const applyTenant = (t: any) => {
    const next = roster.map((x) => (x.id === t.id ? t : x));
    setRoster(next); onTenantsChange?.(next);
  };
  const sorted = [...roster].sort((a, b) => {
    const da = daysLeft(a.leaseEnd), db = daysLeft(b.leaseEnd);
    if (da == null) return 1; if (db == null) return -1; return da - db;
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Lease renewals</h3>
        <p className="text-sm text-gray-400">Track lease terms and send renewal offers before they expire.</p>
      </div>
      <div className={`${card} overflow-hidden`}>
        {sorted.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No tenants yet.</div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {sorted.map((t) => {
              const dl = daysLeft(t.leaseEnd);
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">{t.name}{t.unit ? <span className="text-gray-500"> · {t.unit}</span> : null}</div>
                    <div className="text-xs text-gray-400">
                      {t.leaseEnd ? `Lease ends ${t.leaseEnd}` : 'No lease term set'}
                      {dl != null && <span className={`ml-2 font-medium ${dl <= 30 ? 'text-rose-600' : dl <= 90 ? 'text-amber-600' : 'text-gray-500'}`}>{dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}</span>}
                      {t.renewalOffer && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-400">Offer sent</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={btnGhost} onClick={() => setEditing(t)}><CalendarClock className="h-4 w-4" /> Terms</button>
                    <button className={btnTeal} onClick={() => setOffering(t)}><FileSignature className="h-4 w-4" /> Renewal offer</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {editing && <LeaseTermsModal session={session} tenant={editing} onClose={() => setEditing(null)} onSaved={(t) => { applyTenant(t); setEditing(null); }} />}
      {offering && <RenewalOfferModal session={session} tenant={offering} onClose={() => setOffering(null)} onSent={(t) => { applyTenant(t); setOffering(null); }} />}
    </div>
  );
}

function LeaseTermsModal({ session, tenant, onClose, onSaved }: { session: any; tenant: any; onClose: () => void; onSaved: (t: any) => void }) {
  const [leaseStart, setStart] = useState(tenant.leaseStart || '');
  const [leaseEnd, setEnd] = useState(tenant.leaseEnd || '');
  const [leaseTerm, setTerm] = useState(tenant.leaseTerm || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/landlord/tenants/${tenant.id}/lease-terms`, { method: 'PATCH', headers: jsonAuth(session), body: JSON.stringify({ leaseStart, leaseEnd, leaseTerm }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaved(data.tenant);
    } catch (e: any) { setError(e.message || 'Failed'); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title={`Lease terms · ${tenant.name}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Lease start</label><input className={inputCls} type="date" value={leaseStart} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label className={labelCls}>Lease end</label><input className={inputCls} type="date" value={leaseEnd} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <div><label className={labelCls}>Term label</label><input className={inputCls} value={leaseTerm} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 12 months" /></div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnTeal} disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button></div>
      </div>
    </Modal>
  );
}

function RenewalOfferModal({ session, tenant, onClose, onSent }: { session: any; tenant: any; onClose: () => void; onSent: (t: any) => void }) {
  const [newRent, setRent] = useState(String(tenant.rent || ''));
  const [newTerm, setTerm] = useState('12 months');
  const [newLeaseEnd, setEnd] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/landlord/tenants/${tenant.id}/renewal-offer`, { method: 'POST', headers: jsonAuth(session), body: JSON.stringify({ newRent: Number(newRent), newTerm, newLeaseEnd, message }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSent(data.tenant);
    } catch (e: any) { setError(e.message || 'Failed'); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title={`Renewal offer · ${tenant.name}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>New monthly rent ($)</label><input className={inputCls} type="number" value={newRent} onChange={(e) => setRent(e.target.value)} /></div>
          <div><label className={labelCls}>New term</label><input className={inputCls} value={newTerm} onChange={(e) => setTerm(e.target.value)} /></div>
        </div>
        <div><label className={labelCls}>New lease end date</label><input className={inputCls} type="date" value={newLeaseEnd} onChange={(e) => setEnd(e.target.value)} /></div>
        <div><label className={labelCls}>Message</label><textarea className={inputCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional note to the tenant" /></div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnTeal} disabled={busy} onClick={send}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send offer</button></div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Applications / screening
// ─────────────────────────────────────────────────────────────────────────────
export function LandlordApplications({ session, onTenantAdded }: { session: any; onTenantAdded?: (t: any) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [applyUrl, setApplyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/landlord/applications`, { headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load applications');
      setApps(data.applications || []); setApplyUrl(data.applyUrl || ''); setError('');
    } catch (e: any) { setError(e.message || 'Failed to load applications'); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const pending = apps.filter((a) => a.status === 'pending');
  const decided = apps.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Applications</h3>
          <p className="text-sm text-gray-400">Collect and review rental applications, then approve to create a tenant.</p>
        </div>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add manually</button>
          <button className={btnGhost} onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </div>

      {applyUrl && (
        <div className={`${card} p-4`}>
          <label className={labelCls}>Public application link — share with prospects</label>
          <div className="flex items-center gap-2">
            <input readOnly className={inputCls} value={applyUrl} />
            <button className={btnTeal} onClick={() => navigator.clipboard.writeText(applyUrl)}><Copy className="h-4 w-4" /> Copy</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : (
        <>
          <Section title={`Pending (${pending.length})`}>
            {pending.length === 0 ? <Empty>No pending applications.</Empty> : pending.map((a) => <AppRow key={a.id} a={a} onReview={() => setReviewing(a)} />)}
          </Section>
          {decided.length > 0 && (
            <Section title="Decided">
              {decided.map((a) => <AppRow key={a.id} a={a} />)}
            </Section>
          )}
        </>
      )}

      {adding && <AddApplicationModal session={session} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
      {reviewing && <ReviewApplicationModal session={session} app={reviewing} onClose={() => setReviewing(null)} onDone={(tenant) => { setReviewing(null); load(); if (tenant) onTenantAdded?.(tenant); }} />}
    </div>
  );
}

function AppRow({ a, onReview }: { a: any; onReview?: () => void }) {
  const badge: Record<string, string> = { pending: 'bg-amber-500/10 text-amber-700', approved: 'bg-emerald-50 text-emerald-400', rejected: 'bg-[#0A0A0A] text-gray-400' };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2A] px-4 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium text-white">{a.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge[a.status] || ''}`}>{a.status}</span></div>
        <div className="text-xs text-gray-400">{a.email}{a.phone ? ` · ${a.phone}` : ''}{a.income ? ` · $${Number(a.income).toLocaleString()}/yr` : ''}{a.desiredUnit ? ` · wants ${a.desiredUnit}` : ''}</div>
      </div>
      {onReview && <button className={btnTeal} onClick={onReview}>Review</button>}
    </div>
  );
}

function AddApplicationModal({ session, onClose, onAdded }: { session: any; onClose: () => void; onAdded: () => void }) {
  const [f, setF] = useState<any>({ name: '', email: '', phone: '', income: '', desiredUnit: '', desiredRent: '', notes: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (k: string) => (e: any) => setF((cur: any) => ({ ...cur, [k]: e.target.value }));
  const save = async () => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/landlord/applications`, { method: 'POST', headers: jsonAuth(session), body: JSON.stringify(f) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onAdded();
    } catch (e: any) { setError(e.message || 'Failed'); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} title="Add application">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Name</label><input className={inputCls} value={f.name} onChange={set('name')} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} value={f.email} onChange={set('email')} /></div>
          <div><label className={labelCls}>Phone</label><input className={inputCls} value={f.phone} onChange={set('phone')} /></div>
          <div><label className={labelCls}>Annual income ($)</label><input className={inputCls} type="number" value={f.income} onChange={set('income')} /></div>
          <div><label className={labelCls}>Desired unit</label><input className={inputCls} value={f.desiredUnit} onChange={set('desiredUnit')} /></div>
          <div><label className={labelCls}>Desired rent ($)</label><input className={inputCls} type="number" value={f.desiredRent} onChange={set('desiredRent')} /></div>
        </div>
        <div><label className={labelCls}>Notes</label><textarea className={inputCls} rows={2} value={f.notes} onChange={set('notes')} /></div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnTeal} disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</button></div>
      </div>
    </Modal>
  );
}

function ReviewApplicationModal({ session, app, onClose, onDone }: { session: any; app: any; onClose: () => void; onDone: (tenant?: any) => void }) {
  const [unit, setUnit] = useState(app.desiredUnit || '');
  const [rent, setRent] = useState(String(app.desiredRent || ''));
  const [invite, setInvite] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const decide = async (decision: 'approved' | 'rejected') => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/landlord/applications/${app.id}`, {
        method: 'PATCH', headers: jsonAuth(session),
        body: JSON.stringify({ decision, unit, rent: Number(rent), invite: decision === 'approved' && invite, note }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (decision === 'rejected') { onDone(); return; }
      if (data.warning) { setError(data.warning); return; }
      setResult(data);
    } catch (e: any) { setError(e.message || 'Failed'); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={`Review · ${app.name}`}>
      {result ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-300">
            {app.name} was approved and added as a tenant.
            {result.invite?.created && ' A portal login was created.'}
            {result.invite?.alreadyHadAccount && ' They already had a portal login.'}
          </div>
          {result.invite?.tempPassword && (
            <div>
              <label className={labelCls}>Temporary password — share securely with the tenant</label>
              <div className="flex items-center gap-2">
                <input readOnly className={inputCls} value={result.invite.tempPassword} />
                <button className={btnGhost} onClick={() => navigator.clipboard.writeText(result.invite.tempPassword)}><Copy className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          {result.invite?.error && <div className="text-sm text-amber-700">Tenant created, but login provisioning failed: {result.invite.error}</div>}
          <button className={btnTeal} onClick={() => onDone(result.tenant)}>Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-[#0A0A0A] p-3 text-xs text-gray-400">
            <div><b>Email:</b> {app.email}</div>
            {app.phone && <div><b>Phone:</b> {app.phone}</div>}
            {app.employer && <div><b>Employer:</b> {app.employer}</div>}
            {app.income ? <div><b>Income:</b> ${Number(app.income).toLocaleString()}/yr</div> : null}
            {app.creditScore && <div><b>Credit:</b> {app.creditScore}</div>}
            {app.householdSize ? <div><b>Household:</b> {app.householdSize}</div> : null}
            {app.pets && <div><b>Pets:</b> {app.pets}</div>}
            {app.moveIn && <div><b>Move-in:</b> {app.moveIn}</div>}
            {app.currentAddress && <div><b>Current address:</b> {app.currentAddress}</div>}
            {app.notes && <div className="mt-1"><b>Notes:</b> {app.notes}</div>}
            <div className="mt-1"><b>Background consent:</b> {app.consentBackground ? 'Yes' : 'No'}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Assign unit</label><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
            <div><label className={labelCls}>Monthly rent ($)</label><input className={inputCls} type="number" value={rent} onChange={(e) => setRent(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="h-4 w-4 rounded border-[#2A2A2A] text-teal-400" />
            Create a tenant portal login on approval (Approve &amp; Invite)
          </label>
          <div><label className={labelCls}>Decision note</label><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <button className={btnGhost + ' text-rose-600'} disabled={busy} onClick={() => decide('rejected')}><X className="h-4 w-4" /> Reject</button>
            <button className={btnTeal} disabled={busy} onClick={() => decide('approved')}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve{invite ? ' & Invite' : ''}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document vault
// ─────────────────────────────────────────────────────────────────────────────
export function LandlordDocumentVault({ session }: { session: any }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('Lease');
  const [relatedTo, setRelatedTo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/landlord/documents`, { headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load documents');
      setDocs(data.documents || []); setError('');
    } catch (e: any) { setError(e.message || 'Failed to load documents'); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    try {
      setUploading(true); setError('');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('category', category);
      fd.append('relatedTo', relatedTo);
      const res = await fetch(`${API}/landlord/documents`, { method: 'POST', headers: auth(session), body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      setDocs((cur) => [data.document, ...cur]);
    } catch (e: any) { setError(e.message || 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const res = await fetch(`${API}/landlord/documents/${id}`, { method: 'DELETE', headers: auth(session) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDocs((cur) => cur.filter((d) => d.id !== id));
    } catch (e: any) { alert(e.message || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Document vault</h3>
        <p className="text-sm text-gray-400">Securely store leases, receipts, insurance, and property records.</p>
      </div>
      <div className={`${card} p-4`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={labelCls}>Category</label>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {['Lease', 'Receipt', 'Insurance', 'Inspection', 'Tax', 'General'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Related to (optional)</label><input className={inputCls} value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)} placeholder="Tenant / unit / property" /></div>
          <div className="flex items-end">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <button className={btnTeal} disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload file</button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Max 25MB per file.</p>
      </div>
      {error && <div className="text-sm text-rose-600">{error}</div>}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : docs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No documents yet.</div>
        ) : (
          <ul className="divide-y divide-[#2A2A2A]">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{d.name}</div>
                  <div className="text-xs text-gray-400">{d.category}{d.relatedTo ? ` · ${d.relatedTo}` : ''} · {(d.size / 1024).toFixed(0)} KB</div>
                </div>
                <div className="flex items-center gap-2">
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" className={btnGhost}><Download className="h-4 w-4" /></a>}
                  <button className={btnGhost + ' text-rose-600'} onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#1A1A1A] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-semibold text-white">{title}</h4>
          <button className="rounded-lg p-1 text-gray-500 hover:bg-[#0A0A0A]" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="border-b border-[#2A2A2A] px-4 py-3 text-sm font-semibold text-white">{title}</div>
      <div>{children}</div>
    </div>
  );
}
function Empty({ children }: { children: any }) {
  return <div className="px-4 py-6 text-sm text-gray-500">{children}</div>;
}
