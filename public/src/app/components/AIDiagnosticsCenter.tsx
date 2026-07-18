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

import { useState } from 'react';
import {
  Brain, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Zap,
  TrendingUp, TrendingDown, Cpu, Database, Globe, Server, Shield,
  Settings, Play, Pause, RefreshCw, Terminal, BarChart3, Eye,
  MessageSquare, Sparkles, Bot, Network, HardDrive, Gauge,
  AlertCircle, Info, ChevronDown, ChevronUp, ExternalLink,
  Download, Upload, Search, Filter, Calendar, Users, DollarSign,
  FileText, Image, ShoppingBag, Package, Megaphone, Target,
  Wrench, Gift, Crown, Building2, LineChart, PieChart, Layers, Video
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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
  const [aiSystems, setAISystems] = useState<AISystem[]>([
    {
      id: 'ai-product-catalog',
      name: 'AI Product Catalog Assistant',
      category: 'assistant',
      status: 'healthy',
      uptime: 99.8,
      lastCheck: new Date().toISOString(),
      responseTime: 340,
      apiCalls: 2847,
      tokensUsed: 1284750,
      cost: 142.50,
      errorRate: 0.2,
      features: ['Product descriptions', 'Category suggestions', 'SKU generation', 'Bulk import'],
      icon: ShoppingBag,
      color: 'text-blue-400',
      enabled: true,
      version: '2.1.0',
      latestVersion: '2.3.0',
      updateAvailable: true,
      lastUpdated: 'Jan 15, 2026'
    },
    {
      id: 'ai-crm-import',
      name: 'AI CRM Data Import Assistant',
      category: 'assistant',
      status: 'healthy',
      uptime: 98.5,
      lastCheck: new Date().toISOString(),
      responseTime: 420,
      apiCalls: 1523,
      tokensUsed: 842300,
      cost: 89.20,
      errorRate: 1.5,
      features: ['Data mapping', 'Field validation', 'Duplicate detection', 'Smart suggestions'],
      icon: Database,
      color: 'text-green-400',
      enabled: true,
      version: '1.8.2',
      latestVersion: '1.8.2',
      updateAvailable: false,
      lastUpdated: 'Feb 18, 2026'
    },
    {
      id: 'ai-content-studio',
      name: 'AI Content Studio',
      category: 'content',
      status: 'healthy',
      uptime: 99.2,
      lastCheck: new Date().toISOString(),
      responseTime: 1240,
      apiCalls: 5692,
      tokensUsed: 3456890,
      cost: 398.75,
      errorRate: 0.8,
      features: ['Image generation', 'Content writing', 'Style transfer', 'Background removal'],
      icon: Sparkles,
      color: 'text-purple-400',
      enabled: true,
      version: '3.0.1',
      latestVersion: '3.2.0',
      updateAvailable: true,
      lastUpdated: 'Jan 8, 2026'
    },
    {
      id: 'ai-price-automation',
      name: 'AI Price Automation Engine',
      category: 'automation',
      status: 'healthy',
      uptime: 99.9,
      lastCheck: new Date().toISOString(),
      responseTime: 180,
      apiCalls: 8934,
      tokensUsed: 456720,
      cost: 52.30,
      errorRate: 0.1,
      features: ['Dynamic pricing', 'Market analysis', 'Revenue optimization', 'Demand forecasting'],
      icon: Zap,
      color: 'text-yellow-400',
      enabled: true,
      version: '2.5.4',
      latestVersion: '2.5.4',
      updateAvailable: false,
      lastUpdated: 'Feb 20, 2026'
    },
    {
      id: 'ai-supervisor',
      name: 'AI Supervisor Assistant',
      category: 'assistant',
      status: 'healthy',
      uptime: 100,
      lastCheck: new Date().toISOString(),
      responseTime: 95,
      apiCalls: 12456,
      tokensUsed: 234560,
      cost: 28.90,
      errorRate: 0.0,
      features: ['System monitoring', 'Issue detection', 'Auto-resolution', 'Performance optimization'],
      icon: Brain,
      color: 'text-orange-400',
      enabled: true,
      version: '1.9.5',
      latestVersion: '2.0.0',
      updateAvailable: true,
      lastUpdated: 'Jan 28, 2026'
    },
    {
      id: 'ai-analytics',
      name: 'AI Analytics & Insights',
      category: 'analytics',
      status: 'degraded',
      uptime: 97.3,
      lastCheck: new Date().toISOString(),
      responseTime: 890,
      apiCalls: 4256,
      tokensUsed: 1567890,
      cost: 178.40,
      errorRate: 2.7,
      features: ['Trend analysis', 'Predictive modeling', 'Anomaly detection', 'Custom reports'],
      icon: BarChart3,
      color: 'text-cyan-400',
      enabled: true,
      version: '1.5.2',
      latestVersion: '1.7.0',
      updateAvailable: true,
      lastUpdated: 'Dec 12, 2025'
    },
    {
      id: 'ai-chatbot',
      name: 'AI Customer Support Chatbot',
      category: 'assistant',
      status: 'healthy',
      uptime: 98.9,
      lastCheck: new Date().toISOString(),
      responseTime: 520,
      apiCalls: 15678,
      tokensUsed: 4567890,
      cost: 512.60,
      errorRate: 1.1,
      features: ['24/7 support', 'Multi-language', 'Context awareness', 'Ticket creation'],
      icon: MessageSquare,
      color: 'text-pink-400',
      enabled: true,
      version: '4.2.1',
      latestVersion: '4.2.1',
      updateAvailable: false,
      lastUpdated: 'Feb 10, 2026'
    },
    {
      id: 'ai-image-recognition',
      name: 'AI Image Recognition',
      category: 'vision',
      status: 'critical',
      uptime: 89.5,
      lastCheck: new Date().toISOString(),
      responseTime: 2340,
      apiCalls: 3421,
      tokensUsed: 2345670,
      cost: 289.30,
      errorRate: 10.5,
      features: ['Object detection', 'Text extraction', 'Quality analysis', 'Auto-tagging'],
      icon: Eye,
      color: 'text-red-400',
      enabled: false,
      version: '0.9.8',
      latestVersion: '1.2.0',
      updateAvailable: true,
      lastUpdated: 'Nov 5, 2025'
    },
    {
      id: 'ai-bid-assistant',
      name: 'AI Bid Assistant',
      category: 'assistant',
      status: 'healthy',
      uptime: 99.4,
      lastCheck: new Date().toISOString(),
      responseTime: 385,
      apiCalls: 2156,
      tokensUsed: 967840,
      cost: 103.20,
      errorRate: 0.6,
      features: ['Smart routing', 'Provider matching', 'Complexity analysis', 'Auto-bidding'],
      icon: Target,
      color: 'text-blue-400',
      enabled: true,
      version: '1.4.2',
      latestVersion: '1.5.0',
      updateAvailable: true,
      lastUpdated: 'Feb 15, 2026'
    },
    {
      id: 'ai-video-analysis',
      name: 'AI Video Analysis Studio',
      category: 'vision',
      status: 'healthy',
      uptime: 98.1,
      lastCheck: new Date().toISOString(),
      responseTime: 1850,
      apiCalls: 1892,
      tokensUsed: 3245670,
      cost: 342.80,
      errorRate: 1.9,
      features: ['Material detection', 'Dimension extraction', 'Floor plan generation', 'Cost estimation'],
      icon: Video,
      color: 'text-purple-400',
      enabled: true,
      version: '2.3.1',
      latestVersion: '2.4.0',
      updateAvailable: true,
      lastUpdated: 'Feb 12, 2026'
    },
    {
      id: 'ai-quote-builder',
      name: 'AI Quote Builder',
      category: 'assistant',
      status: 'healthy',
      uptime: 99.6,
      lastCheck: new Date().toISOString(),
      responseTime: 420,
      apiCalls: 3567,
      tokensUsed: 1456720,
      cost: 156.40,
      errorRate: 0.4,
      features: ['Auto-pricing', 'Material suggestions', 'Labor estimates', 'Profit optimization'],
      icon: FileText,
      color: 'text-green-400',
      enabled: true,
      version: '3.1.5',
      latestVersion: '3.1.5',
      updateAvailable: false,
      lastUpdated: 'Feb 22, 2026'
    },
    {
      id: 'ai-work-request-analytics',
      name: 'AI Work Request Analytics',
      category: 'analytics',
      status: 'healthy',
      uptime: 98.8,
      lastCheck: new Date().toISOString(),
      responseTime: 625,
      apiCalls: 2934,
      tokensUsed: 1123450,
      cost: 118.90,
      errorRate: 1.2,
      features: ['Pattern recognition', 'Conversion analysis', 'Customer insights', 'Performance metrics'],
      icon: BarChart3,
      color: 'text-cyan-400',
      enabled: true,
      version: '1.6.3',
      latestVersion: '1.7.0',
      updateAvailable: true,
      lastUpdated: 'Feb 5, 2026'
    },
    {
      id: 'ai-floor-plan',
      name: 'AI Floor Plan Generator',
      category: 'vision',
      status: 'healthy',
      uptime: 97.9,
      lastCheck: new Date().toISOString(),
      responseTime: 1520,
      apiCalls: 1456,
      tokensUsed: 2134560,
      cost: 234.70,
      errorRate: 2.1,
      features: ['CAD generation', 'Measurement extraction', 'Compliance checking', 'Design suggestions'],
      icon: Layers,
      color: 'text-orange-400',
      enabled: true,
      version: '2.0.8',
      latestVersion: '2.1.0',
      updateAvailable: true,
      lastUpdated: 'Jan 30, 2026'
    },
    {
      id: 'ai-report-generator',
      name: 'AI Report Generator',
      category: 'automation',
      status: 'healthy',
      uptime: 99.3,
      lastCheck: new Date().toISOString(),
      responseTime: 890,
      apiCalls: 1823,
      tokensUsed: 894560,
      cost: 95.60,
      errorRate: 0.7,
      features: ['Custom reports', 'Data visualization', 'Natural language queries', 'Export automation'],
      icon: FileText,
      color: 'text-blue-400',
      enabled: true,
      version: '1.3.2',
      latestVersion: '1.4.0',
      updateAvailable: true,
      lastUpdated: 'Feb 8, 2026'
    },
    {
      id: 'ai-recommendations',
      name: 'AI Product Recommendations Engine',
      category: 'automation',
      status: 'healthy',
      uptime: 99.7,
      lastCheck: new Date().toISOString(),
      responseTime: 215,
      apiCalls: 18945,
      tokensUsed: 2345670,
      cost: 245.80,
      errorRate: 0.3,
      features: ['Personalization', 'Behavior tracking', 'Cross-sell optimization', 'Bundle suggestions'],
      icon: Target,
      color: 'text-pink-400',
      enabled: true,
      version: '2.8.1',
      latestVersion: '2.8.1',
      updateAvailable: false,
      lastUpdated: 'Feb 18, 2026'
    },
    {
      id: 'ai-prompt-templates',
      name: 'AI Prompt Template Designer',
      category: 'automation',
      status: 'healthy',
      uptime: 99.1,
      lastCheck: new Date().toISOString(),
      responseTime: 280,
      apiCalls: 1267,
      tokensUsed: 456780,
      cost: 48.90,
      errorRate: 0.9,
      features: ['Template management', 'Version control', 'Testing framework', 'Performance tracking'],
      icon: Wrench,
      color: 'text-yellow-400',
      enabled: true,
      version: '1.2.4',
      latestVersion: '1.3.0',
      updateAvailable: true,
      lastUpdated: 'Jan 25, 2026'
    },
    {
      id: 'ai-workflow-chat',
      name: 'AI Workflow Assistant',
      category: 'assistant',
      status: 'healthy',
      uptime: 99.5,
      lastCheck: new Date().toISOString(),
      responseTime: 340,
      apiCalls: 8234,
      tokensUsed: 3456780,
      cost: 367.90,
      errorRate: 0.5,
      features: ['Workflow monitoring', 'Issue resolution', 'Performance insights', 'Proactive alerts'],
      icon: Bot,
      color: 'text-purple-400',
      enabled: true,
      version: '2.4.6',
      latestVersion: '2.5.0',
      updateAvailable: true,
      lastUpdated: 'Feb 14, 2026'
    },
    {
      id: 'ai-payment-assistant',
      name: 'AI Payment Assistant',
      category: 'assistant',
      status: 'healthy',
      uptime: 99.8,
      lastCheck: new Date().toISOString(),
      responseTime: 195,
      apiCalls: 4567,
      tokensUsed: 1234560,
      cost: 132.50,
      errorRate: 0.2,
      features: ['Payment monitoring', 'Anomaly detection', 'Auto-recovery', 'Smart routing'],
      icon: DollarSign,
      color: 'text-green-400',
      enabled: true,
      version: '1.7.3',
      latestVersion: '1.8.0',
      updateAvailable: true,
      lastUpdated: 'Feb 10, 2026'
    },
    {
      id: 'ai-work-request-guide',
      name: 'Client Work Request AI Guide',
      category: 'assistant',
      status: 'healthy',
      uptime: 98.7,
      lastCheck: new Date().toISOString(),
      responseTime: 465,
      apiCalls: 6789,
      tokensUsed: 2987650,
      cost: 318.40,
      errorRate: 1.3,
      features: ['Conversational UI', 'Auto-fill forms', 'Requirement extraction', 'Quote generation'],
      icon: MessageSquare,
      color: 'text-blue-400',
      enabled: true,
      version: '2.2.1',
      latestVersion: '2.3.0',
      updateAvailable: true,
      lastUpdated: 'Feb 16, 2026'
    }
  ]);

  // Active Alerts
  const [alerts, setAlerts] = useState<AIAlert[]>([
    {
      id: 'alert-1',
      systemId: 'ai-image-recognition',
      systemName: 'AI Image Recognition',
      severity: 'critical',
      title: 'High Error Rate Detected',
      message: 'Error rate has increased to 10.5%, exceeding threshold of 5%. Multiple API timeout errors detected.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      resolved: false,
      recommendation: 'Restart service and check API key quota. Consider switching to backup provider.',
      autoResolvable: true
    },
    {
      id: 'alert-2',
      systemId: 'ai-analytics',
      systemName: 'AI Analytics & Insights',
      severity: 'warning',
      title: 'Slow Response Time',
      message: 'Average response time is 890ms, above normal baseline of 600ms. Performance degradation detected.',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      resolved: false,
      recommendation: 'Increase server resources or implement caching layer.',
      autoResolvable: false
    },
    {
      id: 'alert-3',
      systemId: 'ai-crm-import',
      systemName: 'AI CRM Data Import Assistant',
      severity: 'warning',
      title: 'Elevated Error Rate',
      message: 'Error rate at 1.5%, slightly above normal. May indicate data quality issues.',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      resolved: false,
      recommendation: 'Review recent import batches for data format issues.',
      autoResolvable: false
    },
    {
      id: 'alert-4',
      systemId: 'ai-content-studio',
      systemName: 'AI Content Studio',
      severity: 'info',
      title: 'High API Usage',
      message: 'API calls have increased 45% this week. Monitor costs and consider rate limiting.',
      timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
      resolved: false,
      recommendation: 'Review usage patterns and implement caching for frequently requested content.',
      autoResolvable: false
    },
    {
      id: 'alert-5',
      systemId: 'ai-supervisor',
      systemName: 'AI Supervisor Assistant',
      severity: 'info',
      title: 'System Health Check Complete',
      message: 'Completed routine health check across all AI systems. 2 issues detected and flagged.',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      resolved: true,
      resolvedBy: 'AI Supervisor',
      resolvedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      autoResolvable: true
    }
  ]);

  // Activity Log
  const [activities, setActivities] = useState<AIActivity[]>([
    {
      id: 'act-1',
      systemId: 'ai-image-recognition',
      systemName: 'AI Image Recognition',
      type: 'error',
      action: 'Service Disabled',
      details: 'System automatically disabled due to critical error rate',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      status: 'success'
    },
    {
      id: 'act-2',
      systemId: 'ai-supervisor',
      systemName: 'AI Supervisor Assistant',
      type: 'alert',
      action: 'Alert Generated',
      details: 'Created critical alert for AI Image Recognition high error rate',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'success'
    },
    {
      id: 'act-3',
      systemId: 'ai-price-automation',
      systemName: 'AI Price Automation Engine',
      type: 'execution',
      action: 'Price Rule Executed',
      details: 'Peak Hours Premium rule increased advertising prices by 15%',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      user: 'System',
      status: 'success'
    },
    {
      id: 'act-4',
      systemId: 'ai-analytics',
      systemName: 'AI Analytics & Insights',
      type: 'config',
      action: 'Configuration Updated',
      details: 'Increased timeout threshold from 60s to 90s',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      user: 'Admin User',
      status: 'success'
    },
    {
      id: 'act-5',
      systemId: 'ai-content-studio',
      systemName: 'AI Content Studio',
      type: 'execution',
      action: 'Batch Processing',
      details: 'Generated 45 product images for Materials Hub vendor catalog',
      timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
      user: 'Admin User',
      status: 'success'
    }
  ]);

  // Supervisor Messages
  const [supervisorMessages, setSupervisorMessages] = useState<SupervisorMessage[]>([
    {
      id: 'msg-1',
      type: 'alert',
      message: '🚨 Critical issue detected in AI Image Recognition. I\'ve automatically disabled the system to prevent further errors. Investigating root cause...',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      priority: 'high',
      actionable: true,
      action: 'View Details'
    },
    {
      id: 'msg-2',
      type: 'recommendation',
      message: '💡 AI Analytics is running slower than usual. I recommend increasing server resources or implementing a caching layer. Would you like me to proceed?',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      priority: 'medium',
      actionable: true,
      action: 'Apply Fix'
    },
    {
      id: 'msg-3',
      type: 'status',
      message: '✅ All critical systems are operational. Completed routine health check - everything looks good!',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      priority: 'low',
      actionable: false
    },
    {
      id: 'msg-4',
      type: 'report',
      message: '📊 Weekly summary: Processed 32,807 AI requests, saved $1,247 through optimization, prevented 3 potential outages.',
      timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
      priority: 'low',
      actionable: true,
      action: 'View Report'
    }
  ]);

  // Calculate overall stats
  const totalSystems = aiSystems.length;
  const healthySystems = aiSystems.filter(s => s.status === 'healthy').length;
  const criticalAlerts = alerts.filter(a => !a.resolved && a.severity === 'critical').length;
  const totalApiCalls = aiSystems.reduce((sum, s) => sum + s.apiCalls, 0);
  const totalCost = aiSystems.reduce((sum, s) => sum + s.cost, 0);
  const avgResponseTime = Math.round(aiSystems.reduce((sum, s) => sum + s.responseTime, 0) / aiSystems.length);

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

  const toggleSystem = (systemId: string) => {
    setAISystems(systems =>
      systems.map(s =>
        s.id === systemId ? { ...s, enabled: !s.enabled } : s
      )
    );
    const system = aiSystems.find(s => s.id === systemId);
    toast.success(`${system?.name} ${system?.enabled ? 'disabled' : 'enabled'}`);
  };

  const restartSystem = (systemId: string) => {
    const system = aiSystems.find(s => s.id === systemId);
    toast.info(`Restarting ${system?.name}...`);
    setTimeout(() => {
      setAISystems(systems =>
        systems.map(s =>
          s.id === systemId
            ? { ...s, status: 'healthy', errorRate: 0, responseTime: s.responseTime * 0.7 }
            : s
        )
      );
      toast.success(`${system?.name} restarted successfully`);
    }, 2000);
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
                ${totalCost.toFixed(2)} Total Cost
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
              <p className="text-3xl font-bold text-white mb-1">${totalCost.toFixed(2)}</p>
              <p className="text-sm text-gray-400">Total Cost (24h)</p>
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
                      <span className="text-gray-400">Uptime:</span>
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
                          <p className="text-xs text-gray-400 mb-1">Uptime</p>
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
          <h2 className="text-xl font-bold text-white mb-4">System Activity Log</h2>
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
                const percentage = ((system.cost / totalCost) * 100).toFixed(1);
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
