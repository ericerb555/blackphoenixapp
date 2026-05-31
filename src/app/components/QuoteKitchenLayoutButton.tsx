/**
 * Quote Kitchen Layout Button
 * 
 * Adds kitchen layout analysis to quotes
 * Integrates with video capture and AI floor plan generation
 */

import { useState } from 'react';
import { ChefHat, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { KitchenLayoutAnalysis } from './cv/KitchenLayoutAnalysis';

interface QuoteKitchenLayoutButtonProps {
  quoteId: string;
  workRequestId?: string;
  serviceType?: string;
  onLayoutGenerated?: (data: any) => void;
}

export function QuoteKitchenLayoutButton({
  quoteId,
  workRequestId,
  serviceType,
  onLayoutGenerated
}: QuoteKitchenLayoutButtonProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [hasLayout, setHasLayout] = useState(false);

  // Check if service type is kitchen-related
  const isKitchenRelated = serviceType?.toLowerCase().includes('kitchen') ||
                          serviceType?.toLowerCase().includes('cabinet') ||
                          serviceType?.toLowerCase().includes('remodel');

  const handleAnalysisComplete = (data: any) => {
    console.log('Kitchen layout analysis complete:', data);
    setHasLayout(true);
    toast.success('Kitchen layout and cabinet schedule generated!');
    
    if (onLayoutGenerated) {
      onLayoutGenerated(data);
    }
  };

  // Don't show button if not kitchen-related
  if (!isKitchenRelated) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowAnalysis(true)}
        className={`${
          hasLayout 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-[#ea580c] hover:bg-[#c2410c]'
        } text-white`}
      >
        <ChefHat className="w-4 h-4 mr-2" />
        {hasLayout ? 'View Kitchen Layout' : 'Generate Kitchen Layout & Schedule'}
      </Button>

      {showAnalysis && (
        <KitchenLayoutAnalysis
          workRequestId={workRequestId}
          onClose={() => setShowAnalysis(false)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </>
  );
}
