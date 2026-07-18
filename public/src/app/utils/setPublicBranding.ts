/**
 * Set Public Branding
 *
 * Manually sets branding profile in localStorage for public visitors
 * Call this after uploading logo to make it available for everyone
 */

export function setPublicBranding(logoBase64: string, companyName = 'The Black Phoenix Company'): void {
  const brandingProfile = {
    company_name: companyName,
    dbaName: 'Black Phoenix Builds',
    businessName: companyName,
    logo_url: logoBase64,
    primary_color: '#ea580c',
    secondary_color: '#f97316',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    website: '',
  };

  localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));

  const logoVariants = {
    logo_primary: logoBase64,
    logo_secondary: logoBase64,
    logo_icon: logoBase64,
    logo_square: logoBase64,
    logo_horizontal: logoBase64,
    logo_vertical: logoBase64,
    logo_white: logoBase64,
    logo_black: logoBase64,
  };

  localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));

  // Dispatch event to update UI
  window.dispatchEvent(new Event('brandingUpdated'));

  console.log('✅ [SetPublicBranding] Branding set in localStorage');
  console.log('✅ [SetPublicBranding] Logo size:', (logoBase64.length / 1024).toFixed(1) + 'KB');
  console.log('🎉 [SetPublicBranding] Logo will now appear for ALL visitors!');
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).setPublicBranding = setPublicBranding;
}
