/**
 * Automatic Backup System
 * Runs every 30 seconds to backup all critical data
 * Maintains 3 essential backup locations to prevent quota issues
 */

let backupInterval: NodeJS.Timeout | null = null;
let backupCount = 0;

function backupAllData() {
  try {
    backupCount++;
    console.log(`🔄 [AutoBackup #${backupCount}] Running automatic backup...`);

    // Get all company-related data
    const companyKeys = [
      'companies_offline',
      'companies_global_backup',
      'companies_latest',
      'company_blackphoenix_primary'
    ];

    let hasData = false;
    let companyData: any = null;

    // Find the most complete data
    for (const key of companyKeys) {
      const stored = localStorage.getItem(key);
      if (stored && stored !== 'undefined' && stored !== 'null') {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && (Array.isArray(parsed) ? parsed.length > 0 : parsed.id)) {
            if (!companyData || (Array.isArray(parsed) && parsed.length > (companyData.length || 0))) {
              companyData = parsed;
              hasData = true;
            }
          }
        } catch (e) {
          console.error(`[AutoBackup] Failed to parse ${key}, clearing:`, e);
          localStorage.removeItem(key);
        }
      } else if (stored === 'undefined' || stored === 'null') {
        console.log(`[AutoBackup] Clearing invalid value from ${key}`);
        localStorage.removeItem(key);
      }
    }

    if (hasData && companyData) {
      // Backup to essential locations only (no timestamped backups to prevent quota issues)
      const dataArray = Array.isArray(companyData) ? companyData : [companyData];

      // Clean up ALL old timestamped backups immediately
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys.filter(k => k.startsWith('companies_backup_'));
      if (backupKeys.length > 0) {
        console.log(`🗑️ [AutoBackup] Removing ${backupKeys.length} timestamped backups to free space`);
        for (const key of backupKeys) {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            // Silently ignore
          }
        }
      }

      try {
        // Only maintain 3 essential backup locations (no timestamped backups)
        localStorage.setItem('companies_offline', JSON.stringify(dataArray));
        localStorage.setItem('companies_global_backup', JSON.stringify(dataArray));
        localStorage.setItem('companies_latest', JSON.stringify(dataArray));

        console.log(`✅ [AutoBackup #${backupCount}] Backed up ${dataArray.length} companies to 3 locations`);
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.error('❌ [AutoBackup] Storage quota exceeded. Data is too large for localStorage.');

          // Try to keep at least one backup
          try {
            localStorage.setItem('companies_offline', JSON.stringify(dataArray));
            console.log(`⚠️ [AutoBackup #${backupCount}] Minimal backup completed (1 location only)`);
          } catch (e) {
            console.error('❌ [AutoBackup] Critical: Cannot backup - storage completely full');

            // Last resort: log the data size
            const dataSize = JSON.stringify(dataArray).length;
            console.error(`Data size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);
          }
        } else {
          throw error;
        }
      }
    } else {
      console.log(`⚠️ [AutoBackup #${backupCount}] No company data found to backup`);
    }

    // Also backup user profiles
    const currentUserProfile = localStorage.getItem('currentUserProfile');
    if (currentUserProfile) {
      localStorage.setItem('currentUserProfile_backup', currentUserProfile);
    }

    const userProfiles = localStorage.getItem('userProfiles');
    if (userProfiles) {
      localStorage.setItem('userProfiles_backup', userProfiles);
    }

  } catch (error) {
    console.error('❌ [AutoBackup] Error during backup:', error);
  }
}

export function startAutoBackup() {
  if (backupInterval) {
    console.log('⚠️ [AutoBackup] Already running');
    return;
  }

  console.log('🚀 [AutoBackup] Starting automatic backup system (every 30 seconds)');

  // Run immediately
  backupAllData();

  // Then run every 30 seconds (reduced frequency to prevent quota issues)
  backupInterval = setInterval(backupAllData, 30000);
}

export function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('🛑 [AutoBackup] Stopped');
  }
}

/*
 * NOT started on import any more, and not started anywhere else.
 *
 * Eric, 2026-11-16, on being shown what this actually did: "stop it, keep the
 * keys."
 *
 * WHAT IT WAS DOING
 *
 * This file backed up `localStorage` to `localStorage`. Every thirty seconds it
 * copied company data into `companies_offline`, `companies_global_backup` and
 * `companies_latest`, and `currentUserProfile` into
 * `currentUserProfile_backup` — same browser, same storage, same failure mode.
 * Clearing site data, switching phones, or the browser evicting storage under
 * pressure takes all four copies together. It was a backup only in the sense
 * that it had the word in its name.
 *
 * Worse, its own failure path DELETES. `backupAllData` removes keys when it
 * hits the quota (lines 40, 44 and 59), so the system whose job was protecting
 * this data was the only thing in the app that would throw it away — and it
 * ran forty-eight times an hour looking for the chance.
 *
 * WHY IT WAS INVISIBLE
 *
 * Nothing imported it by name. It self-started as an import side effect, and
 * the one import was a bare `import("./utils/autoBackup")` inside a mount
 * effect in `App.tsx` among seven others, with no binding and no call — so
 * every search for a caller came back empty while the thing ran on every page
 * load. The side effect has been removed along with that import; starting it
 * now takes a deliberate call.
 *
 * WHAT ACTUALLY BACKS THIS UP
 *
 * The Supabase project is on the Pro plan, which takes a daily backup of the
 * database and keeps seven days of them. Nothing needed building; what was
 * needed was for the data to BE in the database, which is why the records that
 * live only in a browser are being moved into the kv store. Note the one gap
 * the Supabase docs are explicit about: daily backups do not cover objects in
 * Storage, so the photo and video buckets are not in that coverage.
 *
 * The functions are left in place, and so are the keys they wrote. Something
 * may still read `companies_offline` as a fallback, and deleting the only copy
 * on somebody's machine to tidy up would repeat this file's original mistake.
 */
