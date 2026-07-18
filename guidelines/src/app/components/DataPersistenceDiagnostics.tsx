/**
 * Data Persistence Diagnostics
 * 
 * Shows real-time status of the data persistence system
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER_PREFIX = '/make-server-57095a78';

export default function DataPersistenceDiagnostics() {
  const [status, setStatus] = useState<{
    serverReachable: boolean;
    lastBackupExists: boolean;
    localStorageItems: number;
    criticalDataPresent: boolean;
    testing: boolean;
  }>({
    serverReachable: false,
    lastBackupExists: false,
    localStorageItems: 0,
    criticalDataPresent: false,
    testing: false,
  });

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, testing: true }));

    try {
      // Check localStorage
      const itemCount = localStorage.length;
      const criticalKeys = [
        'companyData',
        'company_primary',
        'companies_offline',
        'currentUserProfile',
      ];
      const hasCriticalData = criticalKeys.some(key => {
        const value = localStorage.getItem(key);
        return value && value !== 'null' && value !== '{}' && value !== '[]';
      });

      // Check server
      let serverReachable = false;
      let backupExists = false;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1${SERVER_PREFIX}/data/restore`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        serverReachable = true;
        backupExists = response.ok;
      } catch (e) {
        console.error('Server check failed:', e);
      }

      setStatus({
        serverReachable,
        lastBackupExists: backupExists,
        localStorageItems: itemCount,
        criticalDataPresent: hasCriticalData,
        testing: false,
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
      setStatus(prev => ({ ...prev, testing: false }));
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-[#ea580c]" />
          <div>
            <h3 className="text-white font-bold text-lg">Data Persistence Status</h3>
            <p className="text-sm text-gray-400">Real-time system diagnostics</p>
          </div>
        </div>
        <button
          onClick={checkStatus}
          disabled={status.testing}
          className="px-3 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] text-white border border-[#2A2A2A] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${status.testing ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      <div className="space-y-3">
        {/* Server Reachable */}
        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
          <div className="flex items-center gap-3">
            {status.serverReachable ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="text-white font-medium">Backup Server</p>
              <p className="text-xs text-gray-400">
                {SERVER_PREFIX}/data
              </p>
            </div>
          </div>
          <span className={`text-sm font-medium ${
            status.serverReachable ? 'text-green-500' : 'text-red-500'
          }`}>
            {status.serverReachable ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Backup Exists */}
        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
          <div className="flex items-center gap-3">
            {status.lastBackupExists ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="text-white font-medium">Latest Backup</p>
              <p className="text-xs text-gray-400">Database backup available</p>
            </div>
          </div>
          <span className={`text-sm font-medium ${
            status.lastBackupExists ? 'text-green-500' : 'text-yellow-500'
          }`}>
            {status.lastBackupExists ? 'Found' : 'Not Found'}
          </span>
        </div>

        {/* localStorage Items */}
        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
          <div className="flex items-center gap-3">
            {status.localStorageItems > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="text-white font-medium">localStorage Data</p>
              <p className="text-xs text-gray-400">Total stored items</p>
            </div>
          </div>
          <span className="text-sm font-medium text-white">
            {status.localStorageItems} items
          </span>
        </div>

        {/* Critical Data */}
        <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg">
          <div className="flex items-center gap-3">
            {status.criticalDataPresent ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="text-white font-medium">Critical Data</p>
              <p className="text-xs text-gray-400">Company, user profiles</p>
            </div>
          </div>
          <span className={`text-sm font-medium ${
            status.criticalDataPresent ? 'text-green-500' : 'text-red-500'
          }`}>
            {status.criticalDataPresent ? 'Present' : 'Missing'}
          </span>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`mt-4 p-4 rounded-lg border ${
        status.serverReachable && status.criticalDataPresent
          ? 'bg-green-600/10 border-green-600/30'
          : 'bg-yellow-600/10 border-yellow-600/30'
      }`}>
        <div className="flex items-center gap-2">
          {status.serverReachable && status.criticalDataPresent ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
          <div className="flex-1">
            <p className={`font-medium ${
              status.serverReachable && status.criticalDataPresent
                ? 'text-green-500'
                : 'text-yellow-500'
            }`}>
              {status.serverReachable && status.criticalDataPresent
                ? '✅ Data Persistence Active'
                : '⚠️ System Partially Available'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {status.serverReachable && status.criticalDataPresent
                ? 'All systems operational. Your data is being backed up automatically.'
                : !status.serverReachable
                ? 'Backup server offline. Data is stored locally only.'
                : 'Critical data missing. Consider restoring from backup.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Deployment Notice */}
      {!status.serverReachable && (
        <div className="mt-4 p-4 rounded-lg border bg-blue-600/10 border-blue-600/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-500 font-medium mb-2">🚀 Server Deployment Required</p>
              <p className="text-sm text-blue-400/80 mb-3">
                The data persistence system has been implemented but the server needs to be deployed to Supabase.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 mb-3">
                <p className="text-xs text-blue-400 font-mono mb-2">
                  supabase functions deploy server
                </p>
                <p className="text-xs text-blue-400/70">
                  OR deploy via Supabase Dashboard → Edge Functions → server → Deploy
                </p>
              </div>
              <p className="text-xs text-blue-400/70">
                📄 See <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">DATA_PERSISTENCE_DEPLOYMENT.md</code> for detailed instructions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}