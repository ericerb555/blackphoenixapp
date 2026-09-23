/**
 * OnCallEmergencyPortal — the calls that have actually come in.
 *
 * WHAT THIS REPLACED
 *
 * Six invented emergencies with made-up names and phone numbers, a Demo Mode
 * banner, and buttons that only spoke: "Take Call" showed a toast and assigned
 * nothing, "Details" opened nothing, and "Send to Phoenix Exchange" pushed the
 * job into `localStorage['bidRoomJobs']` — a key nothing in this codebase has
 * ever read — and then said it had sent successfully.
 *
 * The design is kept. Repairing the screen that exists beats adding a second
 * one beside it, and the trade colours, the severity chips and the card layout
 * were never the problem: the data behind them was.
 *
 * WHAT IT SHOWS NOW
 *
 * Calls opened by the routing when an urgent work request arrives. Each one
 * carries the decision that was made and the reason for it, because the first
 * question anybody asks about an emergency afterwards is why it went where it
 * went. The first person on the rota is shown with their number, since the
 * useful thing on this screen at three in the morning is who to ring.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Phone, Clock, AlertTriangle, Users, MapPin, CheckCircle2,
  User, Zap, Wrench, Droplet, Flame, LoaderCircle,
  Search, ArrowRight, Gavel, Send, ShieldCheck, Share2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import { projectId } from '../../utils/supabase/info';
import { authedHeaders } from '../../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// Trade color configurations
const tradeColors = {
  'Plumbing': {
    primary: 'from-blue-600 to-cyan-600',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    hover: 'hover:border-blue-400 hover:shadow-blue-500/50',
    icon: Droplet
  },
  'Electrical': {
    primary: 'from-yellow-600 to-orange-600',
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    hover: 'hover:border-yellow-400 hover:shadow-yellow-500/50',
    icon: Zap
  },
  'HVAC': {
    primary: 'from-purple-600 to-pink-600',
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    hover: 'hover:border-purple-400 hover:shadow-purple-500/50',
    icon: Flame
  },
  'General Maintenance': {
    primary: 'from-green-600 to-emerald-600',
    border: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    hover: 'hover:border-green-400 hover:shadow-green-500/50',
    icon: Wrench
  },
  'Emergency Lockout': {
    primary: 'from-red-600 to-rose-600',
    border: 'border-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    hover: 'hover:border-red-400 hover:shadow-red-500/50',
    icon: AlertTriangle
  },
  'Structural': {
    primary: 'from-orange-600 to-amber-600',
    border: 'border-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    hover: 'hover:border-orange-400 hover:shadow-orange-500/50',
    icon: AlertTriangle
  }
};

// Severity configurations
const severityConfig = {
  critical: { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  high: { label: 'HIGH', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  medium: { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  low: { label: 'LOW', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' }
};

type Severity = keyof typeof severityConfig;

interface Call {
  id: string;
  jobId: string | null;
  workRequestId: string | null;
  accountEmail: string;
  reportedBy: string;
  trade: string;
  title: string;
  siteAddress: string;
  plan: any;
  outcome: string;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  takenBy?: string;
  bidRequestId?: string | null;
  firstRefusalUntil?: string | null;
}

/**
 * A free-text trade onto one of the six colour schemes.
 *
 * The trade is whatever the person reporting it typed, so it is matched by
 * substring rather than looked up. Anything unrecognised is general
 * maintenance, which is a colour rather than a claim about the work.
 */
function tradeKeyFor(trade: string): keyof typeof tradeColors {
  const t = String(trade || '').toLowerCase();
  if (/plumb|drain|pipe|water|leak/.test(t)) return 'Plumbing';
  if (/electric|power|wiring|outlet/.test(t)) return 'Electrical';
  if (/hvac|heat|boiler|furnace|cool|air/.test(t)) return 'HVAC';
  if (/lock|door|entry|key/.test(t)) return 'Emergency Lockout';
  if (/structur|roof|ceiling|wall|collapse/.test(t)) return 'Structural';
  return 'General Maintenance';
}

/**
 * How loud this call should look, from where the routing sent it.
 *
 * `nobody` is critical by definition: it means the emergency reached no one,
 * and it is the single state on this screen that must not look like the others.
 */
function severityFor(call: Call): Severity {
  switch (call.outcome) {
    case 'nobody': return 'critical';
    case 'escalate': return 'high';
    case 'rota': return 'medium';
    case 'contracted': return 'medium';
    case 'office-hours': return 'low';
    default: return 'high';
  }
}

const clock = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function OnCallEmergencyPortal() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showBidRoomModal, setShowBidRoomModal] = useState(false);
  const [selectedCallForBid, setSelectedCallForBid] = useState<Call | null>(null);
  const [details, setDetails] = useState<Call | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/on-call-calls`, { headers: await authedHeaders() });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not load the call log.');
      setCalls(Array.isArray(payload.calls) ? payload.calls : []);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load the call log.');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Somebody has it. Recorded, not announced. */
  const takeCall = async (call: Call) => {
    setBusyId(call.id);
    try {
      const res = await fetch(`${SERVER}/on-call-calls/${encodeURIComponent(call.id)}/take`, {
        method: 'POST', headers: await authedHeaders(),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not take that call.');
      setCalls(prev => prev.map(c => (c.id === call.id ? payload.call : c)));
      toast.success('You have this call.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not take that call.');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Put it out to the exchange, for real.
   *
   * The server refuses a call held by an exclusive contract and one that came
   * in during working hours — both decided by the routing rather than here, so
   * the two cannot disagree. Its refusal is shown as written, because "that
   * contractor holds an exclusive agreement" is something the person pressing
   * the button needs to read rather than a generic failure.
   */
  const confirmSendToExchange = async () => {
    if (!selectedCallForBid) return;
    setBusyId(selectedCallForBid.id);
    try {
      const res = await fetch(
        `${SERVER}/on-call-calls/${encodeURIComponent(selectedCallForBid.id)}/to-exchange`,
        { method: 'POST', headers: await authedHeaders() },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Could not post that to the exchange.');
      setCalls(prev => prev.map(c => (c.id === selectedCallForBid.id ? payload.call : c)));
      toast.success('Posted to Phoenix Exchange.', {
        description: payload.firstRefusalUntil
          ? `Black Phoenix has it until ${clock(payload.firstRefusalUntil)}, then it opens to subscribers.`
          : 'Subscribed contractors can bid now.',
      });
      setShowBidRoomModal(false);
      setSelectedCallForBid(null);
    } catch (e: any) {
      toast.error(e?.message || 'Could not post that to the exchange.', { duration: 9000 });
    } finally {
      setBusyId(null);
    }
  };

  const filteredCalls = useMemo(() => calls.filter(call => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || String(call.title || '').toLowerCase().includes(q)
      || String(call.accountEmail || '').toLowerCase().includes(q)
      || String(call.siteAddress || '').toLowerCase().includes(q)
      || String(call.id || '').toLowerCase().includes(q);
    const matchesCategory = filterCategory === 'all' || tradeKeyFor(call.trade) === filterCategory;
    return matchesSearch && matchesCategory;
  }), [calls, searchQuery, filterCategory]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(calls.map(c => tradeKeyFor(c.trade))))],
    [calls],
  );

  const open = calls.filter(c => c.status === 'open');
  const answered = calls.filter(c => c.status === 'answered');
  const unreached = calls.filter(c => c.outcome === 'nobody' && c.status !== 'closed');

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">24/7 On-Call Emergency Portal</h1>
              <p className="text-gray-400">
                Every urgent request that has come in, and where it was sent.
              </p>
            </div>
            <button
              onClick={() => void load()}
              className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500 text-white rounded-xl font-bold transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>

          {/* The one state that must not look like the others. */}
          {unreached.length > 0 && (
            <div className="mb-6 rounded-xl border-2 border-red-500/40 bg-red-500/10 p-4">
              <p className="flex items-center gap-2 font-bold text-red-400">
                <AlertTriangle className="w-5 h-5" />
                {unreached.length} {unreached.length === 1 ? 'call' : 'calls'} reached nobody
              </p>
              <p className="mt-1 text-sm text-red-200/90">
                No rota answered and no escalation was set. These need a person now.
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Open</p>
                  <p className="text-3xl font-bold text-white">{open.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Taken</p>
                  <p className="text-3xl font-bold text-white">{answered.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">On the exchange</p>
                  <p className="text-3xl font-bold text-white">{calls.filter(c => c.bidRequestId).length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Reached nobody</p>
                  <p className={`text-3xl font-bold ${unreached.length ? 'text-red-400' : 'text-white'}`}>
                    {unreached.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by account, address, title, or call ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    filterCategory === cat
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Trades' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Calls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCalls.map((call) => {
            const tradeConfig = tradeColors[tradeKeyFor(call.trade)];
            const severity = severityConfig[severityFor(call)];
            const TradeIcon = tradeConfig.icon;
            const firstUp = call.plan?.steps?.[0]?.contacts?.[0] || null;

            return (
              <div
                key={call.id}
                className={`group relative bg-[#1A1A1A] border-2 ${tradeConfig.border} rounded-2xl p-6 transition-all duration-300 ${tradeConfig.hover} hover:shadow-2xl`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${tradeConfig.primary} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300 pointer-events-none`} />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${tradeConfig.primary} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <TradeIcon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{call.title}</h3>
                        <p className={`text-sm font-semibold ${tradeConfig.text}`}>
                          {call.trade || 'Unspecified trade'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg ${severity.bg} ${severity.border} border`}>
                      <span className={`text-xs font-bold ${severity.color}`}>{severity.label}</span>
                    </div>
                  </div>

                  {/* What the routing decided, and why */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2 text-gray-300">
                      <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{call.plan?.reason || 'No routing recorded.'}</span>
                    </div>

                    {/* The useful thing at three in the morning: who to ring. */}
                    {firstUp && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{firstUp.name}</span>
                        {firstUp.phone && (
                          <>
                            <span className="text-gray-600">•</span>
                            <Phone className="w-4 h-4 text-gray-500" />
                            <a href={`tel:${firstUp.phone}`} className={`text-sm font-semibold ${tradeConfig.text} hover:underline`}>
                              {firstUp.phone}
                            </a>
                          </>
                        )}
                      </div>
                    )}

                    {call.siteAddress && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{call.siteAddress}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Came in at {clock(call.createdAt)}</span>
                      {call.plan?.rotaMinutes > 0 && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-sm">Rota runs {call.plan.rotaMinutes} min</span>
                        </>
                      )}
                      {call.jobId && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="font-mono text-xs text-gray-500">{call.jobId}</span>
                        </>
                      )}
                    </div>

                    {call.takenBy && (
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-lg ${tradeConfig.bg} ${tradeConfig.border} border`}>
                          <span className={`text-xs font-semibold ${tradeConfig.text}`}>
                            Taken by: {call.takenBy}
                          </span>
                        </div>
                      </div>
                    )}

                    {call.bidRequestId && (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <span className="text-xs font-semibold text-purple-400 inline-flex items-center gap-1.5">
                            <Share2 className="w-3 h-3" /> On Phoenix Exchange
                          </span>
                        </div>
                      </div>
                    )}

                    {call.outcome === 'contracted' && (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/30">
                          <span className="text-xs font-semibold text-green-400 inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" /> Held under contract
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        call.status === 'open' ? 'bg-orange-400 animate-pulse' :
                        call.status === 'answered' ? 'bg-blue-400' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-sm text-gray-400 capitalize">{call.status}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    {call.status === 'open' && (
                      <button
                        onClick={() => void takeCall(call)}
                        disabled={busyId === call.id}
                        className={`flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 ${tradeConfig.border} ${tradeConfig.text} rounded-xl font-bold transition-all duration-300 ${tradeConfig.hover} hover:shadow-xl hover:scale-105 disabled:opacity-50`}
                      >
                        {busyId === call.id
                          ? <LoaderCircle className="w-5 h-5 animate-spin" />
                          : <CheckCircle2 className="w-5 h-5" />}
                        Take Call
                      </button>
                    )}
                    {/* Not offered where the routing has already said no — an
                        exclusive contract, or an ordinary in-hours request. */}
                    {!call.bidRequestId && call.outcome !== 'contracted' && call.outcome !== 'office-hours' && (
                      <button
                        onClick={() => { setSelectedCallForBid(call); setShowBidRoomModal(true); }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 border-purple-500 text-purple-400 rounded-xl font-bold transition-all duration-300 hover:border-purple-400 hover:shadow-purple-500/50 hover:shadow-xl hover:scale-105"
                      >
                        <Gavel className="w-5 h-5" />
                        Send to Phoenix Exchange
                      </button>
                    )}
                    <button
                      onClick={() => setDetails(call)}
                      className="col-span-2 flex items-center justify-center gap-2 px-6 py-3 bg-[#0A0A0A] border-2 border-[#2A2A2A] text-white rounded-xl font-bold hover:border-orange-500 hover:shadow-orange-500/50 hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      Details
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty States */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <LoaderCircle className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading the call log…
          </div>
        ) : filteredCalls.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {calls.length === 0 ? 'No emergency calls' : 'No calls match that'}
            </h3>
            <p className="text-gray-400">
              {calls.length === 0
                ? 'A call opens here the moment an urgent work request comes in from any portal.'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        )}
      </div>

      {/* Details */}
      {details && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetails(null)}>
          <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{details.title}</h2>
                <p className="font-mono text-xs text-gray-500 mt-1">{details.id}</p>
              </div>
              <button
                onClick={() => setDetails(null)}
                className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-red-500 transition-all"
              >
                ×
              </button>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 mb-4 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Where it went, and why</p>
                <p className="text-white">{details.plan?.reason || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Account</p>
                  <p className="text-white break-all">{details.accountEmail || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Reported by</p>
                  <p className="text-white break-all">{details.reportedBy || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Job</p>
                  <p className="font-mono text-sm text-white">{details.jobId || 'none'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Service</p>
                  <p className="text-white">{details.plan?.service?.name || 'none matched'}</p>
                </div>
              </div>
            </div>

            {/* The rota, in the order it would be rung */}
            {Array.isArray(details.plan?.steps) && details.plan.steps.length > 0 && (
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 mb-4">
                <p className="text-sm text-gray-400 mb-3">Who is called, in order</p>
                <div className="space-y-2">
                  {details.plan.steps.map((step: any, i: number) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-gray-500 font-mono text-xs">{i + 1}</span>
                      {(step.contacts || []).map((c: any) => (
                        <span key={c.id} className="rounded-lg border border-[#2A2A2A] px-2.5 py-1 text-white">
                          {c.name}{c.phone ? ` · ${c.phone}` : ''}
                        </span>
                      ))}
                      <span className="text-gray-500">wait {step.waitMinutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What it costs, from the account's own rates */}
            {details.plan?.charges?.lines?.length > 0 && (
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                <p className="text-sm text-gray-400 mb-3">Callout charges</p>
                {details.plan.charges.lines.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-gray-300">
                    <span>{l.label}</span>
                    <span>${(l.cents / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-[#2A2A2A] pt-2 font-bold text-white">
                  <span>Total</span>
                  <span>${(details.plan.charges.total / 100).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send to Phoenix Exchange */}
      {showBidRoomModal && selectedCallForBid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border-2 border-purple-500/30 rounded-2xl max-w-2xl w-full p-8 shadow-2xl shadow-purple-500/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Send to Phoenix Exchange</h2>
                  <p className="text-sm text-gray-400">Open this call for contractor bidding</p>
                </div>
              </div>
              <button
                onClick={() => setShowBidRoomModal(false)}
                className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-red-500 transition-all"
              >
                ×
              </button>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Call</p>
                  <p className="text-lg font-semibold text-white">{selectedCallForBid.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Trade</p>
                  <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30">
                    {selectedCallForBid.trade || 'Unspecified'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Routing</p>
                  <p className="text-white">{selectedCallForBid.plan?.reason || '—'}</p>
                </div>
                {selectedCallForBid.siteAddress && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Location</p>
                    <p className="text-white">{selectedCallForBid.siteAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* What actually happens, rather than what sounded good. */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Send className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold mb-1">What happens next?</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• A real bid request is created on Phoenix Exchange, marked as an emergency</li>
                    <li>• Black Phoenix holds first refusal for 15 minutes</li>
                    <li>• After that, subscribed contractors can bid</li>
                    <li>• Contractors you already have under contract are invited by name</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowBidRoomModal(false)}
                className="flex-1 px-6 py-3 bg-[#0A0A0A] border-2 border-[#2A2A2A] text-white rounded-xl font-bold hover:border-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmSendToExchange()}
                disabled={busyId === selectedCallForBid.id}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-105 disabled:opacity-50"
              >
                {busyId === selectedCallForBid.id ? 'Posting…' : 'Confirm & Send to Phoenix Exchange'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
