import { useState } from 'react';
import { Wrench, X, ChevronDown, Flame, Send, Check, Phone, Mail, MapPin, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

const SERVICES = [
  'Lawn Care & Landscaping',
  'Trash Removal / Hauling',
  'Pressure Washing',
  'General Cleaning',
  'Handyman / Repairs',
  'Construction / Builds',
  'Snow Removal',
  'Pest Control',
  'Property Management',
  'Deep Clean',
  'Other / Not Sure',
];

const URGENCY = [
  { value: 'flexible',  label: 'Flexible',      sub: 'Within 2 weeks',  color: '#6b7280' },
  { value: 'soon',      label: 'Soon',           sub: 'Within 3–5 days', color: '#fb923c' },
  { value: 'urgent',    label: 'Urgent',         sub: 'Within 24 hours', color: '#f87171' },
];

const EMPTY = { name: '', phone: '', email: '', address: '', service: '', details: '', urgency: 'flexible' };

export default function WorkRequestWidget() {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState({ ...EMPTY });
  const [step, setStep]       = useState<'form' | 'done'>('form');
  const [submitting, setSub]  = useState(false);
  const [refNum, setRefNum]   = useState('');

  function f(key: string, val: string) { setForm(p => ({ ...p, [key]: val })); }

  async function submit() {
    if (!form.name.trim())    { toast.error('Enter your name');    return; }
    if (!form.phone.trim() && !form.email.trim()) { toast.error('Phone or email required'); return; }
    if (!form.service)        { toast.error('Select a service');   return; }

    setSub(true);
    const ref = `BP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    try {
      await fetch(`${SERVER}/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: publicAnonKey },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          message: `[WORK REQUEST] Service: ${form.service} | Urgency: ${form.urgency} | Address: ${form.address || 'Not provided'} | Details: ${form.details}`,
          source: 'work_request_widget',
          intent: form.urgency === 'urgent' ? 'urgent' : 'converted',
          metadata: { service: form.service, urgency: form.urgency, address: form.address, ref },
        }),
      });
    } catch (_) { /* server offline — still confirm to user */ }

    // Save locally as fallback
    const stored = localStorage.getItem('bp_work_requests');
    const all = stored ? JSON.parse(stored) : [];
    all.unshift({ ...form, ref, submittedAt: new Date().toISOString() });
    localStorage.setItem('bp_work_requests', JSON.stringify(all));

    setRefNum(ref);
    setStep('done');
    setSub(false);
  }

  function reset() { setForm({ ...EMPTY }); setStep('form'); setOpen(false); }

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] flex items-center gap-2.5 px-5 py-3 rounded-full font-black text-sm text-white shadow-2xl hover:brightness-110 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', boxShadow: '0 8px 32px rgba(234,88,12,0.45)' }}>
            <Wrench className="w-4 h-4" />
            Request Service
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9991] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.80)' }}
            onClick={e => { if (e.target === e.currentTarget) reset(); }}>
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: '#0f0f0f', border: '1px solid rgba(234,88,12,0.25)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(234,88,12,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,88,12,0.15)' }}>
                    <ClipboardList className="w-4.5 h-4.5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm leading-tight">Request a Service</p>
                    <p className="text-[10px] text-gray-500">Black Phoenix Company — We'll call you back fast</p>
                  </div>
                </div>
                <button onClick={reset} className="p-2 rounded-xl text-gray-600 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1">
                <AnimatePresence mode="wait">
                  {step === 'done' ? (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">Request Submitted!</h3>
                      <p className="text-sm text-gray-400 mb-1 leading-relaxed">We received your request and will reach out shortly.</p>
                      <p className="text-xs text-gray-600 mb-6">Family-owned — we pick up fast.</p>
                      <div className="px-5 py-3 rounded-2xl mb-6" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Reference #</p>
                        <p className="font-black text-orange-400 text-lg tracking-widest">{refNum}</p>
                      </div>
                      <button onClick={reset}
                        className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                        style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>Done</button>
                    </motion.div>
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 space-y-4">

                      {/* Contact info */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Your Info</p>
                        {[
                          { key: 'name',  icon: ClipboardList, placeholder: 'Full name',      type: 'text',  required: true },
                          { key: 'phone', icon: Phone,         placeholder: 'Phone number',   type: 'tel',   required: false },
                          { key: 'email', icon: Mail,          placeholder: 'Email address',  type: 'email', required: false },
                        ].map(field => (
                          <div key={field.key} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <field.icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <input
                              type={field.type}
                              value={(form as any)[field.key]}
                              onChange={e => f(field.key, e.target.value)}
                              placeholder={field.placeholder + (field.required ? ' *' : '')}
                              className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
                          </div>
                        ))}
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                          style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <input type="text" value={form.address} onChange={e => f('address', e.target.value)}
                            placeholder="Service address (optional)"
                            className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
                        </div>
                      </div>

                      {/* Service picker */}
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Service Needed *</p>
                        <div className="relative">
                          <select value={form.service} onChange={e => f('service', e.target.value)}
                            className="w-full appearance-none px-4 py-3 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500/50 pr-10"
                            style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', color: form.service ? 'white' : '#4b5563' }}>
                            <option value="">Select a service…</option>
                            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                        </div>
                      </div>

                      {/* Urgency */}
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">How Soon?</p>
                        <div className="grid grid-cols-3 gap-2">
                          {URGENCY.map(u => (
                            <button key={u.value} onClick={() => f('urgency', u.value)}
                              className="py-2.5 px-2 rounded-xl text-center transition"
                              style={{
                                background: form.urgency === u.value ? u.color + '18' : '#161616',
                                border: `1px solid ${form.urgency === u.value ? u.color + '50' : 'rgba(255,255,255,0.07)'}`,
                              }}>
                              {u.value === 'urgent' && <Flame className="w-3 h-3 mx-auto mb-1" style={{ color: u.color }} />}
                              <p className="text-xs font-black" style={{ color: form.urgency === u.value ? u.color : '#9ca3af' }}>{u.label}</p>
                              <p className="text-[9px] text-gray-600 mt-0.5">{u.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Details / Notes</p>
                        <textarea value={form.details} onChange={e => f('details', e.target.value)}
                          placeholder="Describe what you need — the more detail the faster we can quote you…"
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none"
                          style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }} />
                      </div>

                      {/* Submit */}
                      <button onClick={submit} disabled={submitting}
                        className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition"
                        style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', boxShadow: '0 4px 20px rgba(234,88,12,0.35)' }}>
                        {submitting ? 'Submitting…' : <><Send className="w-4 h-4" /> Submit Request</>}
                      </button>

                      <p className="text-center text-[10px] text-gray-700">
                        Family-owned &amp; operated · We respond fast · No spam ever
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
