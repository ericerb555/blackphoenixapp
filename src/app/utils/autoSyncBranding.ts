/**
 * Auto-Sync Branding
 *
 * Automatically syncs branding (including logo) from database when authenticated
 * For public visitors, relies on localStorage pre-populated during logo upload
 */

import { supabase } from '../lib/supabase';
import { loadPublicBranding } from './loadPublicBranding';
// The real logo, bundled with the app so it survives deploys AND is always the
// correct artwork (the previous GitHub-hosted URL pointed at the wrong image).
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';

// Permanent logo URL — the bundled phoenix asset (hashed & served by the build).
const PERMANENT_LOGO_URL = phoenixLogo;

/**
 * Published branding for a signed-out visitor.
 *
 * WHY THIS GOES THROUGH THE PUBLIC ENDPOINT
 *
 * This used to read `kv_store_57095a78` directly with `.single()`, in two
 * identical copies. The row it wants does exist, but RLS correctly gives the
 * anon role nothing back — and PostgREST answers 406 when `.single()` matches
 * no row. So every signed-out page load fired a request that could only ever
 * fail:
 *
 *     406  /rest/v1/kv_store_57095a78?select=*&key=eq.public_branding_profile
 *
 * It was wrapped in a try/catch, so nothing broke and branding quietly fell
 * back to defaults. That is why it survived: the only visible trace was a red
 * line in a console nobody had open. It was found while walking the Phoenix
 * Exchange in a browser, which is a surface built entirely for signed-out
 * visitors — so this fired on every single view of it.
 *
 * `loadPublicBranding` asks `/public/branding` on the server, which is built
 * for exactly this and answers 200 to the anon key. The KV table is not
 * readable by a visitor and should not be: it holds everything.
 */
async function applyPublicBranding(): Promise<boolean> {
  try {
    const branding = await loadPublicBranding();
    if (!branding) return false;
    if (!branding.logo_url && !branding.logo_primary && !branding.logoPrimary) return false;

    localStorage.setItem('company_branding_profile', JSON.stringify(branding));
    window.dispatchEvent(new Event('brandingUpdated'));
    console.log('✅ [AutoSync] Loaded public branding for visitor:',
      branding.company_name || branding.businessName || '(unnamed)');
    return true;
  } catch {
    // The loader already swallows network failure and returns null; this is
    // only here so a storage refusal cannot take the caller down with it.
    return false;
  }
}

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

        /*
         * SECOND: there used to be a read of `kv_store_57095a78` here, and it
         * could never have returned anything.
         *
         * The note above explains why the signed-OUT path had to stop reading
         * that table. The same rule applies signed IN, which this read assumed
         * it escaped: RLS is enabled on `kv_store_57095a78` with no policies at
         * all, so it denies the `authenticated` role exactly as it denies
         * `anon`. A browser read returns `200 []`, never rows — so this was a
         * fallback that reported "no logo found in database tables" regardless
         * of what the database held.
         *
         * An earlier fix had already changed `single` to `maybeSingle` here, to
         * stop a 406 on every load. That silenced the symptom and left the read
         * in place, which is what made it look settled.
         *
         * It is removed rather than routed through the server, because the two
         * paths above already cover it: the `companies` table read for a
         * signed-in user, and `/public/branding` for everyone else. There is no
         * third source of truth to consult, and `company_branding_profile_<id>`
         * is written by nothing — grep for it.
         *
         * This runs on every sign-in (`Login.tsx`), so it was also a request per
         * login that could only come back empty.
         */
        console.log('⚠️ [AutoSync] No logo found for this account');
      } else {
        console.log('ℹ️ [AutoSync] No authentication - public visitor mode');
        console.log('🔍 [AutoSync] Checking for published public branding...');

        // For public visitors, try the published branding on the server.
        if (await applyPublicBranding()) return;

        console.log('ℹ️ [AutoSync] No public branding available');
      }
    } catch (authError) {
      console.log('ℹ️ [AutoSync] Auth check failed - public visitor mode');

      // Same path when the auth check itself failed: still a visitor.
      if (await applyPublicBranding()) return;
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
