/**
 * Data Recovery Helper
 * Emergency tool to recover lost company data from localStorage
 */

import { useState } from 'react';
import { Search, RefreshCw, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function DataRecoveryHelper() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const scanLocalStorage = () => {
    setScanning(true);
    const results: any[] = [];

    try {
      // Scan all localStorage keys for company data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('companies')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              results.push({
                key,
                data: parsed,
                count: Array.isArray(parsed) ? parsed.length : 'Not an array',
                timestamp: new Date().toISOString()
              });
            } catch {
              results.push({
                key,
                data: value,
                error: 'Could not parse JSON'
              });
            }
          }
        }
      }

      // Also check for backup keys
      const backupKeys = ['companies_backup', 'companies_temp', 'business_profiles'];
      backupKeys.forEach(backupKey => {
        const value = localStorage.getItem(backupKey);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            results.push({
              key: backupKey,
              data: parsed,
              count: Array.isArray(parsed) ? parsed.length : 'Not an array',
              isBackup: true
            });
          } catch {
            // ignore
          }
        }
      });

      setSearchResults(results);
      toast.success(`Found ${results.length} potential company data sources`);
    } catch (error) {
      toast.error('Error scanning localStorage');
      console.error('Scan error:', error);
    } finally {
      setScanning(false);
    }
  };

  const exportData = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  const restoreData = (key: string, data: any) => {
    try {
      const userId = 'user_default'; // You may need to get this from auth context
      const storageKey = `companies_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
      toast.success('Data restored! Refresh the page to see your companies.');
    } catch (error) {
      toast.error('Failed to restore data');
      console.error('Restore error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0A0A0A] border-2 border-orange-500/30 rounded-2xl w-full max-w-4xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🔍 Data Recovery Tool</h2>
            <p className="text-gray-400 text-sm">Scan localStorage for lost company data</p>
          </div>
        </div>

        <button
          onClick={scanLocalStorage}
          disabled={scanning}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-4 rounded-xl font-semibold transition flex items-center justify-center gap-3 mb-6 disabled:opacity-50"
        >
          {scanning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Scanning localStorage...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Scan for Company Data
            </>
          )}
        </button>

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Found {searchResults.length} data sources:</h3>
            {searchResults.map((result, index) => (
              <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold mb-1">{result.key}</p>
                    {result.count && (
                      <p className="text-sm text-gray-400">
                        Contains {result.count} {result.count === 1 ? 'company' : 'companies'}
                      </p>
                    )}
                    {result.isBackup && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-400 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        Backup found
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportData(result.data, result.key)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-medium transition border border-blue-500/30 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                    {Array.isArray(result.data) && (
                      <button
                        onClick={() => restoreData(result.key, result.data)}
                        className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition border border-green-500/30 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Restore
                      </button>
                    )}
                  </div>
                </div>

                {Array.isArray(result.data) && (
                  <div className="space-y-2">
                    {result.data.map((company: any, idx: number) => (
                      <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3">
                        <p className="text-white font-medium">{company.name || 'Unnamed Company'}</p>
                        <p className="text-xs text-gray-500 mt-1">ID: {company.id}</p>
                        {company.created_at && (
                          <p className="text-xs text-gray-500">Created: {new Date(company.created_at).toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && !scanning && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Click "Scan" to search for lost company data</p>
          </div>
        )}
      </div>
    </div>
  );
}
