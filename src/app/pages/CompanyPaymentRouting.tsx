/**
 * Company Payment Routing (Stripe Connect)
 *
 * Manage TWO companies, each mapped to its own Stripe connected account /
 * bank account, each with a unique company code (e.g. BPB-8544). Every payment
 * routed through the app is a destination charge to the correct company's bank
 * and is tagged with that company's code for reconciliation.
 *
 * All Stripe calls go through the server module `stripe-connect.tsx`.
 */
import { useEffect, useState } from 'react';
import {
  Building2, Plus, Banknote, CheckCircle2, AlertCircle, RefreshCw,
  Link as LinkIcon, DollarSign, Pencil, Save, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Company {
  id: string;
  name: string;
  code: string;
  email?: string;
  connectedAccountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bankLast4?: string;
}

interface RevenueRow {
  companyId: string;
  name: string;
  code: string;
  bankLast4?: string;
  payoutsEnabled: boolean;
  transactionCount: number;
  totalRevenue: number;
}

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function CompanyPaymentRouting() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', email: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', code: '', email: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const health = await api('/stripe/health').catch(() => ({ stripeConfigured: false }));
      setStripeConfigured(!!health.stripeConfigured);

      let list = (await api('/stripe/companies')).companies as Company[];
      // First-run seed so the two-company structure exists.
      if (!list || list.length === 0) {
        const seeded = await api('/stripe/seed', 'POST');
        list = seeded.companies;
      }
      setCompanies(list || []);

      const rev = await api('/stripe/revenue');
      setRevenue(rev.byCompany || []);
      setGrandTotal(rev.grandTotal || 0);
    } catch (err: any) {
      console.error('[CompanyPaymentRouting] load error:', err);
      toast.error(`Failed to load payment routing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const startEdit = (co: Company) => {
    setEditing(co.id);
    setForm({ name: co.name, code: co.code, email: co.email || '' });
  };

  const saveEdit = async (companyId: string) => {
    try {
      setBusy(companyId);
      await api('/stripe/companies', 'POST', { companyId, ...form });
      toast.success('Company saved');
      setEditing(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const addCompany = async () => {
    if (!addForm.name || !addForm.code) {
      toast.error('Name and code are required');
      return;
    }
    try {
      setBusy('add');
      await api('/stripe/companies', 'POST', addForm);
      toast.success('Company added');
      setShowAdd(false);
      setAddForm({ name: '', code: '', email: '' });
      await loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const connectBank = async (co: Company) => {
    if (!stripeConfigured) {
      toast.error('STRIPE_SECRET_KEY is not configured on the server');
      return;
    }
    try {
      setBusy(co.id);
      const returnUrl = window.location.href;
      const { url } = await api(`/stripe/companies/${co.id}/connect`, 'POST', {
        returnUrl, refreshUrl: returnUrl,
      });
      toast.success('Opening Stripe onboarding…');
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(`Could not start onboarding: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const refreshStatus = async (co: Company) => {
    try {
      setBusy(co.id);
      await api(`/stripe/companies/${co.id}/status`);
      await loadAll();
      toast.success('Status refreshed');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const revFor = (id: string) => revenue.find((r) => r.companyId === id);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="w-6 h-6 text-[#ea580c]" />
              Company Payment Routing
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Two bank accounts via Stripe Connect. Every payment routes to the right company
              and is tagged with its code.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadAll()}
              className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#ea580c] text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Company
            </button>
          </div>
        </div>

        {/* Stripe config warning */}
        {!stripeConfigured && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              <strong>STRIPE_SECRET_KEY not detected on the server.</strong> Companies and codes
              still save, but connecting banks and charging cards requires the key. It's listed in
              your provided secrets, so this usually just means the latest server deploy hasn't
              landed yet — refresh in a minute.
            </p>
          </div>
        )}

        {/* Grand total */}
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total routed revenue (all companies)</p>
            <p className="text-3xl font-bold text-[#ea580c]">
              ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <DollarSign className="w-10 h-10 text-[#ea580c]/40" />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((co) => {
              const rev = revFor(co.id);
              const isEditing = editing === co.id;
              const ready = co.payoutsEnabled && co.chargesEnabled;
              return (
                <div key={co.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#ea580c]/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#ea580c]" />
                      </div>
                      <div>
                        {isEditing ? (
                          <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1 text-sm w-40"
                          />
                        ) : (
                          <h3 className="font-semibold">{co.name}</h3>
                        )}
                        {isEditing ? (
                          <input
                            value={form.code}
                            onChange={(e) => setForm({ ...form, code: e.target.value })}
                            className="mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1 text-xs w-32 font-mono text-[#ea580c]"
                          />
                        ) : (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-xs font-mono text-[#ea580c]">
                            {co.code}
                          </span>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(co.id)} disabled={busy === co.id}
                          className="p-1.5 bg-green-600 hover:bg-green-700 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="p-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(co)}
                        className="p-1.5 text-gray-400 hover:text-white">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${co.connectedAccountId ? 'bg-green-500/10 text-green-300' : 'bg-[#0A0A0A] text-gray-500'}`}>
                      {co.connectedAccountId ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      Account {co.connectedAccountId ? 'created' : 'not created'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${co.payoutsEnabled ? 'bg-green-500/10 text-green-300' : 'bg-[#0A0A0A] text-gray-500'}`}>
                      <Banknote className="w-3 h-3" />
                      Bank {co.payoutsEnabled ? `•••• ${co.bankLast4 || ''}` : 'not connected'}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${ready ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                      {ready ? 'Ready to receive' : 'Onboarding needed'}
                    </span>
                  </div>

                  {/* Revenue */}
                  <div className="bg-[#0A0A0A] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">Routed revenue</p>
                      <p className="text-xl font-bold">
                        ${(rev?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">{rev?.transactionCount || 0} txns</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => connectBank(co)}
                      disabled={busy === co.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#ea580c] hover:bg-[#dc2626] disabled:opacity-50 rounded-lg text-sm font-medium"
                    >
                      <LinkIcon className="w-4 h-4" />
                      {co.connectedAccountId ? 'Manage / Finish Bank Setup' : 'Connect Bank'}
                    </button>
                    <button
                      onClick={() => refreshStatus(co)}
                      disabled={busy === co.id}
                      className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-[#ea580c] rounded-lg"
                      title="Refresh status from Stripe"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-200/90 space-y-1">
          <p className="font-semibold text-blue-200">How routing works</p>
          <p>• Each company is a Stripe <strong>connected account</strong> with its own bank & payout schedule.</p>
          <p>• Payments are <strong>destination charges</strong> — funds land in that company's bank automatically.</p>
          <p>• Every charge is stamped with the company <strong>code</strong> (e.g. BPB-8544) in Stripe metadata and your records.</p>
        </div>
      </div>

      {/* Add company modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAdd(false)}>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Add Company</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Company name</label>
                <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Company code (e.g. BPB-8544)</label>
                <input value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm font-mono text-[#ea580c]" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Billing email (optional)</label>
                <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={addCompany} disabled={busy === 'add'}
              className="w-full py-2 bg-[#ea580c] hover:bg-[#dc2626] disabled:opacity-50 rounded-lg font-medium">
              {busy === 'add' ? 'Adding…' : 'Add Company'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
