import { useState } from 'react';
import { LayoutGrid, Users, DollarSign, Wrench, TrendingUp, Eye, EyeOff, Share2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const WIDGETS = [
  { id: 'revenue', label: 'Total Revenue', icon: DollarSign, color: 'text-green-400', getValue: () => `$${(Math.random() * 50000 + 10000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` },
  { id: 'jobs', label: 'Active Jobs', icon: Wrench, color: 'text-orange-400', getValue: () => String(Math.floor(Math.random() * 20 + 5)) },
  { id: 'customers', label: 'Customers', icon: Users, color: 'text-blue-400', getValue: () => String(Math.floor(Math.random() * 100 + 30)) },
  { id: 'growth', label: 'Monthly Growth', icon: TrendingUp, color: 'text-violet-400', getValue: () => `+${(Math.random() * 20 + 5).toFixed(1)}%` },
];

export default function SharedDashboardView() {
  const [visible, setVisible] = useState<Record<string, boolean>>({ revenue: true, jobs: true, customers: true, growth: true });
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/shared-dashboard?token=demo`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success('Share link copied!');
    });
  }

  const values = Object.fromEntries(WIDGETS.map(w => [w.id, w.getValue()]));

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Shared Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Share a read-only view of your business metrics with clients or partners</p>
          </div>
          <button onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Share Link'}
          </button>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Visible to clients</p>
          <div className="space-y-2">
            {WIDGETS.map(w => {
              const Icon = w.icon;
              return (
                <div key={w.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${w.color}`} />
                    <span className="text-sm text-gray-300">{w.label}</span>
                  </div>
                  <button onClick={() => setVisible(v => ({ ...v, [w.id]: !v[w.id] }))}
                    className="text-gray-500 hover:text-white transition">
                    {visible[w.id] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Preview — client view</p>
        <div className="grid grid-cols-2 gap-4">
          {WIDGETS.filter(w => visible[w.id]).map(w => {
            const Icon = w.icon;
            return (
              <div key={w.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${w.color}`} />
                  <p className="text-xs text-gray-500">{w.label}</p>
                </div>
                <p className="text-2xl font-bold text-white">{values[w.id]}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-[#111] border border-[#2A2A2A] rounded-xl">
          <p className="text-xs text-gray-500 mb-1">Share URL</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-orange-400 flex-1 truncate">{shareUrl}</code>
            <button onClick={copyLink} className="text-gray-500 hover:text-white transition flex-shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
