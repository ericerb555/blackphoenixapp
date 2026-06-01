/**
 * Auto-Sync Branding
 *
 * Automatically syncs branding (including logo) from database when authenticated
 * For public visitors, relies on localStorage pre-populated during logo upload
 */

import { supabase } from '../lib/supabase';

export async function autoSyncBranding(): Promise<void> {
  try {
    console.log('🔄 [AutoSync] Starting automatic branding sync...');

    // Check if we already have branding in localStorage
    const existingBranding = localStorage.getItem('company_branding_profile');
    if (existingBranding && existingBranding !== 'undefined' && existingBranding !== 'null') {
      try {
        const parsed = JSON.parse(existingBranding);
        if (parsed.logo_url) {
          console.log('✅ [AutoSync] Logo already in localStorage - skipping sync');
          console.log('✅ [AutoSync] Logo size:', (parsed.logo_url.length / 1024).toFixed(1) + 'KB');
          return;
        }
      } catch (e) {
        // Invalid JSON, continue with sync
      }
    }

    // Try to sync from database if authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 [AutoSync] User authenticated - fetching from database...');

        const { data: companies, error } = await supabase
          .from('companies')
          .select('*')
          .limit(1)
          .order('created_at', { ascending: false });

        if (!error && companies && companies.length > 0) {
          const company = companies[0];
          const logoToUse = company.logo_primary || company.logo_url;

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
          console.log('✅ [AutoSync] Branding synced from database');
          console.log('✅ [AutoSync] Company:', company.company_name);
          console.log('✅ [AutoSync] Logo:', logoToUse ? (logoToUse.length / 1024).toFixed(1) + 'KB' : 'NOT SET');

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

          // Dispatch event
          window.dispatchEvent(new Event('brandingUpdated'));
          console.log('✅ [AutoSync] Sync complete!');
          return;
        }
      } else {
        console.log('ℹ️ [AutoSync] No authentication - public visitor mode');
        console.log('ℹ️ [AutoSync] Logo must be pre-loaded in localStorage');
      }
    } catch (authError) {
      console.log('ℹ️ [AutoSync] Auth check failed - public visitor mode');
    }

    // If we get here, no logo was found in database
    // BUT DO NOT overwrite if user has already uploaded a logo locally
    console.log('⚠️ [AutoSync] No logo found in database - checking localStorage...');

    const existing = localStorage.getItem('company_branding_profile');
    if (existing && existing !== 'undefined' && existing !== 'null') {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.logo_url || parsed.logo_primary || parsed.logoPrimary) {
          console.log('✅ [AutoSync] User has uploaded logo locally - preserving it');
          return; // Don't overwrite user's uploaded logo
        }
      } catch (e) {
        // Invalid JSON, continue to write defaults
      }
    }

    // Only write defaults if there's truly nothing
    console.log('⚠️ [AutoSync] No branding found anywhere - using defaults');
    const defaultBranding = {
      company_name: 'The Black Phoenix Company',
      dbaName: 'Black Phoenix Builds',
      businessName: 'The Black Phoenix Company',
      logo_url: null,
      primary_color: '#ea580c',
      secondary_color: '#f97316'
    };

    localStorage.setItem('company_branding_profile', JSON.stringify(defaultBranding));

  } catch (error) {
    console.error('❌ [AutoSync] Error:', error);
  }
}

// Auto-run IMMEDIATELY on import
if (typeof window !== 'undefined') {
  console.log('🚀 [AutoSync] Module loaded - starting sync...');

  // Run immediately
  autoSyncBranding().catch(err => {
    console.error('❌ [AutoSync] Initial sync failed:', err);
  });

  // Also make available globally for manual sync
  (window as any).autoSyncBranding = autoSyncBranding;
}
