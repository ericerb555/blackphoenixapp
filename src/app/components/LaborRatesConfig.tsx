/**
 * Labor Rates Configuration
 * 
 * Set hourly rates for all labor categories and profit margins
 * These rates are used when auto-generating quotes
 */

import { useState, useEffect } from 'react';
import {
  DollarSign, Save, RefreshCw, TrendingUp, Wrench, Paintbrush,
  Hammer, Zap, Droplets, Home, HardHat, ScrollText, Percent,
  Calculator, ChevronDown, ChevronUp, Settings, CheckCircle,
  AlertCircle, Loader2, Edit3, Plus, Trash2, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useNavigate } from '../hooks/useNavigate';

interface LaborRate {
  id: string;
  category: string;
  description: string;
  hourlyRate: number;
  icon: any;
  color: string;
  visible: boolean;
}

interface ProfitSettings {
  laborMarkup: number; // % markup on labor
  materialsMarkup: number; // % markup on materials
  overheadPercentage: number; // % for overhead
  targetProfitMargin: number; // % target profit
}

interface LaborRatesConfigProps {
  onClose?: () => void;
  embedded?: boolean;
  onNavigate?: (page: string) => void; // Optional navigation prop from App.tsx
}

export default function LaborRatesConfig({ onClose, embedded = false, onNavigate }: LaborRatesConfigProps) {
  const navigate = useNavigate();
  const [laborRates, setLaborRates] = useState<LaborRate[]>([
    { id: 'carpentry', category: 'Carpentry', description: 'Cabinet installation, framing, trim work', hourlyRate: 65, icon: Hammer, color: 'orange', visible: true },
    { id: 'painting', category: 'Painting', description: 'Interior/exterior painting, prep, finish', hourlyRate: 50, icon: Paintbrush, color: 'blue', visible: true },
    { id: 'electrical', category: 'Electrical', description: 'Licensed electrician, wiring, panels', hourlyRate: 95, icon: Zap, color: 'yellow', visible: true },
    { id: 'plumbing', category: 'Plumbing', description: 'Licensed plumber, fixtures, pipes', hourlyRate: 105, icon: Droplets, color: 'cyan', visible: true },
    { id: 'laboring', category: 'General Labor', description: 'Demolition, cleanup, material handling', hourlyRate: 40, icon: HardHat, color: 'gray', visible: true },
    { id: 'sheetrock', category: 'Drywall & Taping', description: 'Drywall installation, mudding, taping, sanding', hourlyRate: 55, icon: ScrollText, color: 'green', visible: true },
    { id: 'siding', category: 'Siding', description: 'Exterior siding installation and repair', hourlyRate: 60, icon: Home, color: 'indigo', visible: true },
    { id: 'roofing', category: 'Roofing', description: 'Roof installation, repair, shingles', hourlyRate: 70, icon: Home, color: 'red', visible: true },
    { id: 'tile', category: 'Tile Installation', description: 'Floor and wall tile, backsplash', hourlyRate: 70, icon: Wrench, color: 'purple', visible: true },
    { id: 'flooring', category: 'Flooring', description: 'Hardwood, laminate, vinyl installation', hourlyRate: 55, icon: Wrench, color: 'pink', visible: true },
    { id: 'masonry', category: 'Masonry', description: 'Brick, stone, concrete work', hourlyRate: 75, icon: Hammer, color: 'stone', visible: true },
    { id: 'hvac', category: 'HVAC', description: 'Heating, ventilation, air conditioning', hourlyRate: 95, icon: Wrench, color: 'teal', visible: true },
  ]);

  const [profitSettings, setProfitSettings] = useState<ProfitSettings>({
    laborMarkup: 15, // 15% markup on labor
    materialsMarkup: 20, // 20% markup on materials
    overheadPercentage: 10, // 10% for overhead costs
    targetProfitMargin: 20, // 20% target profit margin
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    laborRates: true,
    profitSettings: true,
    calculations: false
  });

  const [editingRate, setEditingRate] = useState<string | null>(null);

  // Load saved rates on mount
  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    setIsLoading(true);
    try {
      console.log('[LaborRatesConfig] Loading rates from server...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/labor-rates/get`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[LaborRatesConfig] Data received successfully');
        if (Array.isArray(data.laborRates) && data.laborRates.length) {
          // Merge saved rates with defaults (in case new categories were added)
          const mergedRates = laborRates.map(defaultRate => {
            const savedRate = data.laborRates.find((r: any) => r.id === defaultRate.id);
            return savedRate ? { ...defaultRate, hourlyRate: savedRate.hourlyRate, visible: savedRate.visible } : defaultRate;
          });
          setLaborRates(mergedRates);
        }
        if (data.profitSettings) {
          setProfitSettings(data.profitSettings);
        }
        if (data.lastSaved) {
          setLastSaved(data.lastSaved);
        }
        console.log('[LaborRatesConfig] Rates loaded successfully');
      } else {
        console.log('[LaborRatesConfig] No saved rates found, using defaults');
      }
    } catch (error) {
      // Silently use defaults - this is expected on first load
      console.log('[LaborRatesConfig] Using default rates (server not available or first time setup)');
    } finally {
      console.log('[LaborRatesConfig] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const saveRates = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/labor-rates/save`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            laborRates: laborRates.map(({ id, category, hourlyRate, visible }) => ({
              id,
              category,
              hourlyRate,
              visible
            })),
            profitSettings,
            lastSaved: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        const now = new Date().toLocaleString();
        setLastSaved(now);
        toast.success('Labor rates saved successfully!', {
          description: 'These rates will be used for new quotes'
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving labor rates:', error);
      toast.error('Failed to save labor rates');
    } finally {
      setIsSaving(false);
    }
  };

  const updateLaborRate = (id: string, hourlyRate: number) => {
    setLaborRates(rates =>
      rates.map(rate =>
        rate.id === id ? { ...rate, hourlyRate } : rate
      )
    );
  };

  const toggleRateVisibility = (id: string) => {
    setLaborRates(rates =>
      rates.map(rate =>
        rate.id === id ? { ...rate, visible: !rate.visible } : rate
      )
    );
  };

  const addCustomRate = () => {
    const newRate: LaborRate = {
      id: `custom-${Date.now()}`,
      category: 'Custom Labor',
      description: 'Enter description',
      hourlyRate: 50,
      icon: Wrench,
      color: 'gray',
      visible: true
    };
    setLaborRates([...laborRates, newRate]);
    setEditingRate(newRate.id);
  };

  const removeRate = (id: string) => {
    setLaborRates(rates => rates.filter(rate => rate.id !== id));
    toast.success('Labor rate removed');
  };

  const resetToDefaults = () => {
    if (confirm('Reset all rates to default values? This cannot be undone.')) {
      setLaborRates([
        { id: 'carpentry', category: 'Carpentry', description: 'Cabinet installation, framing, trim work', hourlyRate: 65, icon: Hammer, color: 'orange', visible: true },
        { id: 'painting', category: 'Painting', description: 'Interior/exterior painting, prep, finish', hourlyRate: 50, icon: Paintbrush, color: 'blue', visible: true },
        { id: 'electrical', category: 'Electrical', description: 'Licensed electrician, wiring, panels', hourlyRate: 95, icon: Zap, color: 'yellow', visible: true },
        { id: 'plumbing', category: 'Plumbing', description: 'Licensed plumber, fixtures, pipes', hourlyRate: 105, icon: Droplets, color: 'cyan', visible: true },
        { id: 'laboring', category: 'General Labor', description: 'Demolition, cleanup, material handling', hourlyRate: 40, icon: HardHat, color: 'gray', visible: true },
        { id: 'sheetrock', category: 'Drywall & Taping', description: 'Drywall installation, mudding, taping, sanding', hourlyRate: 55, icon: ScrollText, color: 'green', visible: true },
        { id: 'siding', category: 'Siding', description: 'Exterior siding installation and repair', hourlyRate: 60, icon: Home, color: 'indigo', visible: true },
        { id: 'roofing', category: 'Roofing', description: 'Roof installation, repair, shingles', hourlyRate: 70, icon: Home, color: 'red', visible: true },
        { id: 'tile', category: 'Tile Installation', description: 'Floor and wall tile, backsplash', hourlyRate: 70, icon: Wrench, color: 'purple', visible: true },
        { id: 'flooring', category: 'Flooring', description: 'Hardwood, laminate, vinyl installation', hourlyRate: 55, icon: Wrench, color: 'pink', visible: true },
        { id: 'masonry', category: 'Masonry', description: 'Brick, stone, concrete work', hourlyRate: 75, icon: Hammer, color: 'stone', visible: true },
        { id: 'hvac', category: 'HVAC', description: 'Heating, ventilation, air conditioning', hourlyRate: 95, icon: Wrench, color: 'teal', visible: true },
      ]);
      setProfitSettings({
        laborMarkup: 15,
        materialsMarkup: 20,
        overheadPercentage: 10,
        targetProfitMargin: 20,
      });
      toast.success('Reset to default rates');
    }
  };

  // Calculate example quote totals with current settings
  const calculateExampleQuote = () => {
    const exampleLaborHours = 100;
    const exampleMaterialsCost = 10000;
    const avgLaborRate = laborRates.reduce((sum, r) => sum + r.hourlyRate, 0) / laborRates.length;
    
    const laborCost = exampleLaborHours * avgLaborRate;
    const laborWithMarkup = laborCost * (1 + profitSettings.laborMarkup / 100);
    
    const materialsWithMarkup = exampleMaterialsCost * (1 + profitSettings.materialsMarkup / 100);
    
    const subtotal = laborWithMarkup + materialsWithMarkup;
    const overhead = subtotal * (profitSettings.overheadPercentage / 100);
    const profit = subtotal * (profitSettings.targetProfitMargin / 100);
    const total = subtotal + overhead + profit;

    return {
      laborCost,
      laborWithMarkup,
      materialsWithMarkup,
      subtotal,
      overhead,
      profit,
      total
    };
  };

  const example = calculateExampleQuote();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading labor rates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-[#0A0A0A] ${embedded ? '' : 'p-6'}`}>
      {/* Back Button */}
      {!embedded && (
        <div className="max-w-7xl mx-auto mb-6">
          <button
            onClick={() => onNavigate ? onNavigate('/unified-project-pipeline') : navigate('/unified-project-pipeline')}
            className="px-4 py-2 rounded-xl border border-gray-700 bg-[#1a1a1a] hover:bg-[#2a2a2a] hover:border-[#ea580c] transition-all flex items-center gap-2 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Back to Pipeline</span>
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Labor Rates Configuration</h1>
                  <p className="text-gray-400">Set your hourly rates and profit margins for quotes</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-xl font-semibold transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Defaults
              </button>
              <button
                onClick={saveRates}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Rates
                  </>
                )}
              </button>
            </div>
          </div>

          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Last saved: {lastSaved}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Labor Rates Section */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
            onClick={() => setExpandedSections({ ...expandedSections, laborRates: !expandedSections.laborRates })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-orange-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Hourly Labor Rates</h2>
                  <p className="text-sm text-gray-400">{laborRates.filter(r => r.visible).length} active rates configured</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addCustomRate();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Rate
                </button>
                {expandedSections.laborRates ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {expandedSections.laborRates && (
            <div className="border-t border-[#2A2A2A] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {laborRates.map((rate) => {
                  const Icon = rate.icon;
                  return (
                    <div
                      key={rate.id}
                      className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition ${
                        !rate.visible ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 bg-${rate.color}-600/20 rounded-lg`}>
                            <Icon className={`w-5 h-5 text-${rate.color}-400`} />
                          </div>
                          <div className="flex-1">
                            {editingRate === rate.id ? (
                              <input
                                type="text"
                                value={rate.category}
                                onChange={(e) =>
                                  setLaborRates(rates =>
                                    rates.map(r =>
                                      r.id === rate.id ? { ...r, category: e.target.value } : r
                                    )
                                  )
                                }
                                className="bg-[#2A2A2A] border border-orange-500/30 rounded-lg px-3 py-1 text-white w-full font-semibold"
                                autoFocus
                              />
                            ) : (
                              <h3 className="font-semibold text-white">{rate.category}</h3>
                            )}
                            {editingRate === rate.id ? (
                              <input
                                type="text"
                                value={rate.description}
                                onChange={(e) =>
                                  setLaborRates(rates =>
                                    rates.map(r =>
                                      r.id === rate.id ? { ...r, description: e.target.value } : r
                                    )
                                  )
                                }
                                className="bg-[#2A2A2A] border border-orange-500/30 rounded-lg px-3 py-1 text-gray-400 text-sm w-full mt-1"
                              />
                            ) : (
                              <p className="text-sm text-gray-400">{rate.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRateVisibility(rate.id)}
                            className="p-1 hover:bg-[#2A2A2A] rounded transition"
                            title={rate.visible ? 'Hide from quotes' : 'Show in quotes'}
                          >
                            {rate.visible ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              editingRate === rate.id
                                ? setEditingRate(null)
                                : setEditingRate(rate.id)
                            }
                            className="p-1 hover:bg-[#2A2A2A] rounded transition"
                          >
                            <Edit3 className="w-4 h-4 text-blue-400" />
                          </button>
                          {rate.id.startsWith('custom-') && (
                            <button
                              onClick={() => removeRate(rate.id)}
                              className="p-1 hover:bg-red-600/10 rounded transition"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={rate.hourlyRate}
                            onChange={(e) => updateLaborRate(rate.id, parseFloat(e.target.value) || 0)}
                            className="bg-[#2A2A2A] border border-orange-500/30 rounded-lg px-3 py-2 text-white font-bold text-lg flex-1"
                            step="0.50"
                            min="0"
                          />
                          <span className="text-gray-400 text-sm">/hour</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profit & Markup Settings */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
            onClick={() => setExpandedSections({ ...expandedSections, profitSettings: !expandedSections.profitSettings })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Profit & Markup Settings</h2>
                  <p className="text-sm text-gray-400">Configure markups and profit margins</p>
                </div>
              </div>
              {expandedSections.profitSettings ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {expandedSections.profitSettings && (
            <div className="border-t border-[#2A2A2A] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Labor Markup */}
                <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-5 h-5 text-orange-400" />
                    <h3 className="font-semibold text-white">Labor Markup</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Markup percentage on labor costs</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={profitSettings.laborMarkup}
                      onChange={(e) => setProfitSettings({ ...profitSettings, laborMarkup: parseFloat(e.target.value) || 0 })}
                      className="bg-[#2A2A2A] border border-orange-500/30 rounded-lg px-4 py-3 text-white font-bold text-xl flex-1"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                    <Percent className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Materials Markup */}
                <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">Materials Markup</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Markup percentage on material costs</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={profitSettings.materialsMarkup}
                      onChange={(e) => setProfitSettings({ ...profitSettings, materialsMarkup: parseFloat(e.target.value) || 0 })}
                      className="bg-[#2A2A2A] border border-blue-500/30 rounded-lg px-4 py-3 text-white font-bold text-xl flex-1"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                    <Percent className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Overhead Percentage */}
                <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">Overhead Percentage</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Business overhead and operational costs</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={profitSettings.overheadPercentage}
                      onChange={(e) => setProfitSettings({ ...profitSettings, overheadPercentage: parseFloat(e.target.value) || 0 })}
                      className="bg-[#2A2A2A] border border-purple-500/30 rounded-lg px-4 py-3 text-white font-bold text-xl flex-1"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                    <Percent className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Target Profit Margin */}
                <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-white">Target Profit Margin</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Desired profit percentage</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={profitSettings.targetProfitMargin}
                      onChange={(e) => setProfitSettings({ ...profitSettings, targetProfitMargin: parseFloat(e.target.value) || 0 })}
                      className="bg-[#2A2A2A] border border-green-500/30 rounded-lg px-4 py-3 text-white font-bold text-xl flex-1"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                    <Percent className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Example Quote Calculation */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div
            className="p-6 cursor-pointer hover:bg-[#1A1A1A]/80 transition"
            onClick={() => setExpandedSections({ ...expandedSections, calculations: !expandedSections.calculations })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Example Quote Calculation</h2>
                  <p className="text-sm text-gray-400">See how your rates affect a sample quote</p>
                </div>
              </div>
              {expandedSections.calculations ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>

          {expandedSections.calculations && (
            <div className="border-t border-[#2A2A2A] p-6">
              <div className="bg-[#0A0A0A] border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Sample Project: 100 Labor Hours + $10,000 Materials</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Base Labor Cost (100 hrs × avg rate):</span>
                    <span className="font-semibold">${example.laborCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Labor with {profitSettings.laborMarkup}% Markup:</span>
                    <span className="font-semibold text-orange-400">${example.laborWithMarkup.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Materials with {profitSettings.materialsMarkup}% Markup:</span>
                    <span className="font-semibold text-blue-400">${example.materialsWithMarkup.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t border-[#2A2A2A] pt-3 flex items-center justify-between text-gray-300">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${example.subtotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Overhead ({profitSettings.overheadPercentage}%):</span>
                    <span className="font-semibold text-purple-400">${example.overhead.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Profit ({profitSettings.targetProfitMargin}%):</span>
                    <span className="font-semibold text-green-400">${example.profit.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t-2 border-purple-500 pt-3 flex items-center justify-between">
                    <span className="text-xl font-bold text-white">Quote Total:</span>
                    <span className="text-2xl font-bold text-purple-400">${example.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-300">
                      <p className="font-semibold mb-1">How This Works:</p>
                      <p>When you generate a quote, the system will use your configured hourly rates for each labor category and apply your markup percentages automatically. You can still edit individual line items in the quote editor.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}