/**
 * Company Data Recovery Utilities
 * Run these in the browser console to recover lost company data
 */

export function scanLocalStorageForCompanies() {
  console.log('🔍 Scanning localStorage for company data...');
  console.log('==========================================');
  
  const results: any[] = [];
  
  // Scan all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      console.log(`Key ${i}: ${key}`);
      
      if (key.includes('companies') || key.includes('company') || key.includes('business')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log(`\n✅ FOUND COMPANY DATA: ${key}`);
            console.log('Data:', parsed);
            
            if (Array.isArray(parsed)) {
              console.log(`📊 Contains ${parsed.length} companies:`);
              parsed.forEach((company: any, idx: number) => {
                console.log(`  ${idx + 1}. ${company.name} (ID: ${company.id})`);
              });
            }
            
            results.push({ key, data: parsed });
          } catch (e) {
            console.log(`⚠️ ${key}: Could not parse JSON`);
          }
        }
      }
    }
  }
  
  console.log('\n==========================================');
  console.log(`Total company data sources found: ${results.length}`);
  
  return results;
}

export function getAllLocalStorageKeys() {
  console.log('📋 All localStorage keys:');
  console.log('==========================================');
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      const size = value ? (value.length / 1024).toFixed(2) : '0';
      console.log(`${i + 1}. ${key} (${size} KB)`);
    }
  }
}

export function exportCompanyData(key: string) {
  const value = localStorage.getItem(key);
  if (!value) {
    console.error(`❌ No data found for key: ${key}`);
    return;
  }
  
  try {
    const parsed = JSON.parse(value);
    console.log('✅ Company data exported:');
    console.log(JSON.stringify(parsed, null, 2));
    
    // Also copy to clipboard
    navigator.clipboard?.writeText(JSON.stringify(parsed, null, 2));
    console.log('📋 Copied to clipboard!');
  } catch (e) {
    console.error('❌ Failed to parse data');
  }
}

export function restoreCompanyData(userId: string, data: any[]) {
  const storageKey = `companies_${userId}`;
  localStorage.setItem(storageKey, JSON.stringify(data));
  console.log(`✅ Restored ${data.length} companies to ${storageKey}`);
  console.log('🔄 Please refresh the page to see your companies');
}

// Make functions globally available
if (typeof window !== 'undefined') {
  (window as any).scanLocalStorageForCompanies = scanLocalStorageForCompanies;
  (window as any).getAllLocalStorageKeys = getAllLocalStorageKeys;
  (window as any).exportCompanyData = exportCompanyData;
  (window as any).restoreCompanyData = restoreCompanyData;
}
