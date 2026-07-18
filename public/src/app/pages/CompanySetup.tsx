import { useState, useEffect } from 'react';
import { Building2, Plus, AlertCircle, CheckCircle, RefreshCw, FileText, Shield, DollarSign, Hash } from 'lucide-react';
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
    // Basic Information
    name: 'Black Phoenix Builds',
    slug: 'black-phoenix-builds',
    legalName: '',
    dbaName: '',
    
    // Contact Information
    email: '',
    phone: '',
    fax: '',
    website: '',
    
    // Address Information
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    
    // Business Registration
    businessType: '', // LLC, Corporation, Partnership, Sole Proprietorship
    ein: '', // Employer Identification Number
    stateLicenseNumber: '',
    contractorsLicense: '',
    insurancePolicy: '',
    bondNumber: '',
    
    // Banking & Financial
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    taxId: '',
    
    // Business Details
    yearEstablished: '',
    numberOfEmployees: '',
    serviceAreas: '',
    specialties: '',
    
    // Transaction Settings
    transactionPrefix: 'BPB', // Auto-generated from company name
    nextTransactionNumber: 1000,
    
    // Additional
    notes: '',
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

  // Helper function to generate transaction prefix from company name
  const generateTransactionPrefix = (companyName: string) => {
    return companyName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  };

  // Update transaction prefix when company name changes
  useEffect(() => {
    if (formData.name) {
      const prefix = generateTransactionPrefix(formData.name);
      // Only update if the prefix has actually changed to prevent infinite loops
      if (prefix !== formData.transactionPrefix) {
        setFormData(prev => ({ ...prev, transactionPrefix: prefix }));
      }
    }
  }, [formData.name]); // Only depend on name, not entire formData

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
                    <pre className="text-sm text-gray-400 mb-2 overflow-auto max-h-32">
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
            <div className="p-6 bg-[#0A0A0A] border border-[#ea580c]/30 rounded-lg max-h-[600px] overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#ea580c]" />
                Complete Company Registration
              </h2>
              
              <div className="space-y-6">
                {/* BASIC INFORMATION SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Basic Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Black Phoenix Builds"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Legal Name</label>
                      <input
                        type="text"
                        value={formData.legalName}
                        onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Black Phoenix Builds LLC"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">DBA Name</label>
                      <input
                        type="text"
                        value={formData.dbaName}
                        onChange={(e) => setFormData({ ...formData, dbaName: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Doing Business As (if different)"
                      />
                    </div>
                  </div>
                </div>

                {/* CONTACT INFORMATION SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="contact@blackphoenixbuilds.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Phone *</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Fax</label>
                      <input
                        type="tel"
                        value={formData.fax}
                        onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="(555) 123-4568"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="https://blackphoenixbuilds.com"
                      />
                    </div>
                  </div>
                </div>

                {/* ADDRESS INFORMATION SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4">Business Address</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Street Address *</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="123 Construction Lane"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={formData.addressLine2}
                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Suite, Unit, Building, Floor"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">City *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Phoenix"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">State *</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="AZ"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">ZIP Code *</label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="85001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>

                {/* BUSINESS REGISTRATION SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Business Registration & Licenses
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Business Type</label>
                      <select
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      >
                        <option value="">Select Type</option>
                        <option value="llc">LLC</option>
                        <option value="corporation">Corporation</option>
                        <option value="s-corp">S-Corporation</option>
                        <option value="partnership">Partnership</option>
                        <option value="sole-proprietorship">Sole Proprietorship</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">EIN (Tax ID)</label>
                      <input
                        type="text"
                        value={formData.ein}
                        onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="12-3456789"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">State License Number</label>
                      <input
                        type="text"
                        value={formData.stateLicenseNumber}
                        onChange={(e) => setFormData({ ...formData, stateLicenseNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="SL-123456"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Contractor's License</label>
                      <input
                        type="text"
                        value={formData.contractorsLicense}
                        onChange={(e) => setFormData({ ...formData, contractorsLicense: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="CL-987654"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Insurance Policy Number</label>
                      <input
                        type="text"
                        value={formData.insurancePolicy}
                        onChange={(e) => setFormData({ ...formData, insurancePolicy: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="INS-123456789"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Bond Number</label>
                      <input
                        type="text"
                        value={formData.bondNumber}
                        onChange={(e) => setFormData({ ...formData, bondNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="BD-456789"
                      />
                    </div>
                  </div>
                </div>

                {/* BANKING INFORMATION SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Banking & Financial Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="First National Bank"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="••••••1234"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Routing Number</label>
                      <input
                        type="text"
                        value={formData.routingNumber}
                        onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="123456789"
                      />
                    </div>
                  </div>
                </div>

                {/* BUSINESS DETAILS SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4">Business Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Year Established</label>
                      <input
                        type="number"
                        value={formData.yearEstablished}
                        onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="2020"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Number of Employees</label>
                      <input
                        type="number"
                        value={formData.numberOfEmployees}
                        onChange={(e) => setFormData({ ...formData, numberOfEmployees: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="10"
                        min="1"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Service Areas</label>
                      <input
                        type="text"
                        value={formData.serviceAreas}
                        onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Phoenix Metro Area, Scottsdale, Tempe"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Specialties</label>
                      <input
                        type="text"
                        value={formData.specialties}
                        onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="Kitchen Remodeling, Bathroom Renovation, Custom Homes"
                      />
                    </div>
                  </div>
                </div>

                {/* TRANSACTION CODE SETTINGS SECTION */}
                <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#fb923c]/10 border border-[#ea580c]/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Transaction Code Settings
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Transaction Prefix (Auto-Generated)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.transactionPrefix}
                          onChange={(e) => setFormData({ ...formData, transactionPrefix: e.target.value.toUpperCase().slice(0, 4) })}
                          className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#ea580c]/50 rounded-lg text-[#ea580c] font-mono font-bold focus:outline-none focus:border-[#ea580c]"
                          placeholder="BPB"
                          maxLength={4}
                        />
                        <div className="px-4 py-2 bg-black border border-[#ea580c]/30 rounded-lg text-gray-400 flex items-center">
                          <span className="text-sm">Example: {formData.transactionPrefix}-{formData.nextTransactionNumber}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">Used for Work Orders, Quotes, Invoices, Contracts</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Starting Transaction Number</label>
                      <input
                        type="number"
                        value={formData.nextTransactionNumber}
                        onChange={(e) => setFormData({ ...formData, nextTransactionNumber: parseInt(e.target.value) || 1000 })}
                        className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#ea580c]/50 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                        placeholder="1000"
                        min="1"
                      />
                      <p className="text-sm text-gray-400 mt-1">First transaction will be: {formData.transactionPrefix}-{formData.nextTransactionNumber}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-black/40 border border-[#ea580c]/20 rounded-lg">
                    <p className="text-sm text-gray-300 mb-2">Transaction codes will be auto-generated for:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-[#ea580c]">•</span> Work Requests: WR-{formData.transactionPrefix}-####
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-[#ea580c]">•</span> Quotes: QT-{formData.transactionPrefix}-####
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-[#ea580c]">•</span> Contracts: CT-{formData.transactionPrefix}-####
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-[#ea580c]">•</span> Invoices: INV-{formData.transactionPrefix}-####
                      </div>
                    </div>
                  </div>
                </div>

                {/* NOTES SECTION */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#ea580c] mb-4">Additional Notes</h3>
                  
                  <div>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      rows={4}
                      placeholder="Additional company information, special requirements, certifications, etc."
                    />
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-4 pt-4 border-t border-[#2A2A2A]">
                  <button
                    onClick={createCompany}
                    disabled={loading || !formData.name || !formData.email || !formData.phone}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#fb923c] text-white rounded-lg hover:from-[#fb923c] hover:to-[#ea580c] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {loading ? '⏳ Creating Company...' : '✓ Create Company Profile'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] font-semibold"
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
            <p className="text-sm text-gray-400 mb-2">Open browser console (F12) and run:</p>
            <code className="block text-sm text-green-400 bg-[#1A1A1A] p-2 rounded">
              scanLocalStorageForCompanies()
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}