/**
 * Emergency Company Data Recovery
 *
 * Recovers company data from ALL possible backup locations:
 * - Supabase database
 * - IndexedDB
 * - Old localStorage keys (if any remain)
 * - Session backups
 */

import { supabase } from '../lib/supabase';

export async function recoverCompanies(): Promise<{ success: boolean; companies: any[]; source: string }> {
  console.group('🚨 [Recovery] Starting emergency company recovery...');

  // PRIORITY 1: Check if companies_cache has data (might just need refresh)
  try {
    const cached = localStorage.getItem('companies_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ [Recovery] Found companies in cache:', parsed.length);
        console.groupEnd();
        return { success: true, companies: parsed, source: 'companies_cache' };
      }
    }
  } catch (e) {
    console.warn('[Recovery] Cache check failed:', e);
  }

  // PRIORITY 2: Check Supabase database
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      if (!error && companies && companies.length > 0) {
        console.log('✅ [Recovery] Found companies in database:', companies.length);

        // Save to cache
        localStorage.setItem('companies_cache', JSON.stringify(companies));
        console.log('💾 [Recovery] Restored to companies_cache');

        console.groupEnd();
        return { success: true, companies, source: 'database' };
      }
    }
  } catch (e) {
    console.warn('[Recovery] Database check failed:', e);
  }

  // PRIORITY 3: Check old localStorage keys (in case cleanup hasn't run yet)
  const oldKeys = [
    'companies_offline',
    'companies_global_backup',
    'companies_latest',
    'companies',
  ];

  for (const key of oldKeys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ [Recovery] Found companies in ${key}:`, parsed.length);

          // Save to cache
          localStorage.setItem('companies_cache', JSON.stringify(parsed));
          console.log('💾 [Recovery] Restored to companies_cache');

          console.groupEnd();
          return { success: true, companies: parsed, source: key };
        }
      }
    } catch (e) {
      console.warn(`[Recovery] ${key} check failed:`, e);
    }
  }

  // PRIORITY 4: Check user-specific keys
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const userKey = `companies_${user.id}`;
      const data = localStorage.getItem(userKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ [Recovery] Found companies in ${userKey}:`, parsed.length);

          // Save to cache
          localStorage.setItem('companies_cache', JSON.stringify(parsed));
          console.log('💾 [Recovery] Restored to companies_cache');

          console.groupEnd();
          return { success: true, companies: parsed, source: userKey };
        }
      }
    }
  } catch (e) {
    console.warn('[Recovery] User-specific key check failed:', e);
  }

  // PRIORITY 5: Check IndexedDB
  try {
    const companies = await loadFromIndexedDB('companies');
    if (companies && Array.isArray(companies) && companies.length > 0) {
      console.log('✅ [Recovery] Found companies in IndexedDB:', companies.length);

      // Save to cache
      localStorage.setItem('companies_cache', JSON.stringify(companies));
      console.log('💾 [Recovery] Restored to companies_cache');

      console.groupEnd();
      return { success: true, companies, source: 'IndexedDB' };
    }
  } catch (e) {
    console.warn('[Recovery] IndexedDB check failed:', e);
  }

  console.error('❌ [Recovery] No company data found in any backup location');
  console.groupEnd();
  return { success: false, companies: [], source: 'none' };
}

async function loadFromIndexedDB(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BlackPhoenixDB', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('data')) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const getRequest = store.get(key);

      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    };
  });
}

// Make available globally for console access
if (typeof window !== 'undefined') {
  (window as any).recoverCompanies = recoverCompanies;
  console.log('🚨 [Recovery] Emergency recovery available: run recoverCompanies() in console');
}

export {};
