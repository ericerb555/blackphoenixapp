/**
 * Force Upload Logo - PERMANENT FIX
 *
 * This CLEARS everything and uploads the logo fresh
 * Run: await window.forceUploadLogo()
 */

import { supabase } from '../lib/supabase';

export async function forceUploadLogo(): Promise<void> {
  try {
    console.log('🔥 [FORCE UPLOAD] Starting PERMANENT logo upload...');
    console.log('🧹 [FORCE UPLOAD] Clearing all cached logo data...');

    // STEP 1: CLEAR ALL OLD LOGO DATA
    localStorage.removeItem('company_branding_profile');
    localStorage.removeItem('company_logo_variants');
    console.log('✅ [FORCE UPLOAD] Old cache cleared');

    // STEP 2: FETCH THE CORRECT LOGO
    console.log('📷 [FORCE UPLOAD] Fetching correct logo file...');
    const logoPath = '/src/imports/_47E102CA-EE45-49F2-83C8-656C19BFAA58_.png';
    const response = await fetch(logoPath);

    if (!response.ok) {
      console.error('❌ [FORCE UPLOAD] Failed to fetch logo file');
      return;
    }

    // Convert to base64
    const blob = await response.blob();
    const reader = new FileReader();

    const logoBase64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log('✅ [FORCE UPLOAD] Logo converted to base64 (' + (logoBase64.length / 1024).toFixed(1) + 'KB)');

    // STEP 3: GET USER AUTH
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ [FORCE UPLOAD] No authenticated user - please log in first');
      return;
    }

    // STEP 4: UPDATE DATABASE
    console.log('💾 [FORCE UPLOAD] Saving to database...');
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ [FORCE UPLOAD] Database error:', fetchError);
      return;
    }

    if (!companies || companies.length === 0) {
      // Create new company
      const { error: createError } = await supabase
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
        });

      if (createError) {
        console.error('❌ [FORCE UPLOAD] Error creating company:', createError);
        return;
      }
      console.log('✅ [FORCE UPLOAD] Company created with logo!');
    } else {
      // Update existing company
      const company = companies[0];
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          logo_primary: logoBase64,
          logo_url: logoBase64,
        })
        .eq('id', company.id);

      if (updateError) {
        console.error('❌ [FORCE UPLOAD] Error updating company:', updateError);
        return;
      }
      console.log('✅ [FORCE UPLOAD] Database updated!');
    }

    // STEP 5: SET IN LOCALSTORAGE (PERMANENT)
    console.log('🔒 [FORCE UPLOAD] Setting PERMANENT branding...');
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

    // STEP 6: TRIGGER UI UPDATE
    window.dispatchEvent(new Event('brandingUpdated'));

    console.log('');
    console.log('🎉🎉🎉 SUCCESS! 🎉🎉🎉');
    console.log('✅ Logo saved to database');
    console.log('✅ Logo saved to localStorage (PERMANENT)');
    console.log('✅ Logo size: ' + (logoBase64.length / 1024).toFixed(1) + 'KB');
    console.log('');
    console.log('🔄 REFRESH YOUR BROWSER NOW to see the logo!');
    console.log('🔄 Logo will appear on ALL pages for ALL visitors!');
    console.log('');

  } catch (error) {
    console.error('❌ [FORCE UPLOAD] Error:', error);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).forceUploadLogo = forceUploadLogo;
}
