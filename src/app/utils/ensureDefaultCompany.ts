/**
 * The local branding fallback, for a browser that has no company yet.
 *
 * IT USED TO INVENT A COMPANY, AND THAT WAS THE BUG
 *
 * This inserted a row into `companies` — "The Black Phoenix Company" at
 * "123 Construction Ave, Boston MA 02101", info@blackphoenixbuilds.com,
 * (617) 710-0058 — whenever the signed-in user had no company of their own.
 *
 * Row-level security on `companies` is "own companies" only, so that check can
 * never see anybody else's. Every new user therefore manufactured another
 * fabricated company. Two of them existed by 2026-10-04, with different user
 * ids and identical invented addresses.
 *
 * What made it harmful rather than untidy: `/public/branding` reads that table
 * with the service role, across all users, taking the NEWEST row. So one
 * person's placeholder became the whole platform's public identity — the name,
 * the phone, the address and the website shown to customers. The real company
 * records, carrying the real Salem address, the real EIN and the real licence
 * numbers, sat underneath being outranked by a row nobody typed.
 *
 * So it no longer writes to the database. If there is genuinely no company,
 * the server's branding route already has its own default, and CompanySetup is
 * where a real one gets entered. Inventing an address is the thing this
 * codebase is most careful not to do everywhere else.
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

    /*
      No company row for this user, and that is allowed to be true.

      Nothing is inserted. The branding below is written to localStorage only,
      so an unconfigured browser still has a name and colours to render while
      the server's own default covers the public pages.
    */
    console.log('ℹ️ [DefaultCompany] No company for this user — using local branding only, writing nothing');

    const defaultCompany = {
      company_name: 'The Black Phoenix Company',
      company_legal_name: 'Black Phoenix Builds',
      primary_color: '#ea580c',
      secondary_color: '#f97316',
      /*
        Deliberately blank. These were a fabricated address, a phone number and
        a retiring domain; an empty field is visibly unset, while an invented
        one looks answered and gets published.
      */
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      website: '',
    };

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
