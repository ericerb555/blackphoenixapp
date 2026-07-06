/**
 * useRatingRequest Hook
 * 
 * Easy integration hook for triggering rating requests after payment
 * 
 * Usage:
 * ```tsx
 * const { showRatingRequest, RatingModal } = useRatingRequest();
 * 
 * // After successful payment:
 * showRatingRequest({
 *   invoiceId: 'INV-001',
 *   invoiceNumber: 'INV-001',
 *   projectName: 'Kitchen Renovation',
 *   workers: [...]
 * });
 * 
 * // Render modal in your component:
 * return (
 *   <div>
 *     {/* Your component content *\/}
 *     {RatingModal}
 *   </div>
 * );
 * ```
 */

import { useState } from 'react';
import RatingRequestModal from './RatingRequestModal';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Worker {
  id: string;
  name: string;
  role: 'employee' | 'subcontractor';
  avatar?: string;
}

interface RatingRequestData {
  invoiceId: string;
  invoiceNumber: string;
  projectName: string;
  workers: Worker[];
}

export function useRatingRequest() {
  const [isOpen, setIsOpen] = useState(false);
  const [ratingData, setRatingData] = useState<RatingRequestData | null>(null);

  const showRatingRequest = (data: RatingRequestData) => {
    setRatingData(data);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setRatingData(null), 300); // Clear after animation
  };

  const handleSubmit = async (ratings: any) => {
    try {
      // Submit ratings to backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/ratings/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(ratings)
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ Rating submitted successfully:', result.ratingId);
        // You can show a success toast here if needed
      } else {
        console.error('❌ Failed to submit rating:', result.error);
      }
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
    }
  };

  const RatingModal = ratingData ? (
    <RatingRequestModal
      isOpen={isOpen}
      onClose={handleClose}
      invoiceId={ratingData.invoiceId}
      invoiceNumber={ratingData.invoiceNumber}
      projectName={ratingData.projectName}
      workers={ratingData.workers}
      onSubmit={handleSubmit}
    />
  ) : null;

  return {
    showRatingRequest,
    RatingModal,
    isOpen
  };
}
