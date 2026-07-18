/**
 * Check My Companies - Database Diagnostic
 * Shows what companies are in the database and their logo data
 */

import { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CheckMyCompanies() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [kvData, setKvData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check auth status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      setAuthStatus({
        authenticated: !!user,
        userId: user?.id || 'Not authenticated',
        email: user?.email || 'No email'
      });

      // Check companies table
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error('Companies query error:', companiesError);
        setError(`Companies table error: ${companiesError.message}`);
      } else {
        setCompanies(companiesData || []);
        console.log('📊 Companies found:', companiesData?.length || 0);
      }

      // Check kv_store for branding data
      const { data: kvStoreData, error: kvError } = await supabase
        .from('kv_store_57095a78')
        .select('*')
        .or('key.ilike.%brand%,key.ilike.%logo%,key.ilike.%company%');

      if (kvError) {
        console.error('KV Store query error:', kvError);
      } else {
        setKvData(kvStoreData || []);
        console.log('📊 KV Store entries found:', kvStoreData?.length || 0);
      }

    } catch (err: any) {
      console.error('Check data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncToLocalStorage = (company: any) => {
    try {
      const logoToUse = company.logo_primary || company.logo_url;

      const brandingProfile = {
        company_name: company.company_name || company.name,
        brandName: company.company_name || company.name,
        businessName: company.company_name || company.name,
        logo_url: logoToUse,
        logo_primary: company.logo_primary,
        logoPrimary: company.logo_primary,
        primary_color: company.primary_color || '#ea580c',
        secondary_color: company.secondary_color || '#f97316',
        email: company.email,
        phone: company.phone
      };

      localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));
      window.dispatchEvent(new Event('brandingUpdated'));

      alert(`✅ Synced ${company.company_name || company.name} to localStorage! Refresh the page to see changes.`);
    } catch (err: any) {
      alert(`Failed to sync: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-[#1A1A1A] border-2 border-blue-500/30 rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" />
            Check My Companies
          </h1>
          <button
            onClick={checkData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Auth Status */}
        {authStatus && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-purple-400 mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {authStatus.authenticated ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={authStatus.authenticated ? 'text-green-400' : 'text-red-400'}>
                  {authStatus.authenticated ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
              <p className="text-sm text-gray-400">User ID: {authStatus.userId}</p>
              <p className="text-sm text-gray-400">Email: {authStatus.email}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold">Error</h3>
            </div>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Companies Table */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-orange-400 mb-4">
            Companies Table ({companies.length} found)
          </h2>
          {companies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>No companies found in database</p>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company, idx) => (
                <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">
                        {company.company_name || company.name || 'Unnamed Company'}
                      </h3>
                      <p className="text-sm text-gray-400">ID: {company.id}</p>
                      {company.created_at && (
                        <p className="text-xs text-gray-500">
                          Created: {new Date(company.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => syncToLocalStorage(company)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold"
                    >
                      Sync to Landing Page
                    </button>
                  </div>

                  {/* Logo Display */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Logo Primary:</p>
                      {company.logo_primary ? (
                        <div>
                          <p className="text-xs text-green-400 mb-2">
                            ✓ EXISTS ({(company.logo_primary.length / 1024).toFixed(1)}KB)
                          </p>
                          <img
                            src={company.logo_primary}
                            alt="Logo Primary"
                            className="w-24 h-24 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                          />
                        </div>
                      ) : (
                        <p className="text-red-400 text-xs">✗ NOT SET</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Logo URL:</p>
                      {company.logo_url ? (
                        <div>
                          <p className="text-xs text-green-400 mb-2">
                            ✓ EXISTS ({(company.logo_url.length / 1024).toFixed(1)}KB)
                          </p>
                          <img
                            src={company.logo_url}
                            alt="Logo URL"
                            className="w-24 h-24 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                          />
                        </div>
                      ) : (
                        <p className="text-red-400 text-xs">✗ NOT SET</p>
                      )}
                    </div>
                  </div>

                  {/* Raw Data */}
                  <details className="mt-4">
                    <summary className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                      View Raw Data
                    </summary>
                    <pre className="mt-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-xs text-gray-400 overflow-auto max-h-96">
                      {JSON.stringify(company, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KV Store Data */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            KV Store Branding Data ({kvData.length} entries)
          </h2>
          {kvData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <p>No branding data found in KV store</p>
            </div>
          ) : (
            <div className="space-y-4">
              {kvData.map((entry, idx) => (
                <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <p className="text-white font-semibold mb-2">{entry.key}</p>
                  <pre className="bg-black/50 border border-[#2A2A2A] rounded p-2 text-xs text-gray-400 overflow-auto max-h-48">
                    {JSON.stringify(entry.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
