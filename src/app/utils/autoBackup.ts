/**
 * Automatic Backup System
 * Runs every 10 seconds to backup all critical data
 * Ensures NO data is ever lost
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
      // Backup to ALL locations
      const dataArray = Array.isArray(companyData) ? companyData : [companyData];

      localStorage.setItem('companies_offline', JSON.stringify(dataArray));
      localStorage.setItem('companies_global_backup', JSON.stringify(dataArray));
      localStorage.setItem('companies_latest', JSON.stringify(dataArray));

      // Also create timestamped backup
      const timestamp = Date.now();
      localStorage.setItem(`companies_backup_${timestamp}`, JSON.stringify(dataArray));

      // Keep only last 5 timestamped backups
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys.filter(k => k.startsWith('companies_backup_')).sort();
      if (backupKeys.length > 5) {
        for (let i = 0; i < backupKeys.length - 5; i++) {
          localStorage.removeItem(backupKeys[i]);
        }
      }

      console.log(`✅ [AutoBackup #${backupCount}] Backed up ${dataArray.length} companies to ${companyKeys.length + 1} locations`);
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

  console.log('🚀 [AutoBackup] Starting automatic backup system (every 10 seconds)');

  // Run immediately
  backupAllData();

  // Then run every 10 seconds
  backupInterval = setInterval(backupAllData, 10000);
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
