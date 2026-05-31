/**
 * Sync localStorage data to Supabase
 * This ensures data persists across deployments and browsers
 */

import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

/**
 * Sync company/business profile data to Supabase
 */
export async function syncCompanyDataToSupabase() {
  try {
    console.log('🔄 [Sync] Starting company data sync to Supabase...');

    // Get company data from localStorage
    const companyDataStr = localStorage.getItem('companyData');
    const companiesPrimaryStr = localStorage.getItem('company_primary');

    if (!companyDataStr && !companiesPrimaryStr) {
      console.log('ℹ️ [Sync] No company data found in localStorage');
      return;
    }

    let companyData;
    try {
      companyData = companyDataStr ? JSON.parse(companyDataStr) : null;
    } catch (e) {
      console.warn('⚠️ [Sync] Failed to parse companyData');
    }

    let primaryCompany;
    try {
      primaryCompany = companiesPrimaryStr ? JSON.parse(companiesPrimaryStr) : null;
    } catch (e) {
      console.warn('⚠️ [Sync] Failed to parse company_primary');
    }

    // Build profile object
    const profile = {
      id: companyData?.id || primaryCompany?.id || 'default-company',
      name: companyData?.name || primaryCompany?.name || 'Your Company',
      logo: companyData?.logo_url || companyData?.logo || null,
      website: companyData?.website || null,
      email: companyData?.email || null,
      phone: companyData?.phone || null,
      address: companyData?.address || null,
      city: companyData?.city || null,
      state: companyData?.state || null,
      zip_code: companyData?.zip_code || null,
      description: companyData?.description || null,
      founded_date: companyData?.founded_date || null,
      industry: companyData?.industry || null,
    };

    // Send to Supabase
    const response = await fetch(`${API_BASE}/business-profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (response.ok) {
      console.log('✅ [Sync] Company data synced to Supabase successfully');
    } else {
      const error = await response.text();
      console.warn('⚠️ [Sync] Failed to sync company data:', error);
    }
  } catch (error) {
    // Silently fail - this is not critical for app functionality
    console.log('ℹ️ [Sync] Could not sync company data (offline or not configured)');
  }
}

/**
 * Load company data from Supabase and populate localStorage
 */
export async function loadCompanyDataFromSupabase() {
  try {
    console.log('📥 [Sync] Loading company data from Supabase...');

    const response = await fetch(`${API_BASE}/business-profiles`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      console.log('ℹ️ [Sync] No company data in Supabase yet');
      return;
    }

    const profiles = await response.json();

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️ [Sync] No profiles found in Supabase');
      return;
    }

    // Get the first profile (or primary if multiple exist)
    const profile = profiles[0];

    // Only update localStorage if it's empty
    const existingCompanyData = localStorage.getItem('companyData');
    if (!existingCompanyData || existingCompanyData === 'null') {
      const companyData = {
        id: profile.id,
        name: profile.name,
        logo_url: profile.logo,
        logo: profile.logo,
        website: profile.website,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
        description: profile.description,
        founded_date: profile.founded_date,
        industry: profile.industry,
      };

      localStorage.setItem('companyData', JSON.stringify(companyData));
      localStorage.setItem('company_primary', JSON.stringify(companyData));
      console.log('✅ [Sync] Company data loaded from Supabase into localStorage');
    } else {
      console.log('ℹ️ [Sync] localStorage already has company data, skipping');
    }
  } catch (error) {
    // Silently fail - this is not critical for app functionality
    console.log('ℹ️ [Sync] Could not load company data from Supabase (offline or not configured)');
  }
}

/**
 * Auto-sync function that runs on app initialization
 */
export async function initializeDataSync() {
  // First, try to load data from Supabase (in case this is a new browser/deployment)
  await loadCompanyDataFromSupabase();

  // Then, sync any localStorage data to Supabase (to save changes)
  await syncCompanyDataToSupabase();

  // Set up auto-sync every 30 seconds
  setInterval(() => {
    syncCompanyDataToSupabase();
  }, 30000);

  console.log('✅ [Sync] Data sync initialized - will auto-sync every 30 seconds');
}
