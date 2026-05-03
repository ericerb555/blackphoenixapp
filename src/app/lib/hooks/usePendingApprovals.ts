import { useState, useEffect } from 'react';
import { propertyManagementService } from '../services/propertyManagementService';

interface PendingApprovalCounts {
  total: number;
  condo: number;
  landlord: number;
  propertyManager: number;
  loading: boolean;
  error: string | null;
}

export function usePendingApprovals(refreshInterval: number = 30000) {
  const [counts, setCounts] = useState<PendingApprovalCounts>({
    total: 0,
    condo: 0,
    landlord: 0,
    propertyManager: 0,
    loading: true,
    error: null
  });

  const fetchCounts = async () => {
    try {
      console.log('🔍 Fetching pending approval counts...');
      const response = await propertyManagementService.getPendingApprovalCounts();
      console.log('📊 Pending approval counts response:', response);
      
      if (response.success && response.data) {
        if (response.offline) {
          console.log('📴 Server offline - showing zero counts (app works in offline mode)');
        }
        setCounts({
          total: response.data.total || 0,
          condo: response.data.condo || 0,
          landlord: response.data.landlord || 0,
          propertyManager: response.data.propertyManager || 0,
          loading: false,
          error: null
        });
      } else {
        console.log('⚠️ Response not successful - using fallback values');
        // Silently fail with zeros - don't show error to user
        setCounts({
          total: 0,
          condo: 0,
          landlord: 0,
          propertyManager: 0,
          loading: false,
          error: null // Don't show error, just show 0
        });
      }
    } catch (error) {
      console.log('⚠️ Caught error in usePendingApprovals - gracefully degrading to zero counts');
      // Silently fail with zeros - don't break the UI
      setCounts({
        total: 0,
        condo: 0,
        landlord: 0,
        propertyManager: 0,
        loading: false,
        error: null // Don't show error, just show 0
      });
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Set up auto-refresh
    const interval = setInterval(fetchCounts, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { ...counts, refresh: fetchCounts };
}