/**
 * Clear Data Utility
 * 
 * Admin tool to completely reset the application to a fresh state
 */

import { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function ClearDataUtility() {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearAllData = async () => {
    setIsClearing(true);

    try {
      console.log('🗑️ Starting complete data wipe...');

      // CRITICAL: Preserve company data before clearing
      console.log('  🛡️ Preserving company data...');
      const companyDataKeys = [
        'companies_offline',
        'companies_global_backup',
        'companies_latest',
        'company_blackphoenix_primary',
        'company_branding_profile',
        'company_branding_profile_backup',
        'company_logo_variants',
        'company_documents',
        'investmentOpportunities',
      ];

      const preservedData: Record<string, string | null> = {};
      companyDataKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          preservedData[key] = value;
          console.log(`    ✅ Preserved: ${key}`);
        }
      });

      // Step 1: Clear all localStorage
      console.log('  1. Clearing localStorage...');
      localStorage.clear();

      // Restore company data immediately
      console.log('  ♻️ Restoring company data...');
      Object.entries(preservedData).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
          console.log(`    ✅ Restored: ${key}`);
        }
      });

      // Step 2: Clear all sessionStorage
      console.log('  2. Clearing sessionStorage...');
      sessionStorage.clear();

      // Step 3: Sign out from Supabase
      console.log('  3. Signing out from Supabase...');
      await supabase.auth.signOut();

      // Step 4: Clear IndexedDB (if any)
      console.log('  4. Clearing IndexedDB...');
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }

      // Step 5: Clear all cookies for this domain
      console.log('  5. Clearing cookies...');
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Step 6: Attempt to clear KV store data (requires auth, so do this before signout ideally)
      // Note: We already signed out, so this is for next implementation
      console.log('  6. KV store data requires manual clearing via backend if needed');

      console.log('✅ All data cleared successfully!');
      toast.success('All data cleared! Reloading...', {
        description: 'Application will restart in 2 seconds'
      });

      // Wait 2 seconds then reload
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('❌ Error clearing data:', error);
      toast.error('Error clearing some data. Check console for details.');
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  const clearKVStoreData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error('Not authenticated. Sign in first to clear backend data.');
        return;
      }

      console.log('🗑️ Clearing KV store data...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/admin/clear-user-data`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Backend data cleared successfully!');
      } else {
        toast.error('Failed to clear backend data');
      }
    } catch (error) {
      console.error('Error clearing KV store:', error);
      toast.error('Error clearing backend data');
    }
  };

  return (
    <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-500/20 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-400 mb-4">
            Clear all application data and start fresh. This will:
          </p>
          
          <ul className="text-sm text-gray-400 mb-6 space-y-2 ml-4">
            <li>• Sign you out of all sessions</li>
            <li>• Clear all localStorage and sessionStorage</li>
            <li>• Remove all cookies and cached data</li>
            <li>• Reset "Remember Me" preferences</li>
            <li>• Clear browser storage (IndexedDB)</li>
            <li>• Restart the application</li>
          </ul>

          {!showConfirm ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
              
              <button
                onClick={clearKVStoreData}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                Clear Backend Data Only
              </button>
            </div>
          ) : (
            <div className="bg-[#0A0A0A] border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400 font-semibold mb-4">
                ⚠️ Are you absolutely sure? This action cannot be undone!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={clearAllData}
                  disabled={isClearing}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Yes, Clear Everything
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isClearing}
                  className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-300 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
