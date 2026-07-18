/**
 * Auto-Sync Branding
 *
 * Automatically syncs branding (including logo) from database when authenticated
 * For public visitors, relies on localStorage pre-populated during logo upload
 */

import { supabase } from '../lib/supabase';

// Permanent logo URL — stored in GitHub, always accessible, survives all deploys
const PERMANENT_LOGO_URL = 'https://raw.githubusercontent.com/ericerb555/blackphoenixapp/main/public/phoenix-logo.png';

function applyLogoImmediately() {
  // ALWAYS write the phoenix logo — no conditions, no skipping
  try {
    const existing = JSON.parse(localStorage.getItem('company_branding_profile') || '{}');
    const profile = {
      ...existing,
      logo_url: PERMANENT_LOGO_URL,
      logo_primary: PERMANENT_LOGO_URL,
      primaryLogo: PERMANENT_LOGO_URL,
      logoPrimary: PERMANENT_LOGO_URL,
      dbaName: existing.dbaName || 'Black Phoenix Builds',
      company_name: existing.company_name || 'Black Phoenix Company',
      businessName: existing.businessName || 'Black Phoenix Builds',
    };
    localStorage.setItem('company_branding_profile', JSON.stringify(profile));
    localStorage.setItem('company_logo_variants', JSON.stringify({
      logo_primary: PERMANENT_LOGO_URL,
      logo_horizontal: PERMANENT_LOGO_URL,
      logo_square: PERMANENT_LOGO_URL,
      logo_icon: PERMANENT_LOGO_URL,
    }));
    window.dispatchEvent(new Event('brandingUpdated'));
  } catch {}
}

export async function autoSyncBranding(): Promise<void> {
  // Apply logo immediately — no waiting for DB
  applyLogoImmediately();

  try {
    console.log('🔄 [AutoSync] Starting automatic branding sync...');

    // ALWAYS sync from database if authenticated (don't skip even if localStorage has data)
    // This ensures we always get the latest logo from the database
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
    console.log('⚠️ [AutoSync] No logo found in database');

    // DO NOT write defaults - this would overwrite any existing logo
    // Let the existing localStorage data persist
    console.log('ℹ️ [AutoSync] Keeping existing localStorage data (if any)');

  } catch (error) {
    console.error('❌ [AutoSync] Error:', error);
  }
}

// Auto-run IMMEDIATELY on import — apply logo before React even mounts
if (typeof window !== 'undefined') {
  applyLogoImmediately(); // synchronous — runs before any React render
  console.log('🚀 [AutoSync] Module loaded - starting sync...');

  // Run immediately
  autoSyncBranding().catch(err => {
    console.error('❌ [AutoSync] Initial sync failed:', err);
  });

  // Also make available globally for manual sync
  (window as any).autoSyncBranding = autoSyncBranding;
}
