import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Database, HardDrive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dataPersistenceManager, SaveStatus, IntegrityReport } from '../utils/dataPersistenceManager';

export default function DataSyncStatus() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'saved', message: 'All data saved' });
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string>('');

  useEffect(() => {
    // Subscribe to save status updates
    const unsubscribe = dataPersistenceManager.onSaveStatusChange((status) => {
      setSaveStatus(status);
      if (status.timestamp) {
        setLastSaveTime(new Date(status.timestamp).toLocaleTimeString());
      }
    });

    // Check integrity on mount and periodically
    checkIntegrity();
    const interval = setInterval(checkIntegrity, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const checkIntegrity = async () => {
    const report = await dataPersistenceManager.verifyDataIntegrity();
    setIntegrityReport(report);
  };

  const getStatusIcon = () => {
    switch (saveStatus.status) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'saved':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (saveStatus.status) {
      case 'saving':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'saved':
        return 'border-green-500/50 bg-green-500/10';
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
    }
  };

  const getStorageIcon = (hasData: boolean) => {
    return hasData ? (
      <CheckCircle2 className="w-3 h-3 text-green-400" />
    ) : (
      <AlertCircle className="w-3 h-3 text-gray-500" />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div
        className={`bg-[#1A1A1A] border ${getStatusColor()} rounded-lg shadow-2xl overflow-hidden transition-all duration-300`}
        style={{ minWidth: showDetails ? '320px' : '200px' }}
      >
        {/* Status Bar */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
        >
          {getStatusIcon()}
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-white">
              {saveStatus.message}
            </div>
            {lastSaveTime && (
              <div className="text-xs text-gray-400">
                {lastSaveTime}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {showDetails ? '▼' : '▲'}
          </div>
        </button>

        {/* Details Panel */}
        <AnimatePresence>
          {showDetails && integrityReport && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-800"
            >
              <div className="p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Storage Locations
                </div>

                {/* localStorage Status */}
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Local Storage</span>
                  <div className="flex-1" />
                  {getStorageIcon(integrityReport.localStorage.hasData)}
                  <span className="text-xs text-gray-400">
                    {integrityReport.localStorage.count} items
                  </span>
                </div>

                {/* Database Status */}
                <div className="flex items-center gap-2 text-sm">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Database</span>
                  <div className="flex-1" />
                  {getStorageIcon(integrityReport.database.hasData)}
                  <span className="text-xs text-gray-400">
                    {integrityReport.database.count} items
                  </span>
                </div>

                {/* IndexedDB Status */}
                <div className="flex items-center gap-2 text-sm">
                  <Cloud className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">IndexedDB</span>
                  <div className="flex-1" />
                  {getStorageIcon(integrityReport.indexedDB.hasData)}
                  <span className="text-xs text-gray-400">
                    {integrityReport.indexedDB.count} items
                  </span>
                </div>

                {/* Consistency Status */}
                <div className="pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-2 text-xs">
                    {integrityReport.consistent ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Data is synchronized</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400">Syncing...</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Errors */}
                {saveStatus.errors && saveStatus.errors.length > 0 && (
                  <div className="pt-3 border-t border-gray-800">
                    <div className="text-xs font-semibold text-red-400 mb-2">
                      Errors:
                    </div>
                    {saveStatus.errors.map((error, i) => (
                      <div key={i} className="text-xs text-red-300 mb-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual Verification Button */}
                <button
                  onClick={checkIntegrity}
                  className="w-full mt-2 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-xs rounded-lg transition-colors"
                >
                  Verify Data Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
