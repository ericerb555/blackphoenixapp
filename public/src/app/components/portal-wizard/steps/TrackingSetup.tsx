/**
 * Step 5: Tracking Setup
 * Configure tracking codes and systems
 */

import { ChevronLeft } from 'lucide-react';
import { WizardStepProps } from '../types';
import { PrimaryButton } from '../../ui/button/PrimaryButton';

export default function TrackingSetup({ data, onUpdate, onNext, onPrevious }: WizardStepProps) {
  const trackingConfig = data.tracking_config || { enabled: true, prefix: '', systems: [] };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Tracking & Coding System</h3>
        <p className="text-gray-400">Configure your portal's tracking system</p>
      </div>

      <div className="space-y-4">
        {/* Enable Tracking */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Enable Tracking System</p>
              <p className="text-xs text-gray-400 mt-1">Generate unique codes for items, projects, and transactions</p>
            </div>
            <input
              type="checkbox"
              checked={trackingConfig.enabled}
              onChange={(e) => onUpdate({
                tracking_config: { ...trackingConfig, enabled: e.target.checked }
              })}
              className="w-5 h-5 text-orange-600 bg-[#2A2A2A] border-[#3A3A3A] rounded focus:ring-orange-500"
            />
          </label>
        </div>

        {trackingConfig.enabled && (
          <>
            {/* Prefix */}
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">Tracking Code Prefix</label>
              <input
                type="text"
                value={trackingConfig.prefix}
                onChange={(e) => onUpdate({
                  tracking_config: { ...trackingConfig, prefix: e.target.value.toUpperCase() }
                })}
                placeholder="e.g., PROJ"
                maxLength={4}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Example codes: {trackingConfig.prefix || 'XXXX'}-0001, {trackingConfig.prefix || 'XXXX'}-0002</p>
            </div>

            {/* Tracking Systems */}
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">Tracking Systems</label>
              <div className="space-y-2">
                {(data.template_id ? trackingConfig.systems : []).map((system, index) => (
                  <div key={index} className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                    <p className="text-sm text-white">{system}</p>
                  </div>
                ))}
                {(!trackingConfig.systems || trackingConfig.systems.length === 0) && (
                  <p className="text-sm text-gray-500 italic">Tracking systems will be configured based on your template selection</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between gap-3 pt-6 border-t border-[#2A2A2A]">
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl font-medium hover:bg-[#2A2A2A] transition flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        <PrimaryButton
          onClick={onNext}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
