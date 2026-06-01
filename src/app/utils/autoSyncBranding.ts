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

        // FIRST: Try to find "The Black Phoenix Company LLC" specifically
        console.log('🔍 [AutoSync] Looking for The Black Phoenix Company LLC...');
        let { data: companies, error } = await supabase
          .from('companies')
          .select('*')
          .ilike('company_name', '%black phoenix%')
          .order('created_at', { ascending: false });

        // If not found, get the most recent company
        if (!companies || companies.length === 0) {
          console.log('⚠️ [AutoSync] Black Phoenix Company not found, getting most recent...');
          const response = await supabase
            .from('companies')
            .select('*')
            .limit(1)
            .order('created_at', { ascending: false });
          companies = response.data;
          error = response.error;
        } else {
          console.log('✅ [AutoSync] Found Black Phoenix Company!');
        }

        if (!error && companies && companies.length > 0) {
          const company = companies[0];
          const logoToUse = company.logo_primary || company.logo_url;

          if (logoToUse) {
            const brandingProfile = {
              company_name: company.company_name || company.name,
              dbaName: company.company_legal_name || company.company_name || company.name,
              businessName: company.company_name || company.name,
              logo_url: logoToUse,
              logo_primary: company.logo_primary,
              logoPrimary: company.logo_primary,
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
            console.log('✅ [AutoSync] Branding synced from companies table');
            console.log('✅ [AutoSync] Company:', company.company_name || company.name);
            console.log('✅ [AutoSync] Logo:', (logoToUse.length / 1024).toFixed(1) + 'KB');

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
          } else {
            console.log('⚠️ [AutoSync] Company found but no logo - trying KV store...');
          }
        }

        // SECOND: Try kv_store table for branding profile
        console.log('🔍 [AutoSync] Checking KV store for branding data...');
        const { data: kvData, error: kvError } = await supabase
          .from('kv_store_57095a78')
          .select('*')
          .eq('key', `company_branding_profile_${user.id}`)
          .single();

        if (!kvError && kvData && kvData.value) {
          console.log('✅ [AutoSync] Found branding in KV store');
          const brandingProfile = kvData.value;

          if (brandingProfile.logo_url || brandingProfile.logo_primary || brandingProfile.logoPrimary) {
            localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));
            window.dispatchEvent(new Event('brandingUpdated'));
            console.log('✅ [AutoSync] Synced from KV store with logo');
            return;
          }
        }

        console.log('⚠️ [AutoSync] No logo found in database tables');
      } else {
        console.log('ℹ️ [AutoSync] No authentication - public visitor mode');
        console.log('🔍 [AutoSync] Checking for published public branding...');

        // For public visitors, try to load published branding
        try {
          const { data: publicBranding, error: publicError } = await supabase
            .from('kv_store_57095a78')
            .select('*')
            .eq('key', 'public_branding_profile')
            .single();

          if (!publicError && publicBranding && publicBranding.value) {
            const branding = publicBranding.value;
            if (branding.logo_url || branding.logo_primary || branding.logoPrimary) {
              localStorage.setItem('company_branding_profile', JSON.stringify(branding));
              window.dispatchEvent(new Event('brandingUpdated'));
              console.log('✅ [AutoSync] Loaded public branding for visitor');
              console.log('✅ [AutoSync] Company:', branding.company_name || branding.brandName);
              return;
            }
          }
        } catch (publicError) {
          console.log('⚠️ [AutoSync] Could not load public branding');
        }

        console.log('ℹ️ [AutoSync] No public branding available');
      }
    } catch (authError) {
      console.log('ℹ️ [AutoSync] Auth check failed - public visitor mode');

      // Try public branding even if auth check fails
      try {
        const { data: publicBranding, error: publicError } = await supabase
          .from('kv_store_57095a78')
          .select('*')
          .eq('key', 'public_branding_profile')
          .single();

        if (!publicError && publicBranding && publicBranding.value) {
          const branding = publicBranding.value;
          if (branding.logo_url || branding.logo_primary || branding.logoPrimary) {
            localStorage.setItem('company_branding_profile', JSON.stringify(branding));
            window.dispatchEvent(new Event('brandingUpdated'));
            console.log('✅ [AutoSync] Loaded public branding for visitor');
            return;
          }
        }
      } catch (publicError) {
        console.log('⚠️ [AutoSync] Could not load public branding');
      }
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
