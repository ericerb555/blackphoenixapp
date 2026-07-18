/**
 * TechRosterManager — Owner/Admin tool in the UnifiedDashboard.
 * Manage tech tiers (rates per tier A–D) and individual tech profiles.
 * Portals use TierPicker to select the tier they need for a job.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  HardHat, Plus, Trash2, Edit2, X, Save, RefreshCw,
  DollarSign, Star, CheckCircle, Clock, Phone, Mail,
  ChevronDown, ChevronUp, Award, Wrench, Eye, EyeOff,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export interface TechTier {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  description: string;
  hourlyRate: number;
  color: string;
}

export const TIER_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  A: { border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  B: { border: 'border-gray-400/40',   bg: 'bg-gray-400/10',   text: 'text-gray-300',   badge: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
  C: { border: 'border-blue-500/40',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  D: { border: 'border-green-500/40',  bg: 'bg-green-500/10',  text: 'text-green-400',  badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
};

const TRADE_OPTIONS = [
  'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Roofing', 'Painting',
  'Flooring', 'Concrete', 'Landscaping', 'General Handyman', 'Drywall',
  'Tile & Stone', 'Appliance Repair', 'Pest Control', 'Cleaning',
];

const EMPTY_TECH = {
  name: '', tier: 'C' as TechTier['id'], trades: [] as string[],
  certifications: '', yearsExperience: '', phone: '', email: '', bio: '', available: true,
};

export default function TechRosterManager() {
  const { session } = useAuth();
  const token = session?.access_token || publicAnonKey;

  const [tiers, setTiers] = useState<TechTier[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'tiers' | 'roster'>('tiers');

  // Tier editing
  const [editingTiers, setEditingTiers] = useState(false);
  const [draftTiers, setDraftTiers] = useState<TechTier[]>([]);
  const [savingTiers, setSavingTiers] = useState(false);

  // Tech form
  const [showTechForm, setShowTechForm] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [techForm, setTechForm] = useState({ ...EMPTY_TECH });
  const [savingTech, setSavingTech] = useState(false);
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [tiersRes, rosterRes] = await Promise.all([
        fetch(`${SERVER}/tech-tiers/config`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${SERVER}/tech-roster`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const tiersData = await tiersRes.json();
      const rosterData = await rosterRes.json();
      setTiers(tiersData.tiers || []);
      setTechs(rosterData.techs || []);
    } catch { toast.error('Failed to load roster'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // ── Tier management ──────────────────────────────────────────────────────────

  function startEditTiers() {
    setDraftTiers(tiers.map(t => ({ ...t })));
    setEditingTiers(true);
  }

  async function saveTiers() {
    setSavingTiers(true);
    try {
      const res = await fetch(`${SERVER}/tech-tiers/config`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: draftTiers }),
      });
      if (!res.ok) throw new Error('Server error');
      setTiers(draftTiers);
      setEditingTiers(false);
      toast.success('Tier rates saved!');
    } catch { toast.error('Failed to save tiers'); }
    finally { setSavingTiers(false); }
  }

  // ── Tech management ──────────────────────────────────────────────────────────

  function startEditTech(tech: any) {
    setTechForm({
      name: tech.name || '',
      tier: tech.tier || 'C',
      trades: tech.trades || [],
      certifications: tech.certifications || '',
      yearsExperience: String(tech.yearsExperience || ''),
      phone: tech.phone || '',
      email: tech.email || '',
      bio: tech.bio || '',
      available: tech.available !== false,
    });
    setEditingTechId(tech.id);
    setShowTechForm(true);
  }

  function cancelTechForm() { setShowTechForm(false); setEditingTechId(null); setTechForm({ ...EMPTY_TECH }); }

  function toggleTrade(trade: string) {
    setTechForm(prev => ({
      ...prev,
      trades: prev.trades.includes(trade)
        ? prev.trades.filter(t => t !== trade)
        : [...prev.trades, trade],
    }));
  }

  async function saveTech() {
    if (!techForm.name.trim()) { toast.error('Tech name required'); return; }
    if (!techForm.tier) { toast.error('Select a tier'); return; }
    setSavingTech(true);
    try {
      const res = await fetch(`${SERVER}/tech-roster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tech: { ...techForm, id: editingTechId || undefined } }),
      });
      if (!res.ok) throw new Error('Server error');
      toast.success(editingTechId ? 'Tech updated!' : 'Tech added to roster!');
      cancelTechForm();
      load();
    } catch { toast.error('Failed to save tech'); }
    finally { setSavingTech(false); }
  }

  async function deleteTech(id: string) {
    try {
      await fetch(`${SERVER}/tech-roster/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Tech removed from roster');
      setTechs(prev => prev.filter(t => t.id !== id));
    } catch { toast.error('Failed to delete tech'); }
  }

  async function toggleAvailable(tech: any) {
    try {
      await fetch(`${SERVER}/tech-roster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tech: { ...tech, available: !tech.available } }),
      });
      setTechs(prev => prev.map(t => t.id === tech.id ? { ...t, available: !t.available } : t));
    } catch { toast.error('Failed to update availability'); }
  }

  const tierRate = (tierId: string) => tiers.find(t => t.id === tierId)?.hourlyRate || 0;
  const techsByTier = (tierId: string) => techs.filter(t => t.tier === tierId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HardHat className="w-5 h-5 text-orange-400" /> Tech Roster & Tier Rates
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Set hourly rates per tier (A = best) · Add techs · Portals choose tier when requesting work
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        {([['tiers', 'Tier Rates'], ['roster', 'Tech Roster']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition border ${activeSection === id ? 'bg-orange-600 text-white border-transparent' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
            {label}
            {id === 'roster' && techs.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">{techs.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading…</div>
      ) : activeSection === 'tiers' ? (

        /* ── TIER RATES ─────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Portal users see these rates when choosing a tier for their request. Tier A is the highest skill level.</p>
            {!editingTiers ? (
              <button onClick={startEditTiers}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
                <Edit2 className="w-4 h-4" /> Edit Tiers
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={saveTiers} disabled={savingTiers}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
                  <Save className="w-4 h-4" /> {savingTiers ? 'Saving…' : 'Save Tiers'}
                </button>
                <button onClick={() => setEditingTiers(false)}
                  className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Add tier button (edit mode only) */}
          {editingTiers && (
            <button
              onClick={() => setDraftTiers(prev => [...prev, {
                id: String.fromCharCode(65 + prev.length) as any,
                label: `Tier ${String.fromCharCode(65 + prev.length)} — New Level`,
                description: "Describe this tier's skill level and qualifications",
                hourlyRate: 65,
                color: 'blue',
              }])}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-dashed border-[#3A3A3A] hover:border-orange-500/50 text-gray-400 hover:text-orange-400 rounded-xl text-sm font-medium transition">
              <Plus className="w-4 h-4" /> Add Tier
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(editingTiers ? draftTiers : tiers).map((tier, i) => {
              const styles = TIER_STYLES[tier.id] || TIER_STYLES.C;
              const techCount = techsByTier(tier.id).length;
              return (
                <div key={tier.id} className={`bg-[#1A1A1A] border ${editingTiers ? 'border-orange-500/20' : styles.border} rounded-2xl p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {editingTiers ? (
                        /* Editable tier ID badge */
                        <div className="flex flex-col items-center gap-1">
                          <input
                            value={draftTiers[i].id}
                            maxLength={2}
                            onChange={e => setDraftTiers(prev => prev.map((t, j) => j === i ? { ...t, id: e.target.value.toUpperCase() as any } : t))}
                            className="w-12 h-12 bg-[#0A0A0A] border border-orange-500/50 rounded-xl text-center text-xl font-black text-orange-400 focus:outline-none focus:border-orange-500"
                          />
                          <span className="text-xs text-gray-600">ID</span>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-xl font-black ${styles.text}`}>{tier.id}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {editingTiers ? (
                          <input
                            value={draftTiers[i].label}
                            onChange={e => setDraftTiers(prev => prev.map((t, j) => j === i ? { ...t, label: e.target.value } : t))}
                            placeholder="e.g. Tier A — Elite Master"
                            className="w-full bg-[#0A0A0A] border border-orange-500/30 rounded-lg px-3 py-1.5 text-white text-sm font-bold focus:outline-none focus:border-orange-500 placeholder-gray-600"
                          />
                        ) : (
                          <p className={`font-bold text-sm ${styles.text}`}>{tier.label}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{techCount} tech{techCount !== 1 ? 's' : ''} at this tier</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {editingTiers ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 text-sm">$</span>
                            <input
                              type="number" min="0" step="1"
                              value={draftTiers[i].hourlyRate}
                              onChange={e => setDraftTiers(prev => prev.map((t, j) => j === i ? { ...t, hourlyRate: Number(e.target.value) } : t))}
                              className="w-20 bg-[#0A0A0A] border border-orange-500/50 rounded-lg px-2 py-1.5 text-white text-sm font-bold text-right focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-gray-500 text-sm">/hr</span>
                          </div>
                          {draftTiers.length > 1 && (
                            <button
                              onClick={() => setDraftTiers(prev => prev.filter((_, j) => j !== i))}
                              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition">
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className={`text-2xl font-black ${styles.text}`}>${tier.hourlyRate}</p>
                          <p className="text-xs text-gray-500">per hour</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingTiers ? (
                    <input
                      value={draftTiers[i].description}
                      onChange={e => setDraftTiers(prev => prev.map((t, j) => j === i ? { ...t, description: e.target.value } : t))}
                      placeholder="Describe skill level, certifications, experience required…"
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-gray-300 text-xs focus:outline-none focus:border-orange-500 placeholder-gray-600"
                    />
                  ) : (
                    <p className="text-xs text-gray-400">{tier.description}</p>
                  )}

                  {/* Tech avatars for this tier */}
                  {techsByTier(tier.id).length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#2A2A2A]">
                      <div className="flex -space-x-2">
                        {techsByTier(tier.id).slice(0, 4).map(tech => (
                          <div key={tech.id} className={`w-7 h-7 rounded-full ${styles.bg} border-2 border-[#1A1A1A] flex items-center justify-center`}>
                            <span className={`text-xs font-bold ${styles.text}`}>{tech.name.charAt(0)}</span>
                          </div>
                        ))}
                        {techsByTier(tier.id).length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-[#2A2A2A] border-2 border-[#1A1A1A] flex items-center justify-center">
                            <span className="text-xs text-gray-400">+{techsByTier(tier.id).length - 4}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{techsByTier(tier.id).map(t => t.name).join(', ')}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Portal preview */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Portal user preview — what they see when choosing a tier</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tiers.map(tier => {
                const styles = TIER_STYLES[tier.id] || TIER_STYLES.C;
                return (
                  <div key={tier.id} className={`rounded-xl border-2 ${styles.border} p-3 cursor-pointer hover:opacity-90 transition`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${styles.bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-sm font-black ${styles.text}`}>{tier.id}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${styles.text}`}>{tier.label}</p>
                        <p className={`text-xs font-semibold ${styles.text}`}>${tier.hourlyRate}/hr</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{tier.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      ) : (

        /* ── TECH ROSTER ────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{techs.length} tech{techs.length !== 1 ? 's' : ''} in roster · {techs.filter(t => t.available).length} available now</p>
            {!showTechForm && (
              <button onClick={() => setShowTechForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
                <Plus className="w-4 h-4" /> Add Tech
              </button>
            )}
          </div>

          {/* Tech form */}
          {showTechForm && (
            <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{editingTechId ? 'Edit Tech' : 'Add Tech to Roster'}</h3>
                <button onClick={cancelTechForm} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition"><X className="w-4 h-4" /></button>
              </div>

              {/* Tier selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Experience Tier *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {tiers.map(tier => {
                    const styles = TIER_STYLES[tier.id] || TIER_STYLES.C;
                    const selected = techForm.tier === tier.id;
                    return (
                      <button key={tier.id} onClick={() => setTechForm(p => ({ ...p, tier: tier.id as any }))}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${selected ? `${styles.border} ${styles.bg} ring-2 ring-offset-1 ring-offset-[#1A1A1A] ring-orange-500` : 'border-[#2A2A2A] hover:border-gray-600'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-black ${selected ? styles.text : 'text-gray-500'}`}>{tier.id}</span>
                          <span className={`text-xs font-semibold ${selected ? styles.text : 'text-gray-500'}`}>${tier.hourlyRate}/hr</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{tier.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name *</label>
                  <input value={techForm.name} onChange={e => setTechForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mike Thompson"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Phone</label>
                  <input value={techForm.phone} onChange={e => setTechForm(p => ({ ...p, phone: e.target.value }))} placeholder="(214) 555-0000"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                  <input value={techForm.email} onChange={e => setTechForm(p => ({ ...p, email: e.target.value }))} placeholder="tech@email.com"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Years Experience</label>
                  <input type="number" min="0" value={techForm.yearsExperience} onChange={e => setTechForm(p => ({ ...p, yearsExperience: e.target.value }))} placeholder="5"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Certifications / License #</label>
                  <input value={techForm.certifications} onChange={e => setTechForm(p => ({ ...p, certifications: e.target.value }))} placeholder="e.g. Master Plumber #12345, EPA 608"
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
              </div>

              {/* Trades */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trades / Skills</label>
                <div className="flex flex-wrap gap-2">
                  {TRADE_OPTIONS.map(trade => {
                    const sel = techForm.trades.includes(trade);
                    return (
                      <button key={trade} onClick={() => toggleTrade(trade)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${sel ? 'bg-orange-600 text-white border-transparent' : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-500 hover:text-gray-300'}`}>
                        {sel && '✓ '}{trade}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio + availability */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Short Bio (shown to portal users after assignment)</label>
                <textarea value={techForm.bio} onChange={e => setTechForm(p => ({ ...p, bio: e.target.value }))} rows={2}
                  placeholder="Brief background shown to clients after tech assignment…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600 resize-none" />
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setTechForm(p => ({ ...p, available: !p.available }))}
                  className={`w-11 h-6 rounded-full transition-all relative ${techForm.available ? 'bg-green-600' : 'bg-[#2A2A2A]'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${techForm.available ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm text-gray-300">{techForm.available ? 'Available for assignments' : 'Not available / off roster'}</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={saveTech} disabled={savingTech}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">
                  <Save className="w-4 h-4" /> {savingTech ? 'Saving…' : editingTechId ? 'Update Tech' : 'Add to Roster'}
                </button>
                <button onClick={cancelTechForm} className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">Cancel</button>
              </div>
            </div>
          )}

          {/* Roster list grouped by tier */}
          {techs.length === 0 && !showTechForm ? (
            <div className="text-center py-16 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
              <HardHat className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No techs in roster yet</p>
              <p className="text-gray-600 text-sm mt-1">Add your first tech above</p>
            </div>
          ) : (
            <div className="space-y-6">
              {tiers.map(t => t.id).map(tierId => {
                const tierTechs = techsByTier(tierId);
                if (!tierTechs.length) return null;
                const tier = tiers.find(t => t.id === tierId);
                const styles = TIER_STYLES[tierId] || TIER_STYLES.C;
                return (
                  <div key={tierId}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${styles.bg} border ${styles.border} flex items-center justify-center`}>
                        <span className={`font-black text-sm ${styles.text}`}>{tierId}</span>
                      </div>
                      <p className={`font-semibold text-sm ${styles.text}`}>{tier?.label}</p>
                      <span className="text-xs text-gray-500">${tier?.hourlyRate}/hr · {tierTechs.length} tech{tierTechs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-2">
                      {tierTechs.map(tech => {
                        const expanded = expandedTech === tech.id;
                        return (
                          <div key={tech.id} className={`bg-[#1A1A1A] border rounded-xl transition-all ${tech.available ? `${styles.border}` : 'border-[#2A2A2A] opacity-60'}`}>
                            <div className="flex items-center gap-4 px-5 py-3.5">
                              <div className={`w-10 h-10 rounded-full ${styles.bg} border ${styles.border} flex items-center justify-center flex-shrink-0`}>
                                <span className={`font-bold text-sm ${styles.text}`}>{tech.name.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white text-sm">{tech.name}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${styles.badge}`}>Tier {tech.tier}</span>
                                  {!tech.available && <span className="text-xs text-gray-500 font-semibold">UNAVAILABLE</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {tech.yearsExperience > 0 && <span className="text-xs text-gray-500">{tech.yearsExperience} yrs exp</span>}
                                  {tech.trades?.length > 0 && <span className="text-xs text-gray-500">{tech.trades.slice(0, 3).join(' · ')}{tech.trades.length > 3 ? ` +${tech.trades.length - 3}` : ''}</span>}
                                  {tech.phone && <span className="text-xs text-gray-600">{tech.phone}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => toggleAvailable(tech)} title={tech.available ? 'Mark unavailable' : 'Mark available'}
                                  className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                                  {tech.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button onClick={() => startEditTech(tech)} className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteTech(tech.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setExpandedTech(expanded ? null : tech.id)}
                                  className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition">
                                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                            {expanded && (
                              <div className="px-5 pb-4 border-t border-[#2A2A2A] pt-3 space-y-2">
                                {tech.certifications && <p className="text-xs text-gray-400"><span className="text-gray-500">Certs:</span> {tech.certifications}</p>}
                                {tech.email && <p className="text-xs text-gray-400"><span className="text-gray-500">Email:</span> {tech.email}</p>}
                                {tech.bio && <p className="text-xs text-gray-300 italic">"{tech.bio}"</p>}
                                {tech.trades?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {tech.trades.map((t: string) => (
                                      <span key={t} className="px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-xs text-gray-400">{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
