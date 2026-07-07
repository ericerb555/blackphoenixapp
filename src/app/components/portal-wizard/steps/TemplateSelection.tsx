/**
 * Step 1: Template Selection
 * Choose portal type from predefined templates
 */

import { CheckCircle, Sparkles } from 'lucide-react';
import { PORTAL_TEMPLATES, TEMPLATE_COLORS } from '../constants';
import { WizardStepProps } from '../types';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../../ui/button/PrimaryButton';

interface TemplateSelectionProps extends WizardStepProps {
  useAI: boolean;
}

export default function TemplateSelection({ data, onUpdate, onNext, useAI }: TemplateSelectionProps) {
  const handleSelectTemplate = (templateId: string) => {
    const template = PORTAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    onUpdate({
      portal_type: template.type,
      template_id: template.id,
      enabled_modules: template.features,
      workflows: template.workflows,
      tracking_config: {
        ...data.tracking_config!,
        systems: template.trackingSystems
      }
    });
  };

  const handleContinue = () => {
    if (!data.portal_type) {
      toast.error('Please select a portal template');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Choose Your Portal Template</h3>
        <p className="text-gray-400">Select a template that best matches your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PORTAL_TEMPLATES.map(template => {
          const Icon = template.icon;
          const isSelected = data.template_id === template.id;

          return (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              className={`p-6 rounded-2xl border-2 transition text-left ${
                isSelected
                  ? 'border-orange-500 bg-orange-600/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${TEMPLATE_COLORS[template.color]} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              <h4 className="text-lg font-bold text-white mb-2">{template.name}</h4>
              <p className="text-sm text-gray-400 mb-4">{template.description}</p>

              {template.aiSuggestion && useAI && (
                <div className="flex items-start gap-2 p-3 bg-purple-600/10 rounded-lg border border-purple-500/30 mb-4">
                  <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-300">{template.aiSuggestion}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400">Recommended For:</p>
                <div className="flex flex-wrap gap-1">
                  {template.recommendedFor.map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-[#2A2A2A] rounded text-xs text-gray-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {isSelected && (
                <div className="mt-4 flex items-center gap-2 text-orange-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Selected</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-3 pt-6 border-t border-[#2A2A2A]">
        <PrimaryButton
          onClick={handleContinue}
          disabled={!data.portal_type}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
