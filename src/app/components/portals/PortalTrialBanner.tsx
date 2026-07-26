import { useEffect, useState } from 'react';
import { ShieldCheck, Clock, Lock, ArrowRight, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export interface Entitlements {
  level: 'full' | 'standard';
  trialActive: boolean;
  needsPlan: boolean;
  hasGrant?: boolean;
  admin?: boolean;
  daysLeft: number | null;
  trialEnd: string | null;
  trialMonths?: number;
  portalType?: string;
}

/**
 * Fetches the signed-in user's feature entitlements (trial grant status).
 * Returns null while loading or when there is nothing to gate.
 */
export function useEntitlements() {
  const { session } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!session?.access_token) { setLoading(false); return; }
      try {
        const res = await fetch(`${SERVER}/me/entitlements`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await res.json().catch(() => ({}));
        if (active && res.ok && payload?.success) setEntitlements(payload.entitlements);
      } catch { /* non-blocking */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [session?.access_token]);

  return { entitlements, loading };
}

function goToPlans() {
  window.location.href = '/subscription-hub';
}

/**
 * Drop-in banner for the top of any portal view. Renders:
 *  - nothing for admins / users with no trial grant and no plan requirement
 *  - a countdown banner while the full-access trial is active
 *  - a prominent "choose a plan" banner once the trial has ended
 */
export default function PortalTrialBanner() {
  const { entitlements, loading } = useEntitlements();
  if (loading || !entitlements || entitlements.admin) return null;

  if (entitlements.needsPlan) {
    return (
      <div className="border-b border-red-500/30 bg-gradient-to-r from-red-600/15 to-rose-600/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20"><Lock className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-sm font-bold text-red-300">Your full-access trial has ended</p>
              <p className="text-xs text-red-200/80">Choose a plan to keep using all of your portal's features.</p>
            </div>
          </div>
          <button onClick={goToPlans} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500">Choose a plan <ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  if (entitlements.trialActive && entitlements.hasGrant) {
    const days = entitlements.daysLeft ?? 0;
    const urgent = days <= 14;
    return (
      <div className={`border-b ${urgent ? 'border-amber-500/30 bg-amber-500/10' : 'border-teal-500/25 bg-teal-500/5'}`}>
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            {urgent ? <Clock className="h-4 w-4 text-amber-400" /> : <ShieldCheck className="h-4 w-4 text-teal-400" />}
            <p className={`text-sm ${urgent ? 'text-amber-200' : 'text-teal-200'}`}>
              <span className="font-bold">Full-access trial</span> · {days} day{days === 1 ? '' : 's'} left{entitlements.trialEnd ? ` (ends ${new Date(entitlements.trialEnd).toLocaleDateString()})` : ''}
            </p>
          </div>
          <button onClick={goToPlans} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${urgent ? 'bg-amber-500 text-black hover:bg-amber-400' : 'border border-teal-500/40 text-teal-200 hover:bg-teal-500/10'}`}>
            {urgent ? 'Choose a plan now' : 'View plans'} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Wrap premium content. When the trial has ended and no plan is active, the
 * children are blurred/locked behind an upgrade prompt. Otherwise renders normally.
 */
export function FeatureGate({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const { entitlements, loading } = useEntitlements();
  if (loading) return <div className="flex items-center justify-center py-12 text-sm text-gray-400"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>;
  if (!entitlements || entitlements.admin || entitlements.level === 'full') return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[3px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/40 p-6 text-center backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20"><Lock className="h-6 w-6 text-red-400" /></div>
        <p className="text-sm font-bold text-white">{feature || 'This feature'} requires a plan</p>
        <p className="max-w-xs text-xs text-gray-300">Your full-access trial has ended. Choose a plan to unlock it again.</p>
        <button onClick={goToPlans} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500">Choose a plan <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
