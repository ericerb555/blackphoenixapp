/**
 * Company Data Protection System
 *
 * Intercepts localStorage.clear() to prevent accidental company data deletion
 * MUST be imported FIRST before any other code
 */

// Company data keys that should NEVER be deleted
const PROTECTED_KEYS = [
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

// Keys that match patterns (e.g. companies_{userId})
const PROTECTED_PATTERNS = [
  /^companies_/,  // Protects companies_{userId}
  /^company_/,    // Protects any company_ prefix
];

// Save original localStorage methods
const originalClear = localStorage.clear.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

// Helper function to check if a key should be protected
function isProtectedKey(key: string): boolean {
  if (PROTECTED_KEYS.includes(key)) return true;
  return PROTECTED_PATTERNS.some(pattern => pattern.test(key));
}

// Override localStorage.clear to preserve company data
localStorage.clear = function() {
  console.warn('🛡️ [CompanyDataProtection] localStorage.clear() intercepted - preserving company data');

  // Save ALL company data (exact keys + pattern matches)
  const preserved: Record<string, string | null> = {};

  // Check all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isProtectedKey(key)) {
      const value = localStorage.getItem(key);
      if (value) {
        preserved[key] = value;
        console.log(`  🛡️ Protecting: ${key}`);
      }
    }
  }

  // Clear everything
  originalClear();

  // Restore company data
  Object.entries(preserved).forEach(([key, value]) => {
    if (value) {
      localStorage.setItem(key, value);
    }
  });

  console.log(`✅ [CompanyDataProtection] ${Object.keys(preserved).length} keys preserved through clear()`);
};

// Override localStorage.removeItem to prevent accidental deletion of protected keys
const originalRemoveItemFn = localStorage.removeItem;
localStorage.removeItem = function(key: string) {
  if (isProtectedKey(key)) {
    // Silently block deletion of timestamped backup keys (expected behavior from cleanup)
    // Only log warnings for non-backup protected keys
    if (!key.startsWith('companies_backup_')) {
      console.warn(`🛡️ [CompanyDataProtection] Blocked attempt to delete protected key: ${key}`);
      console.trace('Stack trace for blocked deletion attempt:');
    }
    return;
  }
  originalRemoveItemFn.call(localStorage, key);
};

console.log('✅ [CompanyDataProtection] Protection system active');

export { PROTECTED_KEYS };
