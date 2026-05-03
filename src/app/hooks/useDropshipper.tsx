/**
 * useDropshipper Hook
 * Easy integration for dropshipper functionality in your existing components
 */

import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export interface DropshipperHookReturn {
  // State
  isEnabled: boolean;
  isLoading: boolean;
  
  // Inventory
  checkStock: (sku: string, quantity: number) => Promise<boolean>;
  getInventoryItem: (sku: string) => Promise<any | null>;
  
  // Orders
  forwardOrder: (order: {
    orderId: string;
    items: { sku: string; quantity: number; price: number }[];
    shippingAddress: any;
  }) => Promise<{ success: boolean; error?: string }>;
  
  // Tracking
  getTracking: (orderId: string) => Promise<any | null>;
  
  // Utility
  refreshConfig: () => Promise<void>;
}

/**
 * Hook for integrating dropshipper functionality into your app
 * 
 * @example
 * const { checkStock, forwardOrder, getTracking } = useDropshipper();
 * 
 * // Check stock before checkout
 * const available = await checkStock('SKU-123', 2);
 * 
 * // Forward order after checkout
 * await forwardOrder({
 *   orderId: 'ORD-123',
 *   items: [...],
 *   shippingAddress: {...}
 * });
 * 
 * // Get tracking info
 * const tracking = await getTracking('ORD-123');
 */
export function useDropshipper(): DropshipperHookReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/config`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await response.json();
      if (data.success) {
        setIsEnabled(data.config.enabled);
      }
    } catch (error) {
      console.error('[Dropshipper Hook] Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const checkStock = useCallback(async (sku: string, quantity: number): Promise<boolean> => {
    if (!isEnabled) return true; // If module disabled, don't block

    try {
      const response = await fetch(`${API_URL}/dropshipper/check-stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sku, quantity })
      });

      const data = await response.json();
      return data.available || false;
    } catch (error) {
      console.error('[Dropshipper Hook] Stock check failed:', error);
      return true; // Don't block on error
    }
  }, [isEnabled]);

  const getInventoryItem = useCallback(async (sku: string): Promise<any | null> => {
    if (!isEnabled) return null;

    try {
      const response = await fetch(`${API_URL}/dropshipper/inventory/${sku}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      return data.success ? data.item : null;
    } catch (error) {
      console.error('[Dropshipper Hook] Failed to get inventory item:', error);
      return null;
    }
  }, [isEnabled]);

  const forwardOrder = useCallback(async (order: {
    orderId: string;
    items: { sku: string; quantity: number; price: number }[];
    shippingAddress: any;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!isEnabled) {
      return { success: true }; // Module disabled, skip forwarding
    }

    try {
      const response = await fetch(`${API_URL}/dropshipper/forward-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Dropshipper Hook] Order forward failed:', error);
      return { success: false, error: String(error) };
    }
  }, [isEnabled]);

  const getTracking = useCallback(async (orderId: string): Promise<any | null> => {
    if (!isEnabled) return null;

    try {
      const response = await fetch(`${API_URL}/dropshipper/tracking/${orderId}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      return data.success ? data.tracking : null;
    } catch (error) {
      console.error('[Dropshipper Hook] Failed to get tracking:', error);
      return null;
    }
  }, [isEnabled]);

  return {
    isEnabled,
    isLoading,
    checkStock,
    getInventoryItem,
    forwardOrder,
    getTracking,
    refreshConfig,
  };
}

/**
 * Example: Use in checkout flow
 */
export function useDropshipperCheckout() {
  const { checkStock, forwardOrder } = useDropshipper();

  const validateCart = async (items: { sku: string; quantity: number }[]) => {
    const results = await Promise.all(
      items.map(item => checkStock(item.sku, item.quantity))
    );

    const outOfStock = items.filter((_, idx) => !results[idx]);
    return {
      valid: outOfStock.length === 0,
      outOfStock,
    };
  };

  const processCheckout = async (orderData: any) => {
    // Your existing checkout logic
    // ...

    // Automatically forward to dropshipper
    const result = await forwardOrder({
      orderId: orderData.id,
      items: orderData.items,
      shippingAddress: orderData.shippingAddress,
    });

    if (!result.success) {
      console.warn('[Dropshipper] Order forward failed, but checkout succeeded:', result.error);
      // Don't block customer - admin will be notified via error logs
    }

    return orderData;
  };

  return { validateCart, processCheckout };
}

/**
 * Example: Use in order tracking page
 */
export function useDropshipperTracking(orderId: string) {
  const { getTracking, isEnabled } = useDropshipper();
  const [tracking, setTracking] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEnabled || !orderId) return;

    setLoading(true);
    getTracking(orderId)
      .then(setTracking)
      .finally(() => setLoading(false));
  }, [orderId, isEnabled, getTracking]);

  return { tracking, loading, isEnabled };
}
