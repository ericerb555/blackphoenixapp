import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Check, X, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const STORAGE_KEY = 'bp_store_reviews';

export interface StoreReview {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  date: string;
}

const SEED_REVIEWS: StoreReview[] = [
  { id: 's1', productId: 'p1', author: 'Marcus T.', rating: 5, title: "Best headphones I've owned", body: 'Crystal clear sound and the noise cancellation is incredible. Battery lasts way longer than advertised. Fast shipping too!', verified: true, helpful: 34, date: 'Jul 2, 2026' },
  { id: 's2', productId: 'p1', author: 'Riley H.', rating: 5, title: 'Great value', body: 'Paid way less than similar ones at the mall. Comfortable for 4+ hour sessions. My coworkers keep asking where I got them.', verified: true, helpful: 21, date: 'Jun 28, 2026' },
  { id: 's3', productId: 'p1', author: 'Devon M.', rating: 4, title: 'Solid pick', body: 'Very happy with these. Minor gripe: the ear cushions could be a touch softer, but honestly minor.', verified: false, helpful: 8, date: 'Jun 15, 2026' },
  { id: 's4', productId: 'p2', author: 'Sarah K.', rating: 5, title: 'My water bottle is life', body: 'Keeps my coffee hot until 2pm and my water ice cold all day. No leaks whatsoever. Absolutely love it.', verified: true, helpful: 47, date: 'Jul 5, 2026' },
  { id: 's5', productId: 'p2', author: 'Jordan B.', rating: 5, title: 'Bought 3 for my family', body: 'Such good quality for the price. The lid screws on perfectly. All three still going strong after daily use.', verified: true, helpful: 29, date: 'Jun 30, 2026' },
  { id: 's6', productId: 'p3', author: 'Priya S.', rating: 5, title: 'Transformed my living room', body: 'The colors are so vivid and the app is super easy. My kids love changing the scenes. Worth every penny.', verified: true, helpful: 18, date: 'Jul 1, 2026' },
  { id: 's7', productId: 'p4', author: 'Chris L.', rating: 5, title: 'Handles everything I throw at it', body: "Been using this on a kitchen remodel and it hasn't let me down once. Battery life is excellent, drills through anything.", verified: true, helpful: 22, date: 'Jun 20, 2026' },
  { id: 's8', productId: 'p5', author: 'Taylor N.', rating: 5, title: 'Best mat for my home practice', body: "Non-slip is real — I was sliding off my old mat constantly. This one grips even when I'm sweaty. Love the thickness too.", verified: true, helpful: 15, date: 'Jul 3, 2026' },
  { id: 's9', productId: 'p6', author: 'Morgan F.', rating: 5, title: 'Changed how I cook', body: 'Use it every single day. Fries come out perfect, and cleanup is so easy. Already recommended to 3 friends who all bought one.', verified: true, helpful: 61, date: 'Jun 25, 2026' },
  { id: 's10', productId: 'p7', author: 'Blake M.', rating: 4, title: 'Soft and true to size', body: 'Really comfortable hoodie, the material is thick but not heavy. Colors are exactly as shown. My go-to now.', verified: true, helpful: 12, date: 'Jul 6, 2026' },
  { id: 's11', productId: 'p8', author: 'Jamie R.', rating: 5, title: '360 sound is real', body: 'Took it camping — the audio filled the whole site. Waterproof claim is legit too, had it out in the rain. Impressive battery.', verified: true, helpful: 33, date: 'Jun 22, 2026' },
  { id: 's12', productId: 'p9', author: 'Avery J.', rating: 5, title: 'Tastes great, feel the difference', body: 'Been taking these every morning for 6 weeks. Noticeably fewer sick days. Great flavor, not chalky at all.', verified: true, helpful: 19, date: 'Jul 4, 2026' },
  { id: 's13', productId: 'p10', author: 'Parker C.', rating: 5, title: 'Clicky and satisfying', body: 'Typing feels incredible. The RGB is bright without being distracting. Compact layout means more desk space. Huge upgrade.', verified: true, helpful: 25, date: 'Jun 18, 2026' },
];

export function getStoreReviews(productId: string): StoreReview[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  const user: StoreReview[] = stored ? JSON.parse(stored) : [];
  return [...user.filter(r => r.productId === productId), ...SEED_REVIEWS.filter(r => r.productId === productId)];
}

export function getStoreRating(productId: string): { avg: number; count: number } {
  const reviews = getStoreReviews(productId);
  if (!reviews.length) return { avg: 0, count: 0 };
  return { avg: Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10, count: reviews.length };
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => onChange(s)}
          className="transition-transform hover:scale-110 active:scale-95">
          <Star className={`w-7 h-7 ${s <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
        </button>
      ))}
    </div>
  );
}

interface Props { productId: string; compact?: boolean }

export default function StoreReviews({ productId, compact = false }: Props) {
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [helpedIds, setHelpedIds] = useState<string[]>([]);
  const [form, setForm] = useState({ rating: 0, title: '', body: '', author: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setReviews(getStoreReviews(productId)); }, [productId]);

  const avg = reviews.length ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0;
  const dist = [5,4,3,2,1].map(star => reviews.filter(r => r.rating === star).length);
  const displayed = showAll ? reviews : reviews.slice(0, compact ? 2 : 3);

  async function submit() {
    if (!form.rating) { toast.error('Select a star rating'); return; }
    if (!form.body.trim()) { toast.error('Write a review first'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const rev: StoreReview = {
      id: crypto.randomUUID(), productId,
      author: form.author.trim() || 'Anonymous',
      rating: form.rating,
      title: form.title.trim() || ['Great product!','Highly recommend','Love it!','Worth every penny'][Math.floor(Math.random()*4)],
      body: form.body.trim(), verified: false, helpful: 0,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    const stored = localStorage.getItem(STORAGE_KEY);
    const all: StoreReview[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([rev, ...all]));
    setReviews(getStoreReviews(productId));
    setForm({ rating: 0, title: '', body: '', author: '' });
    setShowForm(false);
    setSubmitting(false);
    toast.success('Review posted! Thank you 🙏');
  }

  function markHelpful(id: string) {
    if (helpedIds.includes(id)) return;
    setHelpedIds(p => [...p, id]);
    setReviews(p => p.map(r => r.id === id ? { ...r, helpful: r.helpful + 1 } : r));
  }

  return (
    <div className="space-y-4">
      {/* Aggregate bar */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-black text-white">{avg.toFixed(1)}</p>
            <div className="flex justify-center gap-0.5 my-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= Math.round(avg) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />)}
            </div>
            <p className="text-xs text-gray-500">{reviews.length} reviews</p>
          </div>
          {!compact && (
            <div className="flex-1 space-y-1.5">
              {[5,4,3,2,1].map((star, i) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-3">{star}</span>
                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div className="h-full rounded-full bg-yellow-400 transition-all"
                      style={{ width: reviews.length ? `${(dist[i]/reviews.length)*100}%` : '0%' }} />
                  </div>
                  <span className="text-[10px] text-gray-600 w-4">{dist[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Write review */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition hover:brightness-110"
          style={{ background: 'rgba(234,88,12,0.1)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.25)' }}>
          <Edit2 className="w-4 h-4" /> Write a Review
        </button>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(234,88,12,0.2)' }}>
            <div className="flex items-center justify-between">
              <h4 className="font-black text-white text-sm">Your Review</h4>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Rating *</p>
              <div className="flex items-center gap-3">
                <StarPicker value={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
                {form.rating > 0 && (
                  <span className="text-xs font-bold" style={{ color: form.rating >= 4 ? '#22c55e' : form.rating >= 3 ? '#f59e0b' : '#ef4444' }}>
                    {['Terrible','Poor','Okay','Good','Excellent'][form.rating - 1]}
                  </span>
                )}
              </div>
            </div>
            {[
              { key: 'author', label: 'Your Name', placeholder: 'First name or initials' },
              { key: 'title',  label: 'Review Title', placeholder: 'Summarize your experience' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Review *</label>
              <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                placeholder="What did you love? What could be better?" rows={3}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/50" />
            </div>
            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 disabled:opacity-50 transition"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              {submitting ? 'Posting…' : 'Post Review'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty */}
      {reviews.length === 0 && !showForm && (
        <div className="text-center py-6">
          <Star className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No reviews yet — be the first!</p>
        </div>
      )}

      {/* Review cards */}
      <div className="space-y-3">
        {displayed.map(r => (
          <div key={r.id} className="rounded-2xl p-4 space-y-2"
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />)}
                </div>
                <p className="text-sm font-black text-white">{r.title}</p>
              </div>
              {r.verified && (
                <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{r.body}</p>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: '#ea580c' }}>{r.author.charAt(0)}</div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400">{r.author}</p>
                  <p className="text-[9px] text-gray-600">{r.date}</p>
                </div>
              </div>
              <button onClick={() => markHelpful(r.id)} disabled={helpedIds.includes(r.id)}
                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition disabled:opacity-40">
                <ThumbsUp className={`w-3 h-3 ${helpedIds.includes(r.id) ? 'fill-gray-400 text-gray-400' : ''}`} />
                Helpful ({r.helpful})
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviews.length > (compact ? 2 : 3) && (
        <button onClick={() => setShowAll(p => !p)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-300 transition"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {reviews.length} reviews</>}
        </button>
      )}
    </div>
  );
}
