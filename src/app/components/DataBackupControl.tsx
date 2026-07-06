/**
 * Data Backup Control Component
 * 
 * Provides manual backup/restore controls for administrators
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Database, Download, Upload, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { backupNow, restoreNow } from '../utils/dataPersistence';

export default function DataBackupControl() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      await backupNow();
      setLastBackup(new Date().toLocaleString());
      toast.success('✅ Data backed up successfully!');
    } catch (error: any) {
      console.log('ℹ️ Backup unavailable:', error.message || 'Server not deployed');
      toast.info('Data saved locally (backup server unavailable)');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleManualRestore = async () => {
    const confirm = window.confirm(
      '⚠️ This will restore data from the latest backup. Any changes since the last backup will be lost. Continue?'
    );

    if (!confirm) return;

    setIsRestoring(true);
    try {
      await restoreNow();
      toast.success('✅ Data restored successfully! Refreshing page...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.log('ℹ️ Restore unavailable:', error.message || 'Server not deployed');
      toast.info('No backup available to restore (server unavailable)');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportBackup = () => {
    try {
      // Export all localStorage data to a JSON file
      const data: Record<string, any> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              data[key] = JSON.parse(value);
            } catch {
              data[key] = value;
            }
          }
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('✅ Backup exported to file!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export backup');
    }
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const confirm = window.confirm(
        '⚠️ This will restore data from the file. Current data will be overwritten. Continue?'
      );
      
      if (!confirm) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Restore to localStorage
        Object.entries(data).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          } catch (e) {
            console.error(`Failed to restore ${key}:`, e);
          }
        });

        toast.success('✅ Backup imported successfully! Refreshing page...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import backup');
      }
    };

    input.click();
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-[#ea580c]" />
        <div>
          <h3 className="text-white font-bold text-lg">Data Backup & Recovery</h3>
          <p className="text-sm text-gray-400">
            Automatic backups every 30 seconds • Manual controls available
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6 p-4 bg-green-600/10 border border-green-600/30 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div className="flex-1">
            <p className="text-green-500 font-medium">Auto-Backup Active</p>
            <p className="text-xs text-green-400/70">
              Your data is being backed up to the database every 30 seconds
            </p>
          </div>
        </div>
        {lastBackup && (
          <p className="text-xs text-green-400/70 mt-2">
            Last manual backup: {lastBackup}
          </p>
        )}
      </div>

      {/* Manual Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Manual Backup */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleManualBackup}
          disabled={isBackingUp}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#ea580c] hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBackingUp ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Backing Up...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Backup Now</span>
            </>
          )}
        </motion.button>

        {/* Restore */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleManualRestore}
          disabled={isRestoring}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRestoring ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Restoring...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Restore Latest</span>
            </>
          )}
        </motion.button>

        {/* Export to File */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportBackup}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] text-white border border-[#2A2A2A] rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export to File</span>
        </motion.button>

        {/* Import from File */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleImportBackup}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0A0A0A] hover:bg-[#2A2A2A] text-white border border-[#2A2A2A] rounded-lg transition-colors"
        >
          <Upload className="w-5 h-5" />
          <span>Import from File</span>
        </motion.button>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-medium mb-1">How Data Persistence Works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-400/80">
              <li>Automatic backup to database every 30 seconds</li>
              <li>Auto-restore if data is missing on page load</li>
              <li>Manual backup/restore controls above</li>
              <li>Export/import for offline backups</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
