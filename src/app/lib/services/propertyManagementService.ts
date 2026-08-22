import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../supabase';

// Test function to verify Supabase info is loaded
console.log('🔧 Property Management Service Initialized');
console.log('  - Project ID:', projectId);
console.log('  - Public Key:', publicAnonKey ? '✓ Loaded' : '✗ Missing');

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/property-management`;

console.log('  - BASE_URL:', BASE_URL);

/**
 * The signed-in user's token, not the public anon key.
 *
 * Every call in this file used to send `Bearer <publicAnonKey>`, which is a
 * value baked into the shipped bundle and identifies nobody. The condo routes
 * consequently had no way to tell one caller from another, so they checked
 * nothing and served every association's records to anyone who asked. Sending
 * the real session token is what gives the server something to check.
 *
 * Falls back to the anon key when signed out so the request still reaches the
 * function, which then refuses it with a 401 — the refusal belongs on the
 * server, not here, where it could be edited out.
 */
const authHeaders = async (): Promise<Record<string, string>> => {
  let token = publicAnonKey;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) token = data.session.access_token;
  } catch {
    // No session available; the anon key below will be refused by the server.
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ==========================================
// CONDO ASSOCIATIONS
// ==========================================

export const CondoService = {
  // Get all condo associations
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/condos`, { headers: await authHeaders() });
    return res.json();
  },

  // Get single condo
  getById: async (id: string) => {
    const res = await fetch(`${BASE_URL}/condos/${id}`, { headers: await authHeaders() });
    return res.json();
  },

  // Create condo
  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/condos`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Update condo
  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/condos/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Delete condo
  delete: async (id: string) => {
    const res = await fetch(`${BASE_URL}/condos/${id}`, {
      method: 'DELETE',
      headers: await authHeaders()
    });
    return res.json();
  },

  // Get work requests for condo
  getWorkRequests: async (condoId: string, status?: string) => {
    const url = status 
      ? `${BASE_URL}/condos/${condoId}/work-requests?status=${status}`
      : `${BASE_URL}/condos/${condoId}/work-requests`;
    const res = await fetch(url, { headers: await authHeaders() });
    return res.json();
  },

  // Create work request
  createWorkRequest: async (condoId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/condos/${condoId}/work-requests`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Update work request (including approval)
  updateWorkRequest: async (condoId: string, requestId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/condos/${condoId}/work-requests/${requestId}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Approve work request
  approveWorkRequest: async (condoId: string, requestId: string, approvedBy: string) => {
    return CondoService.updateWorkRequest(condoId, requestId, {
      status: 'approved',
      approved_by: approvedBy
    });
  },

  // Get units
  getUnits: async (condoId: string) => {
    const res = await fetch(`${BASE_URL}/condos/${condoId}/units`, { headers: await authHeaders() });
    return res.json();
  },

  // Create unit
  createUnit: async (condoId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/condos/${condoId}/units`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }
};

// ==========================================
// LANDLORDS
// ==========================================

export const LandlordService = {
  getAll: async () => {
    try {
      const res = await fetch(`${BASE_URL}/landlords`, { headers: await authHeaders() });
      if (!res.ok) {
        return { success: false, data: [], error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return data;
    } catch (error) {
      // Backend not available - return empty result
      return { success: false, data: [], error: 'Backend unavailable' };
    }
  },

  getById: async (id: string) => {
    try {
      const res = await fetch(`${BASE_URL}/landlords/${id}`, { headers: await authHeaders() });
      if (!res.ok) {
        return { success: false, data: null, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return data;
    } catch (error) {
      // Backend not available - return empty result
      return { success: false, data: null, error: 'Backend unavailable' };
    }
  },

  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/landlords`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/landlords/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getWorkRequests: async (landlordId: string, status?: string) => {
    try {
      const url = status
        ? `${BASE_URL}/landlords/${landlordId}/work-requests?status=${status}`
        : `${BASE_URL}/landlords/${landlordId}/work-requests`;
      const res = await fetch(url, { headers: await authHeaders() });
      if (!res.ok) {
        return { success: false, data: [], error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return data;
    } catch (error) {
      // Backend not available - return empty result
      return { success: false, data: [], error: 'Backend unavailable' };
    }
  },

  createWorkRequest: async (landlordId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/landlords/${landlordId}/work-requests`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateWorkRequest: async (landlordId: string, requestId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/landlords/${landlordId}/work-requests/${requestId}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  approveWorkRequest: async (landlordId: string, requestId: string, approvedBy: string) => {
    return LandlordService.updateWorkRequest(landlordId, requestId, {
      status: 'approved',
      approved_by: approvedBy
    });
  },

  getProperties: async (landlordId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/landlords/${landlordId}/properties`, { headers: await authHeaders() });
      if (!res.ok) {
        return { success: false, data: [], error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return data;
    } catch (error) {
      // Backend not available - return empty result
      return { success: false, data: [], error: 'Backend unavailable' };
    }
  },

  createProperty: async (landlordId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/landlords/${landlordId}/properties`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }
};

// ==========================================
// PROPERTY MANAGERS
// ==========================================

export const PropertyManagerService = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/property-managers`, { headers: await authHeaders() });
    return res.json();
  },

  getById: async (id: string) => {
    const res = await fetch(`${BASE_URL}/property-managers/${id}`, { headers: await authHeaders() });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${BASE_URL}/property-managers`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${BASE_URL}/property-managers/${id}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getWorkRequests: async (managerId: string, status?: string) => {
    const url = status 
      ? `${BASE_URL}/property-managers/${managerId}/work-requests?status=${status}`
      : `${BASE_URL}/property-managers/${managerId}/work-requests`;
    const res = await fetch(url, { headers: await authHeaders() });
    return res.json();
  },

  createWorkRequest: async (managerId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/property-managers/${managerId}/work-requests`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateWorkRequest: async (managerId: string, requestId: string, data: any) => {
    const res = await fetch(`${BASE_URL}/property-managers/${managerId}/work-requests/${requestId}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  approveWorkRequest: async (managerId: string, requestId: string, approvedBy: string) => {
    return PropertyManagerService.updateWorkRequest(managerId, requestId, {
      status: 'approved',
      approved_by: approvedBy
    });
  }
};

// ==========================================
// MASTER DASHBOARD
// ==========================================

export const PropertyManagementDashboard = {
  // Get all approved work requests
  getApprovedWorkRequests: async () => {
    const res = await fetch(`${BASE_URL}/work-requests/approved`, { headers: await authHeaders() });
    return res.json();
  },

  // Get all pending work requests
  getPendingWorkRequests: async () => {
    const res = await fetch(`${BASE_URL}/work-requests/pending`, { headers: await authHeaders() });
    return res.json();
  },

  // Get dashboard stats
  getStats: async () => {
    const res = await fetch(`${BASE_URL}/stats`, { headers: await authHeaders() });
    return res.json();
  }
};

// ==========================================
// UNIFIED SERVICE (All-in-One)
// ==========================================

export const propertyManagementService = {
  // Get pending approval counts across all property types
  getPendingApprovalCounts: async () => {
    try {
      const url = `${BASE_URL}/pending-counts`;
      console.log('🌐 [Property Management Service] Fetching pending counts...');
      console.log('  - URL:', url);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(url, { 
        headers: await authHeaders(),
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      console.log('📡 Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.log('⚠️ Server returned non-OK status:', res.status, '- Using localStorage fallback');
        // Gracefully degrade - return empty counts
        return { 
          success: true, 
          data: { total: 0, condo: 0, landlord: 0, propertyManager: 0 },
          offline: true
        };
      }
      
      const data = await res.json();
      console.log('✅ Response data:', data);
      return data;
    } catch (error) {
      // Check if it's a timeout/abort error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏱️ Request timeout - Server may be offline. Using localStorage fallback.');
      } else {
        console.log('⚠️ Network error (server offline or CORS issue). Using localStorage fallback.');
      }
      
      // Gracefully degrade - return empty counts instead of error
      return { 
        success: true, 
        data: { total: 0, condo: 0, landlord: 0, propertyManager: 0 },
        offline: true
      };
    }
  },

  // Get all pending work requests (for badge/notifications)
  getAllPendingWorkRequests: async () => {
    try {
      console.log('🌐 [Property Management Service] Fetching all pending work requests...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(`${BASE_URL}/work-requests/pending`, { 
        headers: await authHeaders(),
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        console.log('⚠️ Server returned non-OK status - Using localStorage fallback');
        return { 
          success: true, 
          data: [],
          offline: true 
        };
      }
      return res.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏱️ Request timeout - Server may be offline. Using localStorage fallback.');
      } else {
        console.log('⚠️ Network error. Using localStorage fallback.');
      }
      
      // Gracefully degrade
      return { 
        success: true, 
        data: [],
        offline: true 
      };
    }
  },

  // Quick access to all services
  condo: CondoService,
  landlord: LandlordService,
  propertyManager: PropertyManagerService,
  dashboard: PropertyManagementDashboard
};