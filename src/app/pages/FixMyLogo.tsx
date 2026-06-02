/**
 * Fix My Logo - Simple One-Click Logo Sync
 * Forces a sync from database to fix logo issues
 */

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

export default function FixMyLogo() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [dbLogo, setDbLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    // Check what's in localStorage
    const stored = localStorage.getItem('company_branding_profile');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored);
        setCurrentLogo(parsed.logo_url || parsed.logo_primary || parsed.logoPrimary || null);
        setCompanyName(parsed.company_name || parsed.brandName || 'Unknown');
      } catch (e) {
        console.error('Failed to parse branding:', e);
      }
    }

    // Check what's in database
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Look for Black Phoenix Company
        const { data: companies, error } = await supabase
          .from('companies')
          .select('*')
          .ilike('company_name', '%black phoenix%')
          .order('created_at', { ascending: false });

        if (!error && companies && companies.length > 0) {
          const company = companies[0];
          const logo = company.logo_primary || company.logo_url;
          setDbLogo(logo);
          setStatus(`Found "${company.company_name || company.name}" in database`);
        } else {
          setStatus('Black Phoenix Company not found in database');
        }
      } else {
        setStatus('Not logged in - please log in first');
      }
    } catch (err: any) {
      setStatus('Error checking database: ' + err.message);
    }
  };

  const forceSyncLogo = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to sync logo');
        setLoading(false);
        return;
      }

      console.log('🔧 [FixMyLogo] Force syncing logo from database...');

      // Get Black Phoenix Company from database
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .ilike('company_name', '%black phoenix%')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Database error: ' + error.message);
      }

      if (!companies || companies.length === 0) {
        throw new Error('Black Phoenix Company not found in database');
      }

      const company = companies[0];
      const logoToUse = company.logo_primary || company.logo_url;

      if (!logoToUse) {
        throw new Error('Company found but has no logo in database');
      }

      // Force write to localStorage
      const brandingProfile = {
        company_name: company.company_name || company.name,
        dbaName: company.company_legal_name || company.company_name || company.name,
        businessName: company.company_name || company.name,
        logo_url: logoToUse,
        logo_primary: company.logo_primary,
        logoPrimary: company.logo_primary,
        primary_color: company.primary_color || '#ea580c',
        secondary_color: company.secondary_color || '#f97316',
        email: company.email,
        phone: company.phone,
      };

      localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));

      // Also publish for public visitors
      const { error: publishError } = await supabase
        .from('kv_store_57095a78')
        .upsert({
          key: 'public_branding_profile',
          value: brandingProfile,
          updated_at: new Date().toISOString()
        });

      if (publishError) {
        console.error('Failed to publish public branding:', publishError);
      }

      // Dispatch event to update UI
      window.dispatchEvent(new Event('brandingUpdated'));

      toast.success('✅ Logo fixed! Redirecting to home page...');

      console.log('✅ [FixMyLogo] Logo synced successfully');
      console.log('✅ [FixMyLogo] Company:', company.company_name || company.name);
      console.log('✅ [FixMyLogo] Logo size:', (logoToUse.length / 1024).toFixed(1) + 'KB');

      // Reload the page after 1 second
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (err: any) {
      console.error('❌ [FixMyLogo] Error:', err);
      toast.error('Failed to sync logo: ' + err.message);
      setStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-[#1A1A1A] border-2 border-orange-500/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">Fix My Logo</h1>
          </div>

          <p className="text-gray-400 mb-8">
            This will force sync your logo from the database and make it visible everywhere (including for public visitors).
          </p>

          {/* Current Status */}
          <div className="space-y-4 mb-8">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-400 mb-3">Current Status:</h3>
              <p className="text-sm text-gray-300 mb-2">{status || 'Checking...'}</p>

              <div className="space-y-3 mt-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Logo in localStorage:</p>
                  {currentLogo ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={currentLogo}
                        alt="Current Logo"
                        className="w-20 h-20 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                      />
                      <div>
                        <p className="text-xs text-green-400">✓ Logo found</p>
                        <p className="text-xs text-gray-500">{companyName}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-red-400">✗ No logo in localStorage</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Logo in database:</p>
                  {dbLogo ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={dbLogo}
                        alt="Database Logo"
                        className="w-20 h-20 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                      />
                      <p className="text-xs text-green-400">✓ Logo found in database</p>
                    </div>
                  ) : (
                    <p className="text-xs text-red-400">✗ No logo in database</p>
                  )}
                </div>
              </div>
            </div>

            {/* Comparison */}
            {currentLogo && dbLogo && currentLogo !== dbLogo && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-semibold">Logo Mismatch Detected!</p>
                </div>
                <p className="text-xs text-gray-300">
                  The logo in localStorage doesn't match the logo in database. Click "Force Sync Logo" to fix this.
                </p>
              </div>
            )}

            {!dbLogo && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-semibold">No Logo in Database</p>
                </div>
                <p className="text-xs text-gray-300">
                  Your Black Phoenix Company doesn't have a logo in the database. Please upload your logo first using the branding settings.
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={forceSyncLogo}
            disabled={loading || !dbLogo}
            className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold text-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Syncing Logo...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Force Sync Logo from Database
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            This will overwrite any existing logo in localStorage with your database logo
          </p>
        </div>
      </div>
    </div>
  );
}
