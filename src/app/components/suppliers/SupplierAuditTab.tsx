/**
 * Supplier Audit — performance, compliance and quality reviews.
 *
 * Every score here is entered by whoever ran the audit; nothing is inferred or
 * generated, so an empty list means no audits have been done yet.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield, Plus, X, Save, Trash2, AlertCircle, Loader2, CheckCircle,
  AlertTriangle, TrendingUp,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface AuditSupplierOption {
  id: string;
  name: string;
}

interface Audit {
  id: string;
  supplierId: string;
  supplierName?: string;
  auditDate?: string;
  auditor?: string;
  deliveryScore?: number;
  qualityScore?: number;
  complianceScore?: number;
  responsivenessScore?: number;
  insuranceOnFile?: boolean;
  licenseOnFile?: boolean;
  w9OnFile?: boolean;
  findings?: string;
  correctiveAction?: string;
  status?: 'passed' | 'conditional' | 'failed';
}

const SCORE_FIELDS = [
  { key: 'deliveryScore', label: 'On-time delivery' },
  { key: 'qualityScore', label: 'Material quality' },
  { key: 'complianceScore', label: 'Compliance' },
  { key: 'responsivenessScore', label: 'Responsiveness' },
] as const;

const DOC_FIELDS = [
  { key: 'insuranceOnFile', label: 'Certificate of insurance' },
  { key: 'licenseOnFile', label: 'License / registration' },
  { key: 'w9OnFile', label: 'W-9' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  passed: 'bg-green-600/20 text-green-400',
  conditional: 'bg-yellow-600/20 text-yellow-400',
  failed: 'bg-red-600/20 text-red-400',
};

const authHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

/** Mean of whichever of the five-point scores were actually filled in. */
function overallScore(audit: Audit): number | null {
  const scores = SCORE_FIELDS
    .map((f) => Number(audit[f.key]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

const emptyForm = {
  supplierId: '', auditDate: new Date().toISOString().slice(0, 10), auditor: '',
  deliveryScore: '', qualityScore: '', complianceScore: '', responsivenessScore: '',
  insuranceOnFile: false, licenseOnFile: false, w9OnFile: false,
  findings: '', correctiveAction: '', status: 'passed' as Audit['status'],
};

export function SupplierAuditTab({ suppliers }: { suppliers: AuditSupplierOption[] }) {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/supplier-audits`, { headers: authHeaders });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Could not load supplier audits (${res.status}): ${detail.slice(0, 200)}`);
      }
      const data = await res.json();
      setAudits(Array.isArray(data) ? data : (data?.items || []));
      setError(null);
    } catch (err: any) {
      console.error('Failed to load supplier audits:', err);
      setError(err?.message || 'Could not load supplier audits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const scored = audits.map(overallScore).filter((n): n is number => n !== null);
    const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
    const missingDocs = audits.filter(
      (a) => !a.insuranceOnFile || !a.licenseOnFile || !a.w9OnFile,
    ).length;
    return {
      total: audits.length,
      avg,
      failing: audits.filter((a) => a.status === 'failed').length,
      missingDocs,
    };
  }, [audits]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (audit: Audit) => {
    setEditingId(audit.id);
    setForm({
      supplierId: audit.supplierId || '',
      auditDate: audit.auditDate || '',
      auditor: audit.auditor || '',
      deliveryScore: audit.deliveryScore != null ? String(audit.deliveryScore) : '',
      qualityScore: audit.qualityScore != null ? String(audit.qualityScore) : '',
      complianceScore: audit.complianceScore != null ? String(audit.complianceScore) : '',
      responsivenessScore: audit.responsivenessScore != null ? String(audit.responsivenessScore) : '',
      insuranceOnFile: !!audit.insuranceOnFile,
      licenseOnFile: !!audit.licenseOnFile,
      w9OnFile: !!audit.w9OnFile,
      findings: audit.findings || '',
      correctiveAction: audit.correctiveAction || '',
      status: audit.status || 'passed',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.supplierId) {
      toast.error('Choose which supplier this audit is for.');
      return;
    }
    const numeric: Record<string, number | undefined> = {};
    for (const f of SCORE_FIELDS) {
      const raw = form[f.key];
      if (raw === '') { numeric[f.key] = undefined; continue; }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        toast.error(`${f.label} must be a score from 1 to 5.`);
        return;
      }
      numeric[f.key] = n;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        ...numeric,
        supplierName: suppliers.find((s) => s.id === form.supplierId)?.name || '',
      };
      const res = await fetch(
        editingId ? `${API_BASE}/supplier-audits/${editingId}` : `${API_BASE}/supplier-audits`,
        { method: editingId ? 'PUT' : 'POST', headers: authHeaders, body: JSON.stringify(payload) },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      toast.success(editingId ? 'Audit updated' : 'Audit recorded');
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (err: any) {
      console.error('Failed to save supplier audit:', err);
      toast.error(err?.message || 'Could not save the audit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (audit: Audit) => {
    if (!window.confirm('Delete this audit record? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/supplier-audits/${audit.id}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      toast.success('Audit deleted');
      load();
    } catch (err: any) {
      console.error('Failed to delete supplier audit:', err);
      toast.error(err?.message || 'Could not delete the audit.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Supplier Audits</h2>
          <p className="text-zinc-400 text-sm">Score delivery, quality and compliance, and track what's missing.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Audit
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold">Couldn't load audits</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Audits on file', value: String(stats.total), icon: Shield, color: 'text-blue-400' },
          { label: 'Average score', value: stats.avg === null ? '—' : `${stats.avg.toFixed(1)} / 5`, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Failed audits', value: String(stats.failing), icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Missing documents', value: String(stats.missingDocs), icon: AlertCircle, color: 'text-yellow-400' },
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
          Loading audits…
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-12 text-center">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-semibold mb-1">No audits recorded</p>
          <p className="text-zinc-500 text-sm">Run your first supplier audit to start building a performance history.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => {
            const score = overallScore(audit);
            const missing = DOC_FIELDS.filter((d) => !audit[d.key]).map((d) => d.label);
            return (
              <div key={audit.id} className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold">
                        {audit.supplierName || suppliers.find((s) => s.id === audit.supplierId)?.name || audit.supplierId}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[audit.status || 'passed']}`}>
                        {(audit.status || 'passed').toUpperCase()}
                      </span>
                      {score !== null && (
                        <span className="text-sm text-zinc-300">{score.toFixed(1)} / 5</span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">
                      {audit.auditDate || 'No date'}{audit.auditor ? ` • audited by ${audit.auditor}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(audit)} className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(audit)} className="p-2 text-zinc-500 hover:text-red-400" aria-label="Delete audit">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {SCORE_FIELDS.map((f) => {
                    const v = Number(audit[f.key]);
                    return (
                      <div key={f.key} className="bg-[#0F0F0F] border border-zinc-800 rounded-lg p-3">
                        <p className="text-zinc-500 text-xs mb-1">{f.label}</p>
                        <p className="font-semibold">{Number.isFinite(v) && v > 0 ? `${v} / 5` : '—'}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap text-xs">
                  {DOC_FIELDS.map((d) => (
                    <span
                      key={d.key}
                      className={`flex items-center gap-1 px-2 py-1 rounded ${
                        audit[d.key] ? 'bg-green-600/15 text-green-400' : 'bg-yellow-600/15 text-yellow-400'
                      }`}
                    >
                      {audit[d.key] ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {d.label}
                    </span>
                  ))}
                </div>

                {missing.length > 0 && (
                  <p className="text-yellow-400/80 text-xs mt-2">
                    Outstanding: {missing.join(', ')}
                  </p>
                )}
                {audit.findings && (
                  <p className="text-zinc-400 text-sm mt-3"><span className="text-zinc-500">Findings:</span> {audit.findings}</p>
                )}
                {audit.correctiveAction && (
                  <p className="text-zinc-400 text-sm mt-1"><span className="text-zinc-500">Corrective action:</span> {audit.correctiveAction}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold">{editingId ? 'Edit audit' : 'New supplier audit'}</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Supplier *</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select…</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Audit date</label>
                  <input
                    type="date"
                    value={form.auditDate}
                    onChange={(e) => setForm({ ...form, auditDate: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Auditor</label>
                  <input
                    value={form.auditor}
                    onChange={(e) => setForm({ ...form, auditor: e.target.value })}
                    className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Scores (1–5, leave blank to skip)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SCORE_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs text-zinc-500 mb-1">{f.label}</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Documents on file</p>
                <div className="flex flex-wrap gap-4">
                  {DOC_FIELDS.map((d) => (
                    <label key={d.key} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[d.key]}
                        onChange={(e) => setForm({ ...form, [d.key]: e.target.checked })}
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Outcome</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Audit['status'] })}
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="passed">Passed</option>
                  <option value="conditional">Conditional</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Findings</label>
                <textarea
                  value={form.findings}
                  onChange={(e) => setForm({ ...form, findings: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Corrective action</label>
                <textarea
                  value={form.correctiveAction}
                  onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })}
                  rows={2}
                  className="w-full bg-[#0F0F0F] border border-zinc-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-800">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
