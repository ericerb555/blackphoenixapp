/**
 * DealPublisher — Platform Owner tool to create deals targeted at specific portals.
 * Lives in the UnifiedDashboard. Syncs to server so all users see them.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Tag, Plus, Trash2, Edit2, CheckCircle, Clock, Eye, EyeOff,
  Send, ChevronDown, ChevronUp, DollarSign, Percent, X, RefreshCw,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export const PORTAL_OPTIONS = [
  { id: 'all',              label: 'All Portals',       color: 'bg-white/10 text-white border-white/20' },
  { id: 'territory',        label: 'Territory Partner', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'vendor',           label: 'Vendor',            color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'advertiser',       label: 'Advertiser',        color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { id: 'subcontractor',    label: 'Subcontractor',     color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { id: 'customer',         label: 'Customer',          color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { id: 'employee',         label: 'Employee',          color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { id: 'investor',         label: 'Investor',          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'property_manager', label: 'Property Manager',  color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'condo_manager',    label: 'Condo Manager',     color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'landlord',         label: 'Landlord',          color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  promoCode: '',
  discountType: 'percent' as 'percent' | 'flat' | 'free' | 'custom',
  discountValue: '',
  originalPrice: '',
  expiresAt: '',
  imageUrl: '',
  targetPortals: ['all'] as string[],
  active: true,
};

export default function DealPublisher() {
  const { session } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  const token = session?.access_token || publicAnonKey;

  async function loadDeals() {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/portal-deals/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDeals(data.deals || []);
    } catch {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDeals(); }, []);

  function togglePortal(id: string) {
    setForm(prev => {
      if (id === 'all') return { ...prev, targetPortals: ['all'] };
      const without = prev.targetPortals.filter(p => p !== 'all');
      return without.includes(id)
        ? { ...prev, targetPortals: without.filter(p => p !== id) || ['all'] }
        : { ...prev, targetPortals: [...without, id] };
    });
  }

  function startEdit(deal: any) {
    setForm({
      title: deal.title || '',
      description: deal.description || '',
      promoCode: deal.promoCode || '',
      discountType: deal.discountType || 'percent',
      discountValue: deal.discountValue || '',
      originalPrice: deal.originalPrice || '',
      expiresAt: deal.expiresAt ? deal.expiresAt.slice(0, 10) : '',
      imageUrl: deal.imageUrl || '',
      targetPortals: deal.targetPortals || ['all'],
      active: deal.active !== false,
    });
    setEditingId(deal.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  async function saveDeal() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.targetPortals.length) { toast.error('Select at least one portal'); return; }
    setSaving(true);
    try {
      const deal = {
        ...form,
        id: editingId || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : '',
      };
      const res = await fetch(`${SERVER}/portal-deals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal }),
      });
      if (!res.ok) throw new Error('Server error');
      toast.success(editingId ? 'Deal updated!' : 'Deal published to selected portals!');
      cancelForm();
      loadDeals();
    } catch {
      toast.error('Failed to save deal');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDeal(id: string) {
    try {
      await fetch(`${SERVER}/portal-deals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Deal removed');
      setDeals(prev => prev.filter(d => d.id !== id));
    } catch {
      toast.error('Failed to delete deal');
    }
  }

  async function toggleActive(deal: any) {
    try {
      await fetch(`${SERVER}/portal-deals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal: { ...deal, active: !deal.active } }),
      });
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, active: !d.active } : d));
      toast.success(deal.active ? 'Deal paused' : 'Deal activated');
    } catch {
      toast.error('Failed to update deal');
    }
  }

  const portalLabel = (ids: string[]) => {
    if (!ids?.length || ids.includes('all')) return 'All Portals';
    return ids.map(id => PORTAL_OPTIONS.find(p => p.id === id)?.label || id).join(', ');
  };

  const isExpired = (d: any) => d.expiresAt && new Date(d.expiresAt).getTime() < Date.now();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-400" /> Deal Publisher
          </h2>
          <p className="text-sm text-gray-400 mt-1">Create deals targeted at specific portals or private CRMs — synced to server, visible to all users in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDeals} className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> New Deal
            </button>
          )}
        </div>
      </div>

      {/* Deal Form */}
      {showForm && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Deal' : 'Create New Deal'}</h3>
            <button onClick={cancelForm} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Target Portals */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Target Portals *</label>
            <div className="flex flex-wrap gap-2">
              {PORTAL_OPTIONS.map(p => {
                const selected = form.targetPortals.includes(p.id) || (p.id === 'all' && form.targetPortals.includes('all'));
                return (
                  <button key={p.id} onClick={() => togglePortal(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selected ? p.color + ' ring-2 ring-offset-1 ring-offset-[#1A1A1A] ring-orange-500' : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-500 hover:text-gray-300'
                    }`}>
                    {selected && <span className="mr-1">✓</span>}{p.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: <span className="text-orange-400 font-medium">{portalLabel(form.targetPortals)}</span>
            </p>
          </div>

          {/* Title + Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Deal Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. 20% Off HVAC Services"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Promo Code</label>
              <input value={form.promoCode} onChange={e => setForm(p => ({ ...p, promoCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE20"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="What's included, terms, etc."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600 resize-none" />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Discount Type</label>
              <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as any }))}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                <option value="percent">% Off</option>
                <option value="flat">$ Off</option>
                <option value="free">Free</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Value</label>
              <input value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))}
                placeholder={form.discountType === 'percent' ? '20' : form.discountType === 'flat' ? '50' : '—'}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Original Price</label>
              <input value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))}
                placeholder="$299"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Expires</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Image URL (optional)</label>
            <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(p => ({ ...p, active: !p.active }))}
              className={`w-12 h-6 rounded-full transition-all relative ${form.active ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? 'left-6' : 'left-0.5'}`} />
            </button>
            <span className="text-sm text-gray-300">{form.active ? 'Active — visible to selected portals now' : 'Paused — not shown in portals yet'}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={saveDeal} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
              <Send className="w-4 h-4" /> {saving ? 'Publishing…' : editingId ? 'Update Deal' : 'Publish Deal'}
            </button>
            <button onClick={cancelForm} className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm font-medium transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deal List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading deals…</div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
          <Tag className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No deals published yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first deal above and push it to specific portals</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{deals.length} deal{deals.length !== 1 ? 's' : ''} published</p>
          {deals.map(deal => {
            const expired = isExpired(deal);
            const portals = deal.targetPortals || ['all'];
            const expanded = expandedDeal === deal.id;
            return (
              <div key={deal.id}
                className={`bg-[#1A1A1A] border rounded-xl transition-all ${
                  expired ? 'border-red-500/20 opacity-60' :
                  !deal.active ? 'border-[#2A2A2A] opacity-70' :
                  'border-[#2A2A2A] hover:border-orange-500/30'
                }`}>
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    expired ? 'bg-red-500' : deal.active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white text-sm">{deal.title}</p>
                      {deal.promoCode && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded text-xs font-mono font-bold">
                          {deal.promoCode}
                        </span>
                      )}
                      {expired && <span className="text-xs text-red-400 font-semibold">EXPIRED</span>}
                      {!deal.active && !expired && <span className="text-xs text-gray-500 font-semibold">PAUSED</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">{portalLabel(portals)}</span>
                      {deal.expiresAt && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(deal.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {deal.discountValue && (
                        <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                          {deal.discountType === 'percent' ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {deal.discountType === 'percent' ? `${deal.discountValue}% off` :
                           deal.discountType === 'flat' ? `$${deal.discountValue} off` :
                           deal.discountType === 'free' ? 'Free' : deal.discountValue}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleActive(deal)} title={deal.active ? 'Pause' : 'Activate'}
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      {deal.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(deal)} title="Edit"
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteDeal(deal.id)} title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedDeal(expanded ? null : deal.id)}
                      className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-5 pb-4 pt-0 border-t border-[#2A2A2A] mt-1 space-y-3">
                    {deal.description && (
                      <p className="text-sm text-gray-300">{deal.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(deal.targetPortals || ['all']).map((pid: string) => {
                        const opt = PORTAL_OPTIONS.find(p => p.id === pid);
                        return opt ? (
                          <span key={pid} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${opt.color}`}>
                            {opt.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <p className="text-xs text-gray-600">
                      Published by {deal.createdBy} · {deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
