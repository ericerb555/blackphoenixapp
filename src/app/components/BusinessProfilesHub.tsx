/**
 * Business Profiles Hub - REBUILT FROM SCRATCH
 * Simple, reliable company management with localStorage only
 */

import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { CompanyDatabaseService } from '../lib/services/companyDatabaseService';

interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  industry?: string;
  created_at: string;
  updated_at: string;
}

export default function BusinessProfilesHub() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    industry: '',
    logo_url: ''
  });

  // Load companies from DATABASE on mount
  useEffect(() => {
    async function loadCompanies() {
      console.log('🔄 Loading companies from DATABASE');

      const { data, error } = await CompanyDatabaseService.getCompanies();

      if (error) {
        console.error('❌ Failed to load companies from database:', error);
        setCompanies([]);
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ Loaded', data.length, 'companies from database');
        console.log('  - Company names:', data.map(c => c.company_name || c.name));
        setCompanies(data);
      } else {
        console.log('ℹ️ No companies in database yet');
        setCompanies([]);
      }
    }

    if (user) {
      loadCompanies();
    }
  }, [user]);

  // Add or update company
  const handleSave = async () => {
    console.log('🔵 handleSave called');
    console.log('  - editingId:', editingId);
    console.log('  - formData:', formData);

    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      // Update existing
      console.log('  - UPDATING existing company:', editingId);
      const existingCompany = companies.find(c => c.id === editingId);
      const updatedCompany = {
        ...existingCompany,
        ...formData,
        id: editingId,
        company_name: formData.name, // Database uses company_name
        updated_at: now
      };

      const { data, error } = await CompanyDatabaseService.saveCompany(updatedCompany);

      if (error) {
        console.error('❌ Failed to update company:', error);
        toast.error('Failed to update company');
        return;
      }

      // Update local state
      const updated = companies.map(c => c.id === editingId ? updatedCompany : c);
      setCompanies(updated);
      toast.success('Company updated!');
    } else {
      // Add new
      console.log('  - ADDING new company');
      const newCompany: Company = {
        id: `company_${Date.now()}`,
        name: formData.name,
        company_name: formData.name, // Database uses company_name
        ...formData,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await CompanyDatabaseService.saveCompany(newCompany);

      if (error) {
        console.error('❌ Failed to save company:', error);
        toast.error('Failed to save company');
        return;
      }

      // Update local state
      setCompanies([...companies, newCompany]);
      toast.success('Company added!');
    }

    closeModal();
  };

  // Delete company
  const handleDelete = async (id: string) => {
    if (confirm('Delete this company?')) {
      const { success, error } = await CompanyDatabaseService.deleteCompany(id);

      if (error) {
        console.error('❌ Failed to delete company:', error);
        toast.error('Failed to delete company');
        return;
      }

      // Update local state
      const filtered = companies.filter(c => c.id !== id);
      setCompanies(filtered);
      toast.success('Company deleted');
    }
  };

  // Open modal for add/edit
  const openModal = (company?: Company) => {
    if (company) {
      setEditingId(company.id);
      setFormData({
        name: company.name,
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip_code: company.zip_code || '',
        industry: company.industry || '',
        logo_url: company.logo_url || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        industry: '',
        logo_url: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-400">
        Please log in to manage companies
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Business Profiles</h1>
          <p className="text-gray-400">Manage your companies ({companies.length})</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add Company
        </button>
      </div>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Companies Yet</h2>
          <p className="text-gray-400 mb-6">Add your first company to get started</p>
          <button
            onClick={() => openModal()}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold"
          >
            Add Company
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map(company => (
            <div
              key={company.id}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-lg">
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-lg">{company.name}</h3>
                    {company.industry && (
                      <p className="text-sm text-gray-400">{company.industry}</p>
                    )}
                  </div>
                </div>
              </div>

              {(company.email || company.phone || company.address) && (
                <div className="space-y-2 mb-4 text-sm text-gray-400">
                  {company.email && <p>📧 {company.email}</p>}
                  {company.phone && <p>📞 {company.phone}</p>}
                  {company.address && (
                    <p>📍 {[company.address, company.city, company.state, company.zip_code].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => openModal(company)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition font-semibold"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A0A0A] border-2 border-orange-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? 'Edit Company' : 'Add Company'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Enter company name"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {formData.logo_url && (
                    <img
                      src={formData.logo_url}
                      alt="Logo preview"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-[#2A2A2A]"
                    />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      Choose logo file
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="e.g., Construction, Technology"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="company@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="123 Business St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    ZIP
                  </label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#2A2A2A] p-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-[#1A1A1A] text-gray-400 rounded-xl hover:bg-[#2A2A2A] transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-semibold"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Update' : 'Save'} Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
