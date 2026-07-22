/**
 * Secure subscription payment handoff.
 * Card and bank credentials are intentionally never collected in this app;
 * Stripe Checkout owns the payment form and payment confirmation.
 */

import { useState } from "react";
import { Building2, Calendar, Check, CreditCard, Info, Lock, X } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId } from "../utils/supabase/info";
import { supabase } from "../lib/supabase";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface SubscriptionPaymentPageProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: string;
    name: string;
    plan: string;
    type: string;
    amount: number;
    billingCycle: "monthly" | "quarterly" | "annually";
    status: string;
    nextBillingDate?: string;
    hoursIncluded?: number;
    hoursUsed?: number;
    hoursRemaining?: number;
  };
  onPaymentSuccess: () => void;
}

export default function SubscriptionPaymentPage({ isOpen, onClose, subscription }: SubscriptionPaymentPageProps) {
  const [processing, setProcessing] = useState(false);
  if (!isOpen) return null;

  const startSecureCheckout = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in before paying for a subscription.");
      const response = await fetch(`${SERVER}/subscriptions/${encodeURIComponent(subscription.id)}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.checkoutUrl) throw new Error(result.error || "Unable to start secure checkout.");
      window.location.assign(result.checkoutUrl);
    } catch (error: any) {
      toast.error(error.message || "Unable to start secure checkout.");
      setProcessing(false);
    }
  };

  const hoursRemaining = subscription.hoursRemaining ?? Math.max(0, (subscription.hoursIncluded || 0) - (subscription.hoursUsed || 0));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#0F0F0F] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1a1a1a] bg-[#0F0F0F] p-6">
          <div><h2 className="flex items-center gap-2 text-2xl font-bold text-white"><Lock className="h-6 w-6 text-[#ea580c]" />Secure Subscription Checkout</h2><p className="mt-1 text-sm text-gray-400">Payment details are securely handled by Stripe.</p></div>
          <button onClick={onClose} disabled={processing} className="rounded-lg p-2 text-gray-400 transition hover:bg-[#1a1a1a] hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 p-5"><CreditCard className="mb-3 h-7 w-7 text-[#ea580c]" /><h3 className="text-lg font-bold text-white">Continue to Stripe Checkout</h3><p className="mt-2 text-sm leading-6 text-gray-400">You will enter card or eligible bank-payment details directly on Stripe's secure payment page. Black Phoenix never receives or stores those credentials.</p></div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5"><div className="flex gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" /><div><p className="font-semibold text-white">Activation happens after verified payment</p><p className="mt-1 text-sm text-gray-400">Your subscription, included hours, and portal benefits activate only after Stripe confirms the payment.</p></div></div></div>
            <button onClick={startSecureCheckout} disabled={processing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ea580c] px-6 py-4 text-base font-bold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"><Lock className="h-5 w-5" />{processing ? "Redirecting to Stripe…" : `Pay $${Number(subscription.amount || 0).toFixed(2)} securely`}</button>
            <p className="text-center text-xs text-gray-500">Stripe Checkout · Encrypted payment processing · No card data is stored in this app</p>
          </div>
          <aside className="rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-5 lg:col-span-2"><h3 className="mb-4 text-lg font-bold text-white">Subscription Summary</h3><div className="space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-gray-400">Plan</span><span className="text-right font-semibold capitalize text-white">{subscription.plan || subscription.name}</span></div><div className="flex justify-between gap-3"><span className="text-gray-400">Billing cycle</span><span className="font-semibold capitalize text-white">{subscription.billingCycle}</span></div><div className="flex justify-between gap-3 border-t border-[#2a2a2a] pt-3"><span className="text-gray-400">Amount due</span><span className="text-xl font-bold text-[#ea580c]">${Number(subscription.amount || 0).toFixed(2)}</span></div>{subscription.hoursIncluded !== undefined && <div className="border-t border-[#2a2a2a] pt-3"><p className="mb-2 text-gray-400">Included service hours</p><div className="flex items-center justify-between"><span className="font-semibold text-white">{hoursRemaining} remaining</span><span className="text-xs text-gray-500">of {subscription.hoursIncluded} hours</span></div></div>}{subscription.nextBillingDate && <div className="flex items-center gap-2 border-t border-[#2a2a2a] pt-3 text-xs text-gray-400"><Calendar className="h-4 w-4" />Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}</div>}</div><div className="mt-5 border-t border-[#2a2a2a] pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">What activates</p>{["Subscription access", "Plan benefits", "Included service-hour tracking"].map(item => <div key={item} className="mb-2 flex items-center gap-2 text-sm text-gray-300"><Check className="h-4 w-4 text-green-400" />{item}</div>)}</div></aside>
        </div>
      </div>
    </div>
  );
}
