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
import LZString from 'lz-string';
import { migrateLocalImages } from './migrateLocalImages';
import { stripDataUrlsDeep } from './imageStorage';

// Marker key used inside backup.data when the real payload is compressed.
// The server stores this envelope verbatim; only the client understands it.
const COMPRESSED_MARKER = '__lz_compressed__';

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
  private consecutiveFailures = 0; // Circuit breaker counter
  private pausedUntil = 0; // Timestamp; skip backups until this time

  /**
   * Initialize the persistence system
   */
  async initialize() {
    console.log('🔒 [DataPersistence] Initializing data persistence system...');

    // 1. Restore data from Supabase if localStorage is empty
    await this.restoreFromDatabase();

    // 1b. Move any base64 images out of localStorage into Supabase Storage so
    // the footprint (and the backup payload) stays small. Non-blocking-safe.
    try {
      await migrateLocalImages();
    } catch (e) {
      console.warn('[DataPersistence] Image migration skipped:', e);
    }

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
        // Decompress if this backup was stored in compressed form (version 2).
        let restoreData: Record<string, any> = backup.data;
        if (backup.data[COMPRESSED_MARKER]) {
          try {
            const json = LZString.decompressFromBase64(backup.data[COMPRESSED_MARKER]);
            restoreData = json ? JSON.parse(json) : {};
          } catch (e) {
            console.error('[DataPersistence] Failed to decompress backup:', e);
            restoreData = {};
          }
        }

        console.log(`📥 [DataPersistence] Restoring ${Object.keys(restoreData).length} items from database backup`);

        // Restore all data to localStorage
        Object.entries(restoreData).forEach(([key, value]) => {
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

    // Circuit breaker: if the server has been failing (timeouts/5xx), back off
    // for a while instead of hammering it. This lets an in-progress deploy land.
    if (now < this.pausedUntil) {
      return; // Silent skip during cooldown
    }

    this.isBackingUp = true;
    this.lastBackupTime = now;

    try {
      // Only log if server is deployed or first time checking
      if (this.serverDeployed !== false) {
        console.log('💾 [DataPersistence] Starting backup to database...');
      }
      
      // Collect ONLY critical keys (not all of localStorage).
      // Backing up the entire localStorage produced multi-MB payloads that
      // exceeded the KV row / edge memory / storage size limits and caused
      // statement timeouts. We only need the critical app data.
      const data: Record<string, any> = {};

      for (const key of CRITICAL_KEYS) {
        const value = localStorage.getItem(key);
        if (value && value !== 'null' && value !== 'undefined') {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }

      // Safety-net: never ship base64 images to the server backup. If migration
      // hasn't moved them to Storage yet, strip them so the payload stays small.
      // (The images themselves remain safe in localStorage until migrated.)
      for (const key of Object.keys(data)) {
        const asStr = JSON.stringify(data[key]);
        if (asStr && asStr.includes('data:image')) {
          data[key] = stripDataUrlsDeep(data[key]);
        }
      }

      let backup: BackupData = {
        timestamp: new Date().toISOString(),
        data,
        version: 1,
      };

      const MAX_BACKUP_BYTES = 2 * 1024 * 1024; // 2 MB (matches server cap)
      // Below this, send uncompressed; above it, compress to shrink the write.
      const COMPRESS_THRESHOLD = 400 * 1024; // 400 KB

      // If the raw payload is large, compress it so big datasets can still be
      // backed up instead of being skipped. The compressed blob is wrapped in a
      // tiny envelope the server stores verbatim; restore decompresses it.
      let serialized = JSON.stringify(backup);
      if (serialized.length > COMPRESS_THRESHOLD) {
        const compressed = LZString.compressToBase64(JSON.stringify(data));
        backup = {
          timestamp: backup.timestamp,
          data: { [COMPRESSED_MARKER]: compressed },
          version: 2, // version 2 = compressed payload
        };
        serialized = JSON.stringify(backup);
        console.log(
          `🗜️ [DataPersistence] Compressed backup ${(JSON.stringify(data).length / 1024).toFixed(0)} KB → ${(serialized.length / 1024).toFixed(0)} KB`
        );
      }

      // Only skip if even the compressed payload exceeds the server cap.
      if (serialized.length > MAX_BACKUP_BYTES) {
        console.warn(
          `⚠️ [DataPersistence] Backup still too large after compression (${(serialized.length / 1024).toFixed(0)} KB) — skipping server backup. Data remains safe in localStorage.`
        );
        return;
      }

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
          body: serialized,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        this.consecutiveFailures = 0; // Reset breaker on success
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
        // Real error (e.g. 5xx / timeout) — trip the circuit breaker.
        const errorText = await response.text();
        console.warn(`⚠️ [DataPersistence] Backup failed (${response.status}):`, errorText);
        this.registerFailure();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('ℹ️ [DataPersistence] Backup request timeout - will retry later');
        this.registerFailure();
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
   * Trip the circuit breaker after repeated failures so we stop hammering a
   * struggling/deploying server. Data always remains safe in localStorage.
   */
  private registerFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3) {
      const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
      this.pausedUntil = Date.now() + COOLDOWN_MS;
      console.warn(
        `⏸️ [DataPersistence] Pausing server backups for 10 min after ${this.consecutiveFailures} failures (data safe in localStorage)`
      );
      this.consecutiveFailures = 0;
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
    }, 300000); // 5 minutes (reduced from 30s to avoid overloading the DB)

    console.log('⏰ [DataPersistence] Auto-backup started (every 5 minutes)');
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