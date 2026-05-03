import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Image as ImageIcon, Database, CheckCircle, XCircle } from 'lucide-react';

export default function DiagnosticLogos() {
  const [brandingData, setBrandingData] = useState<any>(null);
  const [brandCreatorData, setBrandCreatorData] = useState<any>(null);
  const [allStorageKeys, setAllStorageKeys] = useState<string[]>([]);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = () => {
    // Check main branding profile
    const branding = localStorage.getItem('company_branding_profile');
    if (branding) {
      setBrandingData(JSON.parse(branding));
    }

    // Check for Brand Creator data
    const allKeys = Object.keys(localStorage);
    setAllStorageKeys(allKeys);
    
    const brandDataKey = allKeys.find(key => key.startsWith('brand_data_'));
    if (brandDataKey) {
      const brandData = localStorage.getItem(brandDataKey);
      if (brandData) {
        setBrandCreatorData(JSON.parse(brandData));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.history.back()}
            className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Search className="w-8 h-8 text-[#ea580c]" />
              Logo Diagnostics
            </h1>
            <p className="text-gray-400 mt-1">Debug your logo storage locations</p>
          </div>
        </div>

        {/* Company Branding Profile */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Company Branding Profile</h2>
            <span className="text-xs text-gray-500">(company_branding_profile)</span>
          </div>

          {brandingData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Data Found</span>
              </div>

              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-400">Company Name:</p>
                    <p className="text-white font-semibold">{brandingData.company_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Logo URL:</p>
                    <p className="text-white font-mono text-xs break-all">
                      {brandingData.logo_url || <span className="text-red-400">NOT SET</span>}
                    </p>
                  </div>
                </div>

                {brandingData.logo_url && (
                  <div>
                    <p className="text-gray-400 mb-2">Logo Preview:</p>
                    <img 
                      src={brandingData.logo_url} 
                      alt="Logo" 
                      className="max-h-32 bg-white/10 p-4 rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <details className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  View Full JSON Data
                </summary>
                <pre className="mt-4 text-xs overflow-auto max-h-96 text-gray-300">
                  {JSON.stringify(brandingData, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>No data found</span>
            </div>
          )}
        </div>

        {/* Brand Creator Data */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ImageIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">Brand Creator Data</h2>
            <span className="text-xs text-gray-500">(brand_data_*)</span>
          </div>

          {brandCreatorData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Data Found</span>
              </div>

              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-400">Brand Name:</p>
                    <p className="text-white font-semibold">{brandCreatorData.brandName || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Logo Count:</p>
                    <p className="text-white font-semibold">
                      {[
                        brandCreatorData.logoPrimary,
                        brandCreatorData.logoSecondary,
                        brandCreatorData.logoIcon,
                        brandCreatorData.logoHorizontal
                      ].filter(Boolean).length} logos
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {brandCreatorData.logoPrimary && (
                    <div>
                      <p className="text-gray-400 mb-2">Primary Logo:</p>
                      <img 
                        src={brandCreatorData.logoPrimary} 
                        alt="Primary Logo" 
                        className="max-h-24 bg-white/10 p-2 rounded-lg"
                      />
                    </div>
                  )}
                  {brandCreatorData.logoSecondary && (
                    <div>
                      <p className="text-gray-400 mb-2">Secondary Logo:</p>
                      <img 
                        src={brandCreatorData.logoSecondary} 
                        alt="Secondary Logo" 
                        className="max-h-24 bg-white/10 p-2 rounded-lg"
                      />
                    </div>
                  )}
                  {brandCreatorData.logoIcon && (
                    <div>
                      <p className="text-gray-400 mb-2">Icon Logo:</p>
                      <img 
                        src={brandCreatorData.logoIcon} 
                        alt="Icon Logo" 
                        className="max-h-24 bg-white/10 p-2 rounded-lg"
                      />
                    </div>
                  )}
                  {brandCreatorData.logoHorizontal && (
                    <div>
                      <p className="text-gray-400 mb-2">Horizontal Logo:</p>
                      <img 
                        src={brandCreatorData.logoHorizontal} 
                        alt="Horizontal Logo" 
                        className="max-h-24 bg-white/10 p-2 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <details className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  View Full JSON Data
                </summary>
                <pre className="mt-4 text-xs overflow-auto max-h-96 text-gray-300">
                  {JSON.stringify(brandCreatorData, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>No data found</span>
            </div>
          )}
        </div>

        {/* Fix Actions */}
        <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/10 border border-[#ea580c]/30 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-[#ea580c]" />
            How to Fix Missing Logos
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Go to Company Profile</p>
                <p className="text-gray-400">Navigate to the Company Profile page from your dashboard</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Upload Your Logo</p>
                <p className="text-gray-400">In the "Company Logo" section, upload your logo image</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Save Your Changes</p>
                <p className="text-gray-400">Click the "Save Profile" button to save your logo</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center text-xs font-bold flex-shrink-0">
                4
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Refresh Landing Page</p>
                <p className="text-gray-400">Go back to your landing page and refresh to see your logo</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/company-profile'}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg font-semibold transition-all shadow-lg"
          >
            Go to Company Profile
          </button>
        </div>

        {/* All LocalStorage Keys */}
        <details className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mt-6">
          <summary className="cursor-pointer text-lg font-bold hover:text-[#ea580c] transition-colors">
            All LocalStorage Keys ({allStorageKeys.length})
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {allStorageKeys.map((key) => (
              <div
                key={key}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-xs font-mono text-gray-400 hover:text-white hover:border-[#ea580c]/30 transition-colors"
              >
                {key}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
