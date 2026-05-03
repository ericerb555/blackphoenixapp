/**
 * Portal Creation Wizard - Main Component
 * Enterprise-grade wizard for creating and managing portals
 * Modular, type-safe, and Supabase-integrated
 */

import { useState } from 'react';
import { X, Brain, Smartphone } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PortalData, WizardStep, PortalWizardProps } from './types';
import { DEFAULT_BRANDING, DEFAULT_ACCESS_CONTROL, DEFAULT_TRACKING_CONFIG, DEFAULT_AI_CONFIG } from './constants';
import PortalService from '../../lib/services/portalService';
import WizardProgress from './WizardProgress';
import TemplateSelection from './steps/TemplateSelection';
import BasicInformation from './steps/BasicInformation';
import FeatureSelection from './steps/FeatureSelection';
import WorkflowConfiguration from './steps/WorkflowConfiguration';
import TrackingSetup from './steps/TrackingSetup';
import BrandingCustomization from './steps/BrandingCustomization';
import SecurityConfiguration from './steps/SecurityConfiguration';
import ReviewAndCreate from './steps/ReviewAndCreate';
import {
  Layout, FileText, Package, Workflow as WorkflowIcon,
  Code, Palette, Shield, CheckCircle
} from 'lucide-react';

export default function PortalWizard({ onClose, onComplete, initialData, editMode = false }: PortalWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [useAI, setUseAI] = useState(true);

  // Wizard data state
  const [portalData, setPortalData] = useState<Partial<PortalData>>({
    name: '',
    description: '',
    portal_type: undefined,
    template_id: '',
    company_name: '',
    status: 'draft',
    url_slug: '',
    enabled_features: {},
    enabled_modules: [],
    workflows: [],
    tracking_config: DEFAULT_TRACKING_CONFIG,
    branding: DEFAULT_BRANDING,
    access_control: DEFAULT_ACCESS_CONTROL,
    ai_config: { ...DEFAULT_AI_CONFIG, enabled: useAI },
    ...initialData
  });

  const steps: WizardStep[] = [
    { id: 1, name: 'Portal Type', description: 'Choose portal template', icon: Layout },
    { id: 2, name: 'Basic Info', description: 'Name and details', icon: FileText },
    { id: 3, name: 'Features', description: 'Select features', icon: Package },
    { id: 4, name: 'Workflows', description: 'Attach workflows', icon: WorkflowIcon },
    { id: 5, name: 'Tracking', description: 'Coding & tracking', icon: Code },
    { id: 6, name: 'Branding', description: 'Customize appearance', icon: Palette },
    { id: 7, name: 'Security', description: 'Access control', icon: Shield },
    { id: 8, name: 'Review', description: 'Review & create', icon: CheckCircle }
  ];

  const handleUpdateData = (updates: Partial<PortalData>) => {
    setPortalData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreatePortal = async () => {
    try {
      setIsCreating(true);

      // Validate required fields
      if (!portalData.name || !portalData.portal_type) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Create or update portal
      let result;
      if (editMode && initialData?.id) {
        result = await PortalService.updatePortal(initialData.id, portalData);
      } else {
        result = await PortalService.createPortal(portalData);
      }

      if (result.error) {
        throw result.error;
      }

      toast.success(editMode ? 'Portal updated successfully!' : 'Portal created successfully!');
      onComplete(result.data!);
    } catch (error: any) {
      console.error('Portal creation/update failed:', error);
      toast.error(error.message || 'Failed to save portal');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      data: portalData,
      onUpdate: handleUpdateData,
      onNext: handleNext,
      onPrevious: handlePrevious,
      isFirst: currentStep === 1,
      isLast: currentStep === steps.length,
      useAI
    };

    switch (currentStep) {
      case 1:
        return <TemplateSelection {...stepProps} />;
      case 2:
        return <BasicInformation {...stepProps} />;
      case 3:
        return <FeatureSelection {...stepProps} />;
      case 4:
        return <WorkflowConfiguration {...stepProps} />;
      case 5:
        return <TrackingSetup {...stepProps} />;
      case 6:
        return <BrandingCustomization {...stepProps} />;
      case 7:
        return <SecurityConfiguration {...stepProps} />;
      case 8:
        return <ReviewAndCreate {...stepProps} onCreate={handleCreatePortal} isCreating={isCreating} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Smartphone className="w-7 h-7 text-orange-400" />
                {editMode ? 'Edit Portal' : 'Create New Portal'}
              </h2>
              <p className="text-gray-400 mt-1">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <WizardProgress steps={steps} currentStep={currentStep} />

          {/* AI Toggle */}
          <div className="mt-4 flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">AI-Assisted Portal Creation</p>
                <p className="text-xs text-gray-400">Get smart recommendations and configurations</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => {
                  setUseAI(e.target.checked);
                  handleUpdateData({ 
                    ai_config: { ...portalData.ai_config!, enabled: e.target.checked } 
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
