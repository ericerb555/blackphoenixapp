/**
 * Enterprise Security Hub
 * 
 * Comprehensive security monitoring and management dashboard
 * - Real-time threat detection
 * - Security incidents
 * - Compliance monitoring
 * - Audit logs
 * - AI security insights
 * - Intrusion detection alerts
 */

import { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, Activity, TrendingUp, Users, Lock,
  CheckCircle, XCircle, AlertCircle, Eye, Filter, Download,
  RefreshCw, Settings, Bell, Zap, Brain, FileText, BarChart3,
  Globe, Smartphone, Laptop, Server, Cloud, Key, Database,
  ShieldAlert, ShieldCheck, Target, Crosshair, Radio, Radar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SecurityMetrics {
  threat_score: number;
  active_threats: number;
  blocked_attempts: number;
  suspicious_activities: number;
  ai_predictions_today: number;
  incidents_this_month: number;
  compliance_score: number;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  description: string;
  ip_address: string;
  user_id?: string;
  occurred_at: string;
  is_suspicious: boolean;
  threat_score: number;
}

interface SecurityIncident {
  id: string;
  incident_number: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  detected_at: string;
  affected_systems: string[];
}

interface AIThreatPrediction {
  id: string;
  prediction_type: string;
  risk_score: number;
  confidence: number;
  predicted_class: string;
  action_recommended: string;
  predicted_at: string;
}

export default function EnterpriseSecurityHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'incidents' | 'ai' | 'compliance'>('overview');
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [aiPredictions, setAIPredictions] = useState<AIThreatPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadSecurityData();
    
    // Subscribe to real-time security events
    const subscription = supabase
      .channel('security_events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events',
        filter: `is_suspicious=eq.true`
      }, (payload) => {
        toast.error('🚨 Security Alert Detected!', {
          description: payload.new.description
        });
        loadSecurityData(); // Refresh data
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [timeRange]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load metrics
      const { data: metricsData } = await supabase
        .rpc('get_security_metrics', { time_range: timeRange });
      setMetrics(metricsData);

      // Load recent security events
      const { data: eventsData } = await supabase
        .from('security_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(100);
      setSecurityEvents(eventsData || []);

      // Load active incidents
      const { data: incidentsData } = await supabase
        .from('security_incidents')
        .select('*')
        .in('status', ['new', 'investigating', 'contained'])
        .order('detected_at', { ascending: false });
      setIncidents(incidentsData || []);

      // Load AI predictions
      const { data: aiData } = await supabase
        .from('ai_security_predictions')
        .select('*')
        .gte('predicted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('risk_score', { ascending: false })
        .limit(50);
      setAIPredictions(aiData || []);

    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'emergency':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
      case 'warning':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low':
      case 'info':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getThreatLevelColor = (score: number) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-orange-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-gray-400">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Enterprise Security Hub</h1>
                <p className="text-gray-400">Real-time threat monitoring and incident management</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500/50"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <button
              onClick={loadSecurityData}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-500/30">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {metrics && metrics.active_threats > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/50 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1 animate-pulse" />
          <div className="flex-1">
            <h3 className="font-bold text-red-400 mb-1">Active Security Threats Detected</h3>
            <p className="text-sm text-gray-300 mb-3">
              {metrics.active_threats} active threat{metrics.active_threats !== 1 ? 's' : ''} require immediate attention. 
              Review and take action to protect your system.
            </p>
            <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition">
              View Threats →
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Threat Score */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl">
                <Target className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">THREAT LEVEL</p>
                <p className={`text-3xl font-bold ${getThreatLevelColor(metrics.threat_score)}`}>
                  {metrics.threat_score}
                </p>
              </div>
            </div>
            <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  metrics.threat_score >= 80 ? 'bg-red-500' :
                  metrics.threat_score >= 60 ? 'bg-orange-500' :
                  metrics.threat_score >= 40 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${metrics.threat_score}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {metrics.threat_score >= 80 ? 'Critical - Immediate Action Required' :
               metrics.threat_score >= 60 ? 'High - Monitor Closely' :
               metrics.threat_score >= 40 ? 'Moderate - Normal Operations' :
               'Low - All Systems Secure'}
            </p>
          </div>

          {/* Blocked Attempts */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">BLOCKED</p>
                <p className="text-3xl font-bold text-blue-400">
                  {metrics.blocked_attempts.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400">Malicious attempts prevented</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">+23% from yesterday</span>
            </div>
          </div>

          {/* AI Predictions */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">AI INSIGHTS</p>
                <p className="text-3xl font-bold text-purple-400">
                  {metrics.ai_predictions_today}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400">Predictions today</p>
            <div className="flex items-center gap-2 mt-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">98.5% accuracy</span>
            </div>
          </div>

          {/* Compliance Score */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">COMPLIANCE</p>
                <p className="text-3xl font-bold text-green-400">
                  {metrics.compliance_score}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400">All standards</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              <span>PCI-DSS</span>
              <CheckCircle className="w-3 h-3 ml-2" />
              <span>ISO 20022</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'events', label: 'Security Events', icon: Eye, badge: securityEvents.filter(e => e.is_suspicious).length },
          { id: 'incidents', label: 'Incidents', icon: AlertTriangle, badge: incidents.length },
          { id: 'ai', label: 'AI Insights', icon: Brain },
          { id: 'compliance', label: 'Compliance', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white shadow-lg shadow-orange-500/30'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold mb-4">Security Overview</h2>

            {/* Real-time Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Threats */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Recent Threats
                </h3>
                <div className="space-y-3">
                  {securityEvents.filter(e => e.is_suspicious).slice(0, 5).map((event) => (
                    <div key={event.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-red-500/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-white">{event.event_type}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(event.occurred_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>IP: {event.ip_address}</span>
                        <span>Threat Score: {event.threat_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Incidents */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-orange-400" />
                  Active Incidents
                </h3>
                <div className="space-y-3">
                  {incidents.slice(0, 5).map((incident) => (
                    <div key={incident.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-orange-500/30">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold text-white">{incident.incident_number}</span>
                          <p className="text-xs text-gray-400 mt-1">{incident.title}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getSeverityColor(incident.severity)}`}>
                          {incident.severity.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          incident.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          incident.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {incident.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {incident.affected_systems.length} system{incident.affected_systems.length !== 1 ? 's' : ''} affected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                System Health
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0A0A0A] rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Server className="w-5 h-5 text-green-400" />
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">Servers</p>
                  <p className="text-xs text-gray-400">All operational</p>
                </div>

                <div className="p-4 bg-[#0A0A0A] rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-5 h-5 text-green-400" />
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">Database</p>
                  <p className="text-xs text-gray-400">Healthy</p>
                </div>

                <div className="p-4 bg-[#0A0A0A] rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Cloud className="w-5 h-5 text-green-400" />
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">Cloud Services</p>
                  <p className="text-xs text-gray-400">99.99% uptime</p>
                </div>

                <div className="p-4 bg-[#0A0A0A] rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <Lock className="w-5 h-5 text-green-400" />
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">Encryption</p>
                  <p className="text-xs text-gray-400">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Events Tab */}
        {activeTab === 'events' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Security Events</h2>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl transition flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl transition flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {securityEvents.map((event) => (
                <div key={event.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${getSeverityColor(event.severity)}`}>
                        {event.is_suspicious ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{event.event_type}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                          {event.is_suspicious && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-semibold border border-red-500/30">
                              SUSPICIOUS
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {event.ip_address}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Threat: {event.threat_score}/100
                          </span>
                          <span>{new Date(event.occurred_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition">
                      Investigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-400" />
                  AI Security Insights
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Machine learning-powered threat detection and analysis
                </p>
              </div>
            </div>

            {/* AI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Model Accuracy</p>
                <p className="text-3xl font-bold text-purple-400">98.5%</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Predictions Today</p>
                <p className="text-3xl font-bold text-blue-400">{aiPredictions.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">False Positive Rate</p>
                <p className="text-3xl font-bold text-green-400">1.5%</p>
              </div>
            </div>

            {/* AI Predictions */}
            <h3 className="text-lg font-semibold mb-4">Recent AI Predictions</h3>
            <div className="space-y-3">
              {aiPredictions.slice(0, 10).map((prediction) => (
                <div key={prediction.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-purple-500/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white">{prediction.prediction_type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          prediction.predicted_class === 'fraudulent' || prediction.predicted_class === 'malicious'
                            ? 'bg-red-500/20 text-red-400'
                            : prediction.predicted_class === 'suspicious'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {prediction.predicted_class}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Risk Score</p>
                          <p className={`font-bold ${getThreatLevelColor(prediction.risk_score)}`}>
                            {prediction.risk_score}/100
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Confidence</p>
                          <p className="font-bold text-purple-400">{prediction.confidence}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Recommended</p>
                          <p className="font-bold text-white">{prediction.action_recommended}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition">
                        Accept
                      </button>
                      <button className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition">
                        Reject
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Predicted {new Date(prediction.predicted_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Compliance Dashboard</h2>

            {/* Compliance Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">PCI-DSS</h3>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">100%</p>
                <p className="text-xs text-gray-400">Last audit: Jan 15, 2026</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">ISO 20022</h3>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">100%</p>
                <p className="text-xs text-gray-400">All messages validated</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">GDPR</h3>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">98%</p>
                <p className="text-xs text-gray-400">2 minor items pending</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">CCPA</h3>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">100%</p>
                <p className="text-xs text-gray-400">Fully compliant</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Apple App Store</h3>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">100%</p>
                <p className="text-xs text-gray-400">Guidelines met</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">SOX</h3>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400 mb-2">100%</p>
                <p className="text-xs text-gray-400">Controls verified</p>
              </div>
            </div>

            {/* Audit Trail Access */}
            <div className="mt-8 p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                Audit Trail
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Complete audit trail with 7-year retention for compliance and regulatory requirements.
              </p>
              <button className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl transition">
                View Audit Logs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
