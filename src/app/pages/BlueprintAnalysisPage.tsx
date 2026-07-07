/**
 * Blueprint Analysis Page
 * Upload and analyze blueprints with AI
 */

import { ArrowLeft } from 'lucide-react';
import AIBlueprintAnalyzer from '../components/AIBlueprintAnalyzer';

interface BlueprintAnalysisPageProps {
  onNavigate?: (page: string) => void;
  workRequestId?: string;
}

export default function BlueprintAnalysisPage({ onNavigate, workRequestId }: BlueprintAnalysisPageProps) {
  const handleAnalysisComplete = (analysis: any) => {
    console.log('Blueprint analysis complete:', analysis);
    // Could trigger quote generation, save to database, etc.
  };

  const handleMaterialsExtracted = (materials: any[]) => {
    console.log('Materials extracted:', materials);
    // Could populate quote materials list
  };

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
      <AIBlueprintAnalyzer
        onAnalysisComplete={handleAnalysisComplete}
        onMaterialsExtracted={handleMaterialsExtracted}
        workRequestId={workRequestId}
        autoGenerateQuote={false}
      />
    </div>
  );
}
