/**
 * CRITICAL: Ensure Black Phoenix Builds company data ALWAYS exists
 * This runs on EVERY app load to prevent data loss
 */

export const BLACK_PHOENIX_COMPANY = {
  id: 'company_blackphoenix_primary',
  name: 'Black Phoenix Builds',
  slug: 'black-phoenix-builds',
  is_primary: true,
  role: 'owner',
  industry: 'Construction',
  description: 'Black Phoenix Builds - Enterprise Construction Management',
  country: 'USA',
  email: 'info@blackphoenixbuilds.com',
  phone: '(617) 710-0058',
  address: '50A Northwestern Drive',
  city: 'Salem',
  state: 'NH',
  zip_code: '03079',
  logo_url: '',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: new Date().toISOString(),
};

export function ensureCompanyDataExists(): boolean {
  console.log('🛡️ [ensureCompanyData] Running company data protection...');

  try {
    // Check ALL possible storage locations
    const possibleKeys = [
      'companies_offline',
      'companies_global_backup',
      'companies_latest',
      'company_blackphoenix_primary'
    ];

    let dataExists = false;

    // Check if data exists in ANY location
    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);
      if (stored && stored !== 'undefined' && stored !== 'null') {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (Array.isArray(parsed) ? parsed.length > 0 : parsed.id)) {
            console.log(`✅ [ensureCompanyData] Found company data in: ${key}`);
            dataExists = true;
            break;
          }
        } catch (e) {
          console.error(`❌ [ensureCompanyData] Failed to parse ${key}:`, e);
          console.log(`🧹 [ensureCompanyData] Clearing corrupted data from ${key}`);
          localStorage.removeItem(key);
        }
      } else if (stored === 'undefined' || stored === 'null') {
        console.log(`🧹 [ensureCompanyData] Clearing invalid value "${stored}" from ${key}`);
        localStorage.removeItem(key);
      }
    }

    // If NO data exists ANYWHERE, create it NOW
    if (!dataExists) {
      console.log('⚠️ [ensureCompanyData] NO COMPANY DATA FOUND - CREATING NOW!');

      // Save to ALL keys
      localStorage.setItem('companies_offline', JSON.stringify([BLACK_PHOENIX_COMPANY]));
      localStorage.setItem('companies_global_backup', JSON.stringify([BLACK_PHOENIX_COMPANY]));
      localStorage.setItem('companies_latest', JSON.stringify([BLACK_PHOENIX_COMPANY]));
      localStorage.setItem('company_blackphoenix_primary', JSON.stringify(BLACK_PHOENIX_COMPANY));

      console.log('✅ [ensureCompanyData] Black Phoenix Builds created in ALL storage locations');
      return true; // Data was created
    }

    // Data already exists - verify it's in ALL locations for redundancy
    console.log('✅ [ensureCompanyData] Company data exists, ensuring redundancy...');

    // Read from wherever we found it
    let companyData: any = null;
    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed) {
            companyData = Array.isArray(parsed) ? parsed : [parsed];
            break;
          }
        } catch (e) {}
      }
    }

    if (companyData && companyData.length > 0) {
      // Save to ALL keys to ensure redundancy
      localStorage.setItem('companies_offline', JSON.stringify(companyData));
      localStorage.setItem('companies_global_backup', JSON.stringify(companyData));
      localStorage.setItem('companies_latest', JSON.stringify(companyData));
      console.log('✅ [ensureCompanyData] Company data replicated to all backup locations');
    }

    return false; // Data already existed
  } catch (error) {
    console.error('❌ [ensureCompanyData] Critical error:', error);

    // EMERGENCY: Even if there's an error, create the company
    localStorage.setItem('companies_offline', JSON.stringify([BLACK_PHOENIX_COMPANY]));
    localStorage.setItem('companies_global_backup', JSON.stringify([BLACK_PHOENIX_COMPANY]));
    localStorage.setItem('companies_latest', JSON.stringify([BLACK_PHOENIX_COMPANY]));

    return true;
  }
}

// Auto-run on module import
if (typeof window !== 'undefined') {
  ensureCompanyDataExists();
}
