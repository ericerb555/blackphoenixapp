/**
 * Cleanup corrupted localStorage data on app startup
 * Fixes JSON.parse errors from "undefined" strings
 *
 * CRITICAL: This only removes CORRUPTED data (literal "undefined" or "null" strings)
 * It does NOT remove valid data or empty arrays/objects
 */

// DISABLED: This cleanup was deleting valid company data
// The protectCompanyData.ts module now handles all protection
// DO NOT RUN CLEANUP ON STARTUP - IT DELETES USER DATA

console.log('⚠️ [CleanupCorruptedStorage] DISABLED - All protection now handled by protectCompanyData.ts');

// Helper function to check if a key should be protected
function isProtectedKey(key: string): boolean {
  // Pattern matching for dynamic keys
  const protectedPatterns = [
    /^companies_/,  // companies_{userId}
    /^company_/,    // company_*
  ];

  const exactProtectedKeys = [
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

  if (exactProtectedKeys.includes(key)) return true;
  return protectedPatterns.some(pattern => pattern.test(key));
}

// Export the check function for manual use only
export { isProtectedKey };

export {};
