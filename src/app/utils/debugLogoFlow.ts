/**
 * Debug Logo Flow
 *
 * Complete diagnostic of logo flow from upload to display
 * Run: window.debugLogoFlow() in browser console
 */

import { supabase } from '../lib/supabase';

export async function debugLogoFlow() {
  console.log('🔍🔍🔍 COMPLETE LOGO FLOW DIAGNOSTIC 🔍🔍🔍');
  console.log('='.repeat(60));

  // 1. Check Authentication
  console.log('\n1️⃣ AUTHENTICATION');
  console.log('-'.repeat(60));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log('✅ User authenticated:', user.email);
    console.log('   User ID:', user.id);
  } else {
    console.log('❌ No user authenticated');
  }

  // 2. Check Database Companies
  console.log('\n2️⃣ DATABASE - COMPANIES TABLE');
  console.log('-'.repeat(60));
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, company_name, logo_primary, logo_url, created_at');

  if (companiesError) {
    console.error('❌ Database error:', companiesError);
  } else if (!companies || companies.length === 0) {
    console.log('⚠️ No companies found in database');
  } else {
    console.log(`✅ Found ${companies.length} company(ies):`);
    companies.forEach((c, i) => {
      console.log(`\n   Company ${i + 1}:`);
      console.log(`   - Name: ${c.company_name}`);
      console.log(`   - ID: ${c.id}`);
      console.log(`   - logo_primary: ${c.logo_primary ? (c.logo_primary.length / 1024).toFixed(1) + ' KB' : 'NOT SET'}`);
      console.log(`   - logo_url: ${c.logo_url ? (c.logo_url.length / 1024).toFixed(1) + ' KB' : 'NOT SET'}`);
      console.log(`   - Created: ${c.created_at}`);
    });
  }

  // 3. Check localStorage - company_branding_profile
  console.log('\n3️⃣ LOCALSTORAGE - company_branding_profile');
  console.log('-'.repeat(60));
  const brandingProfile = localStorage.getItem('company_branding_profile');
  if (brandingProfile && brandingProfile !== 'undefined' && brandingProfile !== 'null') {
    try {
      const profile = JSON.parse(brandingProfile);
      console.log('✅ Branding profile exists');
      console.log('   - Company name:', profile.company_name);
      console.log('   - DBA name:', profile.dbaName);
      console.log('   - Logo URL:', profile.logo_url ? (profile.logo_url.length / 1024).toFixed(1) + ' KB' : 'NOT SET');
      console.log('   - Primary color:', profile.primary_color);
      console.log('   - Secondary color:', profile.secondary_color);
    } catch (e) {
      console.error('❌ Failed to parse branding profile:', e);
    }
  } else {
    console.log('⚠️ No branding profile in localStorage');
  }

  // 4. Check localStorage - company_logo_variants
  console.log('\n4️⃣ LOCALSTORAGE - company_logo_variants');
  console.log('-'.repeat(60));
  const logoVariants = localStorage.getItem('company_logo_variants');
  if (logoVariants && logoVariants !== 'undefined' && logoVariants !== 'null') {
    try {
      const variants = JSON.parse(logoVariants);
      console.log('✅ Logo variants exist');
      console.log('   - logo_primary:', variants.logo_primary ? (variants.logo_primary.length / 1024).toFixed(1) + ' KB' : 'NOT SET');
      console.log('   - logo_secondary:', variants.logo_secondary ? (variants.logo_secondary.length / 1024).toFixed(1) + ' KB' : 'NOT SET');
      console.log('   - logo_icon:', variants.logo_icon ? (variants.logo_icon.length / 1024).toFixed(1) + ' KB' : 'NOT SET');
    } catch (e) {
      console.error('❌ Failed to parse logo variants:', e);
    }
  } else {
    console.log('⚠️ No logo variants in localStorage');
  }

  // 5. Check localStorage - companies_offline
  console.log('\n5️⃣ LOCALSTORAGE - companies_offline');
  console.log('-'.repeat(60));
  const companiesOffline = localStorage.getItem('companies_offline');
  if (companiesOffline) {
    try {
      const companies = JSON.parse(companiesOffline);
      console.log(`✅ Found ${companies.length} company(ies) in offline storage`);
      companies.forEach((c: any, i: number) => {
        console.log(`\n   Company ${i + 1}:`);
        console.log(`   - Name: ${c.name}`);
        console.log(`   - logo_primary: ${c.logo_primary ? (c.logo_primary.length / 1024).toFixed(1) + ' KB' : 'NOT SET'}`);
        console.log(`   - logoPrimary: ${c.logoPrimary ? (c.logoPrimary.length / 1024).toFixed(1) + ' KB' : 'NOT SET'}`);
        console.log(`   - logo_url: ${c.logo_url ? (c.logo_url.length / 1024).toFixed(1) + ' KB' : 'NOT SET'}`);
      });
    } catch (e) {
      console.error('❌ Failed to parse companies_offline:', e);
    }
  } else {
    console.log('⚠️ No companies_offline in localStorage');
  }

  // 6. Summary & Recommendations
  console.log('\n6️⃣ SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(60));

  const hasAuth = !!user;
  const hasDbCompanies = companies && companies.length > 0;
  const hasDbLogo = hasDbCompanies && companies[0].logo_primary;
  const hasBrandingProfile = !!brandingProfile;
  const hasBrandingLogo = hasBrandingProfile && JSON.parse(brandingProfile).logo_url;

  console.log('Status:');
  console.log(`  ${hasAuth ? '✅' : '❌'} User authenticated`);
  console.log(`  ${hasDbCompanies ? '✅' : '❌'} Companies in database`);
  console.log(`  ${hasDbLogo ? '✅' : '❌'} Logo in database`);
  console.log(`  ${hasBrandingProfile ? '✅' : '❌'} Branding profile in localStorage`);
  console.log(`  ${hasBrandingLogo ? '✅' : '❌'} Logo in branding profile`);

  console.log('\nRecommendations:');
  if (!hasAuth) {
    console.log('❌ You need to log in first');
  } else if (!hasDbCompanies) {
    console.log('❌ No companies found - create a company first');
    console.log('   → Navigate to Owner\'s Dashboard and create a company');
  } else if (!hasDbLogo) {
    console.log('⚠️ Company exists but no logo uploaded');
    console.log('   → Go to Owner\'s Dashboard → Companies → Edit company → Upload logo');
  } else if (!hasBrandingProfile || !hasBrandingLogo) {
    console.log('⚠️ Logo is in database but not synced to branding profile');
    console.log('   → Run: await window.syncBrandingFromDatabase()');
  } else {
    console.log('✅ Everything looks good! Logo should be visible.');
    console.log('   If not visible, check browser console for errors.');
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Upload Logo from Imports Folder
 *
 * Loads the Black Phoenix Company logo from src/imports and uploads it to the database
 */
export async function uploadLogoFromImports(): Promise<void> {
  try {
    console.log('📷 [UploadLogo] Fetching logo file...');

    // Fetch the logo file from imports folder
    const logoPath = '/src/imports/_47E102CA-EE45-49F2-83C8-656C19BFAA58_.png';
    const response = await fetch(logoPath);

    if (!response.ok) {
      console.error('❌ [UploadLogo] Failed to fetch logo file');
      return;
    }

    // Convert to blob then to base64
    const blob = await response.blob();
    const reader = new FileReader();

    const logoBase64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log('✅ [UploadLogo] Logo converted to base64 (' + (logoBase64.length / 1024).toFixed(1) + 'KB)');

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ [UploadLogo] No authenticated user - please log in first');
      return;
    }

    // Get the first company
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ [UploadLogo] Error fetching companies:', fetchError);
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('⚠️ [UploadLogo] No companies found - creating one...');

      // Create a company with the logo
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.id,
          company_name: 'The Black Phoenix Company',
          company_legal_name: 'Black Phoenix Builds',
          logo_primary: logoBase64,
          logo_url: logoBase64,
          primary_color: '#ea580c',
          secondary_color: '#f97316',
          email: user.email,
          phone: '',
          address_line1: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'US',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [UploadLogo] Error creating company:', createError);
        return;
      }

      console.log('✅ [UploadLogo] Company created with logo!');
    } else {
      // Update existing company
      const company = companies[0];
      console.log('🔄 [UploadLogo] Updating company:', company.company_name);

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          logo_primary: logoBase64,
          logo_url: logoBase64,
        })
        .eq('id', company.id);

      if (updateError) {
        console.error('❌ [UploadLogo] Error updating company:', updateError);
        return;
      }

      console.log('✅ [UploadLogo] Logo updated in database!');
    }

    // CRITICAL: Set branding in localStorage so it persists for ALL visitors
    const brandingProfile = {
      company_name: 'The Black Phoenix Company',
      dbaName: 'Black Phoenix Builds',
      businessName: 'The Black Phoenix Company',
      logo_url: logoBase64,
      primary_color: '#ea580c',
      secondary_color: '#f97316',
      email: user.email,
      phone: '',
      address_line1: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'US',
      website: '',
    };

    localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));
    console.log('✅ [UploadLogo] Branding profile set in localStorage');

    // Update logo variants
    const logoVariants = {
      logo_primary: logoBase64,
      logo_secondary: logoBase64,
      logo_icon: logoBase64,
      logo_square: logoBase64,
      logo_horizontal: logoBase64,
      logo_vertical: logoBase64,
      logo_white: logoBase64,
      logo_black: logoBase64,
    };
    localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));
    console.log('✅ [UploadLogo] Logo variants set in localStorage');

    // Dispatch event to update UI
    window.dispatchEvent(new Event('brandingUpdated'));

    console.log('🎉 [UploadLogo] Logo upload complete!');
    console.log('🎉 [UploadLogo] Logo will now appear for ALL visitors on landing page!');
    console.log('🎉 [UploadLogo] Refresh your browser to see it!');

  } catch (error) {
    console.error('❌ [UploadLogo] Error:', error);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).debugLogoFlow = debugLogoFlow;
  (window as any).uploadLogoFromImports = uploadLogoFromImports;
  console.log('🔧 Debug tools available:');
  console.log('   - window.debugLogoFlow()');
  console.log('   - window.uploadLogoFromImports()');
}
