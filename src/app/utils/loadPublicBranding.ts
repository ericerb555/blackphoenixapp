/**
 * Load Public Branding
 * Fetches company branding from server for public (unauthenticated) visitors
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface PublicBranding {
  company_name?: string;
  dbaName?: string;
  businessName?: string;
  logo_url?: string;
  logo_primary?: string;
  logoPrimary?: string;
  primary_color?: string;
  secondary_color?: string;
  email?: string;
  phone?: string;
}

/**
 * Load branding from server's public endpoint
 * This works for both authenticated and unauthenticated users
 */
export async function loadPublicBranding(): Promise<PublicBranding | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/branding`,
      {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timer));

    if (!response.ok) return null;

    const branding = await response.json();
    return branding;
  } catch {
    // Network unavailable or timed out — silent fallback, app uses defaults
    return null;
  }
}

/**
 * Load branding with fallback chain:
 * 1. Try server public endpoint (works across devices)
 * 2. Fall back to localStorage (device-specific)
 */
const isStorageUrl = (v: any) => typeof v === 'string' && v.startsWith('https://');

export async function loadBrandingWithFallback(): Promise<PublicBranding | null> {
  // 1. Try server — only accepts real Storage URLs (base64 is stripped server-side)
  const serverBranding = await loadPublicBranding();
  const serverLogo = serverBranding?.logo_url || serverBranding?.logo_primary;
  if (serverBranding && isStorageUrl(serverLogo)) {
    console.log('✅ [loadBrandingWithFallback] Using server branding, logo:', serverLogo?.substring(0, 60));
    return serverBranding;
  }

  // 2. Fall back to localStorage — but only use it if it has a real Storage URL
  // (never pass base64 blobs to <img> across devices — they don't transfer)
  try {
    const stored = localStorage.getItem('company_branding_profile');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      const parsed = JSON.parse(stored);
      const localLogo = parsed?.logo_url || parsed?.logo_primary;
      if (isStorageUrl(localLogo)) {
        console.log('✅ [loadBrandingWithFallback] Using localStorage branding (Storage URL)');
        return parsed;
      }
      // Has base64 — return the profile but with logo nulled out so no broken display
      if (localLogo?.startsWith('data:')) {
        console.log('⚠️ [loadBrandingWithFallback] localStorage logo is base64 — returning profile without logo');
        return { ...parsed, logo_url: undefined, logo_primary: undefined };
      }
    }
  } catch (error) {
    console.error('❌ [loadBrandingWithFallback] Error loading from localStorage:', error);
  }

  // 3. Return server branding without logo (company name / colors still useful)
  if (serverBranding) return serverBranding;

  return null;
}
