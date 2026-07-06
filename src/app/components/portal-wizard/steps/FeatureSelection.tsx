/**
 * Step 3: Feature Selection
 * Select features to enable in the portal
 */

import { useState } from 'react';
import { ChevronLeft, Sparkles, Check } from 'lucide-react';
import { ALL_AVAILABLE_FEATURES } from '../constants';
import { WizardStepProps } from '../types';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../../ui/button/PrimaryButton';

interface FeatureSelectionProps extends WizardStepProps {
  useAI: boolean;
}

export default function FeatureSelection({ data, onUpdate, onNext, onPrevious, useAI }: FeatureSelectionProps) {
  const selectedFeatures = data.enabled_modules || [];

  const toggleFeature = (feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter(f => f !== feature)
      : [...selectedFeatures, feature];

    const enabledFeaturesObj = newFeatures.reduce((acc, f) => {
      acc[f.toLowerCase().replace(/\s+/g, '')] = true;
      return acc;
    }, {} as Record<string, boolean>);

    onUpdate({
      enabled_modules: newFeatures,
      enabled_features: enabledFeaturesObj
    });
  };

  const selectAll = () => {
    const enabledFeaturesObj = ALL_AVAILABLE_FEATURES.reduce((acc, f) => {
      acc[f.toLowerCase().replace(/\s+/g, '')] = true;
      return acc;
    }, {} as Record<string, boolean>);

    onUpdate({
      enabled_modules: [...ALL_AVAILABLE_FEATURES],
      enabled_features: enabledFeaturesObj
    });
    toast.success('All features selected');
  };

  const clearAll = () => {
    onUpdate({
      enabled_modules: [],
      enabled_features: {}
    });
    toast.info('Features cleared');
  };

  const handleNext = () => {
    if (selectedFeatures.length === 0) {
      toast.error('Please select at least one feature');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Select Portal Features</h3>
        <p className="text-gray-400">Choose the features you want to enable</p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <p className="text-sm text-gray-400">
          {selectedFeatures.length} of {ALL_AVAILABLE_FEATURES.length} features selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-600/30 transition"
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-[#2A2A2A] text-gray-400 rounded-lg text-sm font-medium hover:bg-[#3A3A3A] transition"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {ALL_AVAILABLE_FEATURES.map(feature => {
          const isSelected = selectedFeatures.includes(feature);

          return (
            <button
              key={feature}
              onClick={() => toggleFeature(feature)}
              className={`p-4 rounded-xl border-2 transition text-left ${
                isSelected
                  ? 'border-orange-500 bg-orange-600/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{feature}</span>
                {isSelected && <Check className="w-4 h-4 text-orange-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-6 border-t border-[#2A2A2A]">
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl font-medium hover:bg-[#2A2A2A] transition flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        <PrimaryButton
          onClick={handleNext}
          disabled={selectedFeatures.length === 0}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
