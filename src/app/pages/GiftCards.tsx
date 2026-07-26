import { useState, useEffect } from 'react';
import { Gift, Copy, Check, Send, Star, Heart, Sparkles, ArrowRight, RefreshCw, Download, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface GiftCard {
  code: string;
  amount: number;
  balance: number;
  from: string;
  to: string;
  message: string;
  purchasedAt: string;
  redeemedAt?: string;
  design: GiftCardDesign;
}

type GiftCardDesign = 'classic' | 'celebrate' | 'love' | 'birthday';

const DESIGNS: { id: GiftCardDesign; label: string; emoji: string; bg: string; accent: string }[] = [
  { id: 'classic',   label: 'Classic',   emoji: '🔥', bg: 'linear-gradient(135deg, #1a0a00 0%, #0d0d0d 100%)', accent: '#ea580c' },
  { id: 'celebrate', label: 'Celebrate', emoji: '🎉', bg: 'linear-gradient(135deg, #1a0033 0%, #0d001a 100%)', accent: '#a855f7' },
  { id: 'love',      label: 'Love',      emoji: '❤️', bg: 'linear-gradient(135deg, #1a0008 0%, #0d0005 100%)', accent: '#e11d48' },
  { id: 'birthday',  label: 'Birthday',  emoji: '🎂', bg: 'linear-gradient(135deg, #001a0d 0%, #00100a 100%)', accent: '#22c55e' },
];

const AMOUNTS = [25, 50, 75, 100, 150, 200];


function GiftCardVisual({ card, size = 'full' }: { card: Partial<GiftCard> & { design: GiftCardDesign; amount: number }; size?: 'full' | 'mini' }) {
  const d = DESIGNS.find(d => d.id === card.design) ?? DESIGNS[0];
  const isMini = size === 'mini';
  return (
    <div className={`relative overflow-hidden ${isMini ? 'rounded-xl' : 'rounded-2xl'}`}
      style={{ background: d.bg, border: `1px solid ${d.accent}30`, aspectRatio: '1.586' }}>
      {/* Glow orb */}
      <div className="absolute top-0 right-0 w-2/3 h-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 30%, ${d.accent}25 0%, transparent 65%)` }} />
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${d.accent} 1px, transparent 1px), linear-gradient(90deg, ${d.accent} 1px, transparent 1px)`, backgroundSize: isMini ? '16px 16px' : '24px 24px' }} />

      <div className={`absolute inset-0 flex flex-col justify-between ${isMini ? 'p-3' : 'p-5'}`}>
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <img src={companyLogo} alt="BP" className={isMini ? 'h-5 w-auto object-contain' : 'h-8 w-auto object-contain'}
              style={{ filter: 'brightness(0) invert(1) opacity(0.9)' }} />
            {!isMini && <div>
              <p className="text-white font-black text-xs leading-none">BLACK PHOENIX</p>
              <p className="text-xs leading-none mt-0.5" style={{ color: d.accent }}>GIFT CARD</p>
            </div>}
          </div>
          <span className={isMini ? 'text-lg' : 'text-3xl'}>{d.emoji}</span>
        </div>

        {/* Amount */}
        <div>
          <p className={`font-black text-white ${isMini ? 'text-xl' : 'text-4xl'}`}
            style={{ textShadow: `0 0 30px ${d.accent}` }}>
            ${card.amount}
          </p>
          {!isMini && card.to && (
            <p className="text-xs mt-1" style={{ color: d.accent }}>For {card.to}</p>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          {card.code ? (
            <p className={`font-mono font-bold tracking-widest ${isMini ? 'text-[8px]' : 'text-xs'} text-white/50`}>
              {isMini ? card.code.slice(0, 4) + '···' : card.code}
            </p>
          ) : (
            <p className={`font-mono ${isMini ? 'text-[8px]' : 'text-xs'} text-white/30`}>XXXX-XXXX-XXXX-XXXX</p>
          )}
          <div className="w-8 h-5 rounded-sm opacity-40" style={{ background: 'linear-gradient(135deg, #ccc, #888)' }} />
        </div>
      </div>
    </div>
  );
}

type Step = 'pick' | 'personalize' | 'pay' | 'done';

export default function GiftCards() {
  const [step, setStep] = useState<Step>('pick');
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [design, setDesign] = useState<GiftCardDesign>('classic');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [issued, setIssued] = useState<GiftCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [activeTab, setActiveTab] = useState<'buy' | 'redeem' | 'mine'>('buy');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemResult, setRedeemResult] = useState<GiftCard | null>(null);

  const finalAmount = customAmount ? parseInt(customAmount) : amount;
  const d = DESIGNS.find(d => d.id === design)!;

  async function request(path: string, init: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SERVER}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.error || 'Gift-card request failed.');
    return payload;
  }

  async function loadMyCards() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setMyCards([]);
      return;
    }
    try {
      const data = await request(`/gift-cards/owner/${encodeURIComponent(session.user.email)}`);
      setMyCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (error: any) {
      toast.error(error.message || 'Unable to load your gift cards.');
    }
  }

  useEffect(() => {
    void loadMyCards();
    const params = new URLSearchParams(window.location.search);
    const purchaseId = params.get('gift_purchase_id');
    const sessionId = params.get('session_id');
    if (!purchaseId || !sessionId) return;

    (async () => {
      setProcessing(true);
      try {
        const data = await request(`/gift-cards/purchases/${encodeURIComponent(purchaseId)}/confirm?session_id=${encodeURIComponent(sessionId)}`);
        if (data.card) {
          setIssued(data.card);
          setStep('done');
          setActiveTab('buy');
          toast.success('Payment confirmed — your gift card is active.');
          void loadMyCards();
        }
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
      } catch (error: any) {
        toast.error(error.message || 'We could not confirm the gift-card payment yet.');
      } finally {
        setProcessing(false);
      }
    })();
  }, []);

  async function purchase() {
    if (!recipientEmail.includes('@')) { toast.error('Valid recipient email required'); return; }
    if (!Number.isFinite(finalAmount) || finalAmount < 10 || finalAmount > 500) {
      toast.error('Gift cards must be between $10 and $500.');
      return;
    }
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await request('/gift-cards/checkout', {
        method: 'POST',
        body: JSON.stringify({
          amount: finalAmount,
          recipientName,
          recipientEmail,
          senderName,
          purchaserEmail: session?.user?.email || '',
          message,
          design,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (!data.checkoutUrl) throw new Error('Secure checkout could not be started.');
      window.location.assign(data.checkoutUrl);
    } catch (error: any) {
      toast.error(error.message || 'Unable to start secure checkout.');
      setProcessing(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  async function checkRedeem() {
    if (!redeemCode.trim()) return;
    setProcessing(true);
    try {
      const data = await request(`/gift-cards/${encodeURIComponent(redeemCode)}`);
      const card = data.card as GiftCard;
      if (card.balance <= 0) throw new Error('This card has no remaining balance.');
      setRedeemResult(card);
    } catch (error: any) {
      setRedeemResult(null);
      toast.error(error.message || 'Gift card not found.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-pink-400" /> Gift Cards
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Give the gift of Black Phoenix — redeemable on anything in the store</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl max-w-lg mx-auto" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        {([['buy', '🎁 Buy a Card'], ['redeem', '💳 Redeem'], ['mine', '📋 My Cards']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={activeTab === id
              ? { background: 'linear-gradient(135deg, #e11d48, #be185d)', color: '#fff' }
              : { color: '#6b7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BUY FLOW ──────────────────────────────────────────────────────── */}
      {activeTab === 'buy' && (
        <>
          {/* Step indicator */}
          {step !== 'done' && (
            <div className="flex items-center gap-2 max-w-lg mx-auto">
              {(['pick', 'personalize', 'pay'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition"
                    style={step === s ? { background: '#e11d48', color: '#fff' } :
                      (['pick','personalize','pay','done'].indexOf(step) > i) ? { background: '#22c55e', color: '#fff' } :
                      { background: '#1e1e1e', color: '#6b7280' }}>
                    {(['pick','personalize','pay','done'].indexOf(step) > i) ? '✓' : i + 1}
                  </div>
                  <span className="text-xs text-gray-600 capitalize hidden sm:inline">{s}</span>
                  {i < 2 && <div className="w-6 h-px bg-[#2a2a2a]" />}
                </div>
              ))}
            </div>
          )}

          {/* Step 1 — Pick amount & design */}
          {step === 'pick' && (
            <div className="space-y-5 max-w-lg mx-auto">
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Choose Amount</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {AMOUNTS.map(a => (
                    <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                      className="py-3 rounded-2xl font-black text-sm transition"
                      style={amount === a && !customAmount
                        ? { background: '#e11d48', color: '#fff' }
                        : { background: '#111', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                      ${a}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input type="number" min="10" max="500" value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    placeholder="Custom amount (min $10)"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-2xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50" />
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Choose Design</p>
                <div className="grid grid-cols-2 gap-3">
                  {DESIGNS.map(des => (
                    <button key={des.id} onClick={() => setDesign(des.id)}
                      className="relative rounded-2xl overflow-hidden transition"
                      style={{ outline: design === des.id ? `2px solid ${des.accent}` : '2px solid transparent', outlineOffset: 2 }}>
                      <GiftCardVisual card={{ design: des.id, amount: finalAmount }} size="mini" />
                      <div className="absolute bottom-2 left-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                          style={{ background: 'rgba(0,0,0,0.6)' }}>{des.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep('personalize')} disabled={finalAmount < 10}
                className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}>
                Continue → Personalize
              </button>
            </div>
          )}

          {/* Step 2 — Personalize */}
          {step === 'personalize' && (
            <div className="space-y-5 max-w-lg mx-auto">
              {/* Live preview */}
              <div className="max-w-xs mx-auto">
                <GiftCardVisual card={{ design, amount: finalAmount, to: recipientName, code: '••••-••••-••••-••••' }} />
              </div>

              <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
                <h3 className="font-black text-white text-sm">Who is this for?</h3>
                {[
                  { key: 'recipientName', label: "Recipient's Name", placeholder: 'Sarah', val: recipientName, set: setRecipientName, type: 'text' },
                  { key: 'recipientEmail', label: "Recipient's Email *", placeholder: 'sarah@email.com', val: recipientEmail, set: setRecipientEmail, type: 'email' },
                  { key: 'senderName', label: 'Your Name', placeholder: 'From: John', val: senderName, set: setSenderName, type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 block">Personal Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    placeholder="Happy Birthday! Hope you find something you love 🎉"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-pink-500/50" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('pick')}
                  className="px-5 py-3 rounded-2xl text-sm font-bold text-gray-400 transition hover:bg-[#1a1a1a]">← Back</button>
                <button onClick={() => setStep('pay')} disabled={!recipientEmail.includes('@')}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}>
                  Continue → Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Pay */}
          {step === 'pay' && (
            <div className="space-y-5 max-w-lg mx-auto">
              <div className="max-w-xs mx-auto">
                <GiftCardVisual card={{ design, amount: finalAmount, to: recipientName, code: '••••-••••-••••-••••' }} />
              </div>

              <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
                <h3 className="font-black text-white text-sm">Order Summary</h3>
                {[
                  { label: 'Gift Card Amount', value: `$${finalAmount}.00` },
                  { label: 'To', value: recipientName || 'Friend' },
                  { label: 'Send to', value: recipientEmail },
                  { label: 'Design', value: `${d.emoji} ${d.label}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm py-1.5" style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-white font-bold">{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-base pt-1">
                  <span className="text-white">Total</span>
                  <span style={{ color: '#e11d48' }}>${finalAmount}.00</span>
                </div>
              </div>

              <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Sparkles className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">You will be redirected to secure Stripe checkout. The gift card is created only after Stripe confirms payment; delivery is sent to <strong className="text-white">{recipientEmail}</strong> when email delivery is configured.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('personalize')}
                  className="px-5 py-3 rounded-2xl text-sm font-bold text-gray-400 transition hover:bg-[#1a1a1a]">← Back</button>
                <button onClick={purchase} disabled={processing}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}>
                  {processing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><CreditCard className="w-4 h-4" /> Purchase ${finalAmount} Gift Card</>}
                </button>
              </div>
            </div>
          )}

          {/* Step done */}
          {step === 'done' && issued && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-5 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-2xl font-black text-white">Gift Card Activated!</h2>
                <p className="text-sm text-gray-400 mt-1">Your payment is confirmed and this gift card is active.</p>
              </div>

              <GiftCardVisual card={issued} />

              <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Gift Card Code</p>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-black font-mono text-white tracking-widest flex-1">{issued.code}</p>
                  <button onClick={() => copyCode(issued.code)}
                    className="px-4 py-2 rounded-xl text-xs font-black text-white transition flex items-center gap-1.5"
                    style={{ background: copied ? '#16a34a' : '#e11d48' }}>
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">Balance: <strong className="text-white">${issued.amount}.00</strong></p>
              </div>

              <button onClick={() => { setStep('pick'); setIssued(null); setRecipientEmail(''); setRecipientName(''); setSenderName(''); setMessage(''); }}
                className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}>
                Buy Another Gift Card
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* ── REDEEM TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'redeem' && (
        <div className="space-y-5 max-w-lg mx-auto">
          <div>
            <h2 className="text-lg font-black text-white mb-1">Redeem a Gift Card</h2>
            <p className="text-sm text-gray-500">Enter your gift card code to check balance or apply at checkout.</p>
          </div>

          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Gift Card Code</label>
              <input value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX" maxLength={19}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-pink-500/50" />
            </div>
            <button onClick={checkRedeem} disabled={redeemCode.length < 10}
              className="w-full py-3 rounded-xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}>
              Check Balance
            </button>
          </div>

          {redeemResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3">
              <GiftCardVisual card={redeemResult} size="mini" />
              <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
                {[
                  { label: 'Original Value', value: `$${redeemResult.amount}.00` },
                  { label: 'Current Balance', value: `$${redeemResult.balance}.00` },
                  { label: 'From', value: redeemResult.from },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-white font-bold">{row.value}</span>
                  </div>
                ))}
                {redeemResult.message && (
                  <div className="p-3 rounded-xl italic text-xs text-gray-400" style={{ background: '#0a0a0a' }}>
                    "{redeemResult.message}"
                  </div>
                )}
              </div>
              <button onClick={() => window.location.hash = 'public-store'}
                className="w-full py-3 rounded-2xl font-black text-sm text-white transition hover:brightness-110 flex items-center justify-center gap-2"
                style={{ background: '#ea580c' }}>
                Shop Now <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ── MY CARDS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'mine' && (
        <div className={myCards.length === 0 ? 'max-w-lg mx-auto' : 'max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4'}>
          {myCards.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No gift cards yet</p>
              <button onClick={() => setActiveTab('buy')}
                className="mt-4 px-5 py-2.5 rounded-xl text-xs font-black text-white"
                style={{ background: '#e11d48' }}>
                Buy Your First Gift Card
              </button>
            </div>
          ) : myCards.map(card => (
            <div key={card.code} className="space-y-3">
              <GiftCardVisual card={card} size="mini" />
              <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-mono text-gray-400">{card.code}</p>
                  <button onClick={() => copyCode(card.code)}
                    className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition">
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">To: {card.to}</span>
                  <span className="font-black" style={{ color: card.balance > 0 ? '#22c55e' : '#6b7280' }}>
                    ${card.balance} remaining
                  </span>
                </div>
                {card.message && <p className="text-xs text-gray-600 mt-1.5 italic">"{card.message}"</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
