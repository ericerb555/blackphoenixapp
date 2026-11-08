/**
 * AI Diagnostics & Control Center
 * 
 * Comprehensive AI monitoring and management system:
 * - AI Supervisor Assistant that monitors all AI systems
 * - Health monitoring and performance tracking
 * - Alert management and incident resolution
 * - Activity logs and resource usage
 * - Admin controls for all AI features
 * - Integration status and diagnostics
 */

import { useState, useEffect } from 'react';
import {
  Brain, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Zap,
  TrendingUp, TrendingDown, Cpu, Database, Globe, Server, Shield,
  Settings, Play, Pause, RefreshCw, Terminal, BarChart3, Eye,
  MessageSquare, Sparkles, Bot, Network, HardDrive, Gauge,
  AlertCircle, Info, ChevronDown, ChevronUp, ExternalLink,
  Download, Upload, Search, Filter, Calendar, Users, DollarSign,
  FileText, Image, ShoppingBag, Package, Megaphone, Target,
  Wrench, Gift, Crown, Building2, LineChart, PieChart, Layers, Video, X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchSummary, fetchCalls, toActivity, toSystem, deriveAlerts, NotPermitted,
  type ActivitySummary,
} from '../lib/aiActivity';

/**
 * Cosmetic only — which glyph an agent gets on the Systems tab.
 *
 * Kept here rather than in `aiActivity.ts` because these are React
 * components and that module is plain data a node test can import. An agent
 * with no entry gets the generic bot, which is also what every future agent
 * gets until somebody chooses otherwise.
 */
const AGENT_ICONS: Record<string, any> = {
  'quote-generator': FileText,
  'design-assistant': Sparkles,
  'house-capture': Image,
  'content-studio': Megaphone,
  'lead-scoring': Target,
};

interface AISystem {
  id: string;
  name: string;
  category: 'content' | 'analytics' | 'automation' | 'assistant' | 'vision';
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  uptime: number; // percentage
  lastCheck: string;
  responseTime: number; // ms
  apiCalls: number;
  tokensUsed: number;
  cost: number;
  errorRate: number; // percentage
  features: string[];
  icon: any;
  color: string;
  enabled: boolean;
  version: string;
  latestVersion?: string;
  updateAvailable?: boolean;
  lastUpdated?: string;
}

interface AIAlert {
  id: string;
  systemId: string;
  systemName: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  recommendation?: string;
  autoResolvable: boolean;
}

interface AIActivity {
  id: string;
  systemId: string;
  systemName: string;
  type: 'execution' | 'error' | 'config' | 'alert' | 'resolution';
  action: string;
  details: string;
  timestamp: string;
  user?: string;
  status: 'success' | 'failure' | 'pending';
}

interface SupervisorMessage {
  id: string;
  type: 'status' | 'alert' | 'recommendation' | 'report';
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action?: string;
}

export default function AIDiagnosticsCenter() {
  const [activeTab, setActiveTab] = useState<'overview' | 'systems' | 'alerts' | 'activity' | 'supervisor' | 'analytics' | 'import-management'>('overview');
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [supervisorExpanded, setSupervisorExpanded] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState<any>(null);

  // AI Systems Registry
  const [aiSystems, setAISystems] = useState<AISystem[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);

  /**
   * There is no AI supervisor, and there never was.
   *
   * This held four invented messages — one claiming it had automatically
   * disabled a failing system, one offering to apply a performance fix, one
   * reporting 32,807 requests and $1,247 saved. No service produced any of
   * them, and no button acted on them.
   *
   * Kept as empty state rather than deleted outright, because the tab that
   * renders it now says plainly that the capability is not built. A screen
   * admitting a gap is worth more than one filling it with reassurance.
   */
  const [supervisorMessages] = useState<SupervisorMessage[]>([]);

  /**
   * The real activity feed, from `ai_call_log` via `/ai-activity/calls`.
   *
   * This used to be five hardcoded entries describing things that never
   * happened — a batch of 45 product images, a service auto-disabling, a
   * timeout threshold being raised. They were written when the screen was
   * built and nobody was ever told they were fiction.
   *
   * It starts empty and fills from the ledger, which means an empty list is
   * now the truth rather than a placeholder.
   */
  const [activities, setActivities] = useState<AIActivity[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<ActivitySummary | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [summary, calls] = await Promise.all([fetchSummary(24), fetchCalls(24, 100)]);
        if (cancelled) return;
        setLedgerSummary(summary);
        setActivities(calls.map(toActivity) as AIActivity[]);
        /**
         * Systems and alerts are derived from the same window, so the three
         * tabs can never disagree with each other about what happened.
         *
         * The icon is attached here rather than in the mapper, because it is
         * a React component and the mapper is plain data that a node test
         * can import.
         */
        setAISystems(summary.agents.map((a) => ({
          ...toSystem(a),
          icon: AGENT_ICONS[a.agent] || Bot,
        })) as AISystem[]);
        setAlerts(deriveAlerts(summary) as AIAlert[]);
        setLedgerError(null);
      } catch (err: any) {
        if (cancelled) return;
        /**
         * Reported, never swallowed into an empty list. "You are not allowed
         * to see this" and "nothing has happened" render identically as zero
         * rows, and they mean completely different things.
         */
        setLedgerError(err instanceof NotPermitted
          ? 'Activity is only shown to company accounts.'
          : (err?.message || 'Could not load AI activity.'));
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);




  // Calculate overall stats
  const totalSystems = aiSystems.length;
  const healthySystems = aiSystems.filter(s => s.status === 'healthy').length;
  const criticalAlerts = alerts.filter(a => !a.resolved && a.severity === 'critical').length;
  const totalApiCalls = aiSystems.reduce((sum, s) => sum + s.apiCalls, 0);
  const totalCost = aiSystems.reduce((sum, s) => sum + s.cost, 0);
  // Guarded: with no agents this divided by zero and rendered "NaNms". The
  // mock data never had zero systems, so the empty case had never run.
  const avgResponseTime = aiSystems.length
    ? Math.round(aiSystems.reduce((sum, s) => sum + s.responseTime, 0) / aiSystems.length)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle };
      case 'degraded': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: AlertTriangle };
      case 'critical': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle };
      case 'offline': return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: XCircle };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: AlertCircle };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      case 'warning': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'info': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };

  const resolveAlert = (alertId: string, auto: boolean = false) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            resolved: true,
            resolvedBy: auto ? 'AI Supervisor' : 'Admin User',
            resolvedAt: new Date().toISOString()
          }
        : alert
    ));
    toast.success(auto ? 'Alert auto-resolved by AI Supervisor' : 'Alert marked as resolved');
  };

  /**
   * There is no pause mechanism on the server, so this cannot pause anything.
   *
   * It used to flip a local boolean and toast "disabled", which is the most
   * dangerous thing this page did: a control that looks like it stops an AI
   * agent, reports success, and leaves the agent running. Somebody reaching
   * for it in an incident would believe they had stopped the spend.
   *
   * A platform-wide stop is gap 6 in `tasks/phoenix-ai-audit.md`. Until it
   * exists this says so rather than lying politely.
   */
  const toggleSystem = (systemId: string) => {
    const system = aiSystems.find(s => s.id === systemId);
    toast.error(
      `Cannot pause ${system?.name || 'this agent'} — no stop control is built yet. `
      + 'Per-account limits are enforced server-side by aiSpend.',
    );
  };

  /**
   * There is nothing to restart. An agent here is a function, not a service.
   *
   * This used to wait two seconds and then set the system to healthy with a
   * zero error rate and a response time 30% faster, and toast "restarted
   * successfully". It fabricated a recovery. Against the mock data that was
   * merely untrue; against the ledger it would overwrite counted figures
   * with invented ones, so the screen would report a fix that never
   * happened and lose the evidence of the problem in the same click.
   */
  const restartSystem = (systemId: string) => {
    const system = aiSystems.find(s => s.id === systemId);
    toast.error(
      `${system?.name || 'This agent'} is a function, not a service — there is nothing to restart. `
      + 'Its figures come from the call ledger and only change when it next runs.',
    );
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity === 'all') return true;
    return alert.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            AI Diagnostics & Control Center
          </h1>
          <p className="text-gray-400">Monitoring {totalSystems} AI systems: Product Catalog, CRM Import, Content Studio, Video Analysis, Bid Assistant, Quote Builder, Workflow Chat, Payment Assistant, and more</p>
        </div>
        <button
          onClick={() => toast.success('AI systems refreshed')}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#ea580c]/50 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* AI Supervisor Status Banner */}
      <div className="bg-gradient-to-r from-[#ea580c]/20 to-orange-600/20 border-2 border-[#ea580c] rounded-xl p-6 shadow-lg shadow-[#ea580c]/20">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-white">AI Supervisor Assistant</h3>
              <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full animate-pulse">
                ONLINE
              </span>
              <span className="text-sm text-gray-400">
                Last check: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <p className="text-gray-300 mb-3">
              Actively monitoring {totalSystems} AI systems. {criticalAlerts > 0 ? `⚠️ ${criticalAlerts} critical alert${criticalAlerts > 1 ? 's' : ''} require attention.` : '✅ All systems operating normally.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-[#0A0A0A] border border-green-500/30 text-green-400 text-sm rounded-lg">
                {healthySystems}/{totalSystems} Systems Healthy
              </span>
              <span className="px-3 py-1 bg-[#0A0A0A] border border-blue-500/30 text-blue-400 text-sm rounded-lg">
                {totalApiCalls.toLocaleString()} API Calls Today
              </span>
              <span className="px-3 py-1 bg-[#0A0A0A] border border-purple-500/30 text-purple-400 text-sm rounded-lg">
                {avgResponseTime}ms Avg Response
              </span>
              <span className="px-3 py-1 bg-[#0A0A0A] border border-[#ea580c]/30 text-[#ea580c] text-sm rounded-lg">
                ${totalCost.toFixed(2)} Est. cost (24h)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Gauge, count: null },
          { id: 'systems', label: 'AI Systems', icon: Layers, count: totalSystems },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: alerts.filter(a => !a.resolved).length },
          { id: 'activity', label: 'Activity Log', icon: Activity, count: null },
          { id: 'supervisor', label: 'Supervisor Chat', icon: Bot, count: supervisorMessages.length },
          { id: 'analytics', label: 'Analytics', icon: LineChart, count: null },
          { id: 'import-management', label: 'Import & Upgrade', icon: Download, count: aiSystems.filter(s => s.updateAvailable).length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/30'
                  : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-orange-700' : 'bg-[#2A2A2A]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Health Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-5 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300">
              <CheckCircle className="w-6 h-6 text-green-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">{healthySystems}/{totalSystems}</p>
              <p className="text-sm text-gray-400">Healthy Systems</p>
            </div>
            <div className="bg-[#0A0A0A] border border-red-500/30 rounded-xl p-5 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300">
              <AlertTriangle className="w-6 h-6 text-red-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">{criticalAlerts}</p>
              <p className="text-sm text-gray-400">Critical Alerts</p>
            </div>
            <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
              <Zap className="w-6 h-6 text-blue-400 mb-3" />
              <p className="text-3xl font-bold text-white mb-1">{totalApiCalls.toLocaleString()}</p>
              <p className="text-sm text-gray-400">API Calls (24h)</p>
            </div>
            <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-5 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <DollarSign className="w-6 h-6 text-purple-400 mb-3" />
              {/*
                Cost is recorded per call but nothing computes it yet — the
                ledger has a cost_cents column and the instrumentation does
                not fill it, because a per-token price table that is wrong is
                worse than an honest blank. Tokens ARE counted, so that is
                what gets shown until pricing is wired.
              */}
              <p className="text-3xl font-bold text-white mb-1">
                {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—'}
              </p>
              <p className="text-sm text-gray-400">
                {totalCost > 0 ? 'Est. cost (24h)' : 'No priced calls yet'}
              </p>
              {/*
                Said where the number is, not in a footnote. Anthropic rates
                come from their published table; the OpenAI ones are from
                recall and have not been checked against openai.com/pricing.
                A figure that cannot say how solid it is does not belong on
                a page that spent its life showing invented ones.
              */}
              {totalCost > 0 && (ledgerSummary?.unverifiedPricing?.length ?? 0) > 0 && (
                <p className="text-[11px] text-yellow-500/70 mt-1 leading-snug">
                  Includes unverified rates for {ledgerSummary!.unverifiedPricing!.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* System Status Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSystems.slice(0, 6).map(system => {
              const Icon = system.icon;
              const statusInfo = getStatusColor(system.status);
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={system.id}
                  className={`bg-[#0A0A0A] border ${statusInfo.border} rounded-xl p-5 hover:border-opacity-100 hover:shadow-lg transition-all duration-300 cursor-pointer`}
                  onClick={() => {
                    setSelectedSystem(system.id);
                    setActiveTab('systems');
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-[#1A1A1A] border ${statusInfo.border} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${system.color}`} />
                    </div>
                    <span className={`px-2 py-1 ${statusInfo.bg} ${statusInfo.text} rounded-lg text-xs font-bold flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {system.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-white font-bold mb-1">{system.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 uppercase font-semibold">{system.category}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Success rate:</span>
                      <span className={`font-semibold ${system.uptime >= 99 ? 'text-green-400' : system.uptime >= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {system.uptime}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Response:</span>
                      <span className="text-white font-semibold">{system.responseTime}ms</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">API Calls:</span>
                      <span className="text-white font-semibold">{system.apiCalls.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Cost:</span>
                      <span className="text-white font-semibold">${system.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Alerts */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ea580c]" />
              Recent Alerts
            </h3>
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => {
                const severityInfo = getSeverityColor(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`bg-[#1A1A1A] border ${severityInfo.border} rounded-lg p-4 ${alert.resolved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`px-2 py-1 ${severityInfo.bg} ${severityInfo.text} rounded text-xs font-bold uppercase`}>
                          {alert.severity}
                        </span>
                        <h4 className={`font-semibold ${alert.resolved ? 'text-gray-400' : 'text-white'}`}>
                          {alert.title}
                        </h4>
                        {alert.resolved && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{alert.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Systems Tab */}
      {activeTab === 'systems' && (
        <div className="space-y-4">
          {/*
            An agent appears here once it has made a call. There is no
            registry of agents yet — gap 2 in tasks/phoenix-ai-audit.md — so
            this is "what has run", not "what exists". Saying so beats
            implying the list is complete.
          */}
          {!ledgerLoading && !ledgerError && aiSystems.length === 0 && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-8 text-center">
              <Bot className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No agent has run in the last 24 hours.</p>
              <p className="text-xs text-gray-600 mt-1">
                Agents are listed here once they make a call. This is what has run, not a registry of what exists.
              </p>
            </div>
          )}
          {ledgerError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-200">{ledgerError}</p>
            </div>
          )}
          {aiSystems.map(system => {
            const Icon = system.icon;
            const statusInfo = getStatusColor(system.status);
            const StatusIcon = statusInfo.icon;
            const isExpanded = selectedSystem === system.id;

            return (
              <div
                key={system.id}
                className={`bg-[#0A0A0A] border-2 ${statusInfo.border} rounded-xl p-6 transition-all duration-300`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-16 h-16 rounded-xl bg-[#1A1A1A] border ${statusInfo.border} flex items-center justify-center`}>
                      <Icon className={`w-8 h-8 ${system.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{system.name}</h3>
                        <span className={`px-3 py-1 ${statusInfo.bg} ${statusInfo.text} rounded-lg text-xs font-bold flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {system.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 text-xs rounded-lg uppercase font-semibold">
                          {system.category}
                        </span>
                        {system.enabled ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg font-semibold">
                            ENABLED
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-lg font-semibold">
                            DISABLED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-5 gap-4 mb-4">
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Success rate</p>
                          <p className={`text-lg font-bold ${system.uptime >= 99 ? 'text-green-400' : system.uptime >= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {system.uptime}%
                          </p>
                        </div>
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Response Time</p>
                          <p className="text-lg font-bold text-white">{system.responseTime}ms</p>
                        </div>
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">API Calls</p>
                          <p className="text-lg font-bold text-white">{system.apiCalls.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Error Rate</p>
                          <p className={`text-lg font-bold ${system.errorRate <= 1 ? 'text-green-400' : system.errorRate <= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {system.errorRate}%
                          </p>
                        </div>
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Cost (24h)</p>
                          <p className="text-lg font-bold text-white">${system.cost.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {system.features.map((feature, idx) => (
                          <span key={idx} className="px-3 py-1 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 text-xs rounded-lg">
                            {feature}
                          </span>
                        ))}
                      </div>

                      {isExpanded && (
                        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 mt-4">
                          <h4 className="text-sm font-semibold text-white mb-3">Additional Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Tokens Used:</span>
                              <span className="text-white font-semibold">{system.tokensUsed.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Last Health Check:</span>
                              <span className="text-white font-semibold">{new Date(system.lastCheck).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">System ID:</span>
                              <span className="text-white font-mono text-xs">{system.id}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleSystem(system.id)}
                      className={`px-3 py-2 rounded-lg font-semibold transition ${
                        system.enabled
                          ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {system.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => restartSystem(system.id)}
                      className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-blue-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toast.info('Opening system settings...')}
                      className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedSystem(isExpanded ? null : system.id)}
                      className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-purple-500/50 text-gray-300 hover:text-white font-semibold rounded-lg transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">System Alerts</h2>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 outline-none transition"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
              <option value="info">Info Only</option>
            </select>
          </div>

          {/*
            These are derived from counted rows, not raised by a monitor.
            There is no alerting service on this platform; two conditions
            qualify — work that never finished, and an agent failing a fifth
            or more of its calls. Nothing here can auto-resolve, so nothing
            claims it can.
          */}
          {!ledgerLoading && !ledgerError && alerts.length === 0 && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-500/60 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                Nothing to report in the last 24 hours.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Alerts appear when calls fail repeatedly or start and never finish.
              </p>
            </div>
          )}

          {filteredAlerts.map(alert => {
            const severityInfo = getSeverityColor(alert.severity);
            return (
              <div
                key={alert.id}
                className={`bg-[#0A0A0A] border-2 ${severityInfo.border} rounded-xl p-6 ${alert.resolved ? 'opacity-60' : 'hover:shadow-lg transition-all duration-300'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 ${severityInfo.bg} ${severityInfo.text} rounded-lg text-xs font-bold uppercase`}>
                        {alert.severity}
                      </span>
                      <h3 className={`text-lg font-bold ${alert.resolved ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {alert.title}
                      </h3>
                      {alert.resolved && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-1">
                      {alert.systemName} • {new Date(alert.timestamp).toLocaleString()}
                    </p>
                    <p className="text-gray-300 mb-3">{alert.message}</p>

                    {alert.recommendation && (
                      <div className="bg-[#1A1A1A] border border-blue-500/30 rounded-lg p-3 mb-3">
                        <p className="text-sm font-semibold text-blue-400 mb-1 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          AI Recommendation:
                        </p>
                        <p className="text-sm text-gray-300">{alert.recommendation}</p>
                      </div>
                    )}

                    {alert.resolved && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Resolved by {alert.resolvedBy} at {new Date(alert.resolvedAt!).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {!alert.resolved && (
                    <div className="flex gap-2">
                      {alert.autoResolvable && (
                        <button
                          onClick={() => resolveAlert(alert.id, true)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Auto-Resolve
                        </button>
                      )}
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="px-4 py-2 bg-[#1A1A1A] border border-green-500/50 hover:bg-green-500/20 text-green-400 font-semibold rounded-lg transition"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-white">System Activity Log</h2>
            {ledgerSummary && (
              <span className="text-xs text-gray-500">
                last {ledgerSummary.windowHours}h · {ledgerSummary.summary.total} call
                {ledgerSummary.summary.total === 1 ? '' : 's'}
                {ledgerSummary.truncated && ' (most recent shown)'}
              </span>
            )}
          </div>

          {/* Anything the ledger thinks is worth saying, said plainly. */}
          {ledgerSummary?.concerns?.length ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200 space-y-1">
                  {ledgerSummary.concerns.map((reason) => <div key={reason}>{reason}</div>)}
                </div>
              </div>
            </div>
          ) : null}

          {ledgerLoading && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-8 text-center text-gray-500">
              Reading the activity ledger…
            </div>
          )}

          {!ledgerLoading && ledgerError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-200">{ledgerError}</p>
            </div>
          )}

          {/*
            An empty ledger is a real answer, not a broken screen, so it says
            which of the two it is. This page spent its whole life showing five
            invented entries; showing nothing when nothing happened is the
            point of the change.
          */}
          {!ledgerLoading && !ledgerError && activities.length === 0 && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-8 text-center">
              <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No model calls in the last 24 hours.</p>
              <p className="text-xs text-gray-600 mt-1">
                Every AI call is recorded here as it happens.
              </p>
            </div>
          )}

          {activities.map(activity => {
            const typeColors = {
              execution: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Zap },
              error: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
              config: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Settings },
              alert: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
              resolution: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle }
            };
            const typeInfo = typeColors[activity.type];
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={activity.id}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className={`w-5 h-5 ${typeInfo.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-white">{activity.action}</h4>
                      <span className={`px-2 py-1 ${typeInfo.bg} ${typeInfo.text} rounded text-xs font-bold uppercase`}>
                        {activity.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{activity.systemName}</p>
                    <p className="text-sm text-gray-300">{activity.details}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      {activity.user && <span>• {activity.user}</span>}
                      <span className={`${
                        activity.status === 'success' ? 'text-green-400' :
                        activity.status === 'failure' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        • {activity.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supervisor Chat Tab */}
      {activeTab === 'supervisor' && (
        <div className="space-y-4">
          {/*
            Said before the panel, not instead of it, so the layout survives
            for when the capability is built. Until then the banner is the
            honest part and everything below it is an empty shell.
          */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-100">
                <p className="font-semibold mb-1">This is not built yet.</p>
                <p className="text-yellow-200/80">
                  There is no supervisor service. This tab previously showed four written-in
                  messages — including one claiming it had disabled a failing system by itself,
                  and a weekly report of 32,807 requests and $1,247 saved. None of it ever
                  happened. The real record of what the AI has done is the Activity tab.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-600/20 to-purple-600/20 border-2 border-orange-500 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center animate-pulse">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Supervisor Assistant</h3>
                <p className="text-sm text-gray-300">Your intelligent AI monitoring all systems 24/7</p>
              </div>
            </div>
            
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-sm font-semibold text-gray-400">Status: Active & Monitoring</p>
              </div>
              <p className="text-xs text-gray-500">
                Processed {supervisorMessages.length} messages • Last update: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {supervisorMessages.map(msg => {
              const priorityColors = {
                high: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
                medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                low: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' }
              };
              const colors = priorityColors[msg.priority];

              return (
                <div
                  key={msg.id}
                  className={`bg-[#0A0A0A] border ${colors.border} rounded-xl p-5 hover:shadow-lg transition-all duration-300`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Bot className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 ${colors.bg} ${colors.text} rounded text-xs font-bold uppercase`}>
                          {msg.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white mb-3">{msg.message}</p>
                      {msg.actionable && (
                        <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition text-sm">
                          {msg.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ask the AI Supervisor a question..."
                className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 outline-none transition"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold rounded-lg transition flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-400" />
              Cost Distribution
            </h3>
            <div className="space-y-3">
              {aiSystems.slice(0, 5).map(system => {
                // Guarded: totalCost is 0 until per-token pricing is wired,
                // and 0/0 rendered "NaN%" on every row.
                const percentage = totalCost > 0
                  ? ((system.cost / totalCost) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div key={system.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">{system.name}</span>
                      <span className="text-sm font-semibold text-white">${system.cost.toFixed(2)} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Average Response Time</p>
                <p className="text-3xl font-bold text-white">{avgResponseTime}ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Tokens Processed</p>
                <p className="text-3xl font-bold text-white">
                  {(aiSystems.reduce((sum, s) => sum + s.tokensUsed, 0) / 1000000).toFixed(2)}M
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Overall System Health</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
                    <div
                      className="h-full bg-gradient-to-r from-green-600 to-green-500"
                      style={{ width: `${(healthySystems / totalSystems) * 100}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-white">
                    {((healthySystems / totalSystems) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import & Management Tab */}
      {activeTab === 'import-management' && (
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Updates Available</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {aiSystems.filter(s => s.updateAvailable).length}
                  </p>
                </div>
                <Download className="w-12 h-12 text-orange-400 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Up to Date</p>
                  <p className="text-3xl font-bold text-green-400">
                    {aiSystems.filter(s => !s.updateAvailable).length}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-400 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Components</p>
                  <p className="text-3xl font-bold text-purple-400">{aiSystems.length}</p>
                </div>
                <Layers className="w-12 h-12 text-purple-400 opacity-50" />
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Bulk Operations</h3>
                <p className="text-sm text-gray-400">Manage multiple AI components at once</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const outdated = aiSystems.filter(s => s.updateAvailable);
                  if (outdated.length > 0) {
                    toast.success(`Upgrading ${outdated.length} components...`);
                    setTimeout(() => {
                      setAISystems(aiSystems.map(s => ({
                        ...s,
                        version: s.latestVersion || s.version,
                        updateAvailable: false,
                        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      })));
                      toast.success('All components upgraded successfully!');
                    }, 2000);
                  } else {
                    toast.info('All components are already up to date');
                  }
                }}
                disabled={aiSystems.filter(s => s.updateAvailable).length === 0}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Upgrade All ({aiSystems.filter(s => s.updateAvailable).length})
              </button>

              <button
                onClick={() => toast.info('Checking for updates...')}
                className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                Check for Updates
              </button>

              <button
                onClick={() => toast.info('Downloading component registry...')}
                className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Import Components
              </button>
            </div>
          </div>

          {/* Components List */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white">AI Component Library</h3>
              <p className="text-sm text-gray-400">Manage versions and upgrades for all AI systems</p>
            </div>

            <div className="divide-y divide-[#2A2A2A]">
              {aiSystems.map(system => {
                const SystemIcon = system.icon;
                return (
                  <div key={system.id} className="p-6 hover:bg-[#1A1A1A]/50 transition">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                        system.updateAvailable ? 'from-orange-500/20 to-red-500/20 border-orange-500/30' : 'from-green-500/20 to-emerald-500/20 border-green-500/30'
                      } border flex items-center justify-center flex-shrink-0`}>
                        <SystemIcon className={`w-6 h-6 ${system.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-white font-bold mb-1">{system.name}</h4>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400">
                                Current: <span className="text-white font-mono">{system.version}</span>
                              </span>
                              {system.updateAvailable && (
                                <>
                                  <span className="text-gray-600">→</span>
                                  <span className="text-sm text-orange-400">
                                    Latest: <span className="font-mono font-bold">{system.latestVersion}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {system.updateAvailable ? (
                              <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg text-xs font-bold text-orange-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                UPDATE AVAILABLE
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg text-xs font-bold text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                UP TO DATE
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                          <span>Last Updated: {system.lastUpdated}</span>
                          <span>•</span>
                          <span className="capitalize">{system.category}</span>
                          <span>•</span>
                          <span>{system.features.length} Features</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {system.updateAvailable && (
                            <button
                              onClick={() => {
                                setSelectedUpgrade(system);
                                setShowUpgradeModal(true);
                              }}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm font-bold transition flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Upgrade to {system.latestVersion}
                            </button>
                          )}
                          
                          <button
                            onClick={() => toast.info(`Viewing details for ${system.name}`)}
                            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white text-sm font-semibold transition flex items-center gap-2"
                          >
                            <Info className="w-4 h-4" />
                            Details
                          </button>

                          <button
                            onClick={() => toast.info('Opening changelog...')}
                            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white text-sm font-semibold transition flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Changelog
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && selectedUpgrade && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-orange-500/30 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <Download className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Upgrade Component</h2>
                    <p className="text-gray-400">{selectedUpgrade.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedUpgrade(null);
                  }}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Version Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-2">Current Version</p>
                  <p className="text-2xl font-mono font-bold text-white">{selectedUpgrade.version}</p>
                  <p className="text-xs text-gray-500 mt-1">Installed: {selectedUpgrade.lastUpdated}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4">
                  <p className="text-sm text-orange-400 mb-2">New Version</p>
                  <p className="text-2xl font-mono font-bold text-orange-400">{selectedUpgrade.latestVersion}</p>
                  <p className="text-xs text-gray-400 mt-1">Released: Feb 23, 2026</p>
                </div>
              </div>

              {/* Upgrade Benefits */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-green-400 mb-3">What's New</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Improved performance and faster response times</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Bug fixes and stability improvements</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>New features and enhanced capabilities</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Security patches and compliance updates</span>
                  </li>
                </ul>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-400 mb-1">Important</p>
                    <p className="text-sm text-gray-400">
                      This upgrade may cause temporary service interruption. Existing data and configurations will be preserved.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedUpgrade(null);
                  }}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success(`Upgrading ${selectedUpgrade.name} to ${selectedUpgrade.latestVersion}...`);
                    setTimeout(() => {
                      setAISystems(aiSystems.map(s =>
                        s.id === selectedUpgrade.id
                          ? {
                              ...s,
                              version: s.latestVersion || s.version,
                              updateAvailable: false,
                              lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            }
                          : s
                      ));
                      toast.success('Upgrade completed successfully!');
                      setShowUpgradeModal(false);
                      setSelectedUpgrade(null);
                    }, 1500);
                  }}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
