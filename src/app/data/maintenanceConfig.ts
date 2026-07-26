// ─────────────────────────────────────────────────────────────────────────────
// Runtime configuration layer for the AI Maintenance Plan Builder.
//
// The builder and the admin editor both read/write the *runtime* config through
// this module. Code defaults come from maintenancePlans.ts; anything the admin
// saves in the in-app editor is persisted server-side and merged over those
// defaults on load. This lets the business edit services, technician levels,
// frequency tiers, and regional pricing without a code change.
// ─────────────────────────────────────────────────────────────────────────────

import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  ENTITY_TYPES,
  SKILL_LEVELS,
  FREQUENCY_TIERS,
  REGIONS,
  SERVICE_CATALOG,
  type EntityType,
  type EntityConfig,
  type SkillLevel,
  type FrequencyTier,
  type Region,
  type ServiceItem,
} from './maintenancePlans';

export type {
  EntityType,
  EntityConfig,
  SkillLevel,
  FrequencyTier,
  Region,
  ServiceItem,
};

export interface MaintenanceConfig {
  entityTypes: EntityConfig[];
  skillLevels: SkillLevel[];
  frequencyTiers: FrequencyTier[];
  regions: Region[];
  catalog: Record<EntityType, ServiceItem[]>;
}

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

// Deep clone so callers can safely mutate a working copy without touching the
// frozen code defaults.
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultConfig(): MaintenanceConfig {
  return {
    entityTypes: clone(ENTITY_TYPES),
    skillLevels: clone(SKILL_LEVELS),
    frequencyTiers: clone(FREQUENCY_TIERS),
    regions: clone(REGIONS),
    catalog: clone(SERVICE_CATALOG),
  };
}

// Merge a (possibly partial) saved config over the code defaults so that new
// entity types / fields added in code still appear even for older saved configs.
function mergeWithDefaults(saved: Partial<MaintenanceConfig> | null | undefined): MaintenanceConfig {
  const base = getDefaultConfig();
  if (!saved || typeof saved !== 'object') return base;

  const catalog = { ...base.catalog };
  if (saved.catalog && typeof saved.catalog === 'object') {
    for (const key of Object.keys(saved.catalog) as EntityType[]) {
      const items = (saved.catalog as Record<string, ServiceItem[]>)[key];
      if (Array.isArray(items)) {
        // Preserve the admin's edits, but append new code-defined services so a
        // previously saved configuration never hides new catalog options.
        const savedById = new Map(items.map(item => [item.id, item]));
        catalog[key] = [
          ...base.catalog[key].map(item => savedById.get(item.id) || item),
          ...items.filter(item => !base.catalog[key].some(defaultItem => defaultItem.id === item.id)),
        ];
      }
    }
  }

  return {
    entityTypes: Array.isArray(saved.entityTypes) && saved.entityTypes.length
      ? saved.entityTypes
      : base.entityTypes,
    skillLevels: Array.isArray(saved.skillLevels) && saved.skillLevels.length
      ? saved.skillLevels
      : base.skillLevels,
    frequencyTiers: Array.isArray(saved.frequencyTiers) && saved.frequencyTiers.length
      ? saved.frequencyTiers
      : base.frequencyTiers,
    regions: Array.isArray(saved.regions) && saved.regions.length
      ? saved.regions
      : base.regions,
    catalog,
  };
}

// Fetch the saved config from the server, merged over code defaults. Falls back
// to pure defaults if the server is unreachable or nothing has been saved.
export async function fetchMaintenanceConfig(): Promise<MaintenanceConfig> {
  try {
    const res = await fetch(`${SERVER}/maintenance-config`, { headers: authHeaders });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      console.log('Failed to load maintenance config, using defaults:', json?.error);
      return getDefaultConfig();
    }
    return mergeWithDefaults(json.config);
  } catch (err) {
    console.log('Error fetching maintenance config, using defaults:', err);
    return getDefaultConfig();
  }
}

// Persist the full config to the server. Returns true on success.
export async function saveMaintenanceConfig(config: MaintenanceConfig): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER}/maintenance-config`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ config }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      console.log('Failed to save maintenance config:', json?.error);
      return false;
    }
    return true;
  } catch (err) {
    console.log('Error saving maintenance config:', err);
    return false;
  }
}

// Region-aware price computation.
export function computeConfigPrice(
  baseMonthlyPrice: number,
  skillMultiplier: number,
  frequencyMultiplier: number,
  regionMultiplier: number = 1,
): number {
  return Math.round(baseMonthlyPrice * skillMultiplier * frequencyMultiplier * regionMultiplier);
}

export function getConfigCategories(config: MaintenanceConfig, entity: EntityType): string[] {
  return Array.from(new Set((config.catalog[entity] || []).map((s) => s.category)));
}
