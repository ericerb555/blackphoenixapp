/**
 * Diagnostic Tool: Logo Loading Issues
 *
 * Run this in console to see what's wrong with logo:
 * - Is logo URL saved?
 * - Where is it saved?
 * - Can the image actually load?
 * - What's blocking it?
 */

export async function diagnoseLogo() {
  console.group('🖼️ LOGO DIAGNOSTIC');

  const results = {
    logoUrlInBrandingProfile: null as string | null,
    logoUrlInLogoVariants: null as string | null,
    imageCanLoad: false,
    imageError: null as string | null,
  };

  // 1. Check company_branding_profile
  console.log('\n1️⃣ Checking company_branding_profile...');
  try {
    const brandingProfile = localStorage.getItem('company_branding_profile');
    if (brandingProfile) {
      const parsed = JSON.parse(brandingProfile);
      results.logoUrlInBrandingProfile = parsed.logo_url || null;
      console.log('✅ Found branding profile');
      console.log('   logo_url:', results.logoUrlInBrandingProfile || '(not set)');
      console.log('   company_name:', parsed.company_name || '(not set)');
    } else {
      console.warn('⚠️ No company_branding_profile found');
    }
  } catch (e: any) {
    console.error('❌ Error reading company_branding_profile:', e.message);
  }

  // 2. Check company_logo_variants
  console.log('\n2️⃣ Checking company_logo_variants...');
  try {
    const logoVariants = localStorage.getItem('company_logo_variants');
    if (logoVariants) {
      const parsed = JSON.parse(logoVariants);
      results.logoUrlInLogoVariants = parsed.logo_primary || null;
      console.log('✅ Found logo variants');
      console.log('   logo_primary:', results.logoUrlInLogoVariants || '(not set)');
      console.log('   All variants:', parsed);
    } else {
      console.warn('⚠️ No company_logo_variants found');
    }
  } catch (e: any) {
    console.error('❌ Error reading company_logo_variants:', e.message);
  }

  // 3. Test if the image URL actually works
  console.log('\n3️⃣ Testing if image can load...');
  const logoUrl = results.logoUrlInBrandingProfile || results.logoUrlInLogoVariants;

  if (logoUrl) {
    console.log('   Testing URL:', logoUrl);

    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          results.imageCanLoad = true;
          console.log('✅ Image loaded successfully!');
          console.log('   Dimensions:', img.width, 'x', img.height);
          resolve(true);
        };
        img.onerror = (e) => {
          results.imageError = 'Failed to load image';
          console.error('❌ Image failed to load');
          console.error('   Possible reasons:');
          console.error('   - URL is broken/invalid');
          console.error('   - CORS policy blocking the image');
          console.error('   - Image server is down');
          console.error('   - Image requires authentication');
          reject(e);
        };
        img.src = logoUrl;
      });
    } catch (e: any) {
      results.imageError = e.message;
    }
  } else {
    console.warn('⚠️ No logo URL found - cannot test image loading');
  }

  // 4. Summary
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Logo in branding profile: ${results.logoUrlInBrandingProfile ? '✅' : '❌'}`);
  console.log(`Logo in logo variants: ${results.logoUrlInLogoVariants ? '✅' : '❌'}`);
  console.log(`Image can load: ${results.imageCanLoad ? '✅' : '❌'}`);

  // 5. Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('='.repeat(50));

  if (!results.logoUrlInBrandingProfile && !results.logoUrlInLogoVariants) {
    console.log('❌ NO LOGO URL SET');
    console.log('   1. Go to Landing Page Editor');
    console.log('   2. Find "Login Page Logo" section');
    console.log('   3. Enter a logo URL (must be a direct image link)');
    console.log('   4. Click away from the input to auto-save');
  } else if (logoUrl && !results.imageCanLoad) {
    console.log('❌ LOGO URL IS SET BUT IMAGE CANNOT LOAD');
    console.log(`   Current URL: ${logoUrl}`);
    console.log('   Solutions:');
    console.log('   1. Make sure the URL is a direct link to an image (ends in .png, .jpg, .svg, etc.)');
    console.log('   2. Test the URL in a new browser tab - does it show the image?');
    console.log('   3. If using a private/authenticated URL, the image won\'t load');
    console.log('   4. Try using a public image hosting service like:');
    console.log('      - imgur.com');
    console.log('      - cloudinary.com');
    console.log('      - images.unsplash.com');
    console.log('   5. Or upload to your own public server');
  } else if (results.imageCanLoad) {
    console.log('✅ LOGO IS WORKING!');
    console.log('   The logo URL is saved and the image loads correctly.');
    console.log('   If you\'re not seeing it on the page, try:');
    console.log('   1. Refresh the page');
    console.log('   2. Check the browser console for errors');
    console.log('   3. Make sure you\'re on the Directory Landing Page');
  }

  console.groupEnd();

  return results;
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).diagnoseLogo = diagnoseLogo;
  console.log('🖼️ [Diagnostic] Run diagnoseLogo() in console to check logo issues');
}

export {};
