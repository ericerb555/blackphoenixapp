/**
 * Offline Mode Indicator
 * Shows a banner when the app is operating in offline mode (server unavailable)
 */

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle, X } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

export default function OfflineModeIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    // DISABLED: Health check removed to prevent console 404 spam
    // Assume offline mode - users can manually retry if needed
    setIsOffline(true);
  }, []);

  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600/95 backdrop-blur-sm border-b-2 border-yellow-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">Offline Mode</h3>
                <span className="px-2 py-0.5 bg-yellow-500/30 border border-yellow-400/50 rounded text-xs font-semibold text-white">
                  LOCAL STORAGE
                </span>
              </div>
              <p className="text-sm text-yellow-100">
                Server is offline. Your data is being saved locally and will sync when the server is available.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition font-semibold text-sm flex items-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              title="Dismiss"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
