/**
 * Logo Diagnostic Tool
 * Shows what's actually stored in localStorage
 */

import { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';

export default function DiagnosticLogosDebug() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    checkStorage();
  }, []);

  const checkStorage = () => {
    const result: any = {};

    // Check company_branding_profile
    const brandingProfile = localStorage.getItem('company_branding_profile');
    if (brandingProfile) {
      try {
        result.company_branding_profile = JSON.parse(brandingProfile);
      } catch {
        result.company_branding_profile = { error: 'Failed to parse', raw: brandingProfile };
      }
    } else {
      result.company_branding_profile = null;
    }

    // Check for brand keys
    const allKeys = Object.keys(localStorage);
    const brandKeys = allKeys.filter(k => k.includes('brand') || k.includes('logo'));
    result.allBrandKeys = brandKeys;

    // Get all brand-related data
    result.brandData = {};
    brandKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          result.brandData[key] = parsed;
        } catch {
          result.brandData[key] = value;
        }
      }
    });

    setData(result);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1A1A1A] border-2 border-orange-500/30 rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Search className="w-6 h-6 text-orange-400" />
            Logo Diagnostic Tool
          </h1>
          <button
            onClick={checkStorage}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold"
          >
            Refresh Data
          </button>
        </div>

        {data && (
          <div className="space-y-6">
            {/* Company Branding Profile */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold text-orange-400 mb-4">company_branding_profile</h2>
              {data.company_branding_profile ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Company Name:</p>
                    <p className="text-white font-semibold">
                      {data.company_branding_profile.company_name ||
                       data.company_branding_profile.brandName ||
                       data.company_branding_profile.businessName ||
                       'NOT SET'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Logo URL (logo_url):</p>
                    {data.company_branding_profile.logo_url ? (
                      <div>
                        <p className="text-green-400 text-xs mb-2">
                          ✓ EXISTS ({(data.company_branding_profile.logo_url.length / 1024).toFixed(1)}KB)
                        </p>
                        <img
                          src={data.company_branding_profile.logo_url}
                          alt="Logo Preview"
                          className="w-32 h-32 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                        />
                      </div>
                    ) : (
                      <p className="text-red-400">✗ NOT SET</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Logo Primary (logo_primary):</p>
                    {data.company_branding_profile.logo_primary ? (
                      <div>
                        <p className="text-green-400 text-xs mb-2">
                          ✓ EXISTS ({(data.company_branding_profile.logo_primary.length / 1024).toFixed(1)}KB)
                        </p>
                        <img
                          src={data.company_branding_profile.logo_primary}
                          alt="Logo Primary Preview"
                          className="w-32 h-32 object-contain bg-white/5 border border-white/10 rounded-lg p-2"
                        />
                      </div>
                    ) : (
                      <p className="text-red-400">✗ NOT SET</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">All Fields:</p>
                    <pre className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-96">
                      {JSON.stringify(data.company_branding_profile, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <p>NOT FOUND IN LOCALSTORAGE</p>
                </div>
              )}
            </div>

            {/* All Brand Keys */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h2 className="text-xl font-bold text-blue-400 mb-4">
                All Brand-Related Keys ({data.allBrandKeys.length})
              </h2>
              <div className="space-y-2">
                {data.allBrandKeys.map((key: string) => (
                  <div key={key} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3">
                    <p className="text-white font-semibold mb-2">{key}</p>
                    {data.brandData[key] && typeof data.brandData[key] === 'object' && (
                      <pre className="text-xs text-gray-400 overflow-auto max-h-48">
                        {JSON.stringify(data.brandData[key], null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
