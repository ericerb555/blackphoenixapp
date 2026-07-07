/**
 * Step 2: Basic Information
 * Portal name, description, and basic configuration
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, Lightbulb, Star } from 'lucide-react';
import { WizardStepProps } from '../types';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../../ui/button/PrimaryButton';
import { TextArea } from '../../ui/input/TextArea';

interface BasicInformationProps extends WizardStepProps {
  useAI: boolean;
}

export default function BasicInformation({ data, onUpdate, onNext, onPrevious, useAI }: BasicInformationProps) {
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const handleNext = () => {
    if (!data.name?.trim()) {
      toast.error('Please enter a portal name');
      return;
    }

    // Auto-generate URL slug if not set
    if (!data.url_slug) {
      const slug = data.name.toLowerCase().replace(/\s+/g, '-');
      onUpdate({ url_slug: slug });
    }

    // Auto-generate coding prefix if not set
    if (!data.tracking_config?.prefix) {
      const prefix = data.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
      onUpdate({
        tracking_config: {
          ...data.tracking_config!,
          prefix
        }
      });
    }

    onNext();
  };

  const handleAIAnalysis = () => {
    if (!data.name) {
      toast.error('Please enter a portal name first');
      return;
    }

    setAiAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      const suggestions = [
        `Based on "${data.name}", consider enabling customer communication features`,
        `Your ${data.portal_type} portal would benefit from automated workflows`,
        `Suggested tracking prefix: ${data.tracking_config?.prefix || 'AUTO'}`,
        `Enable analytics to track portal performance`,
      ];

      setAiSuggestions(suggestions);
      setAiAnalyzing(false);
      toast.success('AI analysis complete!');
    }, 1500);
  };

  useEffect(() => {
    if (useAI && data.name && data.name.length > 3 && aiSuggestions.length === 0) {
      handleAIAnalysis();
    }
  }, [data.name]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Portal Basic Information</h3>
        <p className="text-gray-400">Tell us about your new portal</p>
      </div>

      <div className="space-y-4">
        {/* Portal Name */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            Portal Name <span className="text-orange-400">*</span>
          </label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g., Premium Customer Portal"
            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Portal Description</label>
          <TextArea
            value={data.description || ''}
            onChange={(value) => onUpdate({ description: value })}
            placeholder="Brief description of the portal's purpose..."
            rows={3}
          />
        </div>

        {/* Company Name */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Company/Organization Name</label>
          <input
            type="text"
            value={data.company_name || ''}
            onChange={(e) => onUpdate({ company_name: e.target.value })}
            placeholder="e.g., ABC Construction LLC"
            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* URL Slug */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">/</span>
            <input
              type="text"
              value={data.url_slug || ''}
              onChange={(e) => onUpdate({ url_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="portal-slug"
              className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Auto-generated from portal name if left empty</p>
        </div>

        {/* Coding System Prefix */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Coding System Prefix</label>
          <input
            type="text"
            value={data.tracking_config?.prefix || ''}
            onChange={(e) => onUpdate({
              tracking_config: {
                ...data.tracking_config!,
                prefix: e.target.value.toUpperCase()
              }
            })}
            placeholder="e.g., PCP"
            maxLength={4}
            className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">Used for generating unique tracking codes (auto-generated if left empty)</p>
        </div>
      </div>

      {/* AI Analysis */}
      {useAI && aiAnalyzing && (
        <div className="flex items-center gap-3 p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-white">AI is analyzing your inputs...</p>
            <p className="text-xs text-gray-400">Generating smart recommendations</p>
          </div>
        </div>
      )}

      {useAI && aiSuggestions.length > 0 && (
        <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            <p className="text-sm font-bold text-white">AI Suggestions</p>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-2">
                <Star className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
          disabled={!data.name}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
