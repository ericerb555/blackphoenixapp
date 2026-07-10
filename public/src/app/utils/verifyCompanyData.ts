/**
 * Company Data Verification and Recovery Utility
 *
 * UPDATED: Uses single cache key to prevent conflicts
 * Run this in the console to check what company data exists
 */

export function verifyCompanyData() {
  console.log('🔍 [CompanyData] Scanning localStorage...\n');

  // UPDATED: Only check the NEW single cache key
  const companyKeys = [
    'companies_cache',      // NEW: Single source of truth
    'active_company_id',    // Active company selection
  ];

  const found: Record<string, any> = {};
  const missing: string[] = [];

  companyKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        found[key] = JSON.parse(value);
        console.log(`✅ ${key}:`, found[key]);
      } catch {
        console.log(`⚠️  ${key}: exists but not JSON`);
      }
    } else {
      missing.push(key);
      console.log(`❌ ${key}: NOT FOUND`);
    }
  });

  console.log(`\n📊 Summary: ${Object.keys(found).length} found, ${missing.length} missing`);

  if (Object.keys(found).length === 0) {
    console.warn('⚠️ NO COMPANY DATA FOUND! User needs to create a company.');
    // Don't auto-create - let the user create their own company
  }

  return { found, missing };
}

export function createDefaultCompanyData() {
  const defaultBranding = {
    company_name: 'The Black Phoenix Company',
    company_tagline: 'Building Dreams, Transforming Spaces',
    phone: '(617) 710-0058',
    email: 'info@blackphoenixbuilds.com',
    street_address: '50A Northwestern Drive',
    city: 'Salem',
    state: 'NH',
    zip_code: '03079',
    logo_url: null,
    primary_color: '#ea580c',
    secondary_color: '#fb923c',
    accent_color: '#f97316'
  };

  const defaultCompany = {
    id: 'company_blackphoenix_primary',
    company_name: 'The Black Phoenix Company',
    slug: 'black-phoenix-company',
    is_primary: true,
    role: 'owner',
    industry: 'Construction',
    description: 'Building Dreams, Transforming Spaces, Creating Opportunities',
    country: 'USA',
    ...defaultBranding
  };

  // UPDATED: Save to SINGLE cache only
  localStorage.setItem('companies_cache', JSON.stringify([defaultCompany]));

  console.log('✅ Default company data created in companies_cache');

  // Trigger event to notify components
  window.dispatchEvent(new CustomEvent('companySaved', { detail: defaultCompany }));

  return defaultBranding;
}

// Auto-run verification on import
if (typeof window !== 'undefined') {
  console.log('🔍 [CompanyData] Verification utility loaded. Run verifyCompanyData() in console to check data.');
}
