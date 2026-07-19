import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { saveDual, loadDual } from '../lib/database';
import {
  LayoutGrid, Shield, Users, DollarSign, Wrench, MessageSquare,
  BarChart3, Store, Palette, Workflow, Globe, Zap, Lock, Unlock,
  CheckCircle, XCircle, Settings, Search, ChevronDown, Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  color: string;
  enabled: boolean;
  roles: string[];
  plans: string[];
  critical?: boolean;
}

const MODULES: Module[] = [
  // Core
  { id: 'unified-dashboard', name: 'Unified Dashboard', description: 'Main command center with KPIs and activity feed', category: 'Core', icon: LayoutGrid, color: 'text-orange-400', enabled: true, roles: ['owner', 'admin'], plans: ['all'], critical: true },
  { id: 'owners-dashboard', name: "Owner's Dashboard", description: 'Platform owner settings and analytics', category: 'Core', icon: Shield, color: 'text-orange-400', enabled: true, roles: ['owner'], plans: ['all'], critical: true },
  // CRM
  { id: 'customers', name: 'Customers', description: 'Customer database and contact management', category: 'CRM', icon: Users, color: 'text-blue-400', enabled: true, roles: ['owner', 'admin', 'manager'], plans: ['starter', 'pro', 'enterprise'] },
  { id: 'crm', name: 'Unified CRM', description: 'Leads, pipeline, and sales tracking', category: 'CRM', icon: Users, color: 'text-blue-400', enabled: true, roles: ['owner', 'admin', 'manager'], plans: ['pro', 'enterprise'] },
  { id: 'messaging', name: 'Messaging', description: 'Direct admin ↔ customer messaging', category: 'CRM', icon: MessageSquare, color: 'text-green-400', enabled: true, roles: ['owner', 'admin', 'manager'], plans: ['pro', 'enterprise'] },
  // Financial
  { id: 'invoices', name: 'Invoices', description: 'Invoice creation, tracking, and payment collection', category: 'Financial', icon: DollarSign, color: 'text-yellow-400', enabled: true, roles: ['owner', 'admin', 'manager'], plans: ['starter', 'pro', 'enterprise'] },
  { id: 'unified-payment-center', name: 'Payment Center', description: 'Stripe payments, deposits, and reconciliation', category: 'Financial', icon: DollarSign, color: 'text-yellow-400', enabled: true, roles: ['owner', 'admin'], plans: ['pro', 'enterprise'] },
  { id: 'job-financial-tracker', name: 'Job Financial Tracker', description: 'Per-job profit/loss and cost tracking', category: 'Financial', icon: BarChart3, color: 'text-yellow-400', enabled: true, roles: ['owner', 'admin'], plans: ['enterprise'] },
  // Projects & Work
  { id: 'unified-project-pipeline', name: 'Project Pipeline', description: 'Full project workflow from quote to completion', category: 'Projects', icon: Workflow, color: 'text-violet-400', enabled: true, roles: ['owner', 'admin', 'manager'], plans: ['starter', 'pro', 'enterprise'] },
  { id: 'bid-room', name: 'Bid Room', description: 'Competitive bidding and quote management', category: 'Projects', icon: Workflow, color: 'text-violet-400', enabled: true, roles: ['owner', 'admin'], plans: ['pro', 'enterprise'] },
  { id: 'service-scheduling', name: 'Service Scheduling', description: 'Job scheduling and calendar management', category: 'Projects', icon: Wrench, color: 'text-violet-400', enabled: true, roles: ['owner', 'admin', 'manager', 'employee'], plans: ['pro', 'enterprise'] },
  { id: 'permit-ai', name: 'PermitAI', description: 'AI-powered NH permit and building code assistant', category: 'Projects', icon: Zap, color: 'text-violet-400', enabled: true, roles: ['owner', 'admin', 'manager'], plans: ['pro', 'enterprise'] },
  // Store
  { id: 'digital-store', name: 'Digital Store', description: 'Digital product marketplace and fulfillment', category: 'eCommerce', icon: Store, color: 'text-pink-400', enabled: true, roles: ['owner', 'admin'], plans: ['pro', 'enterprise'] },
  { id: 'public-store', name: 'Public Store', description: 'Customer-facing dropship product store', category: 'eCommerce', icon: Store, color: 'text-pink-400', enabled: true, roles: ['owner', 'admin'], plans: ['enterprise'] },
  { id: 'promotions-manager', name: 'Promotions', description: 'Discount codes, flash sales, and promotions', category: 'eCommerce', icon: Store, color: 'text-pink-400', enabled: true, roles: ['owner', 'admin'], plans: ['enterprise'] },
  // Property
  { id: 'property-management-hub', name: 'Property Management', description: 'Tenant, lease, and maintenance management', category: 'Property', icon: Globe, color: 'text-teal-400', enabled: true, roles: ['owner', 'admin', 'property_manager'], plans: ['pro', 'enterprise'] },
  { id: 'property-ai-enterprise', name: 'Property AI', description: 'AI-powered property analysis and reporting', category: 'Property', icon: Zap, color: 'text-teal-400', enabled: true, roles: ['owner', 'admin'], plans: ['enterprise'] },
  // Design
  { id: 'design-studio-pro', name: 'Design Studio Pro', description: 'Client-facing design proposals and 3D visualization', category: 'Design', icon: Palette, color: 'text-rose-400', enabled: true, roles: ['owner', 'admin'], plans: ['enterprise'] },
  // Analytics
  { id: 'reports', name: 'Enterprise Reporting', description: 'Advanced analytics and business intelligence', category: 'Analytics', icon: BarChart3, color: 'text-cyan-400', enabled: true, roles: ['owner', 'admin'], plans: ['enterprise'] },
];

const CATEGORIES = ['All', ...Array.from(new Set(MODULES.map(m => m.category)))];

interface Props { onNavigate?: (page: string) => void; }

export default function ModuleManager({ onNavigate }: Props) {
  const [modules, setModules] = useState<Module[]>(() => {
    try {
      const saved = localStorage.getItem('module_manager_state');
      if (saved) {
        const savedMap = JSON.parse(saved) as Record<string, boolean>;
        return MODULES.map(m => ({ ...m, enabled: savedMap[m.id] ?? m.enabled }));
      }
    } catch {}
    return MODULES;
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [hasChanges, setHasChanges] = useState(false);

  // Hydrate module state from the server on mount (falls back to the
  // localStorage-seeded initial state if nothing is stored server-side yet).
  useEffect(() => {
    (async () => {
      const saved = await loadDual('module_manager_state');
      if (saved && typeof saved === 'object') {
        const savedMap = saved as Record<string, boolean>;
        setModules(MODULES.map(m => ({ ...m, enabled: savedMap[m.id] ?? m.enabled })));
      }
    })();
  }, []);

  const filtered = modules.filter(m => {
    const matchCat = category === 'All' || m.category === category;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function toggle(id: string) {
    setModules(prev => prev.map(m => {
      if (m.id !== id) return m;
      if (m.critical && m.enabled) { toast.error(`${m.name} is a critical module and cannot be disabled.`); return m; }
      return { ...m, enabled: !m.enabled };
    }));
    setHasChanges(true);
  }

  function saveChanges() {
    const state: Record<string, boolean> = {};
    modules.forEach(m => { state[m.id] = m.enabled; });
    saveDual('module_manager_state', state);
    setHasChanges(false);
    toast.success('Module settings saved');
  }

  const enabledCount = modules.filter(m => m.enabled).length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Module Manager</h1>
          <p className="text-gray-400 text-sm mt-1">{enabledCount} of {modules.length} modules active</p>
        </div>
        {hasChanges && (
          <button onClick={saveChanges}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules…"
            className="w-full pl-9 pr-3 py-2.5 bg-[#111] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${category === cat ? 'bg-orange-600 text-white' : 'bg-[#111] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(module => {
          const Icon = module.icon;
          return (
            <motion.div key={module.id} layout
              className={`p-4 rounded-2xl border transition-all ${module.enabled ? 'bg-[#111] border-[#2A2A2A]' : 'bg-[#0D0D0D] border-[#1A1A1A] opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 ${module.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{module.name}</p>
                      {module.critical && <Lock className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-500">{module.category}</p>
                  </div>
                </div>
                {/* Toggle */}
                <button onClick={() => toggle(module.id)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${module.enabled ? 'bg-orange-600' : 'bg-[#2A2A2A]'}`}
                  style={{ height: '22px', width: '40px' }}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${module.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">{module.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`flex items-center gap-1 text-[10px] font-semibold ${module.enabled ? 'text-green-400' : 'text-gray-600'}`}>
                  {module.enabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {module.enabled ? 'Active' : 'Disabled'}
                </span>
                {module.plans[0] !== 'all' && (
                  <span className="text-[10px] text-gray-600 ml-auto capitalize">{module.plans[module.plans.length - 1]} plan</span>
                )}
                {onNavigate && (
                  <button onClick={() => onNavigate(module.id)}
                    className="text-[10px] text-orange-400 hover:text-orange-300 ml-auto transition">
                    Open →
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">No modules match your search.</div>
      )}
    </div>
  );
}
