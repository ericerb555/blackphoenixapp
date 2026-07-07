/**
 * Sync Branding From Database
 *
 * Forces a sync of branding profile from the database to localStorage
 * This ensures Login and Landing pages always have the latest logo
 */

import { supabase } from '../lib/supabase';

export async function syncBrandingFromDatabase(): Promise<boolean> {
  try {
    console.log('🔄 [BrandingSync] Syncing branding from database...');

    // Load first company from database
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [BrandingSync] Database error:', error);
      return false;
    }

    if (!companies || companies.length === 0) {
      console.log('ℹ️ [BrandingSync] No companies in database yet');
      return false;
    }

    const company = companies[0];
    const logoToUse = company.logo_primary || company.logo_url;

    console.log('🔄 [BrandingSync] Found company:', company.company_name);
    console.log('🔄 [BrandingSync] Logo available:', logoToUse ? 'YES (' + (logoToUse.length / 1024).toFixed(1) + 'KB)' : 'NO');

    // Update branding profile
    const brandingProfile = {
      company_name: company.company_name,
      dbaName: company.company_legal_name || company.company_name,
      businessName: company.company_name,
      logo_url: logoToUse,
      primary_color: company.primary_color || '#ea580c',
      secondary_color: company.secondary_color || '#f97316',
      email: company.email,
      phone: company.phone,
      address_line1: company.address_line1,
      city: company.city,
      state: company.state,
      zip_code: company.zip_code,
      country: company.country,
      website: company.website,
    };

    localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));

    // Update logo variants
    const logoVariants = {
      logo_primary: company.logo_primary,
      logo_secondary: company.logo_secondary,
      logo_icon: company.logo_icon,
      logo_square: company.logo_square,
      logo_horizontal: company.logo_horizontal,
      logo_vertical: company.logo_vertical,
      logo_white: company.logo_white,
      logo_black: company.logo_black,
    };
    localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));

    console.log('✅ [BrandingSync] Branding profile updated');
    console.log('✅ [BrandingSync] Logo in profile:', brandingProfile.logo_url ? 'YES' : 'NO');

    // Dispatch event
    window.dispatchEvent(new Event('brandingUpdated'));

    return true;
  } catch (error) {
    console.error('❌ [BrandingSync] Error:', error);
    return false;
  }
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).syncBrandingFromDatabase = syncBrandingFromDatabase;
  console.log('🔧 [BrandingSync] Available globally: window.syncBrandingFromDatabase()');
}
