// White-Label API Client
// Handles all API communication with Supabase backend

import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { WhiteLabelConfig } from '../../types/white-label';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API Error (${response.status}):`, data);
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: data.success !== false ? data : undefined,
      error: data.success === false ? data.error : undefined,
    };
  } catch (error) {
    console.error('API Request Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

// ============================================================================
// WHITE-LABEL CLIENT MANAGEMENT
// ============================================================================

/**
 * Get all white-label clients
 */
export async function getAllClients(): Promise<{
  success: boolean;
  clients?: WhiteLabelConfig[];
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; clients: WhiteLabelConfig[] }>(
    '/white-label/clients',
    { method: 'GET' }
  );

  if (result.success && result.data) {
    return {
      success: true,
      clients: result.data.clients,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to fetch clients',
  };
}

/**
 * Get single white-label client by ID
 */
export async function getClient(clientId: string): Promise<{
  success: boolean;
  client?: WhiteLabelConfig;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; client: WhiteLabelConfig }>(
    `/white-label/clients/${clientId}`,
    { method: 'GET' }
  );

  if (result.success && result.data) {
    return {
      success: true,
      client: result.data.client,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to fetch client',
  };
}

/**
 * Create new white-label client
 */
export async function createClient(clientData: {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  appName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  plan?: 'enterprise' | 'custom';
  monthlyFee?: number;
  setupFee?: number;
  features?: {
    subcontractorPortal?: boolean;
    employeePortal?: boolean;
    vendorPortal?: boolean;
    messaging?: boolean;
    analytics?: boolean;
    apiAccess?: boolean;
  };
}): Promise<{
  success: boolean;
  client?: WhiteLabelConfig;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; client: WhiteLabelConfig }>(
    '/white-label/clients',
    {
      method: 'POST',
      body: JSON.stringify(clientData),
    }
  );

  if (result.success && result.data) {
    return {
      success: true,
      client: result.data.client,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to create client',
  };
}

/**
 * Update white-label client
 */
export async function updateClient(
  clientId: string,
  updates: Partial<WhiteLabelConfig>
): Promise<{
  success: boolean;
  client?: WhiteLabelConfig;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; client: WhiteLabelConfig }>(
    `/white-label/clients/${clientId}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );

  if (result.success && result.data) {
    return {
      success: true,
      client: result.data.client,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update client',
  };
}

/**
 * Delete white-label client (soft delete)
 */
export async function deleteClient(clientId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; message: string }>(
    `/white-label/clients/${clientId}`,
    { method: 'DELETE' }
  );

  if (result.success && result.data) {
    return {
      success: true,
      message: result.data.message,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to delete client',
  };
}

/**
 * Update client branding
 */
export async function updateBranding(
  clientId: string,
  brandingUpdates: Partial<WhiteLabelConfig['branding']>
): Promise<{
  success: boolean;
  client?: WhiteLabelConfig;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; client: WhiteLabelConfig }>(
    `/white-label/clients/${clientId}/branding`,
    {
      method: 'PUT',
      body: JSON.stringify(brandingUpdates),
    }
  );

  if (result.success && result.data) {
    return {
      success: true,
      client: result.data.client,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update branding',
  };
}

/**
 * Update client features
 */
export async function updateFeatures(
  clientId: string,
  featureUpdates: Partial<WhiteLabelConfig['features']>
): Promise<{
  success: boolean;
  client?: WhiteLabelConfig;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; client: WhiteLabelConfig }>(
    `/white-label/clients/${clientId}/features`,
    {
      method: 'PUT',
      body: JSON.stringify(featureUpdates),
    }
  );

  if (result.success && result.data) {
    return {
      success: true,
      client: result.data.client,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update features',
  };
}

/**
 * Trigger build for client
 */
export async function triggerBuild(
  clientId: string,
  platform: 'ios' | 'android' | 'both' = 'both'
): Promise<{
  success: boolean;
  buildId?: string;
  message?: string;
  error?: string;
}> {
  const result = await apiRequest<{ success: boolean; buildId: string; message: string }>(
    `/white-label/clients/${clientId}/build`,
    {
      method: 'POST',
      body: JSON.stringify({ platform }),
    }
  );

  if (result.success && result.data) {
    return {
      success: true,
      buildId: result.data.buildId,
      message: result.data.message,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to trigger build',
  };
}

/**
 * Get build status
 */
export async function getBuildStatus(buildId: string): Promise<{
  success: boolean;
  build?: {
    id: string;
    clientId: string;
    platform: string;
    status: string;
    queuedAt: string;
    logs: string[];
  };
  error?: string;
}> {
  const result = await apiRequest<{
    success: boolean;
    build: {
      id: string;
      clientId: string;
      platform: string;
      status: string;
      queuedAt: string;
      logs: string[];
    };
  }>(`/white-label/builds/${buildId}`, { method: 'GET' });

  if (result.success && result.data) {
    return {
      success: true,
      build: result.data.build,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to fetch build status',
  };
}

/**
 * Get statistics summary
 */
export async function getStatistics(): Promise<{
  success: boolean;
  stats?: {
    totalClients: number;
    activeClients: number;
    setupClients: number;
    pendingClients: number;
    suspendedClients: number;
    monthlyRevenue: number;
    totalRevenue: number;
    lifetimeValue: number;
    totalUsers: number;
    activeUsers: number;
    totalDownloads: number;
    averageRating: number;
    iosLiveApps: number;
    androidLiveApps: number;
    buildsInProgress: number;
  };
  error?: string;
}> {
  const result = await apiRequest<{
    success: boolean;
    stats: {
      totalClients: number;
      activeClients: number;
      setupClients: number;
      pendingClients: number;
      suspendedClients: number;
      monthlyRevenue: number;
      totalRevenue: number;
      lifetimeValue: number;
      totalUsers: number;
      activeUsers: number;
      totalDownloads: number;
      averageRating: number;
      iosLiveApps: number;
      androidLiveApps: number;
      buildsInProgress: number;
    };
  }>('/white-label/stats', { method: 'GET' });

  if (result.success && result.data) {
    return {
      success: true,
      stats: result.data.stats,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to fetch statistics',
  };
}

/**
 * Initialize system with sample data
 */
export async function initializeSystem(): Promise<{
  success: boolean;
  message?: string;
  clients?: WhiteLabelConfig[];
  clientCount?: number;
  error?: string;
}> {
  const result = await apiRequest<{
    success: boolean;
    message: string;
    clients?: WhiteLabelConfig[];
    clientCount?: number;
  }>('/white-label/initialize', { method: 'POST' });

  if (result.success && result.data) {
    return {
      success: true,
      message: result.data.message,
      clients: result.data.clients,
      clientCount: result.data.clientCount,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to initialize system',
  };
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Quick method to check if system is initialized
 */
export async function isSystemInitialized(): Promise<boolean> {
  const result = await getAllClients();
  return result.success && (result.clients?.length || 0) > 0;
}

/**
 * Quick method to get client count
 */
export async function getClientCount(): Promise<number> {
  const result = await getAllClients();
  return result.clients?.length || 0;
}

/**
 * Update client status
 */
export async function updateClientStatus(
  clientId: string,
  status: 'setup' | 'pending' | 'building' | 'testing' | 'active' | 'suspended' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  return await updateClient(clientId, { status });
}

/**
 * Update billing status
 */
export async function updateBillingStatus(
  clientId: string,
  billingStatus: 'current' | 'overdue' | 'suspended' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  const result = await updateClient(clientId, {
    billing: { billingStatus } as any,
  });

  return {
    success: result.success,
    error: result.error,
  };
}
