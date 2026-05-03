/**
 * Simple Company Manager - Clean, Working Company Creation
 *
 * This component is a complete rebuild focused on:
 * - Simple localStorage-based company management
 * - Reliable company creation and editing
 * - No complex server logic or state conflicts
 * - Clean, maintainable code
 */

import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, X, Upload, Search, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { BrandingService } from '../lib/services/brandingService';
import { CompanyDatabaseService, Company as DBCompany } from '../lib/services/companyDatabaseService';

interface Company {
  id: string;
  name: string;
  dba?: string;
  slug: string;
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
  created_at: string;
  updated_at: string;
}

export default function SimpleCompanyManager() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    dba: '',
    slug: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    industry: '',
    description: '',
  });

  // Logo variants state
  const [logoFiles, setLogoFiles] = useState<{
    primary: File | null;
    icon: File | null;
    square: File | null;
    horizontal: File | null;
    vertical: File | null;
    white: File | null;
    black: File | null;
    secondary: File | null;
  }>({
    primary: null,
    icon: null,
    square: null,
    horizontal: null,
    vertical: null,
    white: null,
    black: null,
    secondary: null,
  });

  const [logoPreviews, setLogoPreviews] = useState<{
    primary: string | null;
    icon: string | null;
    square: string | null;
    horizontal: string | null;
    vertical: string | null;
    white: string | null;
    black: string | null;
    secondary: string | null;
  }>({
    primary: null,
    icon: null,
    square: null,
    horizontal: null,
    vertical: null,
    white: null,
    black: null,
    secondary: null,
  });

  // Company documents state
  const [documents, setDocuments] = useState<{
    license: File | null;
    insurance: File | null;
    other: File[];
  }>({
    license: null,
    insurance: null,
    other: [],
  });

  // Load companies on mount
  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => {
    if (!user) return;

    try {
      // Load from database (primary source)
      const { data: dbCompanies, error } = await CompanyDatabaseService.getCompanies();

      if (dbCompanies && dbCompanies.length > 0) {
        // Convert database companies to UI format
        const uiCompanies: Company[] = dbCompanies.map(c => ({
          id: c.id || '',
          name: c.company_name,
          dba: c.company_legal_name,
          slug: c.slug || '',
          logo_url: c.logo_url,
          website: c.website,
          email: c.email,
          phone: c.phone,
          address: c.address_line1,
          city: c.city,
          state: c.state,
          zip_code: c.zip_code,
          country: c.country,
          industry: c.industry,
          description: c.description,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString(),
        }));

        setCompanies(uiCompanies);
        console.log('✅ Loaded companies from database:', uiCompanies.length);
        return;
      }

      if (error) {
        console.error('Database error, trying fallback:', error);
      }

      // Fallback: Try to create company from branding profile
      const { data: profile } = await BrandingService.getBrandingProfile();
      if (profile && profile.company_name) {
        const newCompany: Company = {
          id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: profile.company_name,
          slug: profile.company_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          logo_url: profile.logo_url,
          email: profile.email,
          phone: profile.phone,
          address: profile.address_line1,
          city: profile.city,
          state: profile.state,
          zip_code: profile.zip_code,
          country: profile.country,
          website: profile.website,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setCompanies([newCompany]);

        // Save to database
        await saveCompanyToDatabase(newCompany);
        console.log('✅ Created company from branding profile and saved to database');
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    }
  };

  const saveCompanyToDatabase = async (company: Company): Promise<void> => {
    const dbCompany: DBCompany = {
      id: company.id,
      company_name: company.name,
      company_legal_name: company.dba,
      slug: company.slug,
      logo_url: company.logo_url,
      website: company.website,
      email: company.email,
      phone: company.phone,
      address_line1: company.address,
      city: company.city,
      state: company.state,
      zip_code: company.zip_code,
      country: company.country,
      industry: company.industry,
      description: company.description,
    };

    await CompanyDatabaseService.saveCompany(dbCompany);
  };

  // Note: saveCompanies is now handled by database service in handleSave
  // Keeping this for backwards compatibility, but it just logs
  const saveCompanies = (updatedCompanies: Company[]) => {
    console.log('ℹ️ Companies now saved to database automatically');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dba: '',
      slug: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'United States',
      industry: '',
      description: '',
    });
    setLogoFiles({
      primary: null,
      icon: null,
      square: null,
      horizontal: null,
      vertical: null,
      white: null,
      black: null,
      secondary: null,
    });
    setLogoPreviews({
      primary: null,
      icon: null,
      square: null,
      horizontal: null,
      vertical: null,
      white: null,
      black: null,
      secondary: null,
    });
    setDocuments({
      license: null,
      insurance: null,
      other: [],
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof logoFiles) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      setLogoFiles(prev => ({ ...prev, [type]: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreviews(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'insurance' | 'other') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'other') {
      // Handle multiple files
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return false;
        }
        return true;
      });
      setDocuments(prev => ({ ...prev, other: [...prev.other, ...validFiles] }));
      toast.success(`${validFiles.length} document(s) added`);
    } else {
      // Handle single file
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File must be less than 10MB');
        return;
      }
      setDocuments(prev => ({ ...prev, [type]: file }));
      toast.success(`${type} uploaded`);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => ({
      ...prev,
      other: prev.other.filter((_, i) => i !== index),
    }));
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      dba: company.dba || '',
      slug: company.slug,
      website: company.website || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zip_code: company.zip_code || '',
      country: company.country || 'United States',
      industry: company.industry || '',
      description: company.description || '',
    });

    // Set primary logo preview if exists
    setLogoPreviews(prev => ({
      ...prev,
      primary: company.logo_url || null,
    }));

    setShowModal(true);
  };

  const handleSave = async () => {
    if (!(formData.name || '').trim()) {
      toast.error('Company name is required');
      return;
    }

    try {
      const slug = formData.slug || (formData.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Use primary logo preview (could be existing or new)
      const primaryLogoUrl = logoPreviews.primary || editingCompany?.logo_url;

      const companyToSave: Company = editingCompany
        ? {
            ...editingCompany,
            ...formData,
            slug,
            logo_url: primaryLogoUrl,
            updated_at: new Date().toISOString(),
          }
        : {
            id: '',  // Database will generate ID
            ...formData,
            slug,
            logo_url: primaryLogoUrl || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

      // Save to database
      await saveCompanyToDatabase(companyToSave);

      // Save logo variants to localStorage
      const logoVariants = {
        logo_primary: logoPreviews.primary || '',
        logo_secondary: logoPreviews.secondary || '',
        logo_icon: logoPreviews.icon || '',
        logo_square: logoPreviews.square || '',
        logo_horizontal: logoPreviews.horizontal || '',
        logo_vertical: logoPreviews.vertical || '',
        logo_white: logoPreviews.white || '',
        logo_black: logoPreviews.black || '',
      };
      localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));
      console.log('✅ Saved logo variants to localStorage:', logoVariants);

      // Save company documents to localStorage
      if (documents.license || documents.insurance || documents.other.length > 0) {
        const companyDocuments = [];

        if (documents.license) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const doc = {
              id: `doc_license_${Date.now()}`,
              name: 'Business License',
              type: 'license',
              fileUrl: reader.result as string,
              fileName: documents.license!.name,
              fileSize: documents.license!.size,
              uploadedAt: new Date().toISOString(),
            };
            companyDocuments.push(doc);
          };
          reader.readAsDataURL(documents.license);
        }

        if (documents.insurance) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const doc = {
              id: `doc_insurance_${Date.now()}`,
              name: 'Insurance Certificate',
              type: 'insurance',
              fileUrl: reader.result as string,
              fileName: documents.insurance!.name,
              fileSize: documents.insurance!.size,
              uploadedAt: new Date().toISOString(),
            };
            companyDocuments.push(doc);
          };
          reader.readAsDataURL(documents.insurance);
        }

        for (const file of documents.other) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const doc = {
              id: `doc_other_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              type: 'other',
              fileUrl: reader.result as string,
              fileName: file.name,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
            };
            companyDocuments.push(doc);
          };
          reader.readAsDataURL(file);
        }

        localStorage.setItem('company_documents', JSON.stringify(companyDocuments));
        console.log('✅ Saved company documents to localStorage:', companyDocuments.length, 'documents');
      }

      // Sync with BrandingService
      const { data: existingProfile } = await BrandingService.getBrandingProfile();
      const updatedProfile = {
        ...(existingProfile || {}),
        company_name: companyToSave.name,
        company_legal_name: companyToSave.dba || companyToSave.name,
        company_tagline: existingProfile?.company_tagline || 'Professional Services',
        logo_url: companyToSave.logo_url || existingProfile?.logo_url || '',
        phone: companyToSave.phone || existingProfile?.phone || '',
        email: companyToSave.email || existingProfile?.email || '',
        website: companyToSave.website || existingProfile?.website || '',
        address_line1: companyToSave.address || existingProfile?.address_line1 || '',
        city: companyToSave.city || existingProfile?.city || '',
        state: companyToSave.state || existingProfile?.state || '',
        zip_code: companyToSave.zip_code || existingProfile?.zip_code || '',
        country: companyToSave.country || existingProfile?.country || 'United States',
        primary_color: existingProfile?.primary_color || '#ea580c',
        secondary_color: existingProfile?.secondary_color || '#dc2626',
        accent_color: existingProfile?.accent_color || '#ea580c',
        tax_id: existingProfile?.tax_id || '',
        tax_label: existingProfile?.tax_label || 'Tax ID',
        payment_terms: existingProfile?.payment_terms || 'Net 30',
      };

      await BrandingService.updateBrandingProfile(updatedProfile);

      // Reload companies from database
      await loadCompanies();

      toast.success(editingCompany ? 'Company updated successfully!' : 'Company created successfully!');
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Failed to save company. Please try again.');
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      // Delete from database
      const { success, error } = await CompanyDatabaseService.deleteCompany(companyId);

      if (success) {
        // Reload companies from database
        await loadCompanies();
        toast.success('Company deleted');
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-400">
        Please log in to manage companies
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCompanies.length === 0 && (
          <div className="col-span-full">
            <div className="bg-gradient-to-br from-orange-600/10 to-orange-500/5 rounded-2xl border-2 border-orange-500/30 p-12 text-center">
              <Building2 className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">
                {searchQuery ? 'No matches found' : 'Create Your First Company'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery
                  ? `No companies match "${searchQuery}"`
                  : 'Get started by creating your company profile'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition"
                >
                  <Plus className="w-5 h-5" />
                  Create Company
                </button>
              )}
            </div>
          </div>
        )}

        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/50 transition"
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
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white font-bold text-lg">
                    {company.name?.charAt(0) || 'C'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white">{company.name || 'Unnamed Company'}</h3>
                  <p className="text-xs text-gray-400">@{company.slug || 'no-slug'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(company)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            {company.industry && (
              <p className="text-sm text-gray-400 mb-2">{company.industry}</p>
            )}
            {company.description && (
              <p className="text-sm text-gray-500">{company.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl border-2 border-orange-500/30 w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="border-b border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingCompany ? 'Edit Company' : 'Add New Company'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {editingCompany ? 'Update company information' : 'Create a new company profile'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-orange-400" />
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">
                      Company Name <span className="text-orange-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="Enter company name"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">DBA</label>
                    <input
                      type="text"
                      value={formData.dba}
                      onChange={(e) => setFormData({ ...formData, dba: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="Doing business as"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="e.g. Construction"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="Brief description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Contact Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="company@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Address Information</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Variants - Multi-Logo Manager */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-orange-400" />
                  Logo Variants
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Upload different logo versions for different use cases (primary, icon, square, horizontal, etc.)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Logo */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Primary Logo</label>
                    <div className="flex items-center gap-3">
                      {logoPreviews.primary && (
                        <img
                          src={logoPreviews.primary}
                          alt="Primary logo"
                          className="w-16 h-16 rounded-lg object-cover border-2 border-[#2A2A2A]"
                        />
                      )}
                      <label className="flex-1 cursor-pointer">
                        <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" />
                          {logoFiles.primary ? logoFiles.primary.name : 'Upload primary logo'}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoChange(e, 'primary')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">Main logo for platform use</p>
                  </div>

                  {/* Icon/Favicon */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Icon/Favicon</label>
                    {logoPreviews.icon && (
                      <img src={logoPreviews.icon} alt="Icon" className="w-16 h-16 rounded-lg object-cover border-2 border-[#2A2A2A] mb-2" />
                    )}
                    <label className="cursor-pointer block">
                      <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        {logoFiles.icon ? logoFiles.icon.name : 'Upload icon (512x512px)'}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'icon')} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-500">Browser tabs & mobile apps</p>
                  </div>

                  {/* Square Logo */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Square Logo</label>
                    {logoPreviews.square && (
                      <img src={logoPreviews.square} alt="Square" className="w-16 h-16 rounded-lg object-cover border-2 border-[#2A2A2A] mb-2" />
                    )}
                    <label className="cursor-pointer block">
                      <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        {logoFiles.square ? logoFiles.square.name : 'Upload square (1:1)'}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'square')} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-500">Social media profiles</p>
                  </div>

                  {/* Horizontal Logo */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Horizontal Logo</label>
                    {logoPreviews.horizontal && (
                      <img src={logoPreviews.horizontal} alt="Horizontal" className="w-24 h-16 rounded-lg object-cover border-2 border-[#2A2A2A] mb-2" />
                    )}
                    <label className="cursor-pointer block">
                      <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        {logoFiles.horizontal ? logoFiles.horizontal.name : 'Upload horizontal'}
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'horizontal')} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-500">Headers & banners</p>
                  </div>
                </div>

                <details className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-300 hover:text-white">
                    + Advanced Logo Variants (Optional)
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Vertical Logo */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-white">Vertical Logo</label>
                      {logoPreviews.vertical && (
                        <img src={logoPreviews.vertical} alt="Vertical" className="w-16 h-24 rounded-lg object-cover border-2 border-[#2A2A2A] mb-2" />
                      )}
                      <label className="cursor-pointer block">
                        <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" />
                          {logoFiles.vertical ? logoFiles.vertical.name : 'Upload vertical'}
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'vertical')} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-500">Sidebars & narrow spaces</p>
                    </div>

                    {/* White Logo */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-white">White/Light Logo</label>
                      {logoPreviews.white && (
                        <div className="bg-gray-800 p-2 rounded-lg mb-2">
                          <img src={logoPreviews.white} alt="White" className="w-16 h-16 rounded-lg object-cover" />
                        </div>
                      )}
                      <label className="cursor-pointer block">
                        <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" />
                          {logoFiles.white ? logoFiles.white.name : 'Upload white version'}
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'white')} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-500">For dark backgrounds</p>
                    </div>

                    {/* Black Logo */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-white">Black/Dark Logo</label>
                      {logoPreviews.black && (
                        <div className="bg-white p-2 rounded-lg mb-2">
                          <img src={logoPreviews.black} alt="Black" className="w-16 h-16 rounded-lg object-cover" />
                        </div>
                      )}
                      <label className="cursor-pointer block">
                        <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" />
                          {logoFiles.black ? logoFiles.black.name : 'Upload black version'}
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'black')} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-500">For light backgrounds</p>
                    </div>

                    {/* Secondary Logo */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-white">Secondary Logo</label>
                      {logoPreviews.secondary && (
                        <img src={logoPreviews.secondary} alt="Secondary" className="w-16 h-16 rounded-lg object-cover border-2 border-[#2A2A2A] mb-2" />
                      )}
                      <label className="cursor-pointer block">
                        <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" />
                          {logoFiles.secondary ? logoFiles.secondary.name : 'Upload secondary'}
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleLogoChange(e, 'secondary')} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-500">Alternative logo variant</p>
                    </div>
                  </div>
                </details>
              </div>

              {/* Company Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  Company Documents
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Upload licenses, insurance, certifications, and other important documents
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Business License */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Business License</label>
                    {documents.license && (
                      <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                        <FileText className="w-4 h-4" />
                        <span>{documents.license.name}</span>
                      </div>
                    )}
                    <label className="cursor-pointer block">
                      <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        {documents.license ? 'Change license' : 'Upload license'}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => handleDocumentChange(e, 'license')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Insurance Certificate */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Insurance Certificate</label>
                    {documents.insurance && (
                      <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                        <FileText className="w-4 h-4" />
                        <span>{documents.insurance.name}</span>
                      </div>
                    )}
                    <label className="cursor-pointer block">
                      <div className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        {documents.insurance ? 'Change insurance' : 'Upload insurance'}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => handleDocumentChange(e, 'insurance')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Other Documents */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-semibold text-white">Other Documents</label>

                    {/* Show uploaded documents */}
                    {documents.other.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {documents.other.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-white">
                              <FileText className="w-4 h-4 text-green-400" />
                              <span>{file.name}</span>
                              <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button
                              onClick={() => removeDocument(index)}
                              className="p-1 hover:bg-red-500/20 rounded transition"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="cursor-pointer block">
                      <div className="px-4 py-3 bg-[#1A1A1A] border border-dashed border-[#2A2A2A] rounded-xl text-gray-400 hover:bg-[#2A2A2A] transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload additional documents (certifications, contracts, etc.)
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        multiple
                        onChange={(e) => handleDocumentChange(e, 'other')}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (max 10MB each)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#2A2A2A] p-6">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!(formData.name || '').trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {editingCompany ? 'Update Company' : 'Create Company'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
