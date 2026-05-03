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

// Save original localStorage methods
const originalClear = localStorage.clear.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

// Override localStorage.clear to preserve company data
localStorage.clear = function() {
  console.warn('🛡️ [CompanyDataProtection] localStorage.clear() intercepted - preserving company data');

  // Save company data
  const preserved: Record<string, string | null> = {};
  PROTECTED_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      preserved[key] = value;
    }
  });

  // Clear everything
  originalClear();

  // Restore company data
  Object.entries(preserved).forEach(([key, value]) => {
    if (value) {
      localStorage.setItem(key, value);
    }
  });

  console.log('✅ [CompanyDataProtection] Company data preserved through clear()');
};

// Override localStorage.removeItem to prevent accidental deletion of protected keys
const originalRemoveItemFn = localStorage.removeItem;
localStorage.removeItem = function(key: string) {
  if (PROTECTED_KEYS.includes(key)) {
    console.warn(`🛡️ [CompanyDataProtection] Blocked attempt to delete protected key: ${key}`);
    console.trace('Stack trace for blocked deletion attempt:');
    return;
  }
  originalRemoveItemFn.call(localStorage, key);
};

console.log('✅ [CompanyDataProtection] Protection system active');

export { PROTECTED_KEYS };
