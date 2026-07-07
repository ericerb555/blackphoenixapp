/**
 * Cleanup Old LocalStorage Keys
 *
 * CRITICAL: MIGRATES data from old keys to new cache BEFORE deleting
 * ONLY keeps: companies_cache, active_company_id
 * Run in browser console: window.cleanupLocalStorage()
 */

export function cleanupLocalStorage(autoMode = false) {
  if (!autoMode) {
    console.group('🧹 localStorage Cleanup - COMPREHENSIVE');
  }

  // STEP 1: MIGRATE data from old keys to companies_cache BEFORE deleting anything
  const oldCompanyKeys = [
    'companies_offline',
    'companies_global_backup',
    'companies_latest',
    'companies',
  ];

  let companiesData: any[] = [];
  let foundDataInKey: string | null = null;

  // Check if companies_cache already has data
  const existingCache = localStorage.getItem('companies_cache');
  if (existingCache) {
    try {
      const parsed = JSON.parse(existingCache);
      if (Array.isArray(parsed) && parsed.length > 0) {
        companiesData = parsed;
        foundDataInKey = 'companies_cache';
        console.log(`✅ [Cleanup] Found ${companiesData.length} companies in companies_cache - preserving`);
      }
    } catch (e) {
      console.warn('[Cleanup] Failed to parse companies_cache');
    }
  }

  // If no data in cache, migrate from old keys
  if (companiesData.length === 0) {
    for (const key of oldCompanyKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            companiesData = parsed;
            foundDataInKey = key;
            console.log(`✅ [Cleanup] Migrating ${companiesData.length} companies from ${key} to companies_cache`);
            break; // Use first valid data found
          }
        } catch (e) {
          console.warn(`[Cleanup] Failed to parse ${key}`);
        }
      }
    }

    // Save migrated data to companies_cache
    if (companiesData.length > 0) {
      localStorage.setItem('companies_cache', JSON.stringify(companiesData));
      console.log(`💾 [Cleanup] Migration complete - saved to companies_cache`);
    }
  }

  // STEP 2: Now safe to remove old keys
  const preserveKeys = [
    'companies_cache',        // Single source of truth for companies
    'active_company_id',      // User's selected active company
    'currentUserProfile',     // User auth profile
    'last_companies_save',    // Save timestamp
    'company_branding_profile', // CRITICAL: Logo and branding for landing page
    'company_logo_variants',    // CRITICAL: Logo variants for different uses
  ];

  const removedKeys: string[] = [];
  let removedCount = 0;

  // Get all keys first (because we'll be modifying during iteration)
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }

  // Remove ALL old company-related keys except the preserved ones
  allKeys.forEach(key => {
    // Skip preserved keys
    if (preserveKeys.includes(key)) {
      return;
    }

    // Remove old company cache keys
    if (
      key.startsWith('companies_') ||
      key.startsWith('company_') ||
      key.includes('active_session') ||
      key === 'last_migration_check' ||
      key === 'migration_timestamp'
    ) {
      try {
        localStorage.removeItem(key);
        removedKeys.push(key);
        removedCount++;
      } catch (e) {
        // Ignore errors
      }
    }
  });

  if (!autoMode) {
    console.log(`\n✅ Cleanup complete:`);
    if (foundDataInKey) {
      console.log(`  - Migrated data from: ${foundDataInKey}`);
      console.log(`  - Companies preserved: ${companiesData.length}`);
    }
    console.log(`  - Removed ${removedCount} old/duplicate keys`);
    console.log(`  - Kept ONLY: ${preserveKeys.join(', ')}`);
    if (removedKeys.length > 0 && !autoMode) {
      console.log(`\n📋 Removed keys:`);
      removedKeys.forEach(key => console.log(`    ❌ ${key}`));
    }
    console.groupEnd();
  } else {
    if (companiesData.length > 0) {
      console.log(`✅ [Cleanup] Migrated ${companiesData.length} companies to companies_cache`);
    }
    if (removedCount > 0) {
      console.log(`🧹 [Cleanup] Removed ${removedCount} old localStorage keys`);
    }
  }

  return {
    removed: removedCount,
    removedKeys,
    preservedKeys: preserveKeys,
    migrated: companiesData.length,
    migratedFrom: foundDataInKey
  };
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).cleanupLocalStorage = cleanupLocalStorage;

  // Run automatic cleanup on first load (silent mode)
  setTimeout(() => {
    const result = cleanupLocalStorage(true);
    if (result.migrated > 0 || result.removed > 0) {
      console.log(`✅ [Cleanup] Migration: ${result.migrated} companies, Removed: ${result.removed} old keys`);
    }
  }, 500);

  console.log('ℹ️ [Cleanup] Run window.cleanupLocalStorage() to manually remove old localStorage keys');
}

export {};
