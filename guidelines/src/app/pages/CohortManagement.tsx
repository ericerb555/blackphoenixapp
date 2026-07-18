/**
 * Cohort Management - Comprehensive Page
 * 
 * Combines two systems:
 * 1. Territory-Based Management - Geographic radius, capacity limits, founder pricing
 * 2. Advanced Cohort Management - Subscriptions, maintenance plans, vendors, advertisers
 */

import { useState } from 'react';
import { TerritoryBasedCohortManagement } from '../components/TerritoryBasedCohortManagement';
import { AdvancedCohortManagement } from '../components/AdvancedCohortManagement';
import { ArrowLeft, MapPin, Layers } from 'lucide-react';

interface CohortManagementProps {
  onNavigate?: (path: string) => void;
}

type SystemMode = 'territory' | 'advanced';

export default function CohortManagement({ onNavigate }: CohortManagementProps) {
  const [systemMode, setSystemMode] = useState<SystemMode>('territory');

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('unified-dashboard');
    } else {
      window.location.href = '/unified-dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header with Back Button and System Tabs */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="px-6 py-4 space-y-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Command Center</span>
          </button>

          {/* System Mode Tabs */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">Cohort Management System</h1>
              <p className="text-zinc-400 text-sm">Manage territories, subscriptions, maintenance plans, vendors, and advertisers</p>
            </div>
            
            <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg">
              <button
                onClick={() => setSystemMode('territory')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  systemMode === 'territory'
                    ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Territory-Based
              </button>
              <button
                onClick={() => setSystemMode('advanced')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  systemMode === 'advanced'
                    ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Advanced Plans
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Switch between systems */}
      <div className="relative">
        {systemMode === 'territory' ? (
          <TerritoryBasedCohortManagement />
        ) : (
          <AdvancedCohortManagement />
        )}
      </div>
    </div>
  );
}
