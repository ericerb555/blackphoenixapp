/**
 * Wizard Progress Component
 * Visual progress indicator for wizard steps
 */

import { Check, ChevronRight } from 'lucide-react';
import { WizardStep } from './types';

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
}

export default function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 flex-1 p-3 rounded-xl transition ${
              isActive
                ? 'bg-orange-600/20 border border-orange-500/30'
                : isCompleted
                ? 'bg-green-600/20 border border-green-500/30'
                : 'bg-[#1A1A1A] border border-[#2A2A2A]'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive
                  ? 'bg-orange-600'
                  : isCompleted
                  ? 'bg-green-600'
                  : 'bg-[#2A2A2A]'
              }`}>
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="hidden md:block">
                <p className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {step.name}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-600 mx-1 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
