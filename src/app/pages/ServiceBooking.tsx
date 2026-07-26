import { useState } from 'react';
import { Calendar, Clock, Wrench, CheckCircle, ChevronRight, ArrowLeft, Phone, Mail, MapPin, Star, Zap, Shield, Users, HardHat, Car, Paintbrush, Leaf, Home, Package, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const SERVICES = [
  { id: 'construction', label: 'Construction & Renovation', icon: HardHat, color: '#ea580c', emoji: '🏗️', desc: 'Additions, remodels, structural work', duration: '1–4 weeks', startingAt: 'Free estimate' },
  { id: 'handyman', label: 'Handyman Services', icon: Wrench, color: '#3b82f6', emoji: '🔧', desc: 'Repairs, installs, odd jobs around the house', duration: '2–8 hrs', startingAt: '$75/hr' },
  { id: 'landscaping', label: 'Landscaping & Lawn', icon: Leaf, color: '#22c55e', emoji: '🌿', desc: 'Mowing, trimming, cleanups, design', duration: '2–6 hrs', startingAt: '$120' },
  { id: 'painting', label: 'Interior & Exterior Painting', icon: Paintbrush, color: '#a855f7', emoji: '🎨', desc: 'Rooms, exteriors, trim, cabinets', duration: '1–5 days', startingAt: '$200' },
  { id: 'cleaning', label: 'Deep Cleaning', icon: Home, color: '#06b6d4', emoji: '✨', desc: 'Move-in/out, post-construction, routine deep clean', duration: '3–8 hrs', startingAt: '$180' },
  { id: 'automotive', label: 'Automotive Services', icon: Car, color: '#f59e0b', emoji: '🚗', desc: 'Detailing, minor repairs, mobile service', duration: '1–4 hrs', startingAt: '$90' },
  { id: 'delivery', label: 'Delivery & Hauling', icon: Package, color: '#64748b', emoji: '📦', desc: 'Furniture, junk removal, moving help', duration: '1–6 hrs', startingAt: '$99' },
  { id: 'other', label: 'Something Else', icon: Zap, color: '#e11d48', emoji: '💬', desc: "Tell us what you need — we'll figure it out", duration: 'Varies', startingAt: 'Get a quote' },
];

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

const URGENCY = [
  { id: 'asap', label: 'ASAP', desc: 'Within 48 hours', color: '#ef4444' },
  { id: 'week', label: 'This Week', desc: '3–7 days', color: '#f59e0b' },
  { id: 'flexible', label: 'Flexible', desc: '1–2 weeks out', color: '#22c55e' },
  { id: 'planning', label: 'Just Planning', desc: 'Getting quotes now', color: '#6b7280' },
];

const REVIEWS = [
  { name: 'Robert H.', service: 'Construction', text: 'They showed up on time, finished early, and the quality was outstanding. Family-owned really shows — they treat your home like their own.', rating: 5 },
  { name: 'Lisa M.', service: 'Handyman', text: 'Fixed 6 things in 3 hours. No upselling, no drama. Just honest work at a fair price. Will be my go-to forever.', rating: 5 },
  { name: 'Tony B.', service: 'Landscaping', text: 'My yard looks like a magazine cover now. Responsive, professional, and reasonably priced. Highly recommend!', rating: 5 },
];

type Step = 'service' | 'details' | 'schedule' | 'confirm' | 'done';

interface BookingForm {
  service: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  urgency: string;
  preferredDate: string;
  preferredTime: string;
  budget: string;
}

const BLANK: BookingForm = { service: '', name: '', email: '', phone: '', address: '', description: '', urgency: '', preferredDate: '', preferredTime: '', budget: '' };

export default function ServiceBooking() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('service');
  const [form, setForm] = useState<BookingForm>({ ...BLANK, name: user?.user_metadata?.full_name || '', email: user?.email || '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const selectedService = SERVICES.find(s => s.id === form.service);

  function set(key: keyof BookingForm, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function submitBooking() {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const workRequestResponse = await fetch(`${SERVER}/work-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          source: 'service_booking',
          serviceType: selectedService?.label || form.service,
          project_type: form.service,
          title: `${selectedService?.label || 'Service'} booking request`,
          description: form.description,
          urgency: form.urgency,
          preferredDate: form.preferredDate || null,
          preferredTime: form.preferredTime || null,
          budget: form.budget || null,
          service_address: form.address,
          client_info: { name: form.name, email: form.email, phone: form.phone, address: form.address },
        }),
      });
      const workRequestResult = await workRequestResponse.json().catch(() => ({}));
      if (!workRequestResponse.ok || !workRequestResult?.success) throw new Error(workRequestResult?.error || 'We could not save your booking request.');

      // Keep the marketing/CRM lead capture in sync, but never let a noncritical
      // marketing failure hide a successfully saved service request.
      void fetch(`${SERVER}/leads/capture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: form.email, name: form.name, phone: form.phone, source: 'service_booking', page: '/book', intent: form.urgency === 'asap' ? 'hot' : form.urgency === 'week' ? 'warm' : 'cold', workRequestId: workRequestResult.workRequest?.id, notes: `Service: ${form.service} | ${form.description} | Urgency: ${form.urgency} | Date: ${form.preferredDate} ${form.preferredTime} | Budget: ${form.budget} | Address: ${form.address}` }),
      }).catch(() => {});
      setBookingRef(workRequestResult.workRequest?.id || `BP-${Date.now().toString(36).toUpperCase().slice(-6)}`);
      setStep('done');
    } catch (error: any) {
      toast.error(error.message || 'We could not save your booking request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvanceDetails = form.name && form.email && form.phone && form.description;
  const canAdvanceSchedule = form.urgency && (form.urgency !== 'asap' ? form.preferredDate : true);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <img src={companyLogo} alt="Black Phoenix" className="h-9 w-auto object-contain" />
          <div>
            <p className="text-sm font-black text-white leading-none">Book a Service</p>
            <p className="text-[10px] text-gray-600">Black Phoenix Company</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(['service', 'details', 'schedule', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="w-6 h-1 rounded-full transition-all"
              style={{ background: ['service','details','schedule','confirm','done'].indexOf(step) >= i ? '#ea580c' : '#2a2a2a' }} />
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── STEP 1: PICK A SERVICE ─────────────────────────────────────── */}
        {step === 'service' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-white">What do you need help with?</h1>
              <p className="text-sm text-gray-500 mt-1">Select a service to get started. We'll match you with the right crew.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SERVICES.map(svc => (
                <button key={svc.id}
                  onClick={() => { set('service', svc.id); setStep('details'); }}
                  className="group text-left p-4 rounded-2xl transition-all duration-200"
                  style={{ background: form.service === svc.id ? svc.color + '18' : '#111', border: `1px solid ${form.service === svc.id ? svc.color + '40' : 'rgba(255,255,255,0.07)'}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = svc.color + '50'; e.currentTarget.style.background = svc.color + '10'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = form.service === svc.id ? svc.color + '40' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = form.service === svc.id ? svc.color + '18' : '#111'; }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">{svc.emoji}</span>
                    <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition" />
                  </div>
                  <p className="text-sm font-black text-white mb-0.5">{svc.label}</p>
                  <p className="text-[11px] text-gray-500 mb-2">{svc.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: svc.color + '18', color: svc.color }}>{svc.startingAt}</span>
                    <span className="text-[10px] text-gray-600">{svc.duration}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Trust strip */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Shield, label: 'Licensed & Insured' },
                { icon: Star, label: '5-Star Rated' },
                { icon: Users, label: 'Family Owned' },
              ].map(t => (
                <div key={t.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <t.icon className="w-4 h-4 text-orange-400" />
                  <p className="text-[11px] font-bold text-gray-400">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: DETAILS ───────────────────────────────────────────── */}
        {step === 'details' && selectedService && (
          <div className="space-y-5">
            <button onClick={() => setStep('service')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{selectedService.emoji}</span>
                <h1 className="text-xl font-black text-white">{selectedService.label}</h1>
              </div>
              <p className="text-sm text-gray-500">Tell us about yourself and what you need.</p>
            </div>

            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
              {[
                { key: 'name', label: 'Your Name *', placeholder: 'John Smith', type: 'text' },
                { key: 'email', label: 'Email Address *', placeholder: 'you@email.com', type: 'email' },
                { key: 'phone', label: 'Phone Number *', placeholder: '+1 (555) 000-0000', type: 'tel' },
                { key: 'address', label: 'Service Address', placeholder: '123 Main St, City, State', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => set(f.key as keyof BookingForm, e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Describe What You Need *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Give us as much detail as you can — size, scope, photos if you have them (you can send those via text after booking)..."
                  rows={4}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Approximate Budget</label>
                <select value={form.budget} onChange={e => set('budget', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50">
                  <option value="">Select a range (optional)</option>
                  {['Under $200', '$200–$500', '$500–$1,000', '$1,000–$5,000', '$5,000–$10,000', '$10,000+', 'Not sure yet'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={() => setStep('schedule')} disabled={!canAdvanceDetails}
              className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              Continue → Schedule
            </button>
          </div>
        )}

        {/* ── STEP 3: SCHEDULE ──────────────────────────────────────────── */}
        {step === 'schedule' && (
          <div className="space-y-5">
            <button onClick={() => setStep('details')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div>
              <h1 className="text-xl font-black text-white">When works for you?</h1>
              <p className="text-sm text-gray-500 mt-1">Pick your urgency and preferred window.</p>
            </div>

            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">How Soon Do You Need This? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {URGENCY.map(u => (
                    <button key={u.id} onClick={() => set('urgency', u.id)}
                      className="p-3 rounded-xl text-left transition"
                      style={form.urgency === u.id
                        ? { background: u.color + '18', border: `1px solid ${u.color}50` }
                        : { background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
                      <p className="text-xs font-black text-white">{u.label}</p>
                      <p className="text-[11px]" style={{ color: form.urgency === u.id ? u.color : '#6b7280' }}>{u.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.urgency && form.urgency !== 'asap' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Preferred Date</label>
                  <input type="date" value={form.preferredDate}
                    onChange={e => set('preferredDate', e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Preferred Time Window</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot} onClick={() => set('preferredTime', slot)}
                      className="py-2 rounded-xl text-xs font-bold transition"
                      style={form.preferredTime === slot
                        ? { background: '#ea580c', color: '#fff' }
                        : { background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#6b7280' }}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setStep('confirm')} disabled={!canAdvanceSchedule}
              className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              Review Booking →
            </button>
          </div>
        )}

        {/* ── STEP 4: CONFIRM ───────────────────────────────────────────── */}
        {step === 'confirm' && selectedService && (
          <div className="space-y-5">
            <button onClick={() => setStep('schedule')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Review Your Request</h1>
              <p className="text-sm text-gray-500 mt-1">Everything look good? We'll reach out within 2 hours to confirm.</p>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-5 space-y-4">
              {[
                { label: 'Service', value: `${selectedService.emoji} ${selectedService.label}` },
                { label: 'Name', value: form.name },
                { label: 'Email', value: form.email },
                { label: 'Phone', value: form.phone },
                { label: 'Address', value: form.address || 'Not provided' },
                { label: 'Urgency', value: URGENCY.find(u => u.id === form.urgency)?.label || form.urgency },
                { label: 'Preferred Date', value: form.preferredDate || 'ASAP' },
                { label: 'Preferred Time', value: form.preferredTime || 'Flexible' },
                { label: 'Budget', value: form.budget || 'Not specified' },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2"
                  style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <span className="text-xs font-bold text-gray-600 flex-shrink-0">{row.label}</span>
                  <span className="text-xs text-white text-right">{row.value}</span>
                </div>
              ))}
              <div>
                <span className="text-xs font-bold text-gray-600 block mb-1">Description</span>
                <p className="text-xs text-gray-400 leading-relaxed">{form.description}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(234,88,12,0.07)', border: '1px solid rgba(234,88,12,0.2)' }}>
              <Zap className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">We'll review your request and call or text you within <strong className="text-white">2 business hours</strong> to confirm the details, pricing, and schedule. No obligation.</p>
            </div>

            <button onClick={submitBooking} disabled={submitting}
              className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              {submitting ? 'Submitting…' : '✅ Submit Booking Request'}
            </button>
          </div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center pt-6">
            <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
              style={{ background: 'rgba(234,88,12,0.15)', border: '2px solid rgba(234,88,12,0.3)' }}>
              <CheckCircle className="w-10 h-10 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white mb-2">Request Sent! 🎉</h1>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">We received your booking request and will contact you within 2 business hours to confirm everything.</p>
            </div>

            <div className="rounded-2xl p-4 text-left" style={{ background: '#111', border: '1px solid #2a2a2a' }}>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Booking Reference</p>
              <p className="text-xl font-black font-mono text-orange-400">{bookingRef}</p>
              <p className="text-[11px] text-gray-600 mt-1">Save this number — we'll use it when we call you.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">What happens next</p>
              {[
                { icon: Phone, text: 'We call or text to confirm within 2 hours' },
                { icon: Calendar, text: "We lock in your date and give you an exact quote" },
                { icon: CheckCircle, text: 'Our crew shows up on time and gets it done right' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234,88,12,0.12)' }}>
                    <s.icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-xs text-gray-400">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Reviews */}
            <div className="space-y-3 text-left pt-2">
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest text-center">What customers say</p>
              {REVIEWS.map((r, i) => (
                <div key={i} className="p-4 rounded-2xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <div className="flex gap-0.5 mb-2">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-xs text-gray-400 italic mb-3">"{r.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#ea580c' }}>
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{r.name}</p>
                      <p className="text-[10px] text-gray-600">{r.service}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2 text-xs text-gray-600 pt-2">
              <p>Questions? Contact us directly:</p>
              <a href="mailto:hello@theblackphoenixcompany.com" className="text-orange-400 font-bold">hello@theblackphoenixcompany.com</a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
