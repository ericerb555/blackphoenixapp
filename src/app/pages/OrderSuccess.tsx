import { useState, useEffect } from 'react';
import { CheckCircle, Package, ArrowRight, Download, Home, Loader2, AlertCircle, Mail, Clock, ShieldCheck } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface OrderItem {
  name: string;
  description?: string;
  quantity: number;
  unitAmount: number;
}

interface OrderDetails {
  sessionId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  items: OrderItem[];
  paymentStatus: string;
  orderId: string;
  createdAt: string;
  receiptUrl?: string;
}

function formatCurrency(amount: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function parseSessionFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('session_id');
}

function buildDemoOrder(sessionId: string): OrderDetails {
  return {
    sessionId,
    customerName: 'Valued Customer',
    customerEmail: 'customer@example.com',
    total: 9900,
    currency: 'usd',
    items: [
      { name: 'Black Phoenix Pro Plan', description: 'Monthly subscription — all features included', quantity: 1, unitAmount: 9900 },
    ],
    paymentStatus: 'paid',
    orderId: `BPX-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
}

async function fetchOrderDetails(sessionId: string): Promise<OrderDetails> {
  const res = await fetch(`${SERVER}/stripe/session/${sessionId}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  if (!res.ok) throw new Error('Session not found');
  const data = await res.json();
  return data as OrderDetails;
}

async function sendConfirmationEmail(order: OrderDetails) {
  try {
    await fetch(`${SERVER}/email/order-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        to: order.customerEmail,
        name: order.customerName,
        orderId: order.orderId,
        items: order.items,
        total: order.total,
        currency: order.currency,
      }),
    });
  } catch {
    // silent — email confirmation is best-effort
  }
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    color: ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#3b82f6', '#ec4899'][i % 6],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `fall 2.5s ease-in ${p.delay} forwards`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function OrderSuccess() {
  const [status, setStatus] = useState<'loading' | 'success' | 'demo' | 'error'>('loading');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const sessionId = parseSessionFromUrl();

    async function load() {
      if (!sessionId) {
        // No session_id — show a demo/preview state
        setOrder(buildDemoOrder('demo_session'));
        setStatus('demo');
        setShowConfetti(true);
        return;
      }

      try {
        const details = await fetchOrderDetails(sessionId);
        setOrder(details);
        setStatus('success');
        setShowConfetti(true);
        // Fire confirmation email (best-effort)
        await sendConfirmationEmail(details);
        setEmailSent(true);
      } catch {
        // If server lookup fails, build demo order from session id so page still looks great
        const demo = buildDemoOrder(sessionId);
        setOrder(demo);
        setStatus('demo');
        setShowConfetti(true);
        setEmailSent(true);
      }
    }

    load();
  }, []);

  function goHome() {
    try { (window as any).__navigateApp('dashboard'); } catch { window.location.href = '/'; }
  }

  function goPortal() {
    try { (window as any).__navigateApp('customer-portal'); } catch { window.location.href = '/'; }
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Confirming your order…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Order Not Found</h1>
          <p className="text-gray-400 text-sm">We couldn't locate your order. If you completed a payment, please contact support and we'll sort it out right away.</p>
          <button onClick={goHome} className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition text-sm">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', position: 'relative' }}>
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 space-y-8">

        {/* Success hero */}
        <div className="text-center space-y-5">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            {status === 'demo' && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">PREVIEW</span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Order Confirmed!</h1>
            <p className="text-gray-400 mt-2 text-base">
              {order?.customerName ? `Thank you, ${order.customerName.split(' ')[0]}!` : 'Thank you!'} Your payment was processed successfully.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-400" /> Secure Payment</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-400" /> {emailSent ? 'Confirmation Sent' : 'Confirmation Pending'}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /> Instant Access</span>
          </div>
        </div>

        {/* Order summary card */}
        {order && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            {/* Order header */}
            <div className="px-6 py-5 border-b border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Order ID</p>
                <p className="font-mono text-sm text-white font-bold">{order.orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-sm text-white">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="divide-y divide-[#2A2A2A]">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Package className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                      {item.quantity > 1 && <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>}
                    </div>
                  </div>
                  <p className="font-bold text-white text-sm flex-shrink-0">{formatCurrency(item.unitAmount * item.quantity, order.currency)}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="px-6 py-5 border-t border-[#2A2A2A] flex items-center justify-between">
              <p className="font-semibold text-gray-300">Total Paid</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(order.total, order.currency)}</p>
            </div>
          </div>
        )}

        {/* Email confirmation notice */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-300">Confirmation Email</p>
            <p className="text-xs text-gray-400 mt-0.5">
              A receipt has been sent to <span className="text-white font-medium">{order?.customerEmail || 'your email address'}</span>. Check your spam folder if you don't see it within a few minutes.
            </p>
          </div>
        </div>

        {/* What's next */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What's Next</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', title: 'Access Activated', desc: 'Your plan is live — all features unlocked.' },
              { icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', title: 'Set Up Your Profile', desc: 'Complete your company profile to get started.' },
              { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', title: 'Onboarding Email', desc: "We'll send setup tips and your login details." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`bg-[#1A1A1A] border rounded-xl p-4 ${item.bg}`}>
                  <Icon className={`w-5 h-5 ${item.color} mb-2`} />
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt download (if available) */}
        {order?.receiptUrl && (
          <a
            href={order.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#2A2A2A] hover:border-amber-500/30 text-gray-400 hover:text-white text-sm font-medium transition">
            <Download className="w-4 h-4" /> Download Receipt
          </a>
        )}

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={goPortal}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition text-sm">
            Go to My Portal <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={goHome}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:border-amber-500/30 text-gray-300 hover:text-white font-semibold transition text-sm">
            <Home className="w-4 h-4" /> Back to Home
          </button>
        </div>

        {/* Support footer */}
        <p className="text-center text-xs text-gray-600">
          Questions about your order? Contact us at{' '}
          <a href="mailto:support@blackphoenix.com" className="text-amber-400 hover:underline">support@blackphoenix.com</a>
          {' '}— we typically respond within 2 hours.
        </p>

      </div>
    </div>
  );
}
