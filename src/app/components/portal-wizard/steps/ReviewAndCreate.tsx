/**
 * Step 8: Review and Create
 * Final review before portal creation
 */

import { ChevronLeft, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { WizardStepProps, PortalData } from '../types';

interface ReviewAndCreateProps extends WizardStepProps {
  onCreate: () => void;
  isCreating: boolean;
}

export default function ReviewAndCreate({ 
  data, 
  onPrevious, 
  onCreate, 
  isCreating 
}: ReviewAndCreateProps) {
  const hasRequiredFields = data.name && data.portal_type;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Review Your Portal Configuration</h3>
        <p className="text-gray-400">Verify everything is correct before creating</p>
      </div>

      {/* Validation */}
      {!hasRequiredFields && (
        <div className="p-4 bg-red-600/10 rounded-xl border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Missing Required Fields</p>
            <p className="text-xs text-red-200/70 mt-1">Please go back and fill in all required information</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Information */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-3">Basic Information</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Portal Name</p>
              <p className="text-sm text-white font-medium">{data.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Portal Type</p>
              <p className="text-sm text-white font-medium capitalize">{data.portal_type || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Company Name</p>
              <p className="text-sm text-white font-medium">{data.company_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">URL Slug</p>
              <p className="text-sm text-white font-medium font-mono">/{data.url_slug || 'not-set'}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-3">Features</h4>
          <div className="flex flex-wrap gap-1">
            {(data.enabled_modules || []).slice(0, 6).map((feature, i) => (
              <span key={i} className="px-2 py-1 bg-orange-600/20 border border-orange-500/30 text-orange-300 rounded text-xs">
                {feature}
              </span>
            ))}
            {(data.enabled_modules?.length || 0) > 6 && (
              <span className="px-2 py-1 bg-[#2A2A2A] text-gray-400 rounded text-xs">
                +{(data.enabled_modules?.length || 0) - 6} more
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {data.enabled_modules?.length || 0} features enabled
          </p>
        </div>

        {/* Workflows */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-3">Workflows</h4>
          <p className="text-sm text-white">
            {data.workflows?.length || 0} workflows configured
          </p>
          {(data.workflows || []).length > 0 && (
            <ul className="mt-2 space-y-1">
              {data.workflows?.slice(0, 3).map((workflow, i) => (
                <li key={i} className="text-xs text-gray-400">• {workflow}</li>
              ))}
              {(data.workflows?.length || 0) > 3 && (
                <li className="text-xs text-gray-500">• +{(data.workflows?.length || 0) - 3} more...</li>
              )}
            </ul>
          )}
        </div>

        {/* Tracking */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-3">Tracking System</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <p className="text-sm text-white font-medium">
                {data.tracking_config?.enabled ? '✓ Enabled' : '✗ Disabled'}
              </p>
            </div>
            {data.tracking_config?.enabled && (
              <div>
                <p className="text-xs text-gray-400">Code Prefix</p>
                <p className="text-sm text-white font-medium font-mono">
                  {data.tracking_config?.prefix || 'AUTO'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Branding */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-3">Branding</h4>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div
                className="w-8 h-8 rounded border border-[#2A2A2A]"
                style={{ backgroundColor: data.branding?.primaryColor }}
                title="Primary Color"
              />
              <div
                className="w-8 h-8 rounded border border-[#2A2A2A]"
                style={{ backgroundColor: data.branding?.secondaryColor }}
                title="Secondary Color"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400">Logo</p>
              <p className="text-sm text-white">
                {data.branding?.logoUrl ? '✓ Uploaded' : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-3">Security</h4>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">
              {data.access_control?.requireLogin ? '✓' : '✗'} Login Required
            </p>
            <p className="text-xs text-gray-400">
              {data.access_control?.allowSignup ? '✓' : '✗'} Self-Registration
            </p>
            <p className="text-xs text-gray-400">
              {data.access_control?.twoFactorAuth ? '✓' : '✗'} Two-Factor Auth
            </p>
          </div>
        </div>
      </div>

      {/* AI Assistance Summary */}
      {data.ai_config?.enabled && (
        <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-300">AI-Assisted Configuration</p>
            <p className="text-xs text-purple-200/70 mt-1">
              This portal was configured with AI assistance to optimize features and settings
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between gap-3 pt-6 border-t border-[#2A2A2A]">
        <button
          onClick={onPrevious}
          disabled={isCreating}
          className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl font-medium hover:bg-[#2A2A2A] disabled:opacity-50 transition flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        <button
          onClick={onCreate}
          disabled={!hasRequiredFields || isCreating}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-medium hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Portal...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Create Portal
            </>
          )}
        </button>
      </div>
    </div>
  );
}
