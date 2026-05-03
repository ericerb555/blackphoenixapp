/**
 * Cleanup corrupted localStorage data on app startup
 * Fixes JSON.parse errors from "undefined" strings
 *
 * CRITICAL: This only removes CORRUPTED data (literal "undefined" or "null" strings)
 * It does NOT remove valid data or empty arrays/objects
 */

// Run cleanup immediately when this module is imported
(function cleanupCorruptedLocalStorage() {
  try {
    console.log('🧹 Cleaning up corrupted localStorage...');

    let cleanedCount = 0;

    // CRITICAL: Keys to NEVER delete - company data is sacred
    const protectedKeys = [
      'companies_offline',
      'companies_global_backup',
      'companies_latest',
      'company_blackphoenix_primary',
      'company_branding_profile',
      'company_branding_profile_backup',
      'company_logo_variants',
      'company_documents',
      'investmentOpportunities',
    ];

    // Check all localStorage keys for corrupted data
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keysToCheck.push(key);
    }

    keysToCheck.forEach(key => {
      try {
        // NEVER delete protected keys
        if (protectedKeys.includes(key)) {
          console.log(`  🛡️ Skipping protected key: ${key}`);
          return;
        }

        const value = localStorage.getItem(key);

        // Only remove if value is LITERALLY the string "undefined" or "null" or empty
        if (value === 'undefined' || value === 'null' || value === '') {
          console.warn(`  🗑️ Removing corrupted key: ${key} (value: "${value}")`);
          localStorage.removeItem(key);
          cleanedCount++;
        }
        // NOTE: We do NOT try to JSON.parse every value anymore
        // That was too aggressive and could delete valid base64 image data
      } catch (error) {
        console.error(`  ❌ Error checking key ${key}:`, error);
      }
    });

    if (cleanedCount > 0) {
      console.log(`✅ Cleaned ${cleanedCount} corrupted localStorage entries`);
    } else {
      console.log('✅ No corrupted localStorage entries found');
    }
  } catch (error) {
    console.error('Failed to cleanup localStorage:', error);
  }
})();

export {};
