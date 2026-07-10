import { useState, useRef } from 'react';
import { Plus, Trash2, Send, Download, Copy, Check, FileText, DollarSign, Clock, ChevronDown, Eye, ArrowLeft, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

interface Invoice {
  id: string;
  type: 'invoice' | 'estimate';
  number: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  notes: string;
  taxRate: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid';
  createdAt: string;
}

const BLANK_ITEM = (): LineItem => ({ id: crypto.randomUUID(), description: '', qty: 1, rate: 0 });

const PRESET_ITEMS = [
  { description: 'Labor (per hour)', qty: 2, rate: 75 },
  { description: 'Materials & Supplies', qty: 1, rate: 150 },
  { description: 'Consultation / Site Visit', qty: 1, rate: 50 },
  { description: 'Debris Removal & Cleanup', qty: 1, rate: 120 },
  { description: 'Painting — Interior (per room)', qty: 1, rate: 350 },
  { description: 'Lawn Mowing & Trimming', qty: 1, rate: 120 },
  { description: 'Power Washing', qty: 1, rate: 180 },
  { description: 'Delivery & Hauling', qty: 1, rate: 99 },
];

const STATUS_CONFIG = {
  draft:  { label: 'Draft',  color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  sent:   { label: 'Sent',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  viewed: { label: 'Viewed', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  paid:   { label: 'Paid',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
};

function newInvoiceNumber(type: 'invoice' | 'estimate') {
  const prefix = type === 'invoice' ? 'INV' : 'EST';
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function today() { return new Date().toISOString().split('T')[0]; }
function inDays(n: number) { return new Date(Date.now() + n * 86400000).toISOString().split('T')[0]; }

const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv1', type: 'invoice', number: 'INV-001234', clientName: 'Marcus Thompson', clientEmail: 'marcus@email.com',
    clientPhone: '(555) 210-4490', clientAddress: '123 Oak St, Columbus, OH',
    issueDate: '2026-07-01', dueDate: '2026-07-15',
    items: [
      { id: 'i1', description: 'Bathroom Renovation — Labor', qty: 16, rate: 75 },
      { id: 'i2', description: 'Materials & Tile', qty: 1, rate: 420 },
      { id: 'i3', description: 'Debris Removal', qty: 1, rate: 120 },
    ],
    notes: 'Thank you for your business! Payment due within 14 days. Accepts Zelle, Venmo, or check.',
    taxRate: 7.5, status: 'paid', createdAt: '2026-07-01',
  },
  {
    id: 'inv2', type: 'estimate', number: 'EST-005678', clientName: 'Sarah K.', clientEmail: 'sarah@email.com',
    clientPhone: '(555) 384-1122', clientAddress: '456 Maple Ave, Dublin, OH',
    issueDate: today(), dueDate: inDays(30),
    items: [
      { id: 'i4', description: 'Lawn Mowing & Trimming (bi-weekly)', qty: 4, rate: 120 },
      { id: 'i5', description: 'Spring Cleanup & Mulching', qty: 1, rate: 280 },
    ],
    notes: 'This estimate is valid for 30 days. We can start as early as next week!',
    taxRate: 0, status: 'sent', createdAt: today(),
  },
];

type View = 'list' | 'edit' | 'preview';

export default function InvoiceBuilder() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES);
  const [view, setView] = useState<View>('list');
  const [current, setCurrent] = useState<Invoice | null>(null);
  const [sending, setSending] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [copied, setCopied] = useState(false);

  function newDoc(type: 'invoice' | 'estimate') {
    const doc: Invoice = {
      id: crypto.randomUUID(),
      type, number: newInvoiceNumber(type),
      clientName: '', clientEmail: '', clientPhone: '', clientAddress: '',
      issueDate: today(), dueDate: inDays(type === 'invoice' ? 14 : 30),
      items: [BLANK_ITEM()],
      notes: type === 'invoice'
        ? 'Thank you for your business! Payment accepted via Zelle, Venmo, cash, or check.'
        : 'This estimate is valid for 30 days. Contact us to get started!',
      taxRate: 0, status: 'draft', createdAt: today(),
    };
    setCurrent(doc);
    setView('edit');
  }

  function setField(key: keyof Invoice, val: any) {
    setCurrent(prev => prev ? { ...prev, [key]: val } : prev);
  }

  function setItem(id: string, key: keyof LineItem, val: any) {
    setCurrent(prev => prev ? { ...prev, items: prev.items.map(i => i.id === id ? { ...i, [key]: val } : i) } : prev);
  }

  function addItem() {
    setCurrent(prev => prev ? { ...prev, items: [...prev.items, BLANK_ITEM()] } : prev);
  }

  function addPreset(preset: typeof PRESET_ITEMS[0]) {
    setCurrent(prev => prev ? { ...prev, items: [...prev.items, { ...BLANK_ITEM(), ...preset }] } : prev);
    setShowPresets(false);
  }

  function removeItem(id: string) {
    setCurrent(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== id) } : prev);
  }

  function save() {
    if (!current) return;
    setInvoices(prev => {
      const exists = prev.find(i => i.id === current.id);
      return exists ? prev.map(i => i.id === current.id ? current : i) : [current, ...prev];
    });
    toast.success(`${current.type === 'invoice' ? 'Invoice' : 'Estimate'} saved!`);
  }

  async function sendDoc() {
    if (!current?.clientEmail) { toast.error('Add client email first'); return; }
    save();
    setSending(true);
    try {
      await fetch(`${SERVER}/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          email: current.clientEmail, name: current.clientName,
          phone: current.clientPhone, source: `${current.type}_sent`,
          notes: `${current.type.toUpperCase()} ${current.number} — Total: $${grandTotal.toFixed(2)}`,
        }),
      });
    } catch (_) {}
    await new Promise(r => setTimeout(r, 1000));
    setField('status', 'sent');
    setInvoices(prev => prev.map(i => i.id === current!.id ? { ...current!, status: 'sent' } : i));
    setSending(false);
    toast.success(`${current.type === 'invoice' ? 'Invoice' : 'Estimate'} sent to ${current.clientEmail}!`);
  }

  function markPaid() {
    if (!current) return;
    const updated = { ...current, status: 'paid' as const };
    setCurrent(updated);
    setInvoices(prev => prev.map(i => i.id === current.id ? updated : i));
    toast.success('Marked as paid! 🎉');
  }

  function openEdit(inv: Invoice) { setCurrent({ ...inv }); setView('edit'); }

  const subtotal = current?.items.reduce((s, i) => s + i.qty * i.rate, 0) ?? 0;
  const tax = subtotal * ((current?.taxRate ?? 0) / 100);
  const grandTotal = subtotal + tax;

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, inv) => {
    const sub = inv.items.reduce((a, item) => a + item.qty * item.rate, 0);
    return s + sub + sub * (inv.taxRate / 100);
  }, 0);
  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'viewed').reduce((s, inv) => {
    const sub = inv.items.reduce((a, item) => a + item.qty * item.rate, 0);
    return s + sub + sub * (inv.taxRate / 100);
  }, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-5">

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" /> Invoices & Estimates
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Create, send, and track professional documents</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => newDoc('estimate')}
                className="px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                + Estimate
              </button>
              <button onClick={() => newDoc('invoice')}
                className="px-3 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                + Invoice
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Collected', value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: '#22c55e' },
              { label: 'Outstanding', value: `$${outstanding.toFixed(0)}`, icon: Clock, color: '#f59e0b' },
              { label: 'Total Docs', value: invoices.length, icon: FileText, color: '#3b82f6' },
              { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, icon: CheckCircle, color: '#ea580c' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.color + '18' }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Document list */}
          <div className="space-y-2">
            {invoices.map(inv => {
              const sub = inv.items.reduce((a, i) => a + i.qty * i.rate, 0);
              const total = sub + sub * (inv.taxRate / 100);
              const sc = STATUS_CONFIG[inv.status];
              return (
                <button key={inv.id} onClick={() => openEdit(inv)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl text-left transition hover:brightness-110"
                  style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: inv.type === 'invoice' ? 'rgba(234,88,12,0.15)' : 'rgba(168,85,247,0.15)' }}>
                      <FileText className="w-5 h-5" style={{ color: inv.type === 'invoice' ? '#ea580c' : '#a855f7' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{inv.number}</p>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{inv.clientName || 'No client'} · {inv.issueDate}</p>
                    </div>
                  </div>
                  <p className="text-base font-black" style={{ color: inv.status === 'paid' ? '#22c55e' : '#ea580c' }}>
                    ${total.toFixed(2)}
                  </p>
                </button>
              );
            })}
            {invoices.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No documents yet — create your first invoice or estimate!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── EDIT VIEW ─────────────────────────────────────────────────────── */}
      {view === 'edit' && current && (
        <div className="space-y-5 max-w-2xl">
          <div className="flex items-center justify-between">
            <button onClick={() => { save(); setView('list'); }} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex gap-2">
              <button onClick={() => setView('preview')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button onClick={save}
                className="px-3 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110"
                style={{ background: '#2a2a2a' }}>
                Save
              </button>
              <button onClick={sendDoc} disabled={sending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>

          {/* Type + number */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['invoice', 'estimate'] as const).map(t => (
                  <button key={t} onClick={() => setField('type', t)}
                    className="px-4 py-2 rounded-xl text-xs font-black capitalize transition"
                    style={current.type === t
                      ? { background: t === 'invoice' ? '#ea580c' : '#a855f7', color: '#fff' }
                      : { background: '#1a1a1a', color: '#6b7280', border: '1px solid #2a2a2a' }}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs font-mono text-gray-500">{current.number}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 block">Issue Date</label>
                <input type="date" value={current.issueDate} onChange={e => setField('issueDate', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 block">{current.type === 'invoice' ? 'Due Date' : 'Valid Until'}</label>
                <input type="date" value={current.dueDate} onChange={e => setField('dueDate', e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Client Info</h3>
            {[
              { key: 'clientName', label: 'Client Name', placeholder: 'John Smith', type: 'text' },
              { key: 'clientEmail', label: 'Email', placeholder: 'client@email.com', type: 'email' },
              { key: 'clientPhone', label: 'Phone', placeholder: '(555) 000-0000', type: 'tel' },
              { key: 'clientAddress', label: 'Address', placeholder: '123 Main St, City, State', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1 block">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(current as any)[f.key]}
                  onChange={e => setField(f.key as keyof Invoice, e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
            ))}
          </div>

          {/* Line items */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Line Items</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <button onClick={() => setShowPresets(p => !p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                    Presets <ChevronDown className="w-3 h-3" />
                  </button>
                  {showPresets && (
                    <div className="absolute right-0 top-full mt-1 w-64 rounded-xl z-10 overflow-hidden shadow-2xl"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                      {PRESET_ITEMS.map(p => (
                        <button key={p.description} onClick={() => addPreset(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#2a2a2a] transition">
                          <span className="text-xs text-gray-300 truncate">{p.description}</span>
                          <span className="text-xs font-bold text-orange-400 flex-shrink-0 ml-2">${p.rate}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white transition hover:brightness-110"
                  style={{ background: '#ea580c' }}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            {/* Header row */}
            <div className="grid gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest px-1"
              style={{ gridTemplateColumns: '1fr 56px 80px 24px' }}>
              <span>Description</span><span className="text-center">Qty</span><span className="text-right">Rate</span><span />
            </div>

            <div className="space-y-2">
              {current.items.map(item => (
                <div key={item.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 56px 80px 24px' }}>
                  <input value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)}
                    placeholder="Item description"
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                  <input type="number" min="1" value={item.qty} onChange={e => setItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white text-center focus:outline-none focus:border-orange-500/50" />
                  <input type="number" min="0" step="0.01" value={item.rate} onChange={e => setItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-2 text-xs text-white text-right focus:outline-none focus:border-orange-500/50" />
                  <button onClick={() => removeItem(item.id)} className="flex items-center justify-center w-6 h-6 rounded-lg hover:bg-red-500/20 transition">
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid #1e1e1e' }}>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Tax</span>
                  <input type="number" min="0" max="20" step="0.1" value={current.taxRate}
                    onChange={e => setField('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500/50" />
                  <span>%</span>
                </div>
                <span className="text-white">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
                <span className="text-white">Total</span>
                <span style={{ color: '#ea580c' }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Notes / Payment Instructions</label>
            <textarea value={current.notes} onChange={e => setField('notes', e.target.value)} rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/50" />
          </div>

          {/* Status actions */}
          {current.status !== 'draft' && (
            <div className="flex gap-2">
              {current.status !== 'paid' && (
                <button onClick={markPaid}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  ✅ Mark as Paid
                </button>
              )}
              {current.status === 'paid' && (
                <div className="flex-1 py-3 rounded-2xl text-center font-black text-sm text-green-400"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ✅ Paid
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW VIEW ──────────────────────────────────────────────────── */}
      {view === 'preview' && current && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setView('edit')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
            </button>
            <button onClick={sendDoc} disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send to Client'}
            </button>
          </div>

          {/* Document */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', color: '#111' }}>
            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex items-start justify-between" style={{ borderBottom: '2px solid #f3f4f6' }}>
              <div>
                <img src={companyLogo} alt="Black Phoenix" className="h-12 w-auto object-contain mb-2"
                  style={{ filter: 'none' }} />
                <p className="text-xs text-gray-500 font-medium">Black Phoenix Company</p>
                <p className="text-xs text-gray-400">hello@theblackphoenixcompany.com</p>
                <p className="text-xs text-gray-400">theblackphoenixcompany.com</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black uppercase" style={{ color: '#ea580c' }}>{current.type}</p>
                <p className="text-sm font-mono text-gray-500 mt-1">{current.number}</p>
                <div className="mt-3 space-y-0.5">
                  <p className="text-xs text-gray-500">Issued: <strong className="text-gray-800">{current.issueDate}</strong></p>
                  <p className="text-xs text-gray-500">{current.type === 'invoice' ? 'Due' : 'Valid Until'}: <strong className="text-gray-800">{current.dueDate}</strong></p>
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div className="px-8 py-5" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Bill To</p>
              <p className="font-black text-gray-900">{current.clientName || '—'}</p>
              {current.clientEmail && <p className="text-xs text-gray-500">{current.clientEmail}</p>}
              {current.clientPhone && <p className="text-xs text-gray-500">{current.clientPhone}</p>}
              {current.clientAddress && <p className="text-xs text-gray-500">{current.clientAddress}</p>}
            </div>

            {/* Line items */}
            <div className="px-8 py-5">
              <div className="grid text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-2"
                style={{ gridTemplateColumns: '1fr 60px 80px 90px', borderBottom: '1px solid #e5e7eb' }}>
                <span>Description</span><span className="text-center">Qty</span><span className="text-right">Rate</span><span className="text-right">Amount</span>
              </div>
              {current.items.map(item => (
                <div key={item.id} className="grid py-2 text-sm"
                  style={{ gridTemplateColumns: '1fr 60px 80px 90px', borderBottom: '1px solid #f9fafb' }}>
                  <span className="text-gray-800">{item.description || '—'}</span>
                  <span className="text-center text-gray-600">{item.qty}</span>
                  <span className="text-right text-gray-600">${item.rate.toFixed(2)}</span>
                  <span className="text-right font-bold text-gray-800">${(item.qty * item.rate).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-8 pb-6 flex justify-end">
              <div className="w-48 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                {current.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax ({current.taxRate}%)</span><span>${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-2" style={{ borderTop: '2px solid #111' }}>
                  <span>Total</span><span style={{ color: '#ea580c' }}>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {current.notes && (
              <div className="px-8 pb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</p>
                <p className="text-xs text-gray-500 leading-relaxed">{current.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-4 text-center text-xs text-gray-400"
              style={{ background: '#f9fafb', borderTop: '1px solid #f3f4f6' }}>
              Thank you for choosing Black Phoenix Company — Family Owned & Operated
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
