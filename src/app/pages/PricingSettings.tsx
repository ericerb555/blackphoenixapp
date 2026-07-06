/**
 * Pricing Settings Page
 * Configure material markups, labor rates, profit margins, and overhead
 */

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Settings, Save, RotateCcw, Wrench, Package } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackToDashboard } from '../components/BackToDashboard';
import { loadPricingConfig, savePricingConfig, defaultPricingConfig, PricingConfig } from '../lib/pricingConfig';

export default function PricingSettings() {
  const [config, setConfig] = useState<PricingConfig>(loadPricingConfig());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loaded = loadPricingConfig();
    setConfig(loaded);
  }, []);

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleLaborRateChange = (role: keyof PricingConfig['laborRates'], value: number) => {
    setConfig(prev => ({
      ...prev,
      laborRates: {
        ...prev.laborRates,
        [role]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleCategoryMarkupChange = (category: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      materialMarkupByCategory: {
        ...prev.materialMarkupByCategory,
        [category]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePricingConfig(config);
    setHasChanges(false);
    toast.success('Pricing settings saved successfully!', {
      description: 'All future quotes will use these settings.',
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all pricing settings to defaults? This cannot be undone.')) {
      setConfig(defaultPricingConfig);
      savePricingConfig(defaultPricingConfig);
      setHasChanges(false);
      toast.success('Pricing settings reset to defaults');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <BackToDashboard />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-8 h-8 text-[#ea580c]" />
              <h1 className="text-4xl font-bold">Pricing Settings</h1>
            </div>
            <p className="text-gray-400">Configure material markups, labor rates, profit margins, and overhead</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-black border border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${
                hasChanges
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#fb923c] hover:from-[#fb923c] hover:to-[#ea580c] text-white shadow-lg'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6 max-w-6xl">
        {/* Material Markups */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#ea580c]/20 rounded-lg">
              <Package className="w-6 h-6 text-[#ea580c]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Material Markups</h2>
              <p className="text-sm text-gray-400">Set markup percentages for different material categories</p>
            </div>
          </div>

          {/* Default Material Markup */}
          <div className="mb-6 p-4 bg-[#0A0A0A] rounded-lg border border-[#ea580c]/30">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Default Material Markup (%)</label>
            <input
              type="number"
              value={config.materialMarkup}
              onChange={(e) => handleChange('materialMarkup', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="30"
            />
            <p className="text-sm text-gray-500 mt-2">Applied to materials without a specific category markup</p>
          </div>

          {/* Category-Specific Markups */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(config.materialMarkupByCategory || {}).map(([category, markup]) => (
              <div key={category} className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
                <label className="block text-sm font-semibold text-gray-400 mb-2">{category}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={markup}
                    onChange={(e) => handleCategoryMarkupChange(category, parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
                  />
                  <span className="text-gray-400 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Labor Rates */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Labor Rates</h2>
              <p className="text-sm text-gray-400">Set hourly rates for different labor roles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(config.laborRates).map(([role, rate]) => (
              <div key={role} className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
                <label className="block text-sm font-semibold text-gray-400 mb-2 capitalize">
                  {role.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => handleLaborRateChange(role as keyof PricingConfig['laborRates'], parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-gray-400">/hr</span>
                </div>
              </div>
            ))}
          </div>

          {/* Labor Markup */}
          <div className="mt-6 p-4 bg-[#0A0A0A] rounded-lg border border-blue-500/30">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Labor Markup (%)</label>
            <input
              type="number"
              value={config.laborMarkup}
              onChange={(e) => handleChange('laborMarkup', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
            <p className="text-sm text-gray-500 mt-2">Additional markup on labor costs (usually 0 - profit comes from rates)</p>
          </div>
        </div>

        {/* Profit & Overhead */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Profit & Overhead</h2>
              <p className="text-sm text-gray-400">Configure profit margins and overhead percentages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
              <label className="block text-sm font-semibold text-gray-400 mb-2">Profit Margin (%)</label>
              <input
                type="number"
                value={config.profitMargin}
                onChange={(e) => handleChange('profitMargin', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="15"
              />
              <p className="text-sm text-gray-500 mt-2">Percentage added to total for profit</p>
            </div>

            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
              <label className="block text-sm font-semibold text-gray-400 mb-2">Overhead (%)</label>
              <input
                type="number"
                value={config.overheadPercentage}
                onChange={(e) => handleChange('overheadPercentage', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="10"
              />
              <p className="text-sm text-gray-500 mt-2">Percentage added for business overhead costs</p>
            </div>
          </div>
        </div>

        {/* Tax & Discounts */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tax & Discounts</h2>
              <p className="text-sm text-gray-400">Configure sales tax and discount policies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
              <label className="block text-sm font-semibold text-gray-400 mb-2">Sales Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.taxRate}
                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="8"
              />
              <p className="text-sm text-gray-500 mt-2">Applied to final quote total</p>
            </div>

            <div className="p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
              <label className="block text-sm font-semibold text-gray-400 mb-2">Max Discount (%)</label>
              <input
                type="number"
                value={config.maxDiscountPercentage}
                onChange={(e) => handleChange('maxDiscountPercentage', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="15"
              />
              <p className="text-sm text-gray-500 mt-2">Maximum discount percentage allowed on quotes</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#0A0A0A] rounded-lg border border-gray-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.allowDiscounts}
                onChange={(e) => handleChange('allowDiscounts', e.target.checked)}
                className="w-5 h-5 bg-black border-2 border-gray-700 rounded checked:bg-purple-500 checked:border-purple-500 focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
              <div>
                <span className="text-white font-semibold">Allow Discounts</span>
                <p className="text-sm text-gray-500">Enable discount functionality in quote generation</p>
              </div>
            </label>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Example Quote Calculation</h2>
              <p className="text-sm text-gray-400">See how your settings affect a sample $10,000 quote</p>
            </div>
          </div>

          <div className="space-y-3">
            {(() => {
              const materials = 6000;
              const labor = 4000;
              const subtotal = materials + labor;
              const overhead = subtotal * (config.overheadPercentage / 100);
              const profit = subtotal * (config.profitMargin / 100);
              const subtotalWithProfitOverhead = subtotal + overhead + profit;
              const tax = subtotalWithProfitOverhead * (config.taxRate / 100);
              const grandTotal = subtotalWithProfitOverhead + tax;

              return (
                <>
                  <div className="flex justify-between text-gray-400">
                    <span>Materials Subtotal:</span>
                    <span className="font-mono">${materials.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Labor Subtotal:</span>
                    <span className="font-mono">${labor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-3">
                    <span>Subtotal:</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Overhead ({config.overheadPercentage}%):</span>
                    <span className="font-mono">+${overhead.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Profit ({config.profitMargin}%):</span>
                    <span className="font-mono">+${profit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-3">
                    <span>Subtotal with Profit & Overhead:</span>
                    <span className="font-mono">${subtotalWithProfitOverhead.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-purple-400">
                    <span>Tax ({config.taxRate}%):</span>
                    <span className="font-mono">+${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#ea580c] font-bold text-xl border-t-2 border-[#ea580c]/50 pt-3 mt-3">
                    <span>Grand Total:</span>
                    <span className="font-mono">${grandTotal.toFixed(2)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
