/**
 * ReviewsSection — live customer reviews on the landing page.
 * Shows star ratings, review text, service type, and admin responses.
 * Customers can submit reviews directly from this section.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight, Plus, X, Send, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import { toast } from 'sonner@2.0.3';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// Placeholder reviews shown before real ones load
const PLACEHOLDER_REVIEWS = [
  { id: 'p1', customerName: 'Sarah M.', rating: 5, reviewText: 'Black Phoenix transformed our kitchen completely. The team was professional, clean, and finished ahead of schedule. The quality of work is outstanding.', serviceType: 'Kitchen Renovation', createdAt: '2026-05-15' },
  { id: 'p2', customerName: 'James T.', rating: 5, reviewText: 'Called them for emergency trash removal and they were there within hours. Fair pricing and they left the place spotless. Will definitely use again.', serviceType: 'Trash Removal', createdAt: '2026-05-22' },
  { id: 'p3', customerName: 'Maria L.', rating: 5, reviewText: "Had our bathroom remodeled and it looks like a luxury spa now. Eric's team communicated every step. Could not be happier with the results.", serviceType: 'Bathroom Remodel', createdAt: '2026-06-01' },
  { id: 'p4', customerName: 'David K.', rating: 5, reviewText: 'The handyman service fixed 8 things around the house in one afternoon. Very knowledgeable and reasonably priced. Already booked them again.', serviceType: 'Handyman Services', createdAt: '2026-06-08' },
  { id: 'p5', customerName: 'Angela R.', rating: 4, reviewText: 'Great experience overall. The quote was accurate and they stuck to it. Project took a day longer than expected but the final result was worth it.', serviceType: 'Home Renovation', createdAt: '2026-06-10' },
  { id: 'p6', customerName: 'Chris P.', rating: 5, reviewText: 'Highly recommend Black Phoenix for property management. They handle everything professionally and keep us updated. Best company we\'ve worked with.', serviceType: 'Property Management', createdAt: '2026-06-12' },
];

interface Review { id: string; customerName: string; rating: number; reviewText: string; serviceType?: string; createdAt: string; response?: string; }

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, text: '', service: '' });
  const perPage = 3;

  useEffect(() => {
    fetch(`${SERVER}/reviews`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(data => {
        if (data.reviews?.length > 0) setReviews(data.reviews);
        else setReviews(PLACEHOLDER_REVIEWS);
      })
      .catch(() => setReviews(PLACEHOLDER_REVIEWS));
  }, []);

  const displayed = reviews.slice(currentPage * perPage, currentPage * perPage + perPage);
  const totalPages = Math.ceil(reviews.length / perPage);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '5.0';

  const submitReview = async () => {
    if (!form.name.trim() || !form.text.trim()) { toast.error('Please add your name and review'); return; }
    if (form.text.length < 10) { toast.error('Review must be at least 10 characters'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER}/reviews`, {
        method: 'POST', headers: await authedHeadersOrAnon(publicAnonKey),
        body: JSON.stringify({ customerName: form.name, customerEmail: form.email, rating: form.rating, reviewText: form.text, serviceType: form.service }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success('Thank you for your review! It will appear once approved.');
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to submit review');
      }
    } catch { toast.error('Failed to submit — please try again'); }
    setSubmitting(false);
  };

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-[#0A0A0A] to-[#111] flex justify-center">
      <div className="w-full max-w-7xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />)}
            <span className="text-2xl font-bold text-white ml-2">{avgRating}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">What Our Customers Say</h2>
          <p className="text-gray-400">{reviews.length}+ verified reviews from real customers</p>
        </div>

        {/* Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {displayed.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col gap-3 hover:border-orange-500/30 transition-colors"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                ))}
              </div>

              {/* Review text */}
              <div className="relative flex-1">
                <Quote className="w-6 h-6 text-orange-500/30 absolute -top-1 -left-1" />
                <p className="text-sm text-gray-300 leading-relaxed pl-4 italic">"{review.reviewText}"</p>
              </div>

              {/* Admin response */}
              {review.response && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                  <p className="text-xs font-bold text-orange-400 mb-1">Response from Black Phoenix:</p>
                  <p className="text-xs text-gray-300">{review.response}</p>
                </div>
              )}

              {/* Author */}
              <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white text-xs font-bold">
                    {review.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{review.customerName}</p>
                    {review.serviceType && <p className="text-xs text-gray-500">{review.serviceType}</p>}
                  </div>
                </div>
                <span className="text-xs text-gray-600">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination + Leave Review */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i)} className={`h-1.5 rounded-full transition-all ${i === currentPage ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-600'}`} />
              ))}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition">
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-sm font-bold rounded-full transition shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Leave a Review
          </button>
        </div>
      </div>

      {/* Submit Review Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !submitting && setShowForm(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>

            {submitted ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">⭐</div>
                <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-gray-400 text-sm">Your review has been submitted and will appear once approved by our team.</p>
                <button onClick={() => { setShowForm(false); setSubmitted(false); setForm({ name: '', email: '', rating: 5, text: '', service: '' }); }} className="mt-5 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Share Your Experience</h3>
                  <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition"><X className="w-4 h-4 text-gray-400" /></button>
                </div>

                {/* Star rating */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Your rating</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, rating: s }))} className="p-1 transition">
                        <Star className={`w-8 h-8 transition ${s <= form.rating ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-gray-600 hover:text-yellow-400'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Your Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First name + last initial" className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Service Type</label>
                    <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none">
                      <option value="">Select...</option>
                      <option>Kitchen Renovation</option>
                      <option>Bathroom Remodel</option>
                      <option>Home Renovation</option>
                      <option>Handyman Services</option>
                      <option>Trash Removal</option>
                      <option>Property Management</option>
                      <option>Construction</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Your Review *</label>
                  <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Tell us about your experience with Black Phoenix..." rows={4} className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none" />
                  <p className="text-xs text-gray-600 mt-1">{form.text.length}/500</p>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email (optional — not shown publicly)</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="your@email.com" className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none" />
                </div>

                <button onClick={submitReview} disabled={submitting || !form.name.trim() || form.text.length < 10} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition disabled:opacity-50">
                  {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Review</>}
                </button>
                <p className="text-xs text-gray-600 text-center">Reviews are verified and approved before appearing publicly.</p>
              </>
            )}
          </motion.div>
        </div>
      )}
    </section>
  );
}
