/**
 * Diagnostic Tool: Company Data Flow
 *
 * Run this in console to see EXACTLY what's happening:
 * - Is user logged in?
 * - Does database table exist?
 * - Can we save to database?
 * - What's in localStorage?
 * - What's in database?
 */

import { supabase } from '../lib/supabase';

export async function diagnoseCompanyFlow() {
  console.group('🔍 COMPANY DATA FLOW DIAGNOSTIC');

  const results = {
    userLoggedIn: false,
    userId: null as string | null,
    localStorageCompanies: 0,
    databaseCompanies: 0,
    canSaveToDatabase: false,
    errors: [] as string[],
  };

  // 1. Check if user is logged in
  console.log('\n1️⃣ Checking authentication...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      results.errors.push(`Auth error: ${error.message}`);
      console.error('❌ Auth error:', error);
    } else if (user) {
      results.userLoggedIn = true;
      results.userId = user.id;
      console.log('✅ User logged in:', user.email);
    } else {
      console.warn('⚠️ No user logged in');
    }
  } catch (e: any) {
    results.errors.push(`Auth check failed: ${e.message}`);
    console.error('❌ Auth check failed:', e);
  }

  // 2. Check localStorage
  console.log('\n2️⃣ Checking localStorage...');
  try {
    const cached = localStorage.getItem('companies_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      results.localStorageCompanies = Array.isArray(parsed) ? parsed.length : 0;
      console.log(`✅ Found ${results.localStorageCompanies} companies in localStorage`);
      console.log('Data:', parsed);
    } else {
      console.warn('⚠️ No companies in localStorage (companies_cache)');
    }

    // Check for old keys
    const oldKeys = ['companies_offline', 'companies_global_backup', 'companies_latest'];
    oldKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`⚠️ Found OLD key "${key}" with ${Array.isArray(parsed) ? parsed.length : 0} companies`);
        } catch (e) {
          console.log(`⚠️ Found OLD key "${key}" but can't parse it`);
        }
      }
    });
  } catch (e: any) {
    results.errors.push(`localStorage check failed: ${e.message}`);
    console.error('❌ localStorage check failed:', e);
  }

  // 3. Check database connection and table
  console.log('\n3️⃣ Checking database...');
  if (results.userLoggedIn && results.userId) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, created_at')
        .eq('user_id', results.userId);

      if (error) {
        results.errors.push(`Database query error: ${error.message}`);
        console.error('❌ Database error:', error);
        console.error('   This usually means:');
        console.error('   - Table "companies" does not exist');
        console.error('   - Row Level Security (RLS) is blocking access');
        console.error('   - Wrong column names');
      } else {
        results.databaseCompanies = data?.length || 0;
        console.log(`✅ Found ${results.databaseCompanies} companies in database`);
        if (data && data.length > 0) {
          console.log('Database companies:', data);
        }
      }
    } catch (e: any) {
      results.errors.push(`Database check failed: ${e.message}`);
      console.error('❌ Database check failed:', e);
    }

    // 4. Test if we can save to database
    console.log('\n4️⃣ Testing database write access...');
    try {
      const testCompany = {
        id: `test_${Date.now()}`,
        user_id: results.userId,
        company_name: 'TEST_COMPANY_DELETE_ME',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('companies')
        .insert(testCompany)
        .select()
        .single();

      if (error) {
        results.errors.push(`Database insert error: ${error.message}`);
        console.error('❌ Cannot save to database:', error);
        console.error('   This usually means:');
        console.error('   - RLS policy is blocking INSERT');
        console.error('   - Missing permissions');
        console.error('   - Wrong column structure');
      } else {
        results.canSaveToDatabase = true;
        console.log('✅ Can save to database! Test company created:', data);

        // Clean up test company
        await supabase.from('companies').delete().eq('id', testCompany.id);
        console.log('✅ Test company deleted');
      }
    } catch (e: any) {
      results.errors.push(`Database write test failed: ${e.message}`);
      console.error('❌ Database write test failed:', e);
    }
  } else {
    console.warn('⚠️ Skipping database check (no user logged in)');
  }

  // 5. Summary
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`User logged in: ${results.userLoggedIn ? '✅' : '❌'}`);
  console.log(`Companies in localStorage: ${results.localStorageCompanies}`);
  console.log(`Companies in database: ${results.databaseCompanies}`);
  console.log(`Can save to database: ${results.canSaveToDatabase ? '✅' : '❌'}`);

  if (results.errors.length > 0) {
    console.log(`\n🚨 ERRORS (${results.errors.length}):`);
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }

  // 6. Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('='.repeat(50));

  if (!results.userLoggedIn) {
    console.log('❌ LOG IN FIRST - You must be logged in to save to database');
  } else if (!results.canSaveToDatabase) {
    console.log('❌ DATABASE NOT WORKING - Companies will only save to localStorage');
    console.log('   Solutions:');
    console.log('   1. Run the SQL scripts in SUPABASE_SECURITY_SETUP.md');
    console.log('   2. Create "companies" table in Supabase');
    console.log('   3. Enable RLS and add policies');
  } else if (results.databaseCompanies === 0 && results.localStorageCompanies > 0) {
    console.log('⚠️ DATA MISMATCH - You have companies in localStorage but not in database');
    console.log('   This means previous saves failed to reach the database');
    console.log('   Solution: Re-save your companies to sync them to database');
  } else if (results.databaseCompanies > 0 && results.localStorageCompanies === 0) {
    console.log('⚠️ CACHE MISSING - You have companies in database but not in localStorage');
    console.log('   Solution: Reload the page to fetch from database');
  } else if (results.databaseCompanies === results.localStorageCompanies) {
    console.log('✅ EVERYTHING LOOKS GOOD - Database and localStorage are in sync');
  }

  console.groupEnd();

  return results;
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).diagnoseCompanyFlow = diagnoseCompanyFlow;
  console.log('🔍 [Diagnostic] Run diagnoseCompanyFlow() in console to check company data flow');
}

export {};
