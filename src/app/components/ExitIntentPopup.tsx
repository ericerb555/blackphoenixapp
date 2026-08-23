/**
 * ExitIntentPopup — fires when mouse leaves viewport top edge.
 * Config is read from localStorage key 'exit_intent_config'.
 * Suppressed for 24h after dismiss or capture.
 */

import { useEffect, useState } from 'react';
import { X, Tag, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ExitIntentConfig {
  enabled: boolean;
  headline: string;
  subheadline: string;
  offerType: 'discount' | 'lead' | 'newsletter';
  promoCode: string;
  discountLabel: string;
  buttonText: string;
  bgColor: string;
  accentColor: string;
  suppressHours: number;
  showOnPages: string[];
}

const DEFAULT_CONFIG: ExitIntentConfig = {
  enabled: true,
  headline: "Wait — Don't Leave Empty Handed!",
  subheadline: "Get an exclusive discount on your first service. Enter your email and we'll send it right over.",
  offerType: 'discount',
  promoCode: 'SAVE5',
  discountLabel: '5% OFF',
  buttonText: 'Claim My Discount',
  bgColor: '#111111',
  accentColor: '#ea580c',
  suppressHours: 24,
  showOnPages: [],
};

function getConfig(): ExitIntentConfig {
  try {
    const stored = localStorage.getItem('exit_intent_config');
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
  } catch { return DEFAULT_CONFIG; }
}

function isSuppressed(config: ExitIntentConfig): boolean {
  try {
    const ts = localStorage.getItem('exit_intent_suppressed');
    if (!ts) return false;
    const elapsed = (Date.now() - Number(ts)) / 3600000;
    return elapsed < config.suppressHours;
  } catch { return false; }
}

function suppress() {
  localStorage.setItem('exit_intent_suppressed', String(Date.now()));
}

function recordImpression() {
  try {
    const stats = JSON.parse(localStorage.getItem('exit_intent_stats') || '{"impressions":0,"captures":0}');
    stats.impressions = (stats.impressions || 0) + 1;
    localStorage.setItem('exit_intent_stats', JSON.stringify(stats));
  } catch {}
}

function recordCapture() {
  try {
    const stats = JSON.parse(localStorage.getItem('exit_intent_stats') || '{"impressions":0,"captures":0}');
    stats.captures = (stats.captures || 0) + 1;
    localStorage.setItem('exit_intent_stats', JSON.stringify(stats));
  } catch {}
}

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [captured, setCaptured] = useState(false);
  const [config, setConfig] = useState<ExitIntentConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const cfg = getConfig();
    setConfig(cfg);
    if (!cfg.enabled || isSuppressed(cfg)) return;

    let triggered = false;

    // Never interrupt the user while they are inside a cart/checkout overlay or
    // actively filling out a form field — that is the worst possible moment for a
    // popup and reads as broken. Cart/checkout overlays render a full-screen
    // `inset-0` element with a `bg-black/NN` darkening layer.
    function overlayOpen(): boolean {
      const nodes = document.querySelectorAll('[class*="inset-0"]');
      for (let i = 0; i < nodes.length; i++) {
        const cls = (nodes[i] as HTMLElement).className;
        if (typeof cls === 'string' && /bg-black\//.test(cls) && /\binset-0\b/.test(cls)) return true;
      }
      return false;
    }
    function formFocused(): boolean {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }
    function isBlocked(): boolean {
      return overlayOpen() || formFocused();
    }

    function handleMouseOut(e: MouseEvent) {
      if (triggered || isBlocked()) return;
      if (e.clientY <= 5 && e.relatedTarget === null) {
        triggered = true;
        setVisible(true);
        recordImpression();
      }
    }

    // Mobile: trigger after 30s of inactivity — but typing/tapping counts as
    // activity too, so filling a form keeps resetting the timer instead of
    // getting interrupted by a popup.
    let mobileTimer: ReturnType<typeof setTimeout>;
    function resetMobileTimer() {
      clearTimeout(mobileTimer);
      mobileTimer = setTimeout(() => {
        if (!triggered && !isBlocked()) {
          triggered = true;
          setVisible(true);
          recordImpression();
        }
      }, 30000);
    }

    document.addEventListener('mouseleave', handleMouseOut);
    window.addEventListener('scroll', resetMobileTimer, { passive: true });
    window.addEventListener('keydown', resetMobileTimer);
    window.addEventListener('pointerdown', resetMobileTimer);
    document.addEventListener('input', resetMobileTimer);
    resetMobileTimer();

    return () => {
      document.removeEventListener('mouseleave', handleMouseOut);
      window.removeEventListener('scroll', resetMobileTimer);
      window.removeEventListener('keydown', resetMobileTimer);
      window.removeEventListener('pointerdown', resetMobileTimer);
      document.removeEventListener('input', resetMobileTimer);
      clearTimeout(mobileTimer);
    };
  }, []);

  function dismiss() {
    suppress();
    setVisible(false);
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    recordCapture();
    suppress();
    setCaptured(true);

    // Persist the lead to the server (and email the discount code). Keep a
    // localStorage copy as an offline fallback.
    try {
      const leads = JSON.parse(localStorage.getItem('exit_intent_leads') || '[]');
      leads.push({ email, capturedAt: new Date().toISOString(), promoCode: config.promoCode, source: 'exit-intent' });
      localStorage.setItem('exit_intent_leads', JSON.stringify(leads));
    } catch {}

    try {
      const res = await fetch(`${SERVER}/exit-intent/capture`, {
        method: 'POST',
        headers: await authedHeadersOrAnon(publicAnonKey),
        body: JSON.stringify({ email, promoCode: config.promoCode, source: 'exit-intent', page: window.location.pathname }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.emailSent ? `Discount emailed to ${email}!` : `You're on the list, ${email}!`);
      } else {
        console.error('Exit-intent capture failed:', json.error);
        toast.success(`Discount code: ${config.promoCode}`);
      }
    } catch (err) {
      console.error('Exit-intent capture network error:', err);
      toast.success(`Discount code: ${config.promoCode}`);
    }

    setTimeout(() => setVisible(false), 2500);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: config.bgColor, border: `1px solid ${config.accentColor}33` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-1.5 w-full" style={{ background: config.accentColor }} />

        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {captured ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: config.accentColor }} />
              <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
              <p className="text-gray-400 mb-4">Your discount code has been sent to <span className="text-white font-semibold">{email}</span></p>
              <div
                className="inline-block px-6 py-3 rounded-xl font-mono text-xl font-bold tracking-widest"
                style={{ background: `${config.accentColor}22`, color: config.accentColor, border: `1px solid ${config.accentColor}44` }}
              >
                {config.promoCode}
              </div>
            </div>
          ) : (
            <>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                style={{ background: `${config.accentColor}22`, color: config.accentColor }}
              >
                <Tag className="w-3.5 h-3.5" />
                {config.discountLabel} — Exclusive Offer
              </div>

              <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                {config.headline}
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                {config.subheadline}
              </p>

              {config.offerType === 'discount' && (
                <div
                  className="p-4 rounded-xl mb-6 text-center"
                  style={{ background: `${config.accentColor}15`, border: `1px dashed ${config.accentColor}66` }}
                >
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Your Promo Code</p>
                  <p
                    className="text-3xl font-bold font-mono tracking-widest"
                    style={{ color: config.accentColor }}
                  >
                    {config.promoCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Use at checkout · Expires in 48 hours</p>
                </div>
              )}

              <form onSubmit={handleCapture} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm focus:outline-none transition"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    onFocus={e => e.target.style.borderColor = config.accentColor}
                    onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: config.accentColor }}
                >
                  {config.buttonText}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-xs text-gray-600 text-center mt-4">
                No spam. Unsubscribe anytime. We respect your privacy.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
