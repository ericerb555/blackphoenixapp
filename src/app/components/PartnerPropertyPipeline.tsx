import { useEffect, useState } from 'react';
import {
  Handshake, RefreshCw, Mail, Phone, MapPin, Home, DollarSign, Loader2,
  ChevronRight, Sparkles, Save, Inbox,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface PartnerProperty {
  id: string;
  contact: { name?: string; email?: string; phone?: string; address?: string; notes?: string };
  property: Record<string, any>;
  recommendation: any;
  contact_name: string;
  contact_email: string;
  recommended_strategy: string;
  recommended_score: number | null;
  status: string;
  owner_notes: string;
  created_at: string;
}

const STATUSES = ['new', 'reviewing', 'contacted', 'partnered', 'declined'];
const STATUS_STYLE: Record<string, string> = {
  new: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  reviewing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  contacted: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  partnered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  declined: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const usd = (n: any) => (Number(n) > 0 ? `$${Number(n).toLocaleString('en-US')}` : '—');

export default function PartnerPropertyPipeline() {
  const [items, setItems] = useState<PartnerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PartnerProperty | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/investments/partner-properties`, {
        headers: await authedHeadersOrAnon(publicAnonKey),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
      setItems(data.partnerProperties || []);
    } catch (err: any) {
      console.error('PartnerPropertyPipeline: failed to load submissions:', err);
      setError(`Couldn't load partner-property submissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patch = async (item: PartnerProperty, changes: Partial<PartnerProperty>) => {
    setSavingId(item.id);
    try {
      const res = await fetch(`${SERVER}/investments/partner-properties/${item.id}`, {
        method: 'PUT',
        headers: await authedHeadersOrAnon(publicAnonKey),
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || `Server returned ${res.status}`);
      const updated = data.partnerProperty as PartnerProperty;
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelected((s) => (s && s.id === updated.id ? updated : s));
    } catch (err: any) {
      console.error('PartnerPropertyPipeline: failed to update submission:', err);
      setError(`Couldn't save changes: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Handshake className="w-6 h-6 text-orange-400" /> Partner Property Pipeline</h2>
          <p className="text-sm text-gray-400 mt-1">Investors who already own property and want our help choosing &amp; executing a strategy.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-gray-300 hover:text-white hover:border-orange-500/50 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="mb-4 bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No partner-property submissions yet.</p>
          <p className="text-sm text-gray-600 mt-1">They'll appear here as investors submit properties from the "Partner With Us" page.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === item.id ? 'border-orange-500/60 bg-[#1A1A1A]' : 'border-[#2A2A2A] bg-[#0F0F0F] hover:border-[#3A3A3A]'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-white truncate">{item.contact_name || 'Unnamed'}</span>
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLE[item.status] || STATUS_STYLE.new}`}>{item.status}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{item.contact?.address || item.contact_email}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-orange-400">
                  <Sparkles className="w-3.5 h-3.5" /> {item.recommended_strategy}
                  {item.recommended_score != null && <span className="text-gray-500">· {item.recommended_score}/100</span>}
                  <ChevronRight className="w-4 h-4 ml-auto text-gray-600" />
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm border border-dashed border-[#2A2A2A] rounded-xl py-16">Select a submission to review</div>
            ) : (
              <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white">{selected.contact_name || 'Unnamed'}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                    {selected.contact?.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selected.contact.email}</span>}
                    {selected.contact?.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {selected.contact.phone}</span>}
                    {selected.contact?.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {selected.contact.address}</span>}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-gradient-to-r from-orange-600/15 to-transparent border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold mb-2"><Sparkles className="w-4 h-4" /> Recommended: {selected.recommended_strategy} {selected.recommended_score != null && `(${selected.recommended_score}/100)`}</div>
                  {selected.recommendation?.primary?.projection && <p className="text-sm text-emerald-400 mb-2">{selected.recommendation.primary.projection}</p>}
                  {Array.isArray(selected.recommendation?.primary?.reasons) && (
                    <ul className="space-y-1">
                      {selected.recommendation.primary.reasons.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-gray-400">• {r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Property snapshot */}
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Detail label="Type" value={selected.property?.propertyType} icon={Home} />
                  <Detail label="Condition" value={selected.property?.condition} icon={Home} />
                  <Detail label="Current use" value={selected.property?.currentUse} icon={Home} />
                  <Detail label="Lot size" value={selected.property?.lotSizeAcres ? `${selected.property.lotSizeAcres} ac` : '—'} icon={MapPin} />
                  <Detail label="As-is value" value={usd(selected.property?.estimatedValue)} icon={DollarSign} />
                  <Detail label="ARV" value={usd(selected.property?.afterRepairValue)} icon={DollarSign} />
                  <Detail label="Repair cost" value={usd(selected.property?.repairCost)} icon={DollarSign} />
                  <Detail label="Monthly rent" value={usd(selected.property?.monthlyRentPotential)} icon={DollarSign} />
                  <Detail label="Zoning subdividable" value={selected.property?.zoningSubdividable} icon={Home} />
                  <Detail label="Goal" value={selected.property?.goal} icon={Home} />
                </div>

                {selected.contact?.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Investor notes</p>
                    <p className="text-sm text-gray-300 bg-[#141414] rounded-lg p-3">{selected.contact.notes}</p>
                  </div>
                )}

                {/* Status control */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => patch(selected, { status: s })}
                        disabled={savingId === selected.id}
                        className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition-all ${selected.status === s ? STATUS_STYLE[s] : 'border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Owner notes */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Internal notes</p>
                  <textarea
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm min-h-[80px] focus:outline-none focus:border-orange-500/60"
                    value={selected.owner_notes || ''}
                    onChange={(e) => setSelected({ ...selected, owner_notes: e.target.value })}
                  />
                  <button
                    onClick={() => patch(selected, { owner_notes: selected.owner_notes })}
                    disabled={savingId === selected.id}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    {savingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save notes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, icon: Icon }: { label: string; value: any; icon: typeof Home }) {
  return (
    <div className="flex items-center gap-2 bg-[#141414] rounded-lg px-3 py-2">
      <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-white capitalize truncate">{value || '—'}</p>
      </div>
    </div>
  );
}
