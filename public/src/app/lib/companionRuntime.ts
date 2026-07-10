/**
 * Companion App Runtime Configuration
 * Manages modular app loading and configuration
 */

export interface CompanionApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  isActive: boolean;
  config: Record<string, unknown>;
  version: string;
  dependencies: string[];
}

export interface RuntimeConfig {
  enabledApps: string[];
  appConfig: Record<string, Record<string, unknown>>;
  featureFlags: Record<string, boolean>;
}

/**
 * Default runtime configuration
 */
const defaultRuntimeConfig: RuntimeConfig = {
  enabledApps: [],
  appConfig: {},
  featureFlags: {
    aiPromptTemplates: true,
    cvMeasurement: true,
    floorPlanEngine: true,
    kitchenDesigner: true,
    renderingEngine: true,
  },
};

/**
 * Get runtime configuration for a company
 */
export function getRuntimeConfig(companyId: string | null): RuntimeConfig {
  // In a real app, this would fetch from database or localStorage
  // For now, return default config
  return defaultRuntimeConfig;
}

/**
 * Check if a companion app is enabled
 */
export function isAppEnabled(appId: string, config?: RuntimeConfig): boolean {
  const cfg = config || defaultRuntimeConfig;
  return cfg.enabledApps.includes(appId) || cfg.featureFlags[appId] === true;
}

/**
 * Get app configuration
 */
export function getAppConfig(appId: string, config?: RuntimeConfig): Record<string, unknown> {
  const cfg = config || defaultRuntimeConfig;
  return cfg.appConfig[appId] || {};
}

/**
 * Update runtime configuration
 */
export function updateRuntimeConfig(
  updates: Partial<RuntimeConfig>,
  config?: RuntimeConfig
): RuntimeConfig {
  const cfg = config || defaultRuntimeConfig;
  return {
    ...cfg,
    ...updates,
  };
}

/**
 * Load companion app modules dynamically
 */
export async function loadCompanionApp(appId: string): Promise<CompanionApp | null> {
  try {
    // In a real implementation, this would dynamically import the app module
    // For now, return a stub
    return {
      id: appId,
      name: appId,
      slug: appId,
      description: `Companion app: ${appId}`,
      category: 'general',
      icon: 'square',
      isActive: true,
      config: {},
      version: '1.0.0',
      dependencies: [],
    };
  } catch (err) {
    console.error(`Error loading companion app ${appId}:`, err);
    return null;
  }
}

export default {
  getRuntimeConfig,
  isAppEnabled,
  getAppConfig,
  updateRuntimeConfig,
  loadCompanionApp,
};
