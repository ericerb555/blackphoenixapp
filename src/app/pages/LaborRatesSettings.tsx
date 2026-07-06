/**
 * Labor Rates Settings Page
 * Configure hourly rates and profit margins for quote generation
 */

import { ArrowLeft } from 'lucide-react';
import LaborRatesConfig from '../components/LaborRatesConfig';

interface LaborRatesSettingsProps {
  onNavigate?: (page: string) => void;
}

export default function LaborRatesSettings({ onNavigate }: LaborRatesSettingsProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Back Button */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => onNavigate ? onNavigate('unified-dashboard') : window.history.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <LaborRatesConfig />
      </div>
    </div>
  );
}
