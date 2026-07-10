import { useEffect, useState } from 'react';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';

export function CompanyDataRestorer() {
  const [status, setStatus] = useState<'checking' | 'restored' | 'exists'>('checking');

  useEffect(() => {
    restoreCompanyData();
  }, []);

  const restoreCompanyData = () => {
    const COMPANY = {
      id: 'company_blackphoenix_primary',
      name: 'Black Phoenix Builds',
      slug: 'black-phoenix-builds',
      is_primary: true,
      role: 'owner',
      industry: 'Construction',
      description: 'Black Phoenix Builds - Enterprise Construction Management',
      country: 'USA',
      email: 'info@blackphoenixbuilds.com',
      phone: '(617) 710-0058',
      address: '50A Northwestern Drive',
      city: 'Salem',
      state: 'NH',
      zip_code: '03079',
      logo_url: '',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };

    // Check if data exists
    const keys = ['companies_offline', 'companies_global_backup', 'companies_latest'];
    let found = false;

    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (stored && stored !== 'undefined' && stored !== 'null') {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            found = true;
            break;
          }
        } catch (e) {
          console.error('Error parsing:', e);
        }
      }
    }

    if (!found) {
      // Restore company data
      localStorage.setItem('companies_offline', JSON.stringify([COMPANY]));
      localStorage.setItem('companies_global_backup', JSON.stringify([COMPANY]));
      localStorage.setItem('companies_latest', JSON.stringify([COMPANY]));
      localStorage.setItem('company_blackphoenix_primary', JSON.stringify(COMPANY));

      console.log('✅ Black Phoenix Builds restored to ALL storage locations');
      setStatus('restored');
    } else {
      console.log('✅ Company data already exists');
      setStatus('exists');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-[#1A1A1A] border border-zinc-800 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-orange-400" />
        <div>
          {status === 'checking' && (
            <p className="text-sm text-zinc-400">Checking company data...</p>
          )}
          {status === 'restored' && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm text-green-400">Company data restored!</p>
            </div>
          )}
          {status === 'exists' && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-blue-400">Company data verified</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
