/**
 * Enhanced Company Creation Form
 * Comprehensive form for all company information with auto-generated transaction code
 */

import { useState, useEffect } from 'react';
import {
  Building2, Plus, X, Upload, DollarSign, Calendar, Users, Shield,
  FileText, CreditCard, MapPin, Globe, Phone, Mail, Hash, Award,
  Briefcase, TrendingUp, Lock, Key, Save, CheckCircle, Palette, Image
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface EnhancedCompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyData: any) => Promise<void>;
  editingCompany?: any | null;
}

export function EnhancedCompanyForm({
  isOpen,
  onClose,
  onSave,
  editingCompany
}: EnhancedCompanyFormProps) {
  const [currentTab, setCurrentTab] = useState<'basic' | 'contact' | 'business' | 'banking' | 'operations' | 'branding' | 'documents'>('basic');
  const [isSaving, setIsSaving] = useState(false);

  // Handle logo file upload
  const handleLogoUpload = (field: string, file: File) => {
    if (!file) return;

    console.log(`🖼️ [Logo Upload] Starting upload for field: ${field}`);
    console.log(`📁 File name: ${file.name}`);
    console.log(`📏 File size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`🎨 File type: ${file.type}`);

    // Check file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type');
      toast.error('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large');
      toast.error('Image must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      console.log(`✅ Logo converted to base64 (${(base64.length / 1024).toFixed(2)} KB)`);
      console.log(`📝 Saving to field: ${field}`);
      console.log(`🔍 Base64 preview: ${base64.substring(0, 50)}...`);

      setFormData({ ...formData, [field]: base64 });
      console.log(`✅ Logo saved to formData.${field}`);
      toast.success(`${field} uploaded successfully!`);
    };
    reader.onerror = () => {
      console.error('❌ Failed to read file');
      toast.error('Failed to upload logo');
    };
    reader.readAsDataURL(file);
  };

  // Generate unique transaction code
  const generateTransactionCode = (companyName: string): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const namePrefix = companyName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase()
      .padEnd(4, 'X');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePrefix}-${timestamp}-${random}`;
  };

  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    legalName: '',
    dba: '',
    slug: '',
    transactionCode: '',
    businessType: 'LLC',
    industry: '',
    description: '',
    tagline: '',
    foundedDate: '',

    // Contact Information
    email: '',
    phone: '',
    fax: '',
    website: '',

    // Address
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    serviceRadius: '50',
    serviceAreas: '',

    // Business Details
    taxId: '',
    taxIdType: 'EIN',
    licenseNumber: '',
    licenseState: '',
    licenseExpiry: '',
    insuranceProvider: '',
    insurancePolicy: '',
    insuranceExpiry: '',
    insuranceAmount: '',

    // Financial Information
    annualRevenue: '',
    employeeCount: '',
    yearEstablished: '',

    // Banking Information
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankRoutingNumber: '',
    bankAccountType: 'Checking',

    // Operations
    paymentTerms: 'Net 30',
    workingHours: '8:00 AM - 5:00 PM',
    timezone: 'America/New_York',
    certifications: '',
    specializations: '',

    // Branding
    logoUrl: '',
    logoPrimary: '',
    logoSecondary: '',
    logoIcon: '',
    logoSquare: '',
    logoHorizontal: '',
    logoVertical: '',
    logoWhite: '',
    logoBlack: '',
    primaryColor: '#ea580c',
    secondaryColor: '#dc2626',
    accentColor: '#ea580c',
  });

  useEffect(() => {
    if (editingCompany) {
      setFormData({
        name: editingCompany.name || '',
        legalName: editingCompany.legalName || '',
        dba: editingCompany.dba || '',
        slug: editingCompany.slug || '',
        transactionCode: editingCompany.transactionCode || '',
        businessType: editingCompany.businessType || 'LLC',
        industry: editingCompany.industry || '',
        description: editingCompany.description || '',
        tagline: editingCompany.tagline || '',
        foundedDate: editingCompany.foundedDate || '',
        email: editingCompany.email || '',
        phone: editingCompany.phone || '',
        fax: editingCompany.fax || '',
        website: editingCompany.website || '',
        address: editingCompany.address || '',
        addressLine2: editingCompany.addressLine2 || '',
        city: editingCompany.city || '',
        state: editingCompany.state || '',
        zipCode: editingCompany.zipCode || '',
        country: editingCompany.country || 'United States',
        serviceRadius: editingCompany.serviceRadius || '50',
        serviceAreas: editingCompany.serviceAreas || '',
        taxId: editingCompany.taxId || '',
        taxIdType: editingCompany.taxIdType || 'EIN',
        licenseNumber: editingCompany.licenseNumber || '',
        licenseState: editingCompany.licenseState || '',
        licenseExpiry: editingCompany.licenseExpiry || '',
        insuranceProvider: editingCompany.insuranceProvider || '',
        insurancePolicy: editingCompany.insurancePolicy || '',
        insuranceExpiry: editingCompany.insuranceExpiry || '',
        insuranceAmount: editingCompany.insuranceAmount || '',
        annualRevenue: editingCompany.annualRevenue || '',
        employeeCount: editingCompany.employeeCount || '',
        yearEstablished: editingCompany.yearEstablished || '',
        bankName: editingCompany.bankName || '',
        bankAccountName: editingCompany.bankAccountName || '',
        bankAccountNumber: editingCompany.bankAccountNumber || '',
        bankRoutingNumber: editingCompany.bankRoutingNumber || '',
        bankAccountType: editingCompany.bankAccountType || 'Checking',
        paymentTerms: editingCompany.paymentTerms || 'Net 30',
        workingHours: editingCompany.workingHours || '8:00 AM - 5:00 PM',
        timezone: editingCompany.timezone || 'America/New_York',
        certifications: editingCompany.certifications || '',
        specializations: editingCompany.specializations || '',
        logoUrl: editingCompany.logoUrl || '',
        logoPrimary: editingCompany.logoPrimary || '',
        logoSecondary: editingCompany.logoSecondary || '',
        logoIcon: editingCompany.logoIcon || '',
        logoSquare: editingCompany.logoSquare || '',
        logoHorizontal: editingCompany.logoHorizontal || '',
        logoVertical: editingCompany.logoVertical || '',
        logoWhite: editingCompany.logoWhite || '',
        logoBlack: editingCompany.logoBlack || '',
        primaryColor: editingCompany.primaryColor || '#ea580c',
        secondaryColor: editingCompany.secondaryColor || '#dc2626',
        accentColor: editingCompany.accentColor || '#ea580c',
      });
    } else {
      // Reset for new company
      setFormData({
        name: '',
        legalName: '',
        dba: '',
        slug: '',
        transactionCode: '',
        businessType: 'LLC',
        industry: '',
        description: '',
        tagline: '',
        foundedDate: '',
        email: '',
        phone: '',
        fax: '',
        website: '',
        address: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
        serviceRadius: '50',
        serviceAreas: '',
        taxId: '',
        taxIdType: 'EIN',
        licenseNumber: '',
        licenseState: '',
        licenseExpiry: '',
        insuranceProvider: '',
        insurancePolicy: '',
        insuranceExpiry: '',
        insuranceAmount: '',
        annualRevenue: '',
        employeeCount: '',
        yearEstablished: '',
        bankName: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bankRoutingNumber: '',
        bankAccountType: 'Checking',
        paymentTerms: 'Net 30',
        workingHours: '8:00 AM - 5:00 PM',
        timezone: 'America/New_York',
        certifications: '',
        specializations: '',
        logoUrl: '',
        logoPrimary: '',
        logoSecondary: '',
        logoIcon: '',
        logoSquare: '',
        logoHorizontal: '',
        logoVertical: '',
        logoWhite: '',
        logoBlack: '',
        primaryColor: '#ea580c',
        secondaryColor: '#dc2626',
        accentColor: '#ea580c',
      });
    }
  }, [editingCompany]);

  // Auto-generate transaction code and slug when company name changes
  useEffect(() => {
    if (formData.name && !editingCompany) {
      const code = generateTransactionCode(formData.name);
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      setFormData(prev => ({
        ...prev,
        transactionCode: code,
        slug: slug
      }));
    }
  }, [formData.name, editingCompany]);

  const handleSubmit = async () => {
    console.log('[EnhancedCompanyForm] 🔵 handleSubmit called');
    console.log('[EnhancedCompanyForm] formData.name:', formData.name);
    console.log('[EnhancedCompanyForm] Full formData:', formData);

    if (!formData.name.trim()) {
      console.log('[EnhancedCompanyForm] ❌ Validation failed - name is empty');
      toast.error('Company name is required');
      return;
    }

    console.log('[EnhancedCompanyForm] ✅ Validation passed, starting save...');
    setIsSaving(true);
    try {
      const companyData = {
        id: editingCompany?.id || `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...formData,
        created_at: editingCompany?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[EnhancedCompanyForm] 💾 Calling onSave with:', companyData);
      console.log('[EnhancedCompanyForm] 🖼️ Logo fields in companyData:');
      console.log('   logoPrimary:', companyData.logoPrimary ? `${(companyData.logoPrimary.length / 1024).toFixed(2)} KB` : 'NOT SET');
      console.log('   logoSecondary:', companyData.logoSecondary ? `${(companyData.logoSecondary.length / 1024).toFixed(2)} KB` : 'NOT SET');
      console.log('   logoIcon:', companyData.logoIcon ? `${(companyData.logoIcon.length / 1024).toFixed(2)} KB` : 'NOT SET');

      await onSave(companyData);
      console.log('[EnhancedCompanyForm] ✅ onSave completed successfully');
      toast.success(editingCompany ? 'Company updated successfully!' : 'Company created successfully!');
      onClose();
    } catch (error: any) {
      console.error('[EnhancedCompanyForm] ❌ Error saving company:', error);
      toast.error(error?.message || 'Failed to save company');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'contact', label: 'Contact & Location', icon: MapPin },
    { id: 'business', label: 'Business Details', icon: Briefcase },
    { id: 'banking', label: 'Banking Info', icon: CreditCard },
    { id: 'operations', label: 'Operations', icon: TrendingUp },
    { id: 'branding', label: 'Branding & Logos', icon: Palette },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-2xl border-2 border-orange-500/30 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] p-6 bg-gradient-to-r from-orange-600/10 to-orange-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Building2 className="w-7 h-7 text-orange-400" />
                {editingCompany ? 'Edit Company Profile' : 'Create New Company'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Complete all information for comprehensive company profile
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#2A2A2A] bg-[#0A0A0A] px-6 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition border-b-2 ${
                currentTab === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Basic Information Tab */}
          {currentTab === 'basic' && (
            <div className="space-y-6">
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
                  <label className="block text-sm font-semibold text-white mb-2">Legal Name</label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Legal business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">DBA (Doing Business As)</label>
                  <input
                    type="text"
                    value={formData.dba}
                    onChange={(e) => setFormData({ ...formData, dba: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Trade name (if different)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-orange-400" />
                    Transaction Code
                  </label>
                  <input
                    type="text"
                    value={formData.transactionCode}
                    readOnly
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-orange-500/30 rounded-xl text-orange-400 font-mono font-bold cursor-not-allowed"
                    placeholder="Auto-generated"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    🔐 Used for all transactions and invoices
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">URL Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                    placeholder="company-url-slug"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Business Type</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="LLC">LLC (Limited Liability Company)</option>
                    <option value="Corporation">Corporation</option>
                    <option value="S-Corp">S-Corporation</option>
                    <option value="C-Corp">C-Corporation</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Nonprofit">Nonprofit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Industry</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="">Select industry...</option>
                    <option value="Construction">Construction</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Roofing">Roofing</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Property Management">Property Management</option>
                    <option value="General Contractor">General Contractor</option>
                    <option value="Renovation">Renovation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Founded Date</label>
                  <input
                    type="date"
                    value={formData.foundedDate}
                    onChange={(e) => setFormData({ ...formData, foundedDate: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Company Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Your company's motto or tagline"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Company Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Brief description of your company and services"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact & Location Tab */}
          {currentTab === 'contact' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-orange-400" />
                    Contact Information
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="contact@company.com"
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

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Fax</label>
                  <input
                    type="tel"
                    value={formData.fax}
                    onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="(555) 123-4568"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="https://company.com"
                  />
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-400" />
                    Physical Address
                  </h3>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Suite 100 (optional)"
                  />
                </div>

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
                  <label className="block text-sm font-semibold text-white mb-2">State/Province</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">ZIP/Postal Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="12345"
                  />
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

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Service Coverage</h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Service Radius (miles)</label>
                  <input
                    type="number"
                    value={formData.serviceRadius}
                    onChange={(e) => setFormData({ ...formData, serviceRadius: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Service Areas</label>
                  <input
                    type="text"
                    value={formData.serviceAreas}
                    onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="e.g., Manhattan, Brooklyn, Queens"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Business Details Tab */}
          {currentTab === 'business' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-400" />
                    Tax & Legal Information
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tax ID Type</label>
                  <select
                    value={formData.taxIdType}
                    onChange={(e) => setFormData({ ...formData, taxIdType: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="EIN">EIN (Employer Identification Number)</option>
                    <option value="SSN">SSN (Social Security Number)</option>
                    <option value="ITIN">ITIN (Individual Taxpayer ID)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tax ID Number</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-400" />
                    License & Insurance
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">License Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="License #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">License State</label>
                  <input
                    type="text"
                    value={formData.licenseState}
                    onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">License Expiry</label>
                  <input
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Insurance Provider</label>
                  <input
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Insurance Company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Policy Number</label>
                  <input
                    type="text"
                    value={formData.insurancePolicy}
                    onChange={(e) => setFormData({ ...formData, insurancePolicy: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Policy #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Coverage Amount</label>
                  <input
                    type="text"
                    value={formData.insuranceAmount}
                    onChange={(e) => setFormData({ ...formData, insuranceAmount: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="$1,000,000"
                  />
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    Financial Metrics
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Annual Revenue</label>
                  <input
                    type="text"
                    value={formData.annualRevenue}
                    onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="$500,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Number of Employees</label>
                  <input
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Year Established</label>
                  <input
                    type="number"
                    value={formData.yearEstablished}
                    onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="2020"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Banking Information Tab */}
          {currentTab === 'banking' && (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-200 font-semibold mb-1">Secure Information</p>
                    <p className="text-xs text-yellow-300/80">
                      Banking information is encrypted and stored securely. This data is only used for payment processing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Bank of America"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Account Name</label>
                  <input
                    type="text"
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="Company Name Business Account"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Account Type</label>
                  <select
                    value={formData.bankAccountType}
                    onChange={(e) => setFormData({ ...formData, bankAccountType: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Business Checking">Business Checking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Account Number</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                    placeholder="••••••••1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Routing Number</label>
                  <input
                    type="text"
                    value={formData.bankRoutingNumber}
                    onChange={(e) => setFormData({ ...formData, bankRoutingNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                    placeholder="021000021"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Operations Tab */}
          {currentTab === 'operations' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-400" />
                    Business Operations
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Working Hours</label>
                  <input
                    type="text"
                    value={formData.workingHours}
                    onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="8:00 AM - 5:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Certifications</label>
                  <textarea
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="List your certifications (e.g., EPA Certified, OSHA 30, etc.)"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Specializations</label>
                  <textarea
                    value={formData.specializations}
                    onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    placeholder="What does your company specialize in?"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Branding & Logos Tab */}
          {currentTab === 'branding' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-orange-400" />
                    Brand Colors
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-16 h-12 rounded-lg cursor-pointer bg-[#1A1A1A] border border-[#2A2A2A]"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                      placeholder="#ea580c"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-16 h-12 rounded-lg cursor-pointer bg-[#1A1A1A] border border-[#2A2A2A]"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                      placeholder="#dc2626"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="w-16 h-12 rounded-lg cursor-pointer bg-[#1A1A1A] border border-[#2A2A2A]"
                    />
                    <input
                      type="text"
                      value={formData.accentColor}
                      onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                      placeholder="#ea580c"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5 text-orange-400" />
                    Logo Variants
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Upload different versions of your logo for various uses (paste image URL or base64 data)
                  </p>
                </div>

                {/* Logo Upload Fields */}
                {[
                  { field: 'logoPrimary', label: 'Primary Logo', desc: 'Main company logo' },
                  { field: 'logoIcon', label: 'Logo Icon', desc: 'Favicon / small icon' },
                  { field: 'logoSquare', label: 'Square Logo', desc: '1:1 aspect ratio' },
                  { field: 'logoHorizontal', label: 'Horizontal Logo', desc: 'Wide format' },
                  { field: 'logoVertical', label: 'Vertical Logo', desc: 'Tall format' },
                  { field: 'logoWhite', label: 'White Logo', desc: 'For dark backgrounds' },
                  { field: 'logoBlack', label: 'Black Logo', desc: 'For light backgrounds' },
                  { field: 'logoSecondary', label: 'Secondary Logo', desc: 'Alternate version' },
                ].map(({ field, label, desc }) => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-white mb-2">
                      {label}
                      <span className="text-xs text-gray-500 ml-2 font-normal">{desc}</span>
                    </label>
                    <div className="flex gap-2">
                      {/* Preview */}
                      <div className="w-20 h-20 bg-[#0A0A0A] border-2 border-[#2A2A2A] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {formData[field as keyof typeof formData] ? (
                          <img
                            src={formData[field as keyof typeof formData] as string}
                            alt={label}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Image className="w-8 h-8 text-gray-600" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        {/* Upload Button */}
                        <label className="block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(field, file);
                            }}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg cursor-pointer transition text-orange-400 text-sm font-medium">
                            <Upload className="w-4 h-4" />
                            Upload Image
                          </div>
                        </label>

                        {/* URL Input (fallback) */}
                        <input
                          type="text"
                          value={formData[field as keyof typeof formData] as string}
                          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          placeholder="Or paste URL/base64"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {currentTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-200 font-semibold mb-1">Company Documents</p>
                    <p className="text-xs text-blue-300/80">
                      Document management will be added in a future update. You'll be able to upload licenses, insurance certificates, contracts, and other company documents here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Document upload feature coming soon</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#2A2A2A] p-6 bg-[#0A0A0A] flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {formData.transactionCode && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Transaction Code: <strong className="text-orange-400 font-mono">{formData.transactionCode}</strong></span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formData.name.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingCompany ? 'Update Company' : 'Create Company'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
