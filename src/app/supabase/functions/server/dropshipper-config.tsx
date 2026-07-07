/**
 * Dropshipper Configuration Module
 * Manages dropshipper provider settings and credentials
 */

import * as kv from './kv_store.tsx';

// Configuration keys
const CONFIG_KEY_PREFIX = 'dropshipper_config';
const ENABLED_KEY = `${CONFIG_KEY_PREFIX}:enabled`;
const PROVIDERS_KEY = `${CONFIG_KEY_PREFIX}:providers`;

export interface DropshipperProvider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
  syncInventory: boolean;
  autoForwardOrders: boolean;
  syncInterval: number; // minutes
  settings: {
    markupPercentage?: number;
    fulfillmentTime?: number; // days
    shippingMethods?: string[];
  };
}

export interface DropshipperConfig {
  enabled: boolean;
  providers: DropshipperProvider[];
  lastSync?: string;
}

/**
 * Check if dropshipper module is enabled
 */
export async function isEnabled(): Promise<boolean> {
  try {
    const result = await kv.get(ENABLED_KEY);
    return result === 'true' || result === true;
  } catch (error) {
    console.error('Error checking if dropshipper enabled:', error);
    return false;
  }
}

/**
 * Enable or disable dropshipper module
 */
export async function setEnabled(enabled: boolean): Promise<void> {
  await kv.set(ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Get all dropshipper providers
 */
export async function getProviders(): Promise<DropshipperProvider[]> {
  try {
    const result = await kv.get(PROVIDERS_KEY);
    if (!result) return [];
    if (typeof result === 'string') {
      return JSON.parse(result);
    }
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  } catch (error) {
    console.error('Error getting providers:', error);
    return [];
  }
}

/**
 * Get enabled providers only
 */
export async function getEnabledProviders(): Promise<DropshipperProvider[]> {
  const providers = await getProviders();
  return providers.filter(p => p.enabled);
}

/**
 * Add or update a provider
 */
export async function saveProvider(provider: DropshipperProvider): Promise<void> {
  const providers = await getProviders();
  const existingIndex = providers.findIndex(p => p.id === provider.id);
  
  if (existingIndex >= 0) {
    providers[existingIndex] = provider;
  } else {
    providers.push(provider);
  }
  
  await kv.set(PROVIDERS_KEY, JSON.stringify(providers));
}

/**
 * Remove a provider
 */
export async function removeProvider(providerId: string): Promise<void> {
  const providers = await getProviders();
  const filtered = providers.filter(p => p.id !== providerId);
  await kv.set(PROVIDERS_KEY, JSON.stringify(filtered));
}

/**
 * Get a specific provider
 */
export async function getProvider(providerId: string): Promise<DropshipperProvider | null> {
  const providers = await getProviders();
  return providers.find(p => p.id === providerId) || null;
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(): Promise<void> {
  await kv.set(`${CONFIG_KEY_PREFIX}:last_sync`, new Date().toISOString());
}

/**
 * Get last sync timestamp
 */
export async function getLastSync(): Promise<string | null> {
  try {
    return await kv.get(`${CONFIG_KEY_PREFIX}:last_sync`);
  } catch (error) {
    console.error('Error getting last sync:', error);
    return null;
  }
}

/**
 * Get full configuration
 */
export async function getConfig(): Promise<DropshipperConfig> {
  try {
    const enabled = await isEnabled();
    const providers = await getProviders();
    const lastSync = await getLastSync();
    
    return {
      enabled,
      providers,
      lastSync: lastSync || undefined,
    };
  } catch (error) {
    console.error('Error getting config:', error);
    // Return default config on error
    return {
      enabled: false,
      providers: [],
      lastSync: undefined,
    };
  }
}