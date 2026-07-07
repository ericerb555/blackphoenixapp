/**
 * Debug utility to check logo data in localStorage
 * Run this in browser console to see what's stored
 */

export function debugLogoData() {
  console.group('🔍 Logo Data Debug');

  // Check logo variants
  const logoVariants = localStorage.getItem('company_logo_variants');
  console.log('Logo Variants (raw):', logoVariants);
  if (logoVariants && logoVariants !== 'undefined' && logoVariants !== 'null') {
    try {
      const parsed = JSON.parse(logoVariants);
      console.log('Logo Variants (parsed):', parsed);
      console.log('  - logo_primary:', parsed.logo_primary);
      console.log('  - logo_horizontal:', parsed.logo_horizontal);
      console.log('  - logo_square:', parsed.logo_square);
    } catch (e) {
      console.error('Failed to parse logo variants:', e);
    }
  } else {
    console.log('ℹ️ No logo variants in localStorage (will be created when company data is set)');
  }

  // Check branding profile
  const branding = localStorage.getItem('company_branding_profile');
  console.log('\nBranding Profile (raw):', branding?.substring(0, 200));
  if (branding && branding !== 'undefined' && branding !== 'null') {
    try {
      const parsed = JSON.parse(branding);
      console.log('Branding Profile (parsed):', {
        dbaName: parsed.dbaName,
        logo_url: parsed.logo_url,
        businessName: parsed.businessName,
      });
    } catch (e) {
      console.error('Failed to parse branding profile:', e);
    }
  } else {
    console.log('ℹ️ No branding profile in localStorage (will be created when company data is set)');
  }

  // Check for any other logo-related keys
  console.log('\nAll localStorage keys with "logo":', );
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.toLowerCase().includes('logo')) {
      console.log(`  - ${key}:`, localStorage.getItem(key)?.substring(0, 100));
    }
  }

  console.groupEnd();
}

// Make available globally (but don't auto-run - only run when manually called)
if (typeof window !== 'undefined') {
  (window as any).debugLogoData = debugLogoData;
  console.log('🔧 Debug utility available: Run window.debugLogoData() to check logo data');
}
