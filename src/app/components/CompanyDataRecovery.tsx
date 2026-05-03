/**
 * Company Data Recovery Tool
 * Helps recover lost company data from localStorage
 */

import { useState } from 'react';
import { Database, Download, Upload, RefreshCw, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function CompanyDataRecovery() {
  const [scanning, setScanning] = useState(false);
  const [foundData, setFoundData] = useState<any[]>([]);
  const [selectedData, setSelectedData] = useState<string | null>(null);

  const scanLocalStorage = () => {
    setScanning(true);
    const results: any[] = [];

    // Scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('companies_') || key.includes('company'))) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              results.push({
                key,
                data: parsed,
                count: parsed.length,
                lastModified: parsed[0]?.updated_at || parsed[0]?.created_at || 'Unknown'
              });
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    setFoundData(results);
    setScanning(false);
    
    if (results.length > 0) {
      toast.success(`Found ${results.length} company data backup(s)`);
    } else {
      toast.error('No company data found in localStorage');
    }
  };

  const restoreData = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        toast.error('Data not found');
        return;
      }

      const parsed = JSON.parse(data);
      
      // Get current user from session storage or create default
      const userIdKey = Object.keys(localStorage).find(k => k.includes('companies_'));
      let targetKey = 'companies_global_backup';
      
      if (userIdKey) {
        targetKey = userIdKey;
      }

      // Save to both user-specific and global
      localStorage.setItem(targetKey, data);
      localStorage.setItem('companies_global_backup', data);

      toast.success(`Restored ${parsed.length} companies! Please refresh the page.`);
      
      // Force reload after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.error(`Failed to restore: ${error.message}`);
    }
  };

  const exportData = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        toast.error('Data not found');
        return;
      }

      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `companies-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Backup file downloaded');
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            
            if (!Array.isArray(imported)) {
              toast.error('Invalid backup file format');
              return;
            }

            // Save to localStorage
            const targetKey = 'companies_global_backup';
            localStorage.setItem(targetKey, JSON.stringify(imported));
            
            toast.success(`Imported ${imported.length} companies! Please refresh the page.`);
            
            // Force reload after 2 seconds
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } catch (error: any) {
            toast.error(`Import failed: ${error.message}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-[#ea580c]" />
          <h2 className="text-xl font-semibold text-white">Company Data Recovery</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={importData}
            className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={scanLocalStorage}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#dc4e0a] disabled:bg-gray-600 text-white rounded-lg transition"
          >
            <Search className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Scan for Data'}
          </button>
        </div>
      </div>

      {foundData.length === 0 && !scanning && (
        <div className="text-center py-12 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p>Click "Scan for Data" to search for company backups</p>
        </div>
      )}

      {foundData.length > 0 && (
        <div className="space-y-3">
          {foundData.map((item, index) => (
            <div
              key={index}
              className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-white">{item.key}</h3>
                  </div>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p>Companies found: <span className="text-white font-semibold">{item.count}</span></p>
                    <p>Last modified: <span className="text-white">{new Date(item.lastModified).toLocaleString()}</span></p>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Companies:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.data.slice(0, 5).map((company: any) => (
                          <span
                            key={company.id}
                            className="px-2 py-1 bg-[#ea580c]/20 border border-[#ea580c]/30 text-[#ea580c] rounded text-xs"
                          >
                            {company.name}
                          </span>
                        ))}
                        {item.data.length > 5 && (
                          <span className="text-gray-500 text-xs">+{item.data.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportData(item.key)}
                    className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
                    title="Export as backup file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => restoreData(item.key)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                  >
                    Restore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">How to recover your companies:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-300/80">
              <li>Click "Scan for Data" to find company backups</li>
              <li>Review the found backups and their contents</li>
              <li>Click "Restore" on the backup you want to recover</li>
              <li>The page will automatically refresh with your data</li>
              <li>Alternatively, export backups and import them later</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
