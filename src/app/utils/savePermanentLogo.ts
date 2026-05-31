/**
 * Save Permanent Logo
 *
 * Extracts the logo from company profile and saves it permanently
 * Run in browser console: await window.savePermanentLogo()
 */

import { supabase } from '../lib/supabase';

export async function savePermanentLogo(): Promise<string | null> {
  try {
    console.log('🎨 [SaveLogo] Fetching logo from company profile...');

    // First try localStorage
    const brandingProfile = localStorage.getItem('company_branding_profile');
    if (brandingProfile && brandingProfile !== 'null' && brandingProfile !== 'undefined') {
      const profile = JSON.parse(brandingProfile);
      if (profile.logo_url && profile.logo_url !== 'null' && profile.logo_url !== 'undefined') {
        console.log('✅ [SaveLogo] Found logo in localStorage (' + (profile.logo_url.length / 1024).toFixed(1) + 'KB)');

        // Download the logo
        const link = document.createElement('a');
        link.href = profile.logo_url;
        link.download = 'black-phoenix-logo.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ [SaveLogo] Logo downloaded! Check your Downloads folder.');
        console.log('📝 [SaveLogo] Next: Upload this file back to the project at src/imports/black-phoenix-logo.png');

        return profile.logo_url;
      }
    }

    // If not in localStorage, fetch from database
    console.log('📡 [SaveLogo] Fetching from database...');

    const { data: companies, error } = await supabase
      .from('companies')
      .select('logo_url, logo_primary, company_name')
      .limit(1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [SaveLogo] Database error:', error);
      return null;
    }

    if (!companies || companies.length === 0) {
      console.log('⚠️ [SaveLogo] No companies found in database');
      return null;
    }

    const company = companies[0];
    const logoUrl = company.logo_primary || company.logo_url;

    if (!logoUrl) {
      console.log('⚠️ [SaveLogo] No logo found in company profile');
      return null;
    }

    console.log('✅ [SaveLogo] Found logo in database (' + (logoUrl.length / 1024).toFixed(1) + 'KB)');

    // Download the logo
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'black-phoenix-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ [SaveLogo] Logo downloaded! Check your Downloads folder.');
    console.log('📝 [SaveLogo] Next: Upload this file back to the project at src/imports/black-phoenix-logo.png');

    return logoUrl;

  } catch (error) {
    console.error('❌ [SaveLogo] Error:', error);
    return null;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).savePermanentLogo = savePermanentLogo;
  console.log('🔧 [SaveLogo] Available: window.savePermanentLogo()');
}
