/**
 * Founding Member Limits Configuration Modal
 * 
 * Allows each territory to configure their founding member limits:
 * - Subcontractors per trade (default: 3)
 * - Total vendors (default: 10)
 * - Total advertisers (default: 5)
 */

import { useState } from 'react';
import { Crown, X, Save, Wrench, Building2, Megaphone, AlertCircle, Users, Award, Plus, Trash2, Edit3, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface FoundingMemberLimits {
  subcontractorsPerTrade: number;
  totalVendors: number;
  totalAdvertisers: number;
  enabledTrades?: string[]; // List of enabled trades
}

interface FoundingMemberLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  territoryId: string;
  territoryName: string;
  currentLimits: FoundingMemberLimits;
  onSave: (limits: FoundingMemberLimits) => void;
  currentCounts?: {
    founderSubcontractors: number;
    founderVendors: number;
    founderAdvertisers: number;
  };
}

const DEFAULT_LIMITS: FoundingMemberLimits = {
  subcontractorsPerTrade: 10, // Updated to 10
  totalVendors: 10,
  totalAdvertisers: 5,
  enabledTrades: [
    'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Masonry',
    'Roofing', 'Painting', 'Flooring', 'Landscaping', 'Concrete',
  ],
};

// All available trades
const ALL_TRADES = [
  'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Masonry',
  'Roofing', 'Painting', 'Flooring', 'Landscaping', 'Concrete',
  'Drywall', 'Siding', 'Windows', 'Doors', 'Insulation',
  'Fencing', 'Demolition', 'Framing', 'Foundation', 'Excavation',
  'Tile Work', 'Cabinet Making', 'Stonework', 'Gutters', 'Decking',
];

export function FoundingMemberLimitsModal({
  isOpen,
  onClose,
  territoryId,
  territoryName,
  currentLimits,
  onSave,
  currentCounts = { founderSubcontractors: 0, founderVendors: 0, founderAdvertisers: 0 }
}: FoundingMemberLimitsModalProps) {
  const [limits, setLimits] = useState<FoundingMemberLimits>(currentLimits || DEFAULT_LIMITS);
  const [newTradeName, setNewTradeName] = useState('');
  const [showAddTrade, setShowAddTrade] = useState(false);

  if (!isOpen) return null;

  const enabledTrades = limits.enabledTrades || DEFAULT_LIMITS.enabledTrades || [];

  const addTrade = (tradeName: string) => {
    if (!tradeName.trim()) {
      toast.error('Trade name cannot be empty');
      return;
    }
    if (enabledTrades.includes(tradeName.trim())) {
      toast.error('This trade already exists');
      return;
    }
    setLimits({
      ...limits,
      enabledTrades: [...enabledTrades, tradeName.trim()]
    });
    toast.success(`Added ${tradeName} to enabled trades`);
    setNewTradeName('');
    setShowAddTrade(false);
  };

  const removeTrade = (tradeName: string) => {
    setLimits({
      ...limits,
      enabledTrades: enabledTrades.filter(t => t !== tradeName)
    });
    toast.success(`Removed ${tradeName} from enabled trades`);
  };

  const addTradeFromList = (tradeName: string) => {
    if (!enabledTrades.includes(tradeName)) {
      setLimits({
        ...limits,
        enabledTrades: [...enabledTrades, tradeName]
      });
      toast.success(`Added ${tradeName}`);
    }
  };

  const handleSave = () => {
    // Validation: Can't set limits below current founder counts
    if (limits.subcontractorsPerTrade < currentCounts.founderSubcontractors) {
      toast.error(`Cannot set limit below current founder count (${currentCounts.founderSubcontractors} per trade)`);
      return;
    }
    if (limits.totalVendors < currentCounts.founderVendors) {
      toast.error(`Cannot set limit below current founder vendors (${currentCounts.founderVendors})`);
      return;
    }
    if (limits.totalAdvertisers < currentCounts.founderAdvertisers) {
      toast.error(`Cannot set limit below current founder advertisers (${currentCounts.founderAdvertisers})`);
      return;
    }

    onSave(limits);
    toast.success('Founding member limits updated successfully!');
    onClose();
  };

  const handleReset = () => {
    setLimits(DEFAULT_LIMITS);
    toast.info('Reset to default values');
  };

  const totalFoundingSlots = (limits.subcontractorsPerTrade * 20) + limits.totalVendors + limits.totalAdvertisers;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-zinc-800 p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Founding Member Limits</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Territory: <span className="text-white font-medium">{territoryName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-red-600/20 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Award className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Founding Member Benefits</h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                    <strong className="text-yellow-400">6 months FREE</strong> for all subscriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <strong className="text-green-400">30% lifetime discount</strong> on monthly fees
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <strong className="text-purple-400">Founding Member badge</strong> and priority status
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Limits Configuration */}
          <div className="space-y-6">
            {/* Subcontractors Per Trade */}
            <div className="bg-[#0F0F0F] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Subcontractors Per Trade</h3>
                  <p className="text-sm text-zinc-400">
                    Maximum founding members allowed for each trade (Plumbing, Electrical, HVAC, etc.)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={limits.subcontractorsPerTrade}
                    onChange={(e) => setLimits({ ...limits, subcontractorsPerTrade: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-zinc-400">members per trade</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Current founder subcontractors:</span>
                  <span className="text-white font-semibold">{currentCounts.founderSubcontractors}</span>
                  <span className="text-zinc-500">across all trades</span>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setLimits({ ...limits, subcontractorsPerTrade: 1 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    1
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, subcontractorsPerTrade: 2 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    2
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, subcontractorsPerTrade: 3 })}
                    className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-sm rounded-lg transition-colors border border-yellow-500/30 font-semibold"
                  >
                    3 (Default)
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, subcontractorsPerTrade: 5 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    5
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, subcontractorsPerTrade: 10 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    10
                  </button>
                </div>
              </div>
            </div>

            {/* Enabled Trades Management */}
            <div className="bg-[#0F0F0F] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Enabled Trade Categories</h3>
                  <p className="text-sm text-zinc-400">
                    Manage which trade categories are eligible for founding member benefits
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Current Enabled Trades */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-zinc-300">
                      Active Trades ({enabledTrades.length})
                    </span>
                    <button
                      onClick={() => setShowAddTrade(!showAddTrade)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm rounded-lg transition-colors border border-emerald-500/30 flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Trade
                    </button>
                  </div>

                  {/* Add New Trade Form */}
                  {showAddTrade && (
                    <div className="mb-4 p-4 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newTradeName}
                          onChange={(e) => setNewTradeName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTrade(newTradeName)}
                          placeholder="Enter custom trade name..."
                          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => addTrade(newTradeName)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowAddTrade(false);
                            setNewTradeName('');
                          }}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Quick Add from Presets */}
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-400 font-medium">Quick Add Presets:</div>
                        <div className="flex flex-wrap gap-2">
                          {ALL_TRADES.filter(t => !enabledTrades.includes(t)).slice(0, 8).map(trade => (
                            <button
                              key={trade}
                              onClick={() => addTradeFromList(trade)}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors"
                            >
                              + {trade}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trade Pills/Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {enabledTrades.map((trade, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-700 hover:border-emerald-500/50 rounded-lg transition-all"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Wrench className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-zinc-200 truncate">{trade}</span>
                        </div>
                        <button
                          onClick={() => removeTrade(trade)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all ml-2 flex-shrink-0"
                          title="Remove trade"
                        >
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {enabledTrades.length === 0 && (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No trades enabled. Click "Add Trade" to get started.
                    </div>
                  )}
                </div>

                {/* Calculation Info */}
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-200">
                      <strong>Total Founding Subcontractor Slots:</strong> {enabledTrades.length} trades × {limits.subcontractorsPerTrade} per trade = <strong className="text-emerald-400">{enabledTrades.length * limits.subcontractorsPerTrade} slots</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Vendors */}
            <div className="bg-[#0F0F0F] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Total Vendors</h3>
                  <p className="text-sm text-zinc-400">
                    Maximum founding vendor members across all hardware stores and suppliers
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={limits.totalVendors}
                    onChange={(e) => setLimits({ ...limits, totalVendors: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-zinc-400">total vendors</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Current founder vendors:</span>
                  <span className="text-white font-semibold">{currentCounts.founderVendors}</span>
                  <span className="text-zinc-500">/ {limits.totalVendors}</span>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setLimits({ ...limits, totalVendors: 5 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    5
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, totalVendors: 10 })}
                    className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-sm rounded-lg transition-colors border border-yellow-500/30 font-semibold"
                  >
                    10 (Default)
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, totalVendors: 15 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    15
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, totalVendors: 25 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    25
                  </button>
                </div>
              </div>
            </div>

            {/* Total Advertisers */}
            <div className="bg-[#0F0F0F] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-pink-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-5 h-5 text-pink-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Total Advertisers</h3>
                  <p className="text-sm text-zinc-400">
                    Maximum founding advertiser members across all marketing partners
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={limits.totalAdvertisers}
                    onChange={(e) => setLimits({ ...limits, totalAdvertisers: parseInt(e.target.value) || 0 })}
                    className="w-32 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-zinc-400">total advertisers</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Current founder advertisers:</span>
                  <span className="text-white font-semibold">{currentCounts.founderAdvertisers}</span>
                  <span className="text-zinc-500">/ {limits.totalAdvertisers}</span>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setLimits({ ...limits, totalAdvertisers: 3 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    3
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, totalAdvertisers: 5 })}
                    className="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-sm rounded-lg transition-colors border border-yellow-500/30 font-semibold"
                  >
                    5 (Default)
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, totalAdvertisers: 10 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    10
                  </button>
                  <button
                    onClick={() => setLimits({ ...limits, totalAdvertisers: 15 })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    15
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Users className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-base font-bold text-white mb-3">Territory Founding Member Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Subcontractors</div>
                    <div className="text-lg font-bold text-orange-400">
                      {limits.subcontractorsPerTrade} <span className="text-sm text-zinc-500">per trade</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Vendors</div>
                    <div className="text-lg font-bold text-blue-400">{limits.totalVendors}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Advertisers</div>
                    <div className="text-lg font-bold text-pink-400">{limits.totalAdvertisers}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Estimated total founding slots (20 trades):</span>
                    <span className="text-white font-bold text-lg">{totalFoundingSlots}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          {(currentCounts.founderSubcontractors > 0 || currentCounts.founderVendors > 0 || currentCounts.founderAdvertisers > 0) && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-semibold mb-1">Note:</p>
                <p>
                  You cannot set limits below your current founder member counts. Existing founders will retain their status even if you reduce future limits.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-zinc-800 p-6 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
            >
              <Save className="w-5 h-5" />
              Save Limits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}