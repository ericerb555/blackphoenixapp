import AIBlueprintAnalyzer from '../components/AIBlueprintAnalyzer';
import { ArrowLeft } from 'lucide-react';

export default function BlueprintAnalysisPage({
  onNavigate,
  workRequestId,
}: {
  onNavigate?: (page: string) => void;
  workRequestId?: string;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {onNavigate && (
        <button
          onClick={() => onNavigate('unified-dashboard')}
          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      )}
      <AIBlueprintAnalyzer
        onAnalysisComplete={() => {}}
        onMaterialsExtracted={() => {}}
        workRequestId={workRequestId}
        autoGenerateQuote={false}
      />
    </div>
  );
}
