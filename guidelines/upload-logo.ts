/**
 * Upload Logo to Database
 *
 * Converts the logo image to base64 and updates the database
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  try {
    console.log('📷 Reading logo file...');

    // Read the logo file
    const logoPath = './src/imports/_34BD6D91-D18D-44F9-8A6E-70DBD2EB0427_.png';
    const logoBuffer = readFileSync(logoPath);
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

    console.log('✅ Logo converted to base64 (' + (logoBase64.length / 1024).toFixed(1) + 'KB)');

    // Get the first company
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching companies:', fetchError);
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('⚠️ No companies found - creating one...');

      // Create a company with the logo
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          company_name: 'The Black Phoenix Company',
          company_legal_name: 'Black Phoenix Builds',
          logo_primary: logoBase64,
          logo_url: logoBase64,
          primary_color: '#ea580c',
          secondary_color: '#f97316',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating company:', createError);
        return;
      }

      console.log('✅ Company created with logo!');
    } else {
      // Update existing company
      const company = companies[0];
      console.log('🔄 Updating company:', company.company_name);

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          logo_primary: logoBase64,
          logo_url: logoBase64,
        })
        .eq('id', company.id);

      if (updateError) {
        console.error('❌ Error updating company:', updateError);
        return;
      }

      console.log('✅ Logo updated in database!');
    }

    console.log('🎉 Logo upload complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

uploadLogo();
