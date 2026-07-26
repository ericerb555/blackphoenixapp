import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Trash2, Eye, CheckCircle, XCircle, Search, Filter, TrendingUp, MessageSquare, Award, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreReviews, type StoreReview } from '../components/StoreReviews';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

const ALL_PRODUCT_IDS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10'];

const PRODUCT_NAMES: Record<string,string> = {
  p1: 'Wireless Headphones Pro', p2: 'Insulated Water Bottle', p3: 'LED Smart Bulbs (4-Pack)',
  p4: 'Power Drill Set', p5: 'Yoga Mat Premium', p6: 'Air Fryer 5.5L',
  p7: 'Fleece Zip Hoodie', p8: 'Bluetooth Speaker 360', p9: 'Daily Vitamin Pack',
  p10: 'Mechanical Keyboard',
};

type Tab = 'all' | 'pending' | 'insights';

export default function ReviewsDashboard() {
  const [allReviews, setAllReviews] = useState<StoreReview[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterProduct, setFilterProduct] = useState('');
  const [approved, setApproved] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    const reviews = ALL_PRODUCT_IDS.flatMap(id => getStoreReviews(id));
    const deduped = Array.from(new Map(reviews.map(r => [r.id, r])).values());
    deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAllReviews(deduped);
    (async () => {
      try {
        const res = await fetch(`${SERVER}/reviews/moderation`, { headers: authHeaders });
        const json = await res.json();
        if (json.success) { setApproved(json.approved || []); setHidden(json.hidden || []); }
        else console.error('Failed to load review moderation:', json.error);
      } catch (err) { console.error('Network error loading review moderation:', err); }
    })();
  }, []);

  // Persist moderation state to the server so it's shared across admins/devices.
  async function persistModeration(nextApproved: string[], nextHidden: string[]) {
    try {
      await fetch(`${SERVER}/reviews/moderation`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ approved: nextApproved, hidden: nextHidden }),
      });
    } catch (err) { console.error('Failed to persist review moderation:', err); }
  }

  function approve(id: string) {
    const next = [...approved, id];
    setApproved(next);
    persistModeration(next, hidden);
    toast.success('Review approved and published');
  }

  function hide(id: string) {
    const next = [...hidden, id];
    setHidden(next);
    persistModeration(approved, next);
    toast('Review hidden from store');
  }

  function restore(id: string) {
    const nextH = hidden.filter(x => x !== id);
    const nextA = approved.filter(x => x !== id);
    setHidden(nextH);
    setApproved(nextA);
    persistModeration(nextA, nextH);
    toast('Review restored to pending');
  }

  const visible = allReviews.filter(r => {
    if (tab === 'pending' && (approved.includes(r.id) || hidden.includes(r.id))) return false;
    if (tab === 'all' && hidden.includes(r.id)) return false;
    if (search && !r.body.toLowerCase().includes(search.toLowerCase()) && !r.author.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRating && r.rating !== filterRating) return false;
    if (filterProduct && r.productId !== filterProduct) return false;
    return true;
  });

  const avg = allReviews.length ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1) : '0.0';
  const ratingDist = [5,4,3,2,1].map(star => ({ star, count: allReviews.filter(r => r.rating === star).length }));

  const kpis = [
    { label: 'Total Reviews', value: allReviews.length, icon: MessageSquare, color: '#818cf8' },
    { label: 'Average Rating', value: avg, icon: Star, color: '#fbbf24' },
    { label: 'Approved', value: approved.length, icon: CheckCircle, color: '#4ade80' },
    { label: 'Pending', value: allReviews.length - approved.length - hidden.length, icon: Eye, color: '#fb923c' },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black">Product Reviews</h1>
          <p className="text-gray-500 text-sm mt-1">Moderate customer reviews and track social proof metrics</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['all','pending','insights'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black capitalize transition"
              style={tab === t ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'insights' ? (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-violet-400" /> Rating Distribution</h3>
              <div className="space-y-3">
                {ratingDist.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex gap-0.5 w-20">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-800'}`} />)}
                    </div>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: allReviews.length ? `${(count/allReviews.length)*100}%` : '0%', background: '#fbbf24' }} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 w-6">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Reviews by Product</h3>
              <div className="space-y-2">
                {ALL_PRODUCT_IDS.map(id => {
                  const pReviews = allReviews.filter(r => r.productId === id);
                  const pAvg = pReviews.length ? (pReviews.reduce((s,r) => s+r.rating, 0)/pReviews.length).toFixed(1) : '-';
                  return (
                    <div key={id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-sm text-gray-300">{PRODUCT_NAMES[id]}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{pReviews.length} reviews</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-black text-white">{pAvg}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search className="w-4 h-4 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews…"
                  className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
              </div>
              <select value={filterRating} onChange={e => setFilterRating(Number(e.target.value))}
                className="bg-[#111] text-sm text-gray-300 rounded-xl px-4 py-2.5 border focus:outline-none focus:border-orange-500/50"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value={0}>All Ratings</option>
                {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} Stars</option>)}
              </select>
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
                className="bg-[#111] text-sm text-gray-300 rounded-xl px-4 py-2.5 border focus:outline-none focus:border-orange-500/50"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">All Products</option>
                {ALL_PRODUCT_IDS.map(id => <option key={id} value={id}>{PRODUCT_NAMES[id]}</option>)}
              </select>
            </div>

            {visible.length === 0 && (
              <div className="text-center py-16 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500">No reviews match your filters</p>
              </div>
            )}

            <div className="space-y-3">
              {visible.map(r => {
                const isApproved = approved.includes(r.id);
                const isHidden = hidden.includes(r.id);
                return (
                  <div key={r.id} className="rounded-2xl p-5 space-y-3"
                    style={{ background: '#111', border: `1px solid ${isApproved ? 'rgba(74,222,128,0.2)' : isHidden ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />)}
                          </div>
                          <span className="text-xs font-black text-white">{r.title}</span>
                          {r.verified && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>Verified</span>}
                          {isApproved && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>Published</span>}
                          {isHidden && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>Hidden</span>}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{r.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#ea580c' }}>{r.author.charAt(0)}</div>
                        <div>
                          <p className="text-xs font-bold text-gray-300">{r.author}</p>
                          <p className="text-[10px] text-gray-600">{PRODUCT_NAMES[r.productId] || r.productId} · {r.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-gray-600">
                          <ThumbsUp className="w-3 h-3" /> {r.helpful}
                        </span>
                        {isHidden || isApproved ? (
                          <button onClick={() => restore(r.id)}
                            className="text-[10px] font-black px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white transition"
                            style={{ background: 'rgba(255,255,255,0.05)' }}>Reset</button>
                        ) : (
                          <>
                            <button onClick={() => approve(r.id)}
                              className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition hover:brightness-110"
                              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => hide(r.id)}
                              className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition hover:brightness-110"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                              <XCircle className="w-3 h-3" /> Hide
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
