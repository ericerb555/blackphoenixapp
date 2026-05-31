/**
 * Bid Room Auto-Post Settings
 * Admin configuration for AI-powered automatic job posting to Bid Room
 */

import { useState } from 'react';
import { 
  Settings, Zap, DollarSign, Bell, CheckCircle, AlertCircle,
  Info, Save, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DEFAULT_AUTO_POST_CONFIG, BidRoomAutoPostConfig } from '../lib/constants/jobCategories';

interface BidRoomAutoPostSettingsProps {
  config?: BidRoomAutoPostConfig;
  onSave: (config: BidRoomAutoPostConfig) => void;
}

export default function BidRoomAutoPostSettings({ 
  config = DEFAULT_AUTO_POST_CONFIG,
  onSave 
}: BidRoomAutoPostSettingsProps) {
  const [settings, setSettings] = useState<BidRoomAutoPostConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof BidRoomAutoPostConfig>(
    key: K, 
    value: BidRoomAutoPostConfig[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const togglePriority = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const currentPriorities = settings.autoPostPriorities;
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    updateSetting('autoPostPriorities', newPriorities);
  };

  const handleSave = () => {
    onSave(settings);
    setHasChanges(false);
    toast.success('Auto-post settings saved!');
  };

  const handleReset = () => {
    setSettings(DEFAULT_AUTO_POST_CONFIG);
    setHasChanges(true);
    toast.info('Settings reset to defaults');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#ea580c]/20 rounded-xl">
            <Zap className="w-6 h-6 text-[#ea580c]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI Auto-Post Settings</h3>
            <p className="text-sm text-gray-400">Configure automatic job posting to Bid Room</p>
          </div>
        </div>
        {hasChanges && (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-lg border border-yellow-500/30">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-semibold mb-1">How AI Auto-Post Works</p>
          <p className="text-blue-400/80">
            When a subcontractor submits a new job or application that meets your criteria, 
            it will automatically be posted to the Bid Room and qualified contractors will be notified.
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
            {settings.enabled ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-white">Auto-Post Enabled</p>
            <p className="text-xs text-gray-400">Automatically post qualifying jobs to Bid Room</p>
          </div>
        </div>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            settings.enabled ? 'bg-[#ea580c]' : 'bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
              settings.enabled ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Minimum Budget */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Minimum Budget Threshold
        </label>
        <div className="flex items-center gap-3">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            value={settings.minimumBudget}
            onChange={(e) => updateSetting('minimumBudget', parseInt(e.target.value) || 0)}
            className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]/50"
            placeholder="2500"
            step="500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Only jobs with a minimum budget above this amount will auto-post
        </p>
      </div>

      {/* Priority Selection */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Auto-Post Priorities
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => {
            const isSelected = settings.autoPostPriorities.includes(priority);
            const color = getPriorityColor(priority);
            
            return (
              <button
                key={priority}
                onClick={() => togglePriority(priority)}
                className={`px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                  isSelected
                    ? `border-${color}-500 bg-${color}-500/10 text-${color}-400`
                    : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400 hover:border-[#ea580c]/30'
                }`}
                style={{
                  borderColor: isSelected ? `var(--${color}-500)` : undefined,
                  backgroundColor: isSelected ? `rgba(var(--${color}-500-rgb), 0.1)` : undefined,
                  color: isSelected ? `var(--${color}-400)` : undefined,
                }}
              >
                {isSelected && <CheckCircle className="w-4 h-4 inline mr-1" />}
                {priority.toUpperCase()}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Jobs with these priority levels will automatically post to Bid Room
        </p>
      </div>

      {/* Additional Options */}
      <div className="space-y-3">
        <label className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-[#ea580c]/30 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#ea580c]" />
            <div>
              <p className="font-semibold text-white text-sm">Notify Admin on Auto-Post</p>
              <p className="text-xs text-gray-400">Send notification when job is automatically posted</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.notifyAdminOnAutoPost}
            onChange={(e) => updateSetting('notifyAdminOnAutoPost', e.target.checked)}
            className="w-5 h-5 rounded bg-[#0A0A0A] border-[#2A2A2A] text-[#ea580c] focus:ring-[#ea580c]"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-[#ea580c]/30 transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#ea580c]" />
            <div>
              <p className="font-semibold text-white text-sm">Require Admin Approval</p>
              <p className="text-xs text-gray-400">Jobs go to review queue before posting</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.requireAdminApproval}
            onChange={(e) => updateSetting('requireAdminApproval', e.target.checked)}
            className="w-5 h-5 rounded bg-[#0A0A0A] border-[#2A2A2A] text-[#ea580c] focus:ring-[#ea580c]"
          />
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
        <button
          onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            hasChanges
              ? 'bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-orange-600 hover:to-[#ea580c] text-white shadow-lg shadow-[#ea580c]/30'
              : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
