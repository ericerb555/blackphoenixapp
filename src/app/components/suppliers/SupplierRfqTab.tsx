/**
 * Supplier Response — RFQ management.
 *
 * An RFQ is sent to a set of suppliers; each reply is stored as a quote on the
 * same record so the comparison table never needs a second lookup. Awarding
 * locks the RFQ to the winning supplier.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, Plus, X, Save, Trash2, Award, DollarSign,
  Clock, AlertCircle, CheckCircle, Loader2,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface RfqSupplierOption {
  id: string;
  name: string;
}

interface Quote {
  supplierId: string;
  supplierName: string;
  amount: number;
  leadTime: string;
  notes: string;
  quotedAt: string;
}

interface Rfq {
  id: string;
  title: string;
  projectName?: string;
  description?: string;
  dueDate?: string;
  invitedSupplierIds?: string[];
  quotes?: Quote[];
  status?: 'open' | 'quoted' | 'awarded' | 'closed';
  awardedTo?: string;
  awardedSupplierName?: string;
  awardedAmount?: number;
  createdAt?: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-600/20 text-blue-400',
  quoted: 'bg-yellow-600/20 text-yellow-400',
  awarded: 'bg-green-600/20 text-green-400',
  closed: 'bg-zinc-600/20 text-zinc-400',
};

const money = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const authHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

export function SupplierRfqTab({ suppliers }: { suppliers: RfqSupplierOption[] }) {
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', projectName: '', description: '', dueDate: '',
    invitedSupplierIds: [] as string[],
  });

  const [quoteFor, setQuoteFor] = useState<Rfq | null>(null);
  const [quoteForm, setQuoteForm] = useState({ supplierId: '', amount: '', leadTime: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/supplier-rfqs`, { headers: authHeaders });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Could not load RFQs (${res.status}): ${detail.slice(0, 200)}`);
      }
      const data = await res.json();
      setRfqs(Array.isArray(data) ? data : (data?.items || []));
      setError(null);
    } catch (err: any) {
      console.error('Failed to load RFQs:', err);
      setError(err?.message || 'Could not load RFQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierName = useCallback(
    (id: string) => suppliers.find((s) => s.id === id)?.name || id,
    [suppliers],
  );

  const stats = useMemo(() => {
    const open = rfqs.filter((r) => r.status !== 'awarded' && r.status !== 'closed').length;
    const awarded = rfqs.filter((r) => r.status === 'awarded');
    const quoteCount = rfqs.reduce((sum, r) => sum + (r.quotes?.length || 0), 0);
    const awardedValue = awarded.reduce((sum, r) => sum + (Number(r.awardedAmount) || 0), 0);
    return { open, awarded: awarded.length, quoteCount, awardedValue };
  }, [rfqs]);

  const resetForm = () =>
    setForm({ title: '', projectName: '', description: '', dueDate: '', invitedSupplierIds: [] });

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Give the RFQ a title so suppliers know what they are quoting.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/supplier-rfqs`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...form, title: form.title.trim(), status: 'open', quotes: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success('RFQ created');
      setShowCreate(false);
      resetForm();
      load();
    } catch (err: any) {
      console.error('Failed to create RFQ:', err);
      toast.error(err?.message || 'Could not create the RFQ.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordQuote = async () => {
    if (!quoteFor) return;
    if (!quoteForm.supplierId) {
      toast.error('Choose which supplier this quote came from.');
      return;
    }
    const amount = Number(quoteForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid quote amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/supplier-rfqs/${quoteFor.id}/quote`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          supplierId: quoteForm.supplierId,
          supplierName: supplierName(quoteForm.supplierId),
          amount,
          leadTime: quoteForm.leadTime,
          notes: quoteForm.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success('Quote recorded');
      setQuoteFor(null);
      setQuoteForm({ supplierId: '', amount: '', leadTime: '', notes: '' });
      load();
    } catch (err: any) {
      console.error('Failed to record quote:', err);
      toast.error(err?.message || 'Could not record the quote.');
    } finally {
      setSaving(false);
    }
  };

  const handleAward = async (rfq: Rfq, supplierId: string) => {
    try {
      const res = await fetch(`${API_BASE}/supplier-rfqs/${rfq.id}/award`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ supplierId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success(`Awarded to ${supplierName(supplierId)}`);
      load();
    } catch (err: any) {
      console.error('Failed to award RFQ:', err);
      toast.error(err?.message || 'Could not award the RFQ.');
    }
  };

  const handleDelete = async (rfq: Rfq) => {
    if (!window.confirm(`Delete the RFQ "${rfq.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/supplier-rfqs/${rfq.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      toast.success('RFQ deleted');
      load();
    } catch (err: any) {
      console.error('Failed to delete RFQ:', err);
      toast.error(err?.message || 'Could not delete the RFQ.');
    }
  };

  const toggleInvited = (id: string) =>
    setForm((f) => ({
      ...f,
      invitedSupplierIds: f.invitedSupplierIds.includes(id)
        ? f.invitedSupplierIds.filter((x) => x !== id)
        : [...f.invitedSupplierIds, id],
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Supplier Responses</h2>
          <p className="text-zinc-400 text-sm">Send RFQs, log the quotes that come back, and award the work.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New RFQ
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold">Couldn't load RFQs</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open RFQs', value: String(stats.open), icon: MessageSquare, color: 'text-blue-400' },
          { label: 'Quotes Received', value: String(stats.quoteCount), icon: DollarSign, color: 'text-yellow-400' },
          { label: 'Awarded', value: String(stats.awarded), icon: Award, color: 'text-green-400' },
          { label: 'Awarded Value', value: money(stats.awardedValue), icon: CheckCircle, color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-12 text-center text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
          Loading RFQs…
        </div>
      ) : rfqs.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold mb-1">No RFQs yet</p>
          <p className="text-zinc-500 text-sm">Create one to start collecting supplier quotes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rfqs.map((rfq) => {
            const quotes = [...(rfq.quotes || [])].sort((a, b) => a.amount - b.amount);
            const lowest = quotes[0]?.amount;
            return (
              <div key={rfq.id} className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold">{rfq.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[rfq.status || 'open']}`}>
                        {(rfq.status || 'open').toUpperCase()}
                      </span>
                    </div>
                    {rfq.projectName && <p className="text-zinc-400 text-sm mt-1">Project: {rfq.projectName}</p>}
                    {rfq.description && <p className="text-zinc-500 text-sm mt-1">{rfq.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                      {rfq.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {rfq.dueDate}
                        </span>
                      )}
                      <span>{rfq.invitedSupplierIds?.length || 0} invited</span>
                      <span>{quotes.length} quoted</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rfq.status !== 'awarded' && (
                      <button
                        onClick={() => { setQuoteFor(rfq); setQuoteForm({ supplierId: '', amount: '', leadTime: '', notes: '' }); }}
                        className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm"
                      >
                        Record Quote
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rfq)}
                      className="p-2 text-zinc-500 hover:text-red-400"
                      aria-label={`Delete RFQ ${rfq.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {quotes.length > 0 && (
                  <div className="mt-4 border-t border-zinc-800 pt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-500 text-left">
                          <th className="pb-2 font-medium">Supplier</th>
                          <th className="pb-2 font-medium">Quote</th>
                          <th className="pb-2 font-medium">Lead Time</th>
                          <th className="pb-2 font-medium">Notes</th>
                          <th className="pb-2 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotes.map((q) => (
                          <tr key={q.supplierId} className="border-t border-zinc-800/60">
                            <td className="py-2">
                              {q.supplierName || supplierName(q.supplierId)}
                              {rfq.awardedTo === q.supplierId && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-green-600/20 text-green-400 text-xs">Awarded</span>
                              )}
                            </td>
                            <td className="py-2">
                              <span className={q.amount === lowest ? 'text-green-400 font-semibold' : ''}>
                                {money(q.amount)}
                              </span>
                              {q.amount === lowest && quotes.length > 1 && (
                                <span className="text-zinc-500 text-xs ml-2">lowest</span>
                              )}
                            </td>
                            <td className="py-2 text-zinc-400">{q.leadTime || '—'}</td>
                            <td className="py-2 text-zinc-400">{q.notes || '—'}</td>
                            <td className="py-2 text-right">
                              {rfq.status !== 'awarded' && (
                                <button
                                  onClick={() => handleAward(rfq, q.supplierId)}
                                  className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-semibold"
                                >
                                  Award
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold">New RFQ</h3>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Framing lumber — Phase 2"
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Project</label>
                  <input
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Responses due</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Scope / notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Invite suppliers</label>
                {suppliers.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    No suppliers on file yet — add them on the Supplier Connect tab first.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-zinc-800 rounded-lg p-2">
                    {suppliers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-zinc-300 px-1 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.invitedSupplierIds.includes(s.id)}
                          onChange={() => toggleInvited(s.id)}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-800">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Create RFQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quoteFor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold">Record a quote</h3>
              <button onClick={() => setQuoteFor(null)} className="text-zinc-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-zinc-400 text-sm">{quoteFor.title}</p>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Supplier *</label>
                <select
                  value={quoteForm.supplierId}
                  onChange={(e) => setQuoteForm({ ...quoteForm, supplierId: e.target.value })}
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select a supplier…</option>
                  {(quoteFor.invitedSupplierIds?.length
                    ? suppliers.filter((s) => quoteFor.invitedSupplierIds!.includes(s.id))
                    : suppliers
                  ).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteForm.amount}
                    onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Lead time</label>
                  <input
                    value={quoteForm.leadTime}
                    onChange={(e) => setQuoteForm({ ...quoteForm, leadTime: e.target.value })}
                    placeholder="e.g. 10 days"
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                <textarea
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-800">
              <button onClick={() => setQuoteFor(null)} className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleRecordQuote}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg font-semibold"
              >
                {saving ? 'Saving…' : 'Save Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
