/**
 * Company Data Restoration Tool
 * Emergency tool to restore complete company data that was lost
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Save, Building2, ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CompanyData {
  id: string;
  name: string;
  dba?: string;
  slug: string;
  is_primary: boolean;
  owner_id: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  industry?: string;
  description?: string;
  founded_date?: string;
  employee_count?: number;
  annual_revenue?: number;
  tax_id?: string;
  business_license?: string;
  created_at: string;
  updated_at: string;
}

export default function CompanyDataRestoration({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/companies`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[Restoration] Loaded companies:', result.companies);
        setCompanies(result.companies || []);
      } else {
        toast.error('Failed to load companies');
      }
    } catch (error) {
      console.error('[Restoration] Error loading companies:', error);
      toast.error('Error loading companies');
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async (company: CompanyData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/companies/${company.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(company)
        }
      );

      if (response.ok) {
        toast.success(`${company.name} saved successfully!`);
        setSaved(prev => ({ ...prev, [company.id]: true }));
        setEditingCompany(null);
        await loadCompanies();
      } else {
        toast.error('Failed to save company');
      }
    } catch (error) {
      console.error('[Restoration] Error saving company:', error);
      toast.error('Error saving company');
    }
  };

  const handleFieldChange = (field: keyof CompanyData, value: any) => {
    if (editingCompany) {
      setEditingCompany({
        ...editingCompany,
        [field]: value,
        updated_at: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#ea580c] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] border-b border-[#ea580c]/30 shadow-xl">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate?.('owners-dashboard')}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Company Data Restoration</h1>
                <p className="text-gray-400 mt-1">Restore all missing company information</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-500 font-bold text-lg mb-2">Data Loss Detected</h3>
              <p className="text-gray-300 mb-2">
                Your companies exist in the database but most of their data is missing. 
                Fill out the forms below to restore complete company information.
              </p>
              <p className="text-gray-400 text-sm">
                Found {companies.length} {companies.length === 1 ? 'company' : 'companies'} with incomplete data
              </p>
            </div>
          </div>
        </div>

        {/* Company Cards */}
        <div className="space-y-6">
          {companies.map((company) => (
            <div key={company.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
              {/* Company Header */}
              <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{company.name}</h2>
                    <p className="text-sm text-gray-400">ID: {company.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {saved[company.id] && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Check className="w-4 h-4" />
                      Saved
                    </div>
                  )}
                  {editingCompany?.id === company.id ? (
                    <>
                      <button
                        onClick={() => saveCompany(editingCompany)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingCompany(null)}
                        className="px-4 py-2 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#3A3A3A] transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingCompany(company)}
                      className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all"
                    >
                      Edit & Restore
                    </button>
                  )}
                </div>
              </div>

              {/* Edit Form */}
              {editingCompany?.id === company.id && (
                <div className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Company Name *</label>
                        <input
                          type="text"
                          value={editingCompany.name}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">DBA (Doing Business As)</label>
                        <input
                          type="text"
                          value={editingCompany.dba || ''}
                          onChange={(e) => handleFieldChange('dba', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Industry</label>
                        <input
                          type="text"
                          value={editingCompany.industry || ''}
                          onChange={(e) => handleFieldChange('industry', e.target.value)}
                          placeholder="e.g., Construction, Consulting, etc."
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Founded Date</label>
                        <input
                          type="date"
                          value={editingCompany.founded_date || ''}
                          onChange={(e) => handleFieldChange('founded_date', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                        <input
                          type="email"
                          value={editingCompany.email || ''}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={editingCompany.phone || ''}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                        <input
                          type="url"
                          value={editingCompany.website || ''}
                          onChange={(e) => handleFieldChange('website', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Logo URL</label>
                        <input
                          type="url"
                          value={editingCompany.logo_url || ''}
                          onChange={(e) => handleFieldChange('logo_url', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Address</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Street Address</label>
                        <input
                          type="text"
                          value={editingCompany.address || ''}
                          onChange={(e) => handleFieldChange('address', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                          <input
                            type="text"
                            value={editingCompany.city || ''}
                            onChange={(e) => handleFieldChange('city', e.target.value)}
                            className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
                          <input
                            type="text"
                            value={editingCompany.state || ''}
                            onChange={(e) => handleFieldChange('state', e.target.value)}
                            className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">ZIP Code</label>
                          <input
                            type="text"
                            value={editingCompany.zip_code || ''}
                            onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                            className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                          <input
                            type="text"
                            value={editingCompany.country || ''}
                            onChange={(e) => handleFieldChange('country', e.target.value)}
                            placeholder="USA"
                            className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Business Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Employee Count</label>
                        <input
                          type="number"
                          value={editingCompany.employee_count || ''}
                          onChange={(e) => handleFieldChange('employee_count', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Annual Revenue ($)</label>
                        <input
                          type="number"
                          value={editingCompany.annual_revenue || ''}
                          onChange={(e) => handleFieldChange('annual_revenue', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tax ID / EIN</label>
                        <input
                          type="text"
                          value={editingCompany.tax_id || ''}
                          onChange={(e) => handleFieldChange('tax_id', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Business License #</label>
                        <input
                          type="text"
                          value={editingCompany.business_license || ''}
                          onChange={(e) => handleFieldChange('business_license', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Description</h3>
                    <textarea
                      value={editingCompany.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      rows={4}
                      placeholder="Describe your company..."
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No companies found in database</p>
          </div>
        )}
      </div>
    </div>
  );
}
