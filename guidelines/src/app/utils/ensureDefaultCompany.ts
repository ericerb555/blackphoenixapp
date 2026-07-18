/**
 * Ensure Default Company Exists
 *
 * Creates a default company in the database if none exist
 * This ensures branding profile always has a company to load from
 */

import { supabase } from '../lib/supabase';

export async function ensureDefaultCompany(): Promise<void> {
  try {
    console.log('🔍 [DefaultCompany] Checking if companies exist...');

    // Get current user (required for RLS)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('ℹ️ [DefaultCompany] No authenticated user - skipping default company creation');
      // Create a default branding profile anyway for unauthenticated pages
      const defaultBrandingProfile = {
        company_name: 'The Black Phoenix Company',
        dbaName: 'Black Phoenix Builds',
        businessName: 'The Black Phoenix Company',
        logo_url: null,
        primary_color: '#ea580c',
        secondary_color: '#f97316',
      };
      localStorage.setItem('company_branding_profile', JSON.stringify(defaultBrandingProfile));
      return;
    }

    // Check if any companies exist for this user
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (fetchError) {
      console.error('❌ [DefaultCompany] Error checking companies:', fetchError);
      return;
    }

    if (companies && companies.length > 0) {
      console.log('✅ [DefaultCompany] Companies already exist, no need to create default');
      return;
    }

    console.log('📝 [DefaultCompany] No companies found - creating default company...');

    // Create default company with user_id for RLS
    const defaultCompany = {
      id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id, // CRITICAL: Required for RLS
      company_name: 'The Black Phoenix Company',
      company_legal_name: 'Black Phoenix Builds',
      slug: 'black-phoenix-company',
      email: 'info@blackphoenixbuilds.com',
      phone: '(617) 710-0058',
      address_line1: '123 Construction Ave',
      city: 'Boston',
      state: 'MA',
      zip_code: '02101',
      country: 'USA',
      website: 'https://blackphoenixbuilds.com',
      primary_color: '#ea580c',
      secondary_color: '#f97316',
      accent_color: '#fb923c',
      industry: 'Construction',
      description: 'Full-service construction and renovation company',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('companies')
      .insert([defaultCompany]);

    if (insertError) {
      console.error('❌ [DefaultCompany] Error creating default company:', insertError);
      return;
    }

    console.log('✅ [DefaultCompany] Default company created:', defaultCompany.company_name);

    // Create branding profile immediately
    const brandingProfile = {
      company_name: defaultCompany.company_name,
      dbaName: defaultCompany.company_legal_name, // Use company_legal_name, not dba
      businessName: defaultCompany.company_name,
      logo_url: null, // No logo yet - user will upload one
      primary_color: defaultCompany.primary_color,
      secondary_color: defaultCompany.secondary_color,
      email: defaultCompany.email,
      phone: defaultCompany.phone,
      address_line1: defaultCompany.address_line1,
      city: defaultCompany.city,
      state: defaultCompany.state,
      zip_code: defaultCompany.zip_code,
      country: defaultCompany.country,
      website: defaultCompany.website,
    };

    localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));
    console.log('✅ [DefaultCompany] Branding profile created');

    // Create empty logo variants (will be populated when user uploads logos)
    const logoVariants = {
      logo_primary: null,
      logo_secondary: null,
      logo_icon: null,
      logo_square: null,
      logo_horizontal: null,
      logo_vertical: null,
      logo_white: null,
      logo_black: null,
    };
    localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));
    console.log('✅ [DefaultCompany] Logo variants initialized');

    // Dispatch event
    window.dispatchEvent(new Event('brandingUpdated'));
  } catch (error) {
    console.error('❌ [DefaultCompany] Unexpected error:', error);
  }
}

// Auto-run on import
if (typeof window !== 'undefined') {
  // Run after Supabase AND auth are initialized
  // Longer delay to ensure user is authenticated
  setTimeout(() => {
    ensureDefaultCompany().catch(err => {
      console.error('❌ [DefaultCompany] Failed:', err);
    });
  }, 2000);
}
