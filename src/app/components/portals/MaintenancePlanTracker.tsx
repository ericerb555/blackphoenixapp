/**
 * MaintenancePlanTracker — shared across all portals.
 * Shows subscription plan hours, usage, remaining balance, overages, and amounts owed.
 * Terminology adapts per portal type.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { createInvoiceCheckout, listPlans, logPlanUsage } from '../../utils/plansApi';
import { loadEntitlementSummary } from '../../utils/entitlementsApi';
import {
  Clock, CheckCircle, AlertTriangle, DollarSign, TrendingUp,
  Plus, ChevronDown, ChevronUp, CreditCard, FileText, Wrench,
  Calendar, ArrowUpRight, X, BarChart3, Zap, Package,
  ShoppingBag, BookOpen, Bot, Star, ExternalLink, Shield,
} from 'lucide-react';
import TierPicker from '../TierPicker';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PortalRole =
  | 'landlord' | 'condo_manager' | 'property_manager'
  | 'territory' | 'vendor' | 'advertiser' | 'subcontractor'
  | 'customer' | 'employee' | 'investor';

interface Plan {
  id: string;
  name: string;
  hoursIncluded: number;
  hoursUsed: number;
  overageRate: number; // $ per hour over
  monthlyFee: number;
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'paused' | 'cancelled';
  renewsOn: string;
  property?: string; // for property portals
}

interface UsageEntry {
  id: string;
  date: string;
  description: string;
  hours: number;
  tech?: string;
  tierId?: string;
  tierRate?: number;
  planId: string;
}

interface Payment {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  planId: string;
}

// ── Role-specific copy ─────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<PortalRole, {
  title: string;
  subtitle: string;
  hoursLabel: string;
  serviceLabel: string;
  accentColor: string;
  tabColor: string;
}> = {
  landlord:         { title: 'Maintenance Plans',      subtitle: 'Track labor hours & balances per property',          hoursLabel: 'Service Hours', serviceLabel: 'Maintenance',  accentColor: 'teal',   tabColor: 'bg-teal-600' },
  condo_manager:    { title: 'Maintenance Plans',      subtitle: 'HOA service hour tracking & overage billing',        hoursLabel: 'Service Hours', serviceLabel: 'Maintenance',  accentColor: 'cyan',   tabColor: 'bg-cyan-600' },
  property_manager: { title: 'Maintenance Plans',      subtitle: 'Monitor hours & billing across all properties',      hoursLabel: 'Service Hours', serviceLabel: 'Maintenance',  accentColor: 'amber',  tabColor: 'bg-amber-600' },
  territory:        { title: 'Subscription Plans',     subtitle: 'Customer subscription hours & overage tracking',     hoursLabel: 'Plan Hours',    serviceLabel: 'Service',      accentColor: 'purple', tabColor: 'bg-purple-600' },
  vendor:           { title: 'Service Plans',          subtitle: 'Platform service hours & account balance',           hoursLabel: 'Support Hours', serviceLabel: 'Support',      accentColor: 'blue',   tabColor: 'bg-blue-600' },
  advertiser:       { title: 'Campaign Plans',         subtitle: 'Ad campaign hours & managed service usage',          hoursLabel: 'Managed Hours', serviceLabel: 'Campaign',     accentColor: 'pink',   tabColor: 'bg-pink-600' },
  subcontractor:    { title: 'Labor Plans',            subtitle: 'Contracted hours used, remaining & overages owed',   hoursLabel: 'Labor Hours',   serviceLabel: 'Labor',        accentColor: 'orange', tabColor: 'bg-orange-600' },
  customer:         { title: 'My Service Plan',        subtitle: 'Hours included, used & any balance owed',            hoursLabel: 'Service Hours', serviceLabel: 'Service',      accentColor: 'green',  tabColor: 'bg-green-600' },
  employee:         { title: 'Hour Banking',           subtitle: 'Banked hours, usage & payout balance',              hoursLabel: 'Banked Hours',  serviceLabel: 'Work',         accentColor: 'indigo', tabColor: 'bg-indigo-600' },
  investor:         { title: 'Management Fee Plans',   subtitle: 'Asset management hours & fee tracking',              hoursLabel: 'Mgmt Hours',    serviceLabel: 'Management',   accentColor: 'emerald',tabColor: 'bg-emerald-600' },
};

// ── Demo data generators ───────────────────────────────────────────────────────

function demoPlan(role: PortalRole): Plan[] {
  const base: Plan[] = [
    {
      id: 'plan-1',
      name: 'Basic Maintenance Plan',
      hoursIncluded: 20,
      hoursUsed: 14.5,
      overageRate: 85,
      monthlyFee: 299,
      billingCycle: 'monthly',
      status: 'active',
      renewsOn: '2026-08-01',
      property: role === 'landlord' ? 'Oak Street Duplex' : role === 'condo_manager' ? 'Harborview Condos' : role === 'property_manager' ? 'Sunset Towers' : undefined,
    },
    {
      id: 'plan-2',
      name: 'Pro Coverage Plan',
      hoursIncluded: 40,
      hoursUsed: 47,
      overageRate: 75,
      monthlyFee: 549,
      billingCycle: 'monthly',
      status: 'active',
      renewsOn: '2026-08-01',
      property: role === 'landlord' ? 'Maple Avenue Flats' : role === 'condo_manager' ? 'Sunset Towers' : role === 'property_manager' ? 'Harborview Condos' : undefined,
    },
  ];
  return base;
}

function demoUsage(planId: string): UsageEntry[] {
  return [
    { id: 'u1', date: '2026-06-28', description: 'HVAC filter replacement', hours: 2.0, tech: 'Mike T.', planId },
    { id: 'u2', date: '2026-06-25', description: 'Plumbing leak repair – Unit 305', hours: 3.5, tech: 'Carlos R.', planId },
    { id: 'u3', date: '2026-06-20', description: 'Electrical panel inspection', hours: 2.0, tech: 'James W.', planId },
    { id: 'u4', date: '2026-06-15', description: 'General handyman – doors & hardware', hours: 4.0, tech: 'Mike T.', planId },
    { id: 'u5', date: '2026-06-10', description: 'Roof drain cleaning', hours: 1.5, tech: 'Sarah L.', planId },
    { id: 'u6', date: '2026-06-05', description: 'Appliance repair – Unit 12A', hours: 1.5, tech: 'Carlos R.', planId },
  ];
}

function demoPayments(planId: string): Payment[] {
  return [
    { id: 'inv-1', date: '2026-07-01', description: 'Monthly plan fee – July', amount: 299, status: 'pending', planId },
    { id: 'inv-2', date: '2026-06-01', description: 'Monthly plan fee – June', amount: 299, status: 'paid', planId },
    { id: 'inv-3', date: '2026-06-01', description: 'Overage – 7h × $85', amount: 595, status: 'pending', planId },
    { id: 'inv-4', date: '2026-05-01', description: 'Monthly plan fee – May', amount: 299, status: 'paid', planId },
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(used: number, total: number) {
  return Math.min(100, Math.round((used / total) * 100));
}

function overageHours(p: Plan) {
  return Math.max(0, p.hoursUsed - p.hoursIncluded);
}

function overageOwed(p: Plan) {
  return overageHours(p) * p.overageRate;
}

function statusBadge(s: string) {
  if (s === 'active') return 'bg-green-500/20 text-green-400 border border-green-500/30';
  if (s === 'paused') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  if (s === 'cancelled') return 'bg-red-500/20 text-red-400 border border-red-500/30';
  if (s === 'paid') return 'bg-green-500/20 text-green-400 border border-green-500/30';
  if (s === 'pending') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  if (s === 'overdue') return 'bg-red-500/20 text-red-400 border border-red-500/30';
  return 'bg-gray-500/20 text-gray-400 border border-gray-500/20';
}

// ── Log Hours Modal ────────────────────────────────────────────────────────────

function LogHoursModal({ plan, onClose, onSave, cfg }: {
  plan: Plan;
  onClose: () => void;
  onSave: (entry: Omit<UsageEntry, 'id'>) => void | Promise<void>;
  cfg: typeof ROLE_CONFIG[PortalRole];
}) {
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState('');
  const [tech, setTech] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tierId, setTierId] = useState('');
  const [tierRate, setTierRate] = useState(0);

  async function submit() {
    if (!desc || !hours) { toast.error('Description and hours are required'); return; }
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) { toast.error('Enter a valid number of hours'); return; }
    await onSave({ date, description: desc, hours: h, tech, planId: plan.id, tierId, tierRate });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Log {cfg.hoursLabel}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-400">Plan: <span className="text-white font-medium">{plan.name}</span></p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description *</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              placeholder={`e.g. ${cfg.serviceLabel} work performed`}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Hours *</label>
              <input type="number" step="0.5" min="0.5" value={hours} onChange={e => setHours(e.target.value)}
                placeholder="2.5"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tech / Person</label>
              <input value={tech} onChange={e => setTech(e.target.value)}
                placeholder="Name"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
          </div>
        </div>
        {/* Tier selection */}
        <TierPicker
          value={tierId}
          onChange={(id, rate) => { setTierId(id); setTierRate(rate); }}
          hours={parseFloat(hours) || 0}
          label="Tech Experience Level"
          compact
        />

        {parseFloat(hours) > 0 && plan.hoursUsed + parseFloat(hours) > plan.hoursIncluded && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-300">
            ⚠ This will add <strong>{Math.max(0, plan.hoursUsed + parseFloat(hours) - plan.hoursIncluded).toFixed(1)}h</strong> of overage at <strong>${plan.overageRate}/hr</strong> = <strong>${(Math.max(0, plan.hoursUsed + parseFloat(hours) - plan.hoursIncluded) * plan.overageRate).toFixed(2)}</strong> extra
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={submit} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
            Log Hours
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-sm transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  portalRole: PortalRole;
  ownerName?: string;
}

// Map a tracker portal role to the plan record's portalType (territory has no
// plan portalType, so it's filtered by owner only).
const ROLE_TO_PORTAL: Partial<Record<PortalRole, string>> = {
  landlord: 'landlord', condo_manager: 'condo_manager', property_manager: 'property_manager',
  vendor: 'vendor', advertiser: 'advertiser', subcontractor: 'subcontractor',
  customer: 'customer', employee: 'employee', investor: 'investor',
};

export default function MaintenancePlanTracker({ portalRole, ownerName }: Props) {
  const cfg = ROLE_CONFIG[portalRole];
  const { user, isAdmin, isOwner } = useAuth();
  // Only company staff can reduce a plan's bank. The server independently enforces
  // this rule, and owners still see every live balance and invoice in this tracker.
  const metadataRole = String(user?.user_metadata?.role || user?.user_metadata?.accountType || '').toLowerCase();
  const canLogHours = isAdmin || isOwner || ['owner', 'admin', 'master_admin', 'management'].includes(metadataRole);
  // Start empty: this tracker must show persisted records, never sample balances.
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageEntry[]>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>(plans[0]?.id || '');
  const [showLogModal, setShowLogModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'usage' | 'payments' | null>('usage');
  // Ids of plans backed by the server (real, persisted) vs. local demo plans.
  const [serverPlanIds, setServerPlanIds] = useState<Set<string>>(new Set());

  // Pull real plans (built via the AI plan builder) and merge them in, polling so
  // hour usage stays in sync with the portal live panel and the command center.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params: { owner?: string; portalType?: string } = {};
        if (user?.email) params.owner = user.email;
        const pt = ROLE_TO_PORTAL[portalRole];
        if (pt) params.portalType = pt;
        const [sp, entitlementSummary] = await Promise.all([
          listPlans(params),
          loadEntitlementSummary(params).catch(() => null),
        ]);
        if (cancelled) return;
        const balanceByPlan = new Map((entitlementSummary?.plans || []).map((row: any) => [row.plan.id, row.balance]));
        const mapped: Plan[] = sp.map(p => {
          const balance = balanceByPlan.get(p.id);
          return ({
          id: p.id,
          name: p.planName || (p as any).name || 'Service Plan',
          hoursIncluded: Number(balance?.hoursGranted ?? p.hours?.included ?? 0),
          hoursUsed: Number(balance?.hoursUsed ?? p.hours?.used ?? 0),
          overageRate: p.hours?.overageRate || 95,
          monthlyFee: p.monthlyTotal,
          billingCycle: p.frequencyId === 'annual' ? 'annual' : 'monthly',
          status: (p.status as Plan['status']) || 'active',
          renewsOn: new Date(new Date(p.createdAt).getTime() + 30 * 864e5).toISOString().slice(0, 10),
          property: p.owner || undefined,
        });
        });

        setServerPlanIds(new Set(mapped.map(m => m.id)));
        setPlans(mapped);
        // Keep the portal ledger view durable across reloads: work entries and
        // invoice/payment status come from the same server read model as the balance.
        const rowsByPlan = new Map((entitlementSummary?.plans || []).map((row: any) => [row.plan.id, row]));
        setUsage(Object.fromEntries(mapped.map(m => [m.id, ((rowsByPlan.get(m.id)?.usageEntries || []) as any[]).map((entry: any) => ({ id: entry.id, date: entry.date || entry.createdAt, description: entry.description || entry.note || 'Service work', hours: Number(entry.hours || Math.abs(Number(entry.hoursDelta || 0))), tech: entry.tech || undefined, planId: m.id } as UsageEntry))])));
        setPayments(Object.fromEntries(mapped.map(m => [m.id, ((rowsByPlan.get(m.id)?.invoices || []) as any[]).map((invoice: any) => ({ id: invoice.id, date: invoice.paidAt || invoice.createdAt || invoice.date, description: invoice.description || `Invoice ${invoice.invoiceNumber || invoice.id}`, amount: Number(invoice.amountPaid ?? invoice.total ?? invoice.amount ?? 0), status: ['paid', 'completed'].includes(String(invoice.status || invoice.paymentStatus || '').toLowerCase()) ? 'paid' : ['overdue', 'past_due'].includes(String(invoice.status || invoice.paymentStatus || '').toLowerCase()) ? 'overdue' : 'pending', planId: m.id } as Payment))])));
        // If nothing meaningful is selected yet, focus the newest real plan.
        setSelectedPlan(cur => (cur && mapped.some(plan => plan.id === cur) ? cur : (mapped[0]?.id || '')));
      } catch (err) {
        console.error('[MaintenancePlanTracker] Failed to load server plans:', err);
        if (!cancelled) setLoadError('Could not load your plan records. Please refresh and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [portalRole, ownerName, user?.email]);

  const plan = plans.find(p => p.id === selectedPlan) || plans[0];
  if (!plan) return (
    <section className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 text-center">
      <Package className="mx-auto mb-3 h-8 w-8 text-orange-400" />
      <h2 className="text-lg font-semibold text-white">{cfg.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">{loading ? 'Loading your live plan balance…' : loadError || 'No active plan is assigned to this portal yet.'}</p>
      {!loading && <button onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-[#3A3A3A] px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-orange-500 hover:text-white">Refresh records</button>}
    </section>
  );

  const planUsage = usage[plan.id] || [];
  const planPayments = payments[plan.id] || [];
  const ovHours = overageHours(plan);
  const ovOwed = overageOwed(plan);
  const totalOwed = planPayments.filter(p => p.status !== 'paid').reduce((a, p) => a + p.amount, 0);
  const used = plan.hoursUsed;
  const remaining = Math.max(0, plan.hoursIncluded - used);
  const usedPct = pct(Math.min(used, plan.hoursIncluded), plan.hoursIncluded);
  const overLimit = used > plan.hoursIncluded;

  async function logHours(entry: Omit<UsageEntry, 'id'>) {
    if (!canLogHours) {
      toast.error('Only an authorized Black Phoenix administrator can record plan hours.');
      return;
    }
    if (!serverPlanIds.has(plan.id)) {
      toast.error('This plan is not connected to a saved account record.');
      return;
    }
    try {
      const hours = await logPlanUsage(plan.id, {
        hours: entry.hours, description: entry.description, tech: entry.tech, date: entry.date,
      });
      const id = `u${Date.now()}`;
      setUsage(prev => ({ ...prev, [plan.id]: [{ ...entry, id }, ...(prev[plan.id] || [])] }));
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, hoursIncluded: hours.included, hoursUsed: hours.used, overageRate: hours.overageRate } : p));
      toast.success('Hours were recorded to the shared plan ledger.');
    } catch (err) {
      console.error('[MaintenancePlanTracker] Failed to persist usage:', err);
      toast.error('Hours were not recorded. Please try again.');
    }
  }

  async function payInvoice(invoiceId: string, description: string) {
    try {
      const { checkoutUrl } = await createInvoiceCheckout(invoiceId, description);
      toast.success('Taking you to secure checkout…');
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      console.error('[MaintenancePlanTracker] Unable to start invoice checkout:', error);
      toast.error(error.message || 'Could not start secure checkout.');
    }
  }

  const accentMap: Record<string, string> = {
    teal: 'text-teal-400', cyan: 'text-cyan-400', amber: 'text-amber-400',
    purple: 'text-purple-400', blue: 'text-blue-400', pink: 'text-pink-400',
    orange: 'text-orange-400', green: 'text-green-400', indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
  };
  const accentBg: Record<string, string> = {
    teal: 'bg-teal-500/10 border-teal-500/20', cyan: 'bg-cyan-500/10 border-cyan-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20', purple: 'bg-purple-500/10 border-purple-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20', pink: 'bg-pink-500/10 border-pink-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20', green: 'bg-green-500/10 border-green-500/20',
    indigo: 'bg-indigo-500/10 border-indigo-500/20', emerald: 'bg-emerald-500/10 border-emerald-500/20',
  };
  const accent = accentMap[cfg.accentColor] || 'text-orange-400';
  const accentBorder = accentBg[cfg.accentColor] || 'bg-orange-500/10 border-orange-500/20';

  return (
    <div className="space-y-6">
      {showLogModal && (
        <LogHoursModal plan={plan} onClose={() => setShowLogModal(false)} onSave={logHours} cfg={cfg} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className={`w-5 h-5 ${accent}`} /> {cfg.title}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">{cfg.subtitle}</p>
        </div>
        {canLogHours ? (
          <button onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Log {cfg.hoursLabel}
          </button>
        ) : (
          <div className="max-w-xs rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-gray-400">
            Service hours are recorded by your assigned Black Phoenix team and update here automatically.
          </div>
        )}
      </div>

      {/* Plan selector (if multiple) */}
      {plans.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {plans.map(p => (
            <button key={p.id} onClick={() => setSelectedPlan(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                selectedPlan === p.id
                  ? `${cfg.tabColor} text-white border-transparent`
                  : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-white hover:border-gray-600'
              }`}>
              {p.property ? `${p.property}` : p.name}
            </button>
          ))}
        </div>
      )}

      {/* Plan summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hours used */}
        <div className={`bg-[#1A1A1A] rounded-xl border p-5 ${overLimit ? 'border-red-500/30' : 'border-[#2A2A2A]'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${overLimit ? 'bg-red-500/10 border border-red-500/20' : accentBorder + ' border'}`}>
            <Clock className={`w-5 h-5 ${overLimit ? 'text-red-400' : accent}`} />
          </div>
          <p className={`text-2xl font-bold ${overLimit ? 'text-red-400' : 'text-white'}`}>{used.toFixed(1)}h</p>
          <p className="text-xs text-gray-400 mt-0.5">{cfg.hoursLabel} Used</p>
          <p className="text-xs text-gray-600 mt-1">of {plan.hoursIncluded}h included</p>
        </div>

        {/* Hours remaining / overages */}
        <div className={`bg-[#1A1A1A] rounded-xl border p-5 ${overLimit ? 'border-red-500/30' : 'border-[#2A2A2A]'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${overLimit ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
            {overLimit
              ? <AlertTriangle className="w-5 h-5 text-red-400" />
              : <CheckCircle className="w-5 h-5 text-green-400" />}
          </div>
          {overLimit ? (
            <>
              <p className="text-2xl font-bold text-red-400">{ovHours.toFixed(1)}h</p>
              <p className="text-xs text-red-300 mt-0.5">Overage Hours</p>
              <p className="text-xs text-gray-600 mt-1">@ ${plan.overageRate}/hr</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-green-400">{remaining.toFixed(1)}h</p>
              <p className="text-xs text-gray-400 mt-0.5">Hours Remaining</p>
              <p className="text-xs text-gray-600 mt-1">in this period</p>
            </>
          )}
        </div>

        {/* Overage owed */}
        <div className={`bg-[#1A1A1A] rounded-xl border p-5 ${ovOwed > 0 ? 'border-yellow-500/30' : 'border-[#2A2A2A]'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${ovOwed > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-500/10 border border-gray-500/20'}`}>
            <DollarSign className={`w-5 h-5 ${ovOwed > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
          </div>
          <p className={`text-2xl font-bold ${ovOwed > 0 ? 'text-yellow-400' : 'text-white'}`}>
            ${ovOwed.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Overage Owed</p>
          <p className="text-xs text-gray-600 mt-1">{ovHours > 0 ? `${ovHours.toFixed(1)}h × $${plan.overageRate}` : 'No overages'}</p>
        </div>

        {/* Total balance due */}
        <div className={`bg-[#1A1A1A] rounded-xl border p-5 ${totalOwed > 0 ? 'border-orange-500/30' : 'border-[#2A2A2A]'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${totalOwed > 0 ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
            <CreditCard className={`w-5 h-5 ${totalOwed > 0 ? 'text-orange-400' : 'text-green-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${totalOwed > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            ${totalOwed.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Total Balance Due</p>
          <p className="text-xs text-gray-600 mt-1">{totalOwed > 0 ? 'Payment needed' : 'All paid up'}</p>
        </div>
      </div>

      {/* Hour gauge */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="font-semibold text-white text-sm">{plan.name}</p>
            {plan.property && <p className="text-xs text-gray-500 mt-0.5">{plan.property}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge(plan.status)}`}>
              {plan.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Renews {new Date(plan.renewsOn).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-5 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#2A2A2A] mb-2">
          {/* included portion */}
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-l-full ${overLimit ? 'bg-gradient-to-r from-orange-600 to-red-500' : `${cfg.tabColor}`}`}
            style={{ width: `${usedPct}%` }}
          />
          {/* overage bar (extends past the end) */}
          {overLimit && (
            <div className="absolute left-0 top-0 h-full w-full bg-red-500/20 rounded-full border-2 border-red-500/50" />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{used.toFixed(1)}h used</span>
          <span className={overLimit ? 'text-red-400 font-semibold' : ''}>
            {overLimit ? `${ovHours.toFixed(1)}h over limit` : `${remaining.toFixed(1)}h left`}
          </span>
          <span>{plan.hoursIncluded}h included</span>
        </div>

        {/* Plan fee info */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[#2A2A2A]">
          <div>
            <p className="text-xs text-gray-500">Monthly Fee</p>
            <p className="text-sm font-bold text-white mt-0.5">${plan.monthlyFee}/mo</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overage Rate</p>
            <p className="text-sm font-bold text-white mt-0.5">${plan.overageRate}/hr</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">This Period</p>
            <p className={`text-sm font-bold mt-0.5 ${ovOwed > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              ${(plan.monthlyFee + ovOwed).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Overage alert banner */}
      {overLimit && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">Plan Limit Exceeded</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              You've used <strong>{ovHours.toFixed(1)} overage hours</strong> at ${plan.overageRate}/hr.
              Additional charge of <strong>${ovOwed.toFixed(2)}</strong> will be added to your next invoice.
            </p>
          </div>
          <button className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 text-xs font-semibold rounded-lg transition flex-shrink-0">
            Upgrade Plan
          </button>
        </div>
      )}

      {/* Usage log */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'usage' ? null : 'usage')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#2A2A2A]/30 transition">
          <div className="flex items-center gap-2">
            <Wrench className={`w-4 h-4 ${accent}`} />
            <span className="font-semibold text-white text-sm">{cfg.serviceLabel} Usage Log</span>
            <span className="px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-gray-400">
              {planUsage.length} entries · {planUsage.reduce((a, u) => a + u.hours, 0).toFixed(1)}h total
            </span>
          </div>
          {expandedSection === 'usage' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expandedSection === 'usage' && (
          <div className="border-t border-[#2A2A2A]">
            {planUsage.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">No usage logged yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tech</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tier</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {planUsage.map((u, i) => (
                    <tr key={u.id} className={`border-b border-[#1A1A1A] hover:bg-[#0A0A0A]/50 transition ${i % 2 === 0 ? '' : 'bg-[#0A0A0A]/20'}`}>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(u.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-white">{u.description}</td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{u.tech || '—'}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {u.tierId ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                            u.tierId === 'A' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            u.tierId === 'B' ? 'bg-gray-400/20 text-gray-300 border-gray-400/30' :
                            u.tierId === 'C' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            'bg-green-500/20 text-green-300 border-green-500/30'
                          }`}>Tier {u.tierId}{u.tierRate ? ` · $${u.tierRate}/hr` : ''}</span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-white">{u.hours.toFixed(1)}h</td>
                      <td className="px-5 py-3 text-right text-gray-400 hidden md:table-cell">
                        {u.tierRate ? `$${(u.hours * (u.tierRate || 0)).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#0A0A0A] border-t border-[#2A2A2A]">
                    <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</td>
                    <td className={`px-5 py-3 text-right font-bold ${overLimit ? 'text-red-400' : accent}`}>
                      {planUsage.reduce((a, u) => a + u.hours, 0).toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* NH Compliance Callout — property roles only */}
      {(portalRole === 'landlord' || portalRole === 'condo_manager' || portalRole === 'property_manager') && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-300">NH Compliance Notice</p>
              <p className="text-xs text-violet-400/80 mt-1">
                {portalRole === 'landlord' && 'Under RSA 540, NH landlords must provide written notice before entering a rental unit and maintain habitable conditions. Your maintenance plan documents service history—keep records for all completed work per RSA 540:13-a.'}
                {portalRole === 'condo_manager' && 'NH RSA 356-B (Condominium Act) requires associations to maintain common areas in good repair. Log all service hours here to support reserve fund justification and board transparency requirements.'}
                {portalRole === 'property_manager' && 'NH property managers handling trust funds must comply with RSA 331-A. Your service hour logs provide the documentation trail required for owner reporting and licensed property management oversight.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payments / Invoices */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'payments' ? null : 'payments')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#2A2A2A]/30 transition">
          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 ${accent}`} />
            <span className="font-semibold text-white text-sm">Invoices & Payments</span>
            {totalOwed > 0 && (
              <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs text-orange-400 font-semibold">
                ${totalOwed.toFixed(2)} due
              </span>
            )}
          </div>
          {expandedSection === 'payments' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expandedSection === 'payments' && (
          <div className="border-t border-[#2A2A2A]">
            {planPayments.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-8">No invoices yet</p>
            ) : (
              <div className="divide-y divide-[#2A2A2A]">
                {planPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#0A0A0A]/50 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{p.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(p.date).toLocaleDateString()}</p>
                    </div>
                    <p className={`font-bold text-sm ${p.status === 'paid' ? 'text-green-400' : p.status === 'overdue' ? 'text-red-400' : 'text-yellow-400'}`}>
                      ${p.amount.toFixed(2)}
                    </p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                      {p.status.toUpperCase()}
                    </span>
                    {p.status !== 'paid' && (
                      <button onClick={() => void payInvoice(p.id, p.description)}
                        className="px-3 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs font-semibold rounded-lg transition border border-green-500/30">
                        Pay Securely
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {totalOwed > 0 && (
              <div className="px-5 py-4 bg-[#0A0A0A] border-t border-[#2A2A2A] flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-300">Total Balance Due</p>
                <p className="text-lg font-bold text-orange-400">${totalOwed.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Digital Add-ons — Marketplace products */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-[#2A2A2A]">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Digital Add-ons & Resources</p>
            <p className="text-xs text-gray-400">Included with your plan · Access instantly</p>
          </div>
          <button
            onClick={() => (window as any).__navigateApp?.('/property-ai-enterprise')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-semibold rounded-lg transition border border-violet-500/30">
            <ExternalLink className="w-3 h-3" /> Browse All
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* PropertyAI Enterprise */}
          <div className="bg-[#0A0A0A] border border-violet-500/20 rounded-xl p-4 hover:border-violet-500/40 transition group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">PropertyAI Enterprise</p>
                <p className="text-xs text-violet-400">AI-powered property tools</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {(portalRole === 'landlord'
                ? ['RSA 540 compliance checker', 'Lease clause analyzer', 'Rental pricing AI']
                : portalRole === 'condo_manager'
                ? ['RSA 356-B compliance tools', 'Reserve fund analyzer', 'Board meeting AI notes']
                : ['Multi-property dashboard', 'Revenue opportunity AI', '10-year capital planning']
              ).map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle className="w-3 h-3 text-violet-400 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => (window as any).__navigateApp?.('/property-ai-enterprise')}
              className="w-full py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-xs font-semibold rounded-lg transition border border-violet-500/30 group-hover:bg-violet-600/40">
              Open PropertyAI →
            </button>
          </div>

          {/* Knowledge Center */}
          <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Knowledge Center</p>
                <p className="text-xs text-blue-400">NH law library & templates</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {(portalRole === 'landlord'
                ? ['NH landlord law guides', 'Eviction process flowcharts', 'Security deposit rules']
                : portalRole === 'condo_manager'
                ? ['NH condo act summaries', 'Meeting procedure guides', 'Budget templates']
                : ['NH PM licensing guides', 'Owner report templates', 'Trust accounting guides']
              ).map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => (window as any).__navigateApp?.('/property-ai-enterprise')}
              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold rounded-lg transition border border-blue-500/30 group-hover:bg-blue-600/40">
              Open Knowledge Center →
            </button>
          </div>

          {/* Marketplace */}
          <div className="bg-[#0A0A0A] border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Marketplace</p>
                <p className="text-xs text-emerald-400">Ebooks, templates & calculators</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {(portalRole === 'landlord'
                ? ['NH Landlord Operations Manual', 'NH Lease Agreement Pack', 'Rental Pricing Calculator']
                : portalRole === 'condo_manager'
                ? ['Condo Board Handbook', 'Board Meeting Package', 'Reserve Fund Calculator']
                : ['Property Manager Pro Bundle', 'Vendor Contract Pack', 'Property ROI Calculator']
              ).map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                  <Star className="w-3 h-3 text-emerald-400 flex-shrink-0 fill-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => (window as any).__navigateApp?.('/property-ai-enterprise')}
              className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-semibold rounded-lg transition border border-emerald-500/30 group-hover:bg-emerald-600/40">
              Browse Marketplace →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
