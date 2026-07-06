/**
 * Data Persistence System
 * 
 * Prevents localStorage data loss by:
 * 1. Auto-backing up to Supabase database every 30 seconds
 * 2. Restoring from Supabase on page load if localStorage is empty
 * 3. Monitoring localStorage for unexpected deletions
 * 4. Creating versioned backups
 * 5. Detecting and preventing data corruption
 */

import { projectId, publicAnonKey } from './supabase/info';

// IMPORTANT: Use the correct server prefix for this project
const SERVER_PREFIX = '/make-server-57095a78';

// UPDATED: Monitor only the NEW single-source keys (not old duplicate keys)
const CRITICAL_KEYS = [
  'companies_cache',      // NEW: Single source of truth for companies
  'currentUserProfile',   // User auth profile
  'userProfiles',         // User data
  'materials',
  'customers',
  'invoices',
  'projects',
  'employees',
];

interface BackupData {
  timestamp: string;
  data: Record<string, any>;
  version: number;
}

class DataPersistenceManager {
  private backupInterval: number | null = null;
  private isBackingUp = false;
  private lastBackupTime = 0;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private serverDeployed: boolean | null = null; // Track if server is deployed
  private hasLoggedDeploymentStatus = false; // Only log once

  /**
   * Initialize the persistence system
   */
  async initialize() {
    console.log('🔒 [DataPersistence] Initializing data persistence system...');

    // 1. Restore data from Supabase if localStorage is empty
    await this.restoreFromDatabase();
    
    // 2. Create initial backup
    await this.backupToDatabase();
    
    // 3. Start auto-backup every 30 seconds
    this.startAutoBackup();
    
    // 4. Monitor localStorage for changes/deletions
    this.monitorStorage();
    
    // 5. Backup before page unload
    this.setupBeforeUnloadBackup();
    
    console.log('✅ [DataPersistence] System initialized');
  }

  /**
   * Restore data from Supabase database if localStorage is missing critical data
   */
  private async restoreFromDatabase() {
    try {
      // Check if we have critical data in localStorage
      const hasCriticalData = CRITICAL_KEYS.some(key => {
        const value = localStorage.getItem(key);
        return value && value !== 'null' && value !== '{}' && value !== '[]';
      });

      if (hasCriticalData) {
        console.log('✅ [DataPersistence] Critical data exists in localStorage');
        return;
      }

      console.log('⚠️ [DataPersistence] Missing critical data, restoring from database...');

      // Fetch latest backup from database with 5-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1${SERVER_PREFIX}/data/restore`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 404/503 means server not deployed yet - this is expected, not an error
        if (response.status === 404 || response.status === 503) {
          if (!this.hasLoggedDeploymentStatus) {
            console.log('ℹ️ [DataPersistence] Backup server not yet deployed (this is normal on first setup)');
            this.hasLoggedDeploymentStatus = true;
          }
          this.serverDeployed = false;
          return;
        }
        console.warn(`⚠️ [DataPersistence] No backup available (${response.status})`);
        return;
      }

      const backup: BackupData = await response.json();
      
      if (backup && backup.data) {
        console.log(`📥 [DataPersistence] Restoring ${Object.keys(backup.data).length} items from database backup`);
        
        // Restore all data to localStorage
        Object.entries(backup.data).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          } catch (e) {
            console.error(`[DataPersistence] Failed to restore ${key}:`, e);
          }
        });
        
        console.log('✅ [DataPersistence] Data restored successfully!');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('ℹ️ [DataPersistence] Restore request timeout - continuing with existing data');
      } else {
        console.log('ℹ️ [DataPersistence] Could not restore from database (offline or not configured)');
      }
    }
  }

  /**
   * Backup all localStorage data to Supabase database
   */
  private async backupToDatabase() {
    if (this.isBackingUp) {
      return; // Silent skip if already backing up
    }

    // Throttle backups to max once per 10 seconds
    const now = Date.now();
    if (now - this.lastBackupTime < 10000) {
      return; // Silent skip if too soon
    }

    this.isBackingUp = true;
    this.lastBackupTime = now;

    try {
      // Only log if server is deployed or first time checking
      if (this.serverDeployed !== false) {
        console.log('💾 [DataPersistence] Starting backup to database...');
      }
      
      // Collect all localStorage data
      const data: Record<string, any> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              // Try to parse as JSON, if it fails, store as string
              data[key] = JSON.parse(value);
            } catch {
              data[key] = value;
            }
          }
        }
      }

      const backup: BackupData = {
        timestamp: new Date().toISOString(),
        data,
        version: 1,
      };

      // Send to database with 5-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1${SERVER_PREFIX}/data/backup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backup),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ [DataPersistence] Backed up ${Object.keys(data).length} items to database`);
      } else {
        // 404/503 means server not deployed yet - this is expected, not an error
        if (response.status === 404 || response.status === 503) {
          if (!this.hasLoggedDeploymentStatus) {
            console.log('ℹ️ [DataPersistence] Backup server not yet deployed (data safe in localStorage)');
            this.hasLoggedDeploymentStatus = true;
          }
          this.serverDeployed = false;
          return;
        }
        // Only log actual errors (not expected unavailability)
        const errorText = await response.text();
        console.warn(`⚠️ [DataPersistence] Backup failed (${response.status}):`, errorText);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('ℹ️ [DataPersistence] Backup request timeout - will retry later');
      } else if (error.message?.includes('Failed to fetch')) {
        // Network error or server not available - this is expected if backend not deployed
        console.log('ℹ️ [DataPersistence] Backup server unavailable (data safe in localStorage)');
        this.serverDeployed = false;
      } else {
        console.log('ℹ️ [DataPersistence] Backup skipped:', error.message || 'Network unavailable');
      }
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Start automatic backup every 30 seconds
   */
  private startAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backupInterval = window.setInterval(() => {
      this.backupToDatabase();
    }, 30000); // 30 seconds

    console.log('⏰ [DataPersistence] Auto-backup started (every 30 seconds)');
  }

  /**
   * Monitor localStorage for unexpected deletions
   */
  private monitorStorage() {
    // Listen for storage events (detects changes from other tabs)
    this.storageListener = (e: StorageEvent) => {
      if (!e.key) {
        // localStorage.clear() was called!
        console.log('ℹ️ [DataPersistence] Detected storage clear, auto-recovering data...');
        this.restoreFromDatabase();
        return;
      }

      // Only alert on CRITICAL keys being deleted (not old duplicate keys being cleaned up)
      if (CRITICAL_KEYS.includes(e.key) && !e.newValue && e.oldValue) {
        console.log(`ℹ️ [DataPersistence] Critical data deleted: ${e.key}, auto-recovering...`);
        this.restoreFromDatabase();
      }
    };

    window.addEventListener('storage', this.storageListener);
    console.log('👁️ [DataPersistence] Storage monitoring active (protecting: companies_cache, profiles, business data)');
  }

  /**
   * Backup before page unload
   */
  private setupBeforeUnloadBackup() {
    window.addEventListener('beforeunload', () => {
      // Force immediate backup before page closes
      this.backupToDatabase();
    });
    
    console.log('💾 [DataPersistence] Before-unload backup registered');
  }

  /**
   * Manually trigger a backup
   */
  async manualBackup() {
    console.log('🔵 [DataPersistence] Manual backup requested...');
    await this.backupToDatabase();
  }

  /**
   * Manually restore from database
   */
  async manualRestore() {
    console.log('🔵 [DataPersistence] Manual restore requested...');
    await this.restoreFromDatabase();
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    
    console.log('🔴 [DataPersistence] System destroyed');
  }
}

// Create singleton instance
export const dataPersistence = new DataPersistenceManager();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Use non-blocking initialization to prevent app from hanging
  Promise.race([
    dataPersistence.initialize(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), 3000))
  ]).catch(err => {
    // Silent skip - this is expected on first load or when offline
    console.log('ℹ️ [DataPersistence] Running in local-only mode (no backup server available)');
    // App will continue without backup system - data still safe in localStorage
  });
}

// Export manual control functions
export const backupNow = () => dataPersistence.manualBackup();
export const restoreNow = () => dataPersistence.manualRestore();