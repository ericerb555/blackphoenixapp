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

// Auto-start on import
if (typeof window !== 'undefined') {
  startAutoBackup();
}
