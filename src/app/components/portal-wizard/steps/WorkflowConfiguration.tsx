/**
 * Step 4: Workflow Configuration
 * Select and configure automated workflows
 */

import { ChevronLeft, Check } from 'lucide-react';
import { ALL_AVAILABLE_WORKFLOWS } from '../constants';
import { WizardStepProps } from '../types';
import { PrimaryButton } from '../../ui/button/PrimaryButton';

export default function WorkflowConfiguration({ data, onUpdate, onNext, onPrevious }: WizardStepProps) {
  const selectedWorkflows = data.workflows || [];

  const toggleWorkflow = (workflow: string) => {
    const newWorkflows = selectedWorkflows.includes(workflow)
      ? selectedWorkflows.filter(w => w !== workflow)
      : [...selectedWorkflows, workflow];

    onUpdate({ workflows: newWorkflows });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Configure Workflows</h3>
        <p className="text-gray-400">Select automated workflows for your portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_AVAILABLE_WORKFLOWS.map(workflow => {
          const isSelected = selectedWorkflows.includes(workflow);

          return (
            <button
              key={workflow}
              onClick={() => toggleWorkflow(workflow)}
              className={`p-4 rounded-xl border-2 transition text-left ${
                isSelected
                  ? 'border-orange-500 bg-orange-600/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{workflow}</span>
                {isSelected && <Check className="w-5 h-5 text-orange-400" />}
              </div>
            </button>
          );
        })}
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
