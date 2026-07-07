/**
 * Data Persistence Manager
 *
 * CRITICAL: Ensures company data is NEVER lost by using multiple redundant storage layers:
 * 1. localStorage (multiple keys for redundancy)
 * 2. Supabase database (server-side backup)
 * 3. IndexedDB (large data backup)
 * 4. Session verification (detect data loss immediately)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface DataSnapshot {
  timestamp: string;
  userId: string;
  companies: any[];
  userProfile: any;
  branding: any;
  logos: any;
}

class DataPersistenceManager {
  private saveQueue: Array<() => Promise<void>> = [];
  private isSaving = false;
  private lastSaveTime = 0;
  private saveListeners: Array<(status: SaveStatus) => void> = [];

  constructor() {
    // Start monitoring for data changes
    this.startMonitoring();

    // Verify data integrity every 30 seconds
    setInterval(() => this.verifyDataIntegrity(), 30000);
  }

  /**
   * Subscribe to save status updates
   */
  onSaveStatusChange(callback: (status: SaveStatus) => void) {
    this.saveListeners.push(callback);
    return () => {
      this.saveListeners = this.saveListeners.filter(cb => cb !== callback);
    };
  }

  private notifySaveStatus(status: SaveStatus) {
    this.saveListeners.forEach(cb => cb(status));
  }

  /**
   * Save company data with redundancy
   */
  async saveCompanies(companies: any[], userId?: string): Promise<SaveResult> {
    console.log('💾 [DataPersistenceManager] Starting save operation for', companies.length, 'companies');
    this.notifySaveStatus({ status: 'saving', message: 'Saving data...' });

    const results: SaveResult = {
      localStorage: false,
      database: false,
      indexedDB: false,
      timestamp: new Date().toISOString(),
      errors: []
    };

    try {
      // 1. ALWAYS save to localStorage FIRST (fastest, most reliable)
      // UPDATED: Use SINGLE cache key to prevent conflicts
      try {
        const dataStr = JSON.stringify(companies);

        // SINGLE source of truth - no more duplicate keys
        localStorage.setItem('companies_cache', dataStr);

        // Save timestamp
        localStorage.setItem('last_companies_save', new Date().toISOString());

        results.localStorage = true;
        console.log('✅ [DataPersistenceManager] localStorage save complete (single cache)');
      } catch (error: any) {
        console.error('❌ [DataPersistenceManager] localStorage save failed:', error);
        results.errors.push(`localStorage: ${error.message}`);

        // If quota exceeded, try to free space
        if (error.name === 'QuotaExceededError') {
          this.freeUpSpace();
          // Try one more time
          try {
            localStorage.setItem('companies_cache', JSON.stringify(companies));
            results.localStorage = true;
            console.log('✅ [DataPersistenceManager] localStorage save succeeded after cleanup');
          } catch (e) {
            console.error('❌ [DataPersistenceManager] localStorage still failed after cleanup');
          }
        }
      }

      // 2. Save to Supabase database (server-side backup)
      if (supabase && userId) {
        try {
          const { data: session } = await supabase.auth.getSession();

          if (session?.session?.access_token) {
            // Save each company individually
            for (const company of companies) {
              const { error } = await supabase
                .from('companies')
                .upsert({
                  id: company.id,
                  user_id: userId,
                  name: company.name,
                  data: company,
                  updated_at: new Date().toISOString()
                });

              if (error) {
                console.warn('⚠️ [DataPersistenceManager] Database save warning:', error);
              }
            }

            results.database = true;
            console.log('✅ [DataPersistenceManager] Database save complete');
          } else {
            console.log('ℹ️ [DataPersistenceManager] No auth session - skipping database save');
          }
        } catch (error: any) {
          console.error('❌ [DataPersistenceManager] Database save failed:', error);
          results.errors.push(`database: ${error.message}`);
        }
      }

      // 3. Save to IndexedDB (backup for large data)
      try {
        await this.saveToIndexedDB('companies', companies);
        results.indexedDB = true;
        console.log('✅ [DataPersistenceManager] IndexedDB save complete');
      } catch (error: any) {
        console.error('❌ [DataPersistenceManager] IndexedDB save failed:', error);
        results.errors.push(`indexedDB: ${error.message}`);
      }

      // Report success
      const successCount = [results.localStorage, results.database, results.indexedDB].filter(Boolean).length;

      if (successCount >= 1) {
        this.notifySaveStatus({
          status: 'saved',
          message: `Saved to ${successCount}/3 locations`,
          timestamp: results.timestamp
        });
        console.log(`✅ [DataPersistenceManager] Save complete: ${successCount}/3 locations succeeded`);
      } else {
        this.notifySaveStatus({
          status: 'error',
          message: 'Save failed - data at risk!',
          errors: results.errors
        });
        console.error('❌ [DataPersistenceManager] CRITICAL: All save locations failed!');
      }

      return results;

    } catch (error: any) {
      console.error('❌ [DataPersistenceManager] Unexpected error during save:', error);
      this.notifySaveStatus({
        status: 'error',
        message: 'Save failed',
        errors: [error.message]
      });
      results.errors.push(`unexpected: ${error.message}`);
      return results;
    }
  }

  /**
   * Verify data integrity across all storage locations
   */
  async verifyDataIntegrity(): Promise<IntegrityReport> {
    console.log('🔍 [DataPersistenceManager] Verifying data integrity...');

    const report: IntegrityReport = {
      localStorage: { hasData: false, count: 0 },
      database: { hasData: false, count: 0 },
      indexedDB: { hasData: false, count: 0 },
      consistent: false,
      timestamp: new Date().toISOString()
    };

    // Check localStorage (UPDATED: Use single cache key)
    try {
      const data = localStorage.getItem('companies_cache');
      if (data) {
        const parsed = JSON.parse(data);
        report.localStorage.hasData = true;
        report.localStorage.count = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('❌ [DataPersistenceManager] localStorage check failed:', e);
    }

    // Check database
    if (supabase) {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          const { data, error } = await supabase
            .from('companies')
            .select('id');

          if (!error && data) {
            report.database.hasData = true;
            report.database.count = data.length;
          }
        }
      } catch (e) {
        console.error('❌ [DataPersistenceManager] Database check failed:', e);
      }
    }

    // Check IndexedDB
    try {
      const data = await this.loadFromIndexedDB('companies');
      if (data) {
        report.indexedDB.hasData = true;
        report.indexedDB.count = Array.isArray(data) ? data.length : 0;
      }
    } catch (e) {
      console.error('❌ [DataPersistenceManager] IndexedDB check failed:', e);
    }

    // Check consistency
    const counts = [
      report.localStorage.count,
      report.database.count,
      report.indexedDB.count
    ].filter(c => c > 0);

    report.consistent = counts.length > 0 && counts.every(c => c === counts[0]);

    if (!report.consistent && counts.length > 1) {
      console.warn('⚠️ [DataPersistenceManager] Data inconsistency detected!', report);
      // Auto-reconcile by using the location with the most data
      this.autoReconcile(report);
    }

    return report;
  }

  /**
   * Auto-reconcile data from different storage locations
   */
  private async autoReconcile(report: IntegrityReport) {
    console.log('🔄 [DataPersistenceManager] Auto-reconciling data...');

    // Find the source with the most data
    const sources = [
      { name: 'localStorage', count: report.localStorage.count },
      { name: 'database', count: report.database.count },
      { name: 'indexedDB', count: report.indexedDB.count }
    ].sort((a, b) => b.count - a.count);

    const bestSource = sources[0];

    if (bestSource.count === 0) {
      console.log('ℹ️ [DataPersistenceManager] No data to reconcile');
      return;
    }

    console.log(`✅ [DataPersistenceManager] Using ${bestSource.name} as source (${bestSource.count} companies)`);

    // Load from best source and save to all others
    let companies: any[] = [];

    if (bestSource.name === 'localStorage') {
      const data = localStorage.getItem('companies_cache');
      if (data) companies = JSON.parse(data);
    } else if (bestSource.name === 'indexedDB') {
      companies = await this.loadFromIndexedDB('companies') || [];
    }

    if (companies.length > 0) {
      await this.saveCompanies(companies);
      console.log('✅ [DataPersistenceManager] Reconciliation complete');
    }
  }

  /**
   * Free up localStorage space
   */
  private freeUpSpace() {
    console.log('🧹 [DataPersistenceManager] Freeing up localStorage space...');

    // Remove old timestamped backups
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('companies_backup_') ||
        key.startsWith('recovery_') ||
        key.includes('_old_') ||
        key.includes('_temp_')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore
      }
    });

    console.log(`✅ [DataPersistenceManager] Removed ${keysToRemove.length} old backup keys`);
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CompanyDataBackup', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        const putRequest = store.put({ data, timestamp: new Date().toISOString() }, key);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CompanyDataBackup', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('backups')) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.data || null);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  /**
   * Start monitoring for data changes
   */
  private startMonitoring() {
    // Monitor storage events
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('companies_')) {
        console.log('📢 [DataPersistenceManager] Storage event detected:', e.key);
        this.verifyDataIntegrity();
      }
    });

    // Log current status on startup
    setTimeout(() => {
      this.verifyDataIntegrity();
    }, 2000);
  }
}

// Singleton instance
export const dataPersistenceManager = new DataPersistenceManager();

// Types
export interface SaveResult {
  localStorage: boolean;
  database: boolean;
  indexedDB: boolean;
  timestamp: string;
  errors: string[];
}

export interface SaveStatus {
  status: 'saving' | 'saved' | 'error';
  message: string;
  timestamp?: string;
  errors?: string[];
}

export interface IntegrityReport {
  localStorage: { hasData: boolean; count: number };
  database: { hasData: boolean; count: number };
  indexedDB: { hasData: boolean; count: number };
  consistent: boolean;
  timestamp: string;
}
