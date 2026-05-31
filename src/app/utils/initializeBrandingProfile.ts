/**
 * Initialize Branding Profile
 *
 * Ensures company_branding_profile exists in localStorage
 * by loading it from the first available company in the database
 *
 * NOTE: This is a safety fallback. The main branding profile update
 * happens in SimpleCompanyManager.loadCompanies() when companies are loaded.
 */

import { supabase } from '../lib/supabase';

export async function initializeBrandingProfile(): Promise<void> {
  try {
    // Check if branding profile already exists with a logo
    const existing = localStorage.getItem('company_branding_profile');
    if (existing && existing !== 'null' && existing !== 'undefined') {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.logo_url) {
          console.log('✅ [BrandingInit] Branding profile already exists with logo');
          return;
        }
        console.log('⚠️ [BrandingInit] Branding profile exists but no logo - will try to load from database');
      } catch (e) {
        console.error('❌ [BrandingInit] Failed to parse existing profile:', e);
      }
    }

    console.log('🔍 [BrandingInit] Loading company from database to create/update branding profile...');

    // Load companies from database
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [BrandingInit] Error loading companies:', error);

      // Create a default branding profile only if none exists
      if (!existing) {
        const defaultProfile = {
          company_name: 'The Black Phoenix Company',
          dbaName: 'Black Phoenix Builds',
          businessName: 'The Black Phoenix Company',
          logo_url: null,
          primary_color: '#ea580c',
          secondary_color: '#f97316',
        };
        localStorage.setItem('company_branding_profile', JSON.stringify(defaultProfile));
        console.log('✅ [BrandingInit] Created default branding profile');
      }
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('ℹ️ [BrandingInit] No companies in database yet - will be created when user logs in');

      // Create a default branding profile for unauthenticated pages
      const defaultProfile = {
        company_name: 'The Black Phoenix Company',
        dbaName: 'Black Phoenix Builds',
        businessName: 'The Black Phoenix Company',
        logo_url: null,
        primary_color: '#ea580c',
        secondary_color: '#f97316',
      };
      localStorage.setItem('company_branding_profile', JSON.stringify(defaultProfile));
      console.log('✅ [BrandingInit] Created default branding profile');
      return;
    }

    // Create/update branding profile from first company
    const company = companies[0];
    const logoToUse = company.logo_primary || company.logo_url;

    const brandingProfile = {
      company_name: company.company_name,
      dbaName: company.company_legal_name || company.company_name,
      businessName: company.company_name,
      logo_url: logoToUse,
      primary_color: company.primary_color || '#ea580c',
      secondary_color: company.secondary_color || '#f97316',
    };

    localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));
    console.log('✅ [BrandingInit] Created branding profile from company:', company.company_name);
    console.log('   Logo:', logoToUse ? 'YES (' + (logoToUse.length / 1024).toFixed(2) + 'KB)' : 'NO');

    // Also create logo variants
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
    console.log('✅ [BrandingInit] Created logo variants');

    // Dispatch event to notify components
    window.dispatchEvent(new Event('brandingUpdated'));
    console.log('✅ [BrandingInit] Dispatched brandingUpdated event');
  } catch (error) {
    console.error('❌ [BrandingInit] Error initializing branding profile:', error);

    // Create a default branding profile on error (only if none exists)
    const existing = localStorage.getItem('company_branding_profile');
    if (!existing) {
      const defaultProfile = {
        company_name: 'The Black Phoenix Company',
        dbaName: 'Black Phoenix Builds',
        businessName: 'The Black Phoenix Company',
        logo_url: null,
        primary_color: '#ea580c',
        secondary_color: '#f97316',
      };
      localStorage.setItem('company_branding_profile', JSON.stringify(defaultProfile));
      console.log('✅ [BrandingInit] Created default branding profile (error fallback)');
    }
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Run after a short delay to ensure Supabase is initialized
  setTimeout(() => {
    initializeBrandingProfile().catch(err => {
      console.error('❌ [BrandingInit] Failed to initialize:', err);
    });
  }, 500); // Increased delay to ensure database is ready
}
