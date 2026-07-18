/**
 * Data Backup & Restore Component
 * Allows users to export/import all company data to prevent data loss
 */

import { useState } from 'react';
import { Download, Upload, Save, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { BrandingService } from '../lib/services/brandingService';

export default function DataBackupRestore() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    try {
      setExporting(true);
      console.log('📤 Exporting all company data...');

      // Get branding profile
      const { data: brandingProfile } = await BrandingService.getBrandingProfile();

      // Get all localStorage data
      const localStorageData: Record<string, any> = {};
      const importantKeys = [
        'company_branding_profile',
        'landingPageSections',
        'landingPageContent',
        'work_requests',
        'companies_',
        'userProfiles',
        'currentUserProfile'
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && importantKeys.some(prefix => key.includes(prefix))) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              localStorageData[key] = JSON.parse(value);
            }
          } catch {
            // Skip if not JSON
            const value = localStorage.getItem(key);
            if (value) {
              localStorageData[key] = value;
            }
          }
        }
      }

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        brandingProfile,
        localStorage: localStorageData,
      };

      // Create downloadable file
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `company-data-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      console.log('✅ Export complete!');
      toast.success('Data exported successfully! Save this file in a safe place.');
    } catch (error) {
      console.error('❌ Export failed:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      console.log('📥 Importing company data...');

      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.brandingProfile) {
        throw new Error('Invalid backup file format');
      }

      // Restore branding profile
      if (backup.brandingProfile) {
        await BrandingService.updateBrandingProfile(backup.brandingProfile);
        console.log('✅ Restored branding profile');
      }

      // Restore localStorage data
      if (backup.localStorage) {
        Object.entries(backup.localStorage).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          } catch (err) {
            console.warn(`Could not restore ${key}:`, err);
          }
        });
        console.log('✅ Restored localStorage data');
      }

      toast.success('Data restored successfully! Refresh the page to see your data.');

      // Auto-refresh after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Import failed:', error);
      toast.error('Failed to import data. Make sure the file is valid.');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-[#ea580c]" />
        <div>
          <h3 className="text-lg font-semibold text-white">Data Backup & Restore</h3>
          <p className="text-sm text-gray-400">Export your data to prevent loss during updates</p>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-semibold mb-1">Important: Backup Your Data Regularly</p>
            <p className="text-yellow-200/80">
              The development environment may reset during updates. Export your data frequently
              and keep the backup file safe. You can restore it anytime.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <button
          onClick={exportData}
          disabled={exporting}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-[#ea580c] hover:bg-[#dc2626] disabled:bg-gray-700 text-white rounded-lg transition-colors font-medium"
        >
          {exporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export Data
            </>
          )}
        </button>

        {/* Import */}
        <label className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium cursor-pointer">
          <input
            type="file"
            accept=".json"
            onChange={importData}
            disabled={importing}
            className="hidden"
          />
          {importing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Import Data
            </>
          )}
        </label>
      </div>

      <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
        <h4 className="text-sm font-semibold text-white mb-3">How it works:</h4>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Export:</strong> Downloads all your company data as a JSON file</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Import:</strong> Restores data from a backup file</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Auto-save:</strong> Data is saved to database + 4 backup locations automatically</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
