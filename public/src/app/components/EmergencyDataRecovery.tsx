/**
 * Emergency Data Recovery Component
 * Always visible button to save and restore company data
 */

import { useState, useEffect } from 'react';
import { Download, Upload, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function EmergencyDataRecovery() {
  const [hasData, setHasData] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    checkForData();

    // Auto-backup every 60 seconds
    const interval = setInterval(() => {
      autoBackup();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const checkForData = () => {
    const keys = [
      'companies_offline',
      'companies_global_backup',
      'company_branding_profile',
      'userProfiles'
    ];

    const dataExists = keys.some(key => {
      const value = localStorage.getItem(key);
      return value && value !== 'null' && value !== 'undefined';
    });

    setHasData(dataExists);

    const backup = localStorage.getItem('emergency_backup_timestamp');
    if (backup) {
      setLastBackup(backup);
    }
  };

  const autoBackup = () => {
    try {
      const backup = gatherAllData();
      if (backup) {
        // Save to multiple localStorage keys
        const backupStr = JSON.stringify(backup);
        localStorage.setItem('emergency_backup_primary', backupStr);
        localStorage.setItem('emergency_backup_secondary', backupStr);
        localStorage.setItem('emergency_backup_timestamp', new Date().toISOString());

        // Also save to a timestamped key (keep last 3)
        const timestamp = Date.now();
        localStorage.setItem(`recovery_${timestamp}`, backupStr);

        // Clean up old timestamped backups (keep only 3 most recent)
        const allKeys = Object.keys(localStorage);
        const recoveryKeys = allKeys.filter(k => k.startsWith('recovery_')).sort().reverse();
        if (recoveryKeys.length > 3) {
          recoveryKeys.slice(3).forEach(key => localStorage.removeItem(key));
        }

        setLastBackup(new Date().toISOString());
        console.log('✅ Auto-backup completed');
      }
    } catch (error) {
      console.error('Auto-backup failed:', error);
    }
  };

  const gatherAllData = () => {
    const data: Record<string, any> = {};

    // Critical keys to backup
    const criticalKeys = [
      'companies_offline',
      'companies_global_backup',
      'companies_latest',
      'company_branding_profile',
      'company_logo_variants',
      'userProfiles',
      'currentUserProfile',
      'partnerLogos'
    ];

    // Also backup any key matching patterns
    const allKeys = Object.keys(localStorage);
    const dynamicKeys = allKeys.filter(k =>
      k.startsWith('companies_') ||
      k.startsWith('company_') ||
      k.includes('branding') ||
      k.includes('profile')
    );

    const keysToBackup = [...new Set([...criticalKeys, ...dynamicKeys])];

    keysToBackup.forEach(key => {
      const value = localStorage.getItem(key);
      if (value && value !== 'null' && value !== 'undefined') {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    return Object.keys(data).length > 0 ? data : null;
  };

  const handleExport = () => {
    try {
      const data = gatherAllData();
      if (!data) {
        toast.error('No data to export');
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blackphoenix-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Data exported! Save this file somewhere safe.');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  const handleImport = () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        try {
          const file = e.target.files[0];
          if (!file) return;

          const text = await file.text();
          const data = JSON.parse(text);

          // Restore all data
          Object.entries(data).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            } catch (error) {
              console.error(`Failed to restore ${key}:`, error);
            }
          });

          toast.success('Data restored successfully! Refreshing page...');
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          console.error('Import failed:', error);
          toast.error('Failed to import data');
        }
      };
      input.click();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import data');
    }
  };

  const handleEmergencyRecover = () => {
    try {
      // Try all backup locations in order of preference
      const backupKeys = [
        'emergency_backup_primary',
        'emergency_backup_secondary',
        ...Object.keys(localStorage).filter(k => k.startsWith('recovery_')).sort().reverse()
      ];

      let recovered = false;
      for (const key of backupKeys) {
        const backup = localStorage.getItem(key);
        if (backup && backup !== 'null') {
          try {
            const data = JSON.parse(backup);
            Object.entries(data).forEach(([dataKey, value]) => {
              localStorage.setItem(dataKey, typeof value === 'string' ? value : JSON.stringify(value));
            });
            recovered = true;
            toast.success(`Data recovered from ${key}! Refreshing...`);
            setTimeout(() => window.location.reload(), 1000);
            break;
          } catch (e) {
            console.error(`Failed to recover from ${key}:`, e);
          }
        }
      }

      if (!recovered) {
        toast.error('No backup found to recover from');
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      toast.error('Failed to recover data');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className="bg-[#1A1A1A] border-2 border-orange-600 rounded-xl shadow-2xl p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-white">Data Protection</h3>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            {hasData ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-400">Data detected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-400">No data found</span>
              </>
            )}
          </div>
          {lastBackup && (
            <div className="text-xs text-zinc-400">
              Last backup: {new Date(lastBackup).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
            title="Download backup file"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
            title="Restore from backup file"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>
          <button
            onClick={handleEmergencyRecover}
            className="col-span-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
            title="Recover from automatic backup"
          >
            <Shield className="w-3 h-3" />
            Emergency Recover
          </button>
        </div>

        <div className="mt-2 text-xs text-zinc-500 text-center">
          Auto-backing up every 60s
        </div>
      </div>
    </div>
  );
}
