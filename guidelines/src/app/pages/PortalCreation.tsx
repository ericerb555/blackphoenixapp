/**
 * Portal Creation Page
 * 
 * Create and configure custom portals for different user types
 */

import { useState } from 'react';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import PortalCreationWizard from '../components/PortalCreationWizard';
import { toast } from 'sonner@2.0.3';

interface PortalCreationProps {
  onNavigate?: (page: string) => void;
}

export default function PortalCreation({ onNavigate }: PortalCreationProps) {
  const [showWizard, setShowWizard] = useState(false);

  const handlePortalComplete = (portalData: any) => {
    console.log('Portal created:', portalData);
    toast.success(`Portal "${portalData.name}" created successfully!`);
    setShowWizard(false);
    
    // Navigate to portal management after creation
    setTimeout(() => {
      if (onNavigate) {
        onNavigate('portal-management');
      } else {
        window.location.href = '/portal-management';
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {onNavigate && (
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">Portal Creation</h1>
              <p className="text-gray-400 text-sm">Create and configure custom portals with AI assistance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto p-6">
        {!showWizard ? (
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/30">
                <Plus className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-3">Create a New Portal</h2>
              <p className="text-gray-400 text-lg mb-8">
                Build custom portals for customers, employees, vendors, or any user type with our AI-powered creation wizard.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#0A0A0A] border border-purple-500/30 rounded-xl p-4">
                  <Sparkles className="w-8 h-8 text-purple-400 mb-2 mx-auto" />
                  <h3 className="text-white font-semibold mb-1">AI-Powered</h3>
                  <p className="text-gray-400 text-sm">Smart recommendations based on your needs</p>
                </div>
                <div className="bg-[#0A0A0A] border border-blue-500/30 rounded-xl p-4">
                  <Plus className="w-8 h-8 text-blue-400 mb-2 mx-auto" />
                  <h3 className="text-white font-semibold mb-1">Template-Based</h3>
                  <p className="text-gray-400 text-sm">Start from proven portal templates</p>
                </div>
                <div className="bg-[#0A0A0A] border border-green-500/30 rounded-xl p-4">
                  <ArrowLeft className="w-8 h-8 text-green-400 mb-2 mx-auto transform rotate-180" />
                  <h3 className="text-white font-semibold mb-1">Step-by-Step</h3>
                  <p className="text-gray-400 text-sm">Guided setup from start to finish</p>
                </div>
              </div>

              <button
                onClick={() => setShowWizard(true)}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/30 flex items-center gap-3 mx-auto"
              >
                <Plus className="w-6 h-6" />
                Start Portal Creation Wizard
              </button>
            </div>
          </div>
        ) : (
          <PortalCreationWizard
            onClose={() => setShowWizard(false)}
            onComplete={handlePortalComplete}
          />
        )}
      </div>
    </div>
  );
}