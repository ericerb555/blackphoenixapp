import { useState, useEffect } from 'react';
import { Building2, Plus, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CompanySetupProps {
  onNavigate: (page: string) => void;
}

export default function CompanySetup({ onNavigate }: CompanySetupProps) {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [localStorageData, setLocalStorageData] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Black Phoenix Builds',
    slug: 'black-phoenix-builds',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  useEffect(() => {
    checkUser();
    scanLocalStorage();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchCompanies(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const fetchCompanies = async (uid: string) => {
    setLoading(true);
    try {
      // Try to fetch from API
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.log('No access token available');
        setLoading(false);
        return;
      }

      const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/companies`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { companies: companiesData } = await response.json();
        setCompanies(companiesData || []);
      } else {
        console.log('Failed to fetch companies from server');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const scanLocalStorage = () => {
    setScanning(true);
    const found: any[] = [];
    
    try {
      // Check for company data in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('companies') || key.includes('company'))) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              found.push({ key, data: parsed });
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      setLocalStorageData(found);
    } catch (error) {
      console.error('Error scanning localStorage:', error);
    } finally {
      setScanning(false);
    }
  };

  const createCompany = async () => {
    if (!userId) {
      alert('Please log in first');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        alert('No access token available. Please log in again.');
        setLoading(false);
        return;
      }

      // Create company via API
      const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/companies`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          is_primary: true,
          owner_id: userId
        })
      });

      if (response.ok) {
        const { company } = await response.json();
        alert('Company created successfully!');
        setCompanies([company]);
        setShowCreateForm(false);
        
        // Save to localStorage as backup
        localStorage.setItem('companies_offline', JSON.stringify([company]));
        
        // Reload page to refresh context
        window.location.reload();
      } else {
        const error = await response.text();
        alert(`Failed to create company: ${error}`);
      }
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Error creating company. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const restoreFromLocalStorage = (data: any) => {
    try {
      // Save to current localStorage key
      localStorage.setItem('companies_offline', JSON.stringify(Array.isArray(data) ? data : [data]));
      alert('Company data restored! Reloading page...');
      window.location.reload();
    } catch (error) {
      console.error('Error restoring data:', error);
      alert('Failed to restore data');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-8 h-8 text-[#ea580c]" />
            <h1 className="text-3xl font-bold text-white">Company Setup & Recovery</h1>
          </div>

          {/* User Info */}
          <div className="mb-6 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-2">Current User</h2>
            {userId ? (
              <p className="text-green-400">✓ Logged in (ID: {userId.substring(0, 8)}...)</p>
            ) : (
              <p className="text-yellow-400">⚠ Not logged in</p>
            )}
          </div>

          {/* Database Companies */}
          <div className="mb-6 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Companies in Database</h2>
              <button
                onClick={() => userId && fetchCompanies(userId)}
                disabled={loading || !userId}
                className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : companies.length > 0 ? (
              <div className="space-y-2">
                {companies.map((company) => (
                  <div key={company.id} className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white font-medium">{company.name}</p>
                        <p className="text-sm text-gray-400">ID: {company.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onNavigate('unified-dashboard')}
                  className="w-full mt-4 px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] font-semibold"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <p className="text-gray-400 mb-4">No companies found in database</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] font-semibold flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Create New Company
                </button>
              </div>
            )}
          </div>

          {/* LocalStorage Recovery */}
          <div className="mb-6 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">LocalStorage Recovery</h2>
              <button
                onClick={scanLocalStorage}
                disabled={scanning}
                className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                Scan
              </button>
            </div>

            {localStorageData.length > 0 ? (
              <div className="space-y-2">
                {localStorageData.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                    <p className="text-white font-medium mb-2">Key: {item.key}</p>
                    <pre className="text-xs text-gray-400 mb-2 overflow-auto max-h-32">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                    <button
                      onClick={() => restoreFromLocalStorage(item.data)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Restore This Data
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No company data found in localStorage</p>
            )}
          </div>

          {/* Create Company Form */}
          {showCreateForm && (
            <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Create New Company</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    placeholder="Black Phoenix Builds"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    placeholder="info@blackphoenixbuilds.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={createCompany}
                    disabled={loading || !formData.name}
                    className="flex-1 px-6 py-3 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Company'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Console Commands */}
          <div className="mt-6 p-4 bg-[#0A0A0A] border border-yellow-600/30 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-400 mb-2">🔧 Advanced Recovery (Console)</h3>
            <p className="text-xs text-gray-400 mb-2">Open browser console (F12) and run:</p>
            <code className="block text-xs text-green-400 bg-[#1A1A1A] p-2 rounded">
              scanLocalStorageForCompanies()
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
