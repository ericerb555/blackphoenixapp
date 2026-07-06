import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CompanionAppConfig,
  fetchCompanionAppConfig,
  isFeatureEnabled,
  getFeatureConfig,
  canAccessDataSource,
  logModuleAction
} from '../lib/companionRuntime';
import { supabase } from '../lib/supabase';

interface CompanionAppContextType {
  config: CompanionAppConfig | null;
  loading: boolean;
  error: string | null;
  isFeatureEnabled: (featureKey: string) => boolean;
  getFeatureConfig: <T = Record<string, unknown>>(featureKey: string) => T | null;
  canAccessData: (dataSource: string) => boolean;
  logAction: (
    actionType: string,
    actionName: string,
    resourceType?: string,
    resourceId?: string,
    inputData?: Record<string, unknown>,
    outputData?: Record<string, unknown>,
    durationMs?: number
  ) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const CompanionAppContext = createContext<CompanionAppContextType | null>(null);

interface CompanionAppProviderProps {
  moduleSlug: string;
  userRole: string;
  userId: string;
  children: ReactNode;
}

export function CompanionAppProvider({
  moduleSlug,
  userRole,
  userId,
  children
}: CompanionAppProviderProps) {
  const [config, setConfig] = useState<CompanionAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const appConfig = await fetchCompanionAppConfig(moduleSlug, userRole, userId);

      if (!appConfig) {
        setError('Module not found or inactive');
        return;
      }

      if (!appConfig.module.is_active) {
        setError('This module is currently unavailable');
        return;
      }

      setConfig(appConfig);
    } catch (err) {
      setError('Failed to load application configuration');
      console.error('Error loading companion app config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [moduleSlug, userRole, userId]);

  const checkFeatureEnabled = (featureKey: string): boolean => {
    if (!config) return false;
    return isFeatureEnabled(config, featureKey);
  };

  const getFeatureConfigValue = <T = Record<string, unknown>>(featureKey: string): T | null => {
    if (!config) return null;
    return getFeatureConfig<T>(config, featureKey);
  };

  const checkDataAccess = (dataSource: string): boolean => {
    if (!config) return false;
    return canAccessDataSource(config, dataSource);
  };

  const logAction = async (
    actionType: string,
    actionName: string,
    resourceType?: string,
    resourceId?: string,
    inputData?: Record<string, unknown>,
    outputData?: Record<string, unknown>,
    durationMs?: number
  ) => {
    if (!config) return;

    await logModuleAction(
      config.module.module_id,
      userId,
      actionType,
      actionName,
      resourceType,
      resourceId,
      inputData,
      outputData,
      durationMs,
      'success'
    );
  };

  const value: CompanionAppContextType = {
    config,
    loading,
    error,
    isFeatureEnabled: checkFeatureEnabled,
    getFeatureConfig: getFeatureConfigValue,
    canAccessData: checkDataAccess,
    logAction,
    refreshConfig: loadConfig
  };

  return (
    <CompanionAppContext.Provider value={value}>
      {children}
    </CompanionAppContext.Provider>
  );
}

export function useCompanionApp() {
  const context = useContext(CompanionAppContext);
  if (!context) {
    throw new Error('useCompanionApp must be used within a CompanionAppProvider');
  }
  return context;
}

export function useFeature(featureKey: string) {
  const { isFeatureEnabled, getFeatureConfig } = useCompanionApp();

  return {
    isEnabled: isFeatureEnabled(featureKey),
    config: getFeatureConfig(featureKey)
  };
}

export function useDashboard() {
  const { config } = useCompanionApp();
  return config?.dashboard ?? null;
}

export function useAIConfig() {
  const { config, canAccessData } = useCompanionApp();

  return {
    prompts: config?.ai.prompts ?? [],
    rules: config?.ai.behavior_rules ?? [],
    allowedDataSources: config?.ai.allowed_data_sources ?? [],
    canAccessData
  };
}

export function useModuleInfo() {
  const { config } = useCompanionApp();

  return {
    moduleId: config?.module.module_id,
    moduleSlug: config?.module.module_slug,
    moduleName: config?.module.module_name,
    version: config?.module.version,
    isActive: config?.module.is_active ?? false
  };
}

export function useUserPermissions() {
  const { config } = useCompanionApp();

  return {
    userId: config?.user.id,
    role: config?.user.role,
    permissions: config?.user.permissions ?? []
  };
}
