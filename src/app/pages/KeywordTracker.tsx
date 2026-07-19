import { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Plus, Trash2, Download, Info, Star, Target } from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

interface Keyword {
  id: string;
  keyword: string;
  location: string;
  device: 'desktop' | 'mobile';
  targetUrl: string;
  notes: string;
  addedAt: string;
  history: { date: string; position: number | null }[];
  searchVolume: number;
  difficulty: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
}

async function persist(k: Keyword[]) {
  try {
    const res = await fetch(`${SERVER}/keywords`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ keywords: k }) });
    const json = await res.json();
    if (!json.success) console.error('Failed to save keywords:', json.error);
  } catch (err) {
    console.error('Network error saving keywords:', err);
  }
}

// Positions are entered manually (or pasted from Google Search Console / a rank
// tool) and stored per keyword as a dated history. No values are fabricated —
// a keyword shows "not ranked" until a real position is recorded for it.
const DEFAULTS: Keyword[] = [
  { id: 'kw-1', keyword: 'roofing contractor new hampshire', location: 'New Hampshire', device: 'desktop', targetUrl: 'https://www.blackphoenixbuilds.com', notes: 'Primary keyword', addedAt: '2026-05-01', searchVolume: 1600, difficulty: 'high', priority: 'high', history: [] },
  { id: 'kw-2', keyword: 'roof replacement NH', location: 'New Hampshire', device: 'desktop', targetUrl: 'https://www.blackphoenixbuilds.com', notes: '', addedAt: '2026-05-01', searchVolume: 880, difficulty: 'medium', priority: 'high', history: [] },
  { id: 'kw-3', keyword: 'siding contractor Nashua NH', location: 'Nashua, NH', device: 'mobile', targetUrl: 'https://www.blackphoenixbuilds.com', notes: 'Local intent', addedAt: '2026-05-15', searchVolume: 320, difficulty: 'low', priority: 'high', history: [] },
  { id: 'kw-4', keyword: 'deck builder New Hampshire', location: 'New Hampshire', device: 'desktop', targetUrl: 'https://www.blackphoenixbuilds.com', notes: '', addedAt: '2026-05-20', searchVolume: 590, difficulty: 'medium', priority: 'medium', history: [] },
  { id: 'kw-5', keyword: 'Black Phoenix Builds', location: 'New Hampshire', device: 'desktop', targetUrl: 'https://www.blackphoenixbuilds.com', notes: 'Brand term', addedAt: '2026-04-01', searchVolume: 110, difficulty: 'low', priority: 'high', history: [] },
  { id: 'kw-6', keyword: 'gutter installation NH', location: 'New Hampshire', device: 'desktop', targetUrl: 'https://www.blackphoenixbuilds.com', notes: '', addedAt: '2026-06-01', searchVolume: 480, difficulty: 'low', priority: 'medium', history: [] },
];

const BLANK = (): Keyword => ({
  id: `kw-${Date.now()}`, keyword: '', location: 'New Hampshire', device: 'desktop',
  targetUrl: 'https://www.blackphoenixbuilds.com', notes: '', addedAt: new Date().toISOString().split('T')[0],
  searchVolume: 0, difficulty: 'medium', priority: 'medium', history: [],
});

function latestPosition(k: Keyword): number | null {
  const h = k.history.filter(x => x.position !== null);
  return h.length > 0 ? h[h.length - 1].position : null;
}

function positionChange(k: Keyword): number | null {
  const h = k.history.filter(x => x.position !== null);
  if (h.length < 2) return null;
  return h[h.length - 2].position! - h[h.length - 1].position!; // positive = improved
}

function positionColor(pos: number | null): string {
  if (pos === null) return 'text-gray-500';
  if (pos <= 3) return 'text-emerald-400';
  if (pos <= 10) return 'text-green-400';
  if (pos <= 20) return 'text-yellow-400';
  if (pos <= 50) return 'text-orange-400';
  return 'text-red-400';
}

function difficultyColor(d: Keyword['difficulty']) {
  return { low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', high: 'text-red-400 bg-red-500/10 border-red-500/20' }[d];
}

function priorityColor(p: Keyword['priority']) {
  return { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-gray-400' }[p];
}

function MiniSparkline({ history }: { history: Keyword['history'] }) {
  const data = history.filter(h => h.position !== null).slice(-14);
  if (data.length < 2) return <span className="text-xs text-gray-700">—</span>;
  const positions = data.map(d => d.position!);
  const max = Math.max(...positions);
  const min = Math.min(...positions);
  const range = max - min || 1;
  const w = 60, h = 20;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.position! - min) / range) * h; // invert: lower position = higher on chart
    return `${x},${y}`;
  }).join(' ');
  const last = data[data.length - 1].position!;
  const prev = data[data.length - 2].position!;
  const improved = last < prev;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={improved ? '#34d399' : '#f87171'} strokeWidth={1.5} points={points} />
    </svg>
  );
}

export default function KeywordTracker() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newKw, setNewKw] = useState<Keyword>(BLANK());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'position' | 'volume' | 'keyword' | 'priority'>('priority');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [posInput, setPosInput] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/keywords`, { headers: authHeaders });
        const json = await res.json();
        if (json.success && Array.isArray(json.keywords) && json.keywords.length) {
          setKeywords(json.keywords);
        } else {
          setKeywords(DEFAULTS);
          persist(DEFAULTS);
        }
      } catch (err) {
        console.error('Network error loading keywords:', err);
        setKeywords(DEFAULTS);
      }
    })();
  }, []);

  function save(k: Keyword[]) { setKeywords(k); persist(k); }

  function addKeyword() {
    if (!newKw.keyword.trim()) { toast.error('Enter a keyword.'); return; }
    const kw = { ...newKw, id: `kw-${Date.now()}`, history: [] };
    save([...keywords, kw]);
    setNewKw(BLANK());
    setShowAdd(false);
    toast.success('Keyword added!');
  }

  function del(id: string) { save(keywords.filter(k => k.id !== id)); toast.success('Removed.'); }

  // Record a real, manually-observed position for a keyword. Overwrites any
  // entry already logged today so re-checks don't create duplicates.
  function recordPosition(id: string) {
    const raw = posInput.trim();
    const today = new Date().toISOString().split('T')[0];
    const value = raw === '' ? null : Math.max(1, Math.min(100, Math.round(Number(raw))));
    if (raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 1)) {
      toast.error('Enter a position from 1–100, or leave blank for "not ranked".');
      return;
    }
    const updated = keywords.map(k => {
      if (k.id !== id) return k;
      const history = k.history.filter(h => h.date !== today);
      history.push({ date: today, position: value });
      history.sort((a, b) => a.date.localeCompare(b.date));
      return { ...k, history };
    });
    save(updated);
    setEditingId(null);
    setPosInput('');
    toast.success('Position saved.');
  }

  function exportCSV() {
    const rows = [['Keyword', 'Location', 'Device', 'Current Position', 'Search Volume', 'Difficulty', 'Priority', 'Notes']];
    keywords.forEach(k => rows.push([k.keyword, k.location, k.device, String(latestPosition(k) ?? 'Not tracked'), String(k.searchVolume), k.difficulty, k.priority, k.notes]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    el.download = 'keywords.csv';
    el.click();
    toast.success('Exported!');
  }

  const sorted = useMemo(() => {
    let list = keywords.filter(k => !search || k.keyword.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'position') list = [...list].sort((a, b) => (latestPosition(a) ?? 999) - (latestPosition(b) ?? 999));
    if (sortBy === 'volume') list = [...list].sort((a, b) => b.searchVolume - a.searchVolume);
    if (sortBy === 'keyword') list = [...list].sort((a, b) => a.keyword.localeCompare(b.keyword));
    if (sortBy === 'priority') {
      const rank = { high: 0, medium: 1, low: 2 };
      list = [...list].sort((a, b) => rank[a.priority] - rank[b.priority]);
    }
    return list;
  }, [keywords, search, sortBy]);

  const top10 = keywords.filter(k => { const p = latestPosition(k); return p !== null && p <= 10; }).length;
  const top3 = keywords.filter(k => { const p = latestPosition(k); return p !== null && p <= 3; }).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Keyword Rank Tracker</h1>
            <p className="text-sm text-gray-400">Monitor Google rankings for your target keywords</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#222] text-gray-400 hover:text-white text-sm transition">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Add Keyword
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Keywords', value: keywords.length },
          { label: 'Top 3', value: top3, color: 'text-emerald-400' },
          { label: 'Top 10', value: top10, color: 'text-green-400' },
          { label: 'Not Ranked', value: keywords.filter(k => latestPosition(k) === null).length, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="bg-[#0d1a2a] border border-blue-900/30 rounded-xl p-4 mb-5 flex gap-2.5">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          <span className="text-blue-300 font-semibold">Positions are entered manually.</span> Click any keyword's position to record where it currently ranks (check Google Search Console → Performance → Queries, or a tool like Semrush/Ahrefs). Each entry is dated and stored, building a real trend over time. Leave the field blank to mark a keyword "not ranked".
        </p>
      </div>

      {/* Add keyword form */}
      {showAdd && (
        <div className="bg-[#111] border border-orange-500/30 rounded-xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-white mb-4">Add Keyword</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Keyword</label>
              <input value={newKw.keyword} onChange={e => setNewKw(x => ({ ...x, keyword: e.target.value }))}
                placeholder="e.g. roofing contractor new hampshire"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Location</label>
              <input value={newKw.location} onChange={e => setNewKw(x => ({ ...x, location: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Monthly Search Volume</label>
              <input type="number" value={newKw.searchVolume} onChange={e => setNewKw(x => ({ ...x, searchVolume: Number(e.target.value) }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Difficulty</label>
              <select value={newKw.difficulty} onChange={e => setNewKw(x => ({ ...x, difficulty: e.target.value as Keyword['difficulty'] }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Priority</label>
              <select value={newKw.priority} onChange={e => setNewKw(x => ({ ...x, priority: e.target.value as Keyword['priority'] }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition">Cancel</button>
            <button onClick={addKeyword} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition">Add Keyword</button>
          </div>
        </div>
      )}

      {/* Sort + Search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter keywords..."
            className="w-full bg-[#111] border border-[#222] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="bg-[#111] border border-[#222] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition">
          <option value="priority">Sort: Priority</option>
          <option value="position">Sort: Position</option>
          <option value="volume">Sort: Search Volume</option>
          <option value="keyword">Sort: Alphabetical</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_100px_80px_80px_40px] gap-2 px-4 py-2.5 text-[10px] text-gray-500 font-semibold border-b border-[#1a1a1a]">
          <span>KEYWORD</span>
          <span className="text-center">POSITION</span>
          <span className="text-center">CHANGE</span>
          <span className="text-center">TREND (14d)</span>
          <span className="text-center">VOLUME</span>
          <span className="text-center">DIFF</span>
          <span />
        </div>
        {sorted.map(k => {
          const pos = latestPosition(k);
          const change = positionChange(k);
          return (
            <div key={k.id} className="grid grid-cols-[1fr_80px_80px_100px_80px_80px_40px] gap-2 px-4 py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#0d0d0d] transition items-center">
              <div>
                <p className="text-sm text-white font-medium">{k.keyword}</p>
                <p className="text-[10px] text-gray-600">{k.location} · {k.device}</p>
              </div>
              <div className="text-center">
                {editingId === k.id ? (
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    max={100}
                    value={posInput}
                    onChange={e => setPosInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') recordPosition(k.id); if (e.key === 'Escape') { setEditingId(null); setPosInput(''); } }}
                    onBlur={() => recordPosition(k.id)}
                    placeholder="1-100"
                    className="w-16 bg-[#1a1a1a] border border-orange-500 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => { setEditingId(k.id); setPosInput(pos !== null ? String(pos) : ''); }}
                    title="Click to record current position"
                    className={`text-lg font-bold ${positionColor(pos)} hover:underline`}
                  >
                    {pos ?? '—'}
                  </button>
                )}
              </div>
              <div className="text-center">
                {change === null ? <Minus className="w-4 h-4 text-gray-700 mx-auto" /> : change > 0
                  ? <span className="text-xs text-emerald-400 flex items-center justify-center gap-0.5"><TrendingUp className="w-3.5 h-3.5" />+{change}</span>
                  : change < 0
                    ? <span className="text-xs text-red-400 flex items-center justify-center gap-0.5"><TrendingDown className="w-3.5 h-3.5" />{change}</span>
                    : <Minus className="w-4 h-4 text-gray-700 mx-auto" />
                }
              </div>
              <div className="flex justify-center">
                <MiniSparkline history={k.history} />
              </div>
              <div className="text-center text-xs text-gray-500">{k.searchVolume > 0 ? k.searchVolume.toLocaleString() : '—'}</div>
              <div className="flex justify-center">
                <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full capitalize ${difficultyColor(k.difficulty)}`}>{k.difficulty}</span>
              </div>
              <div className="flex justify-center">
                <button onClick={() => del(k.id)} className="p-1 hover:bg-[#1a1a1a] rounded text-gray-700 hover:text-red-400 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="text-center py-10 text-gray-600 text-sm">No keywords found.</div>}
      </div>
    </div>
  );
}
