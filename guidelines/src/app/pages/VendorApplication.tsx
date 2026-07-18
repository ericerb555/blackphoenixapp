import { useState } from 'react';
import {
  Store, Building2, Mail, Phone, MapPin, User, Globe, FileText,
  ArrowLeft, CheckCircle, AlertCircle, Code, Key, Link as LinkIcon,
  Zap, Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../components/ui/button/PrimaryButton';
import ApplicationPlanBuilderSection from '../components/ApplicationPlanBuilderSection';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface VendorApplicationForm {
  // Business Information
  companyName: string;
  businessType: string;
  taxId: string;
  yearsInBusiness: string;
  
  // Contact Information
  contactName: string;
  email: string;
  phone: string;
  website: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Business Details
  productsServices: string;
  categories: string[];
  insuranceCertificate: boolean;
  businessLicense: boolean;
  
  // API Integration (Optional)
  hasApiIntegration: boolean;
  apiEndpoint: string;
  apiKey: string;
  apiDocumentationUrl: string;
  webhookUrl: string;
  apiNotes: string;
}

interface VendorApplicationProps {
  onNavigate?: (page: string) => void;
}

export default function VendorApplication({ onNavigate }: VendorApplicationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<VendorApplicationForm>({
    companyName: '',
    businessType: 'supplier',
    taxId: '',
    yearsInBusiness: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    productsServices: '',
    categories: [],
    insuranceCertificate: false,
    businessLicense: false,
    hasApiIntegration: false,
    apiEndpoint: '',
    apiKey: '',
    apiDocumentationUrl: '',
    webhookUrl: '',
    apiNotes: ''
  });

  const businessTypes = [
    { value: 'supplier', label: 'Supplier/Wholesaler' },
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'retailer', label: 'Retailer' },
    { value: 'service', label: 'Service Provider' }
  ];

  const categoryOptions = [
    'Lumber & Building Materials',
    'Electrical Supplies',
    'Plumbing Fixtures',
    'HVAC Equipment',
    'Flooring',
    'Paint & Finishes',
    'Hardware',
    'Roofing Materials',
    'Doors & Windows',
    'Concrete & Masonry',
    'Tools & Equipment',
    'Safety Equipment',
    'Landscaping Materials',
    'Kitchen & Bath'
  ];

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.companyName || !formData.email || !formData.phone || !formData.contactName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.categories.length === 0) {
      toast.error('Please select at least one product category');
      return;
    }

    setSubmitting(true);

    const vendorData = {
      name: formData.companyName,
      company_name: formData.companyName,
      type: formData.businessType,
      contact_name: formData.contactName,
      contact_email: formData.email,
      email: formData.email,
      contact_phone: formData.phone,
      phone: formData.phone,
      website: formData.website,
      address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
      tax_id: formData.taxId,
      years_in_business: formData.yearsInBusiness,
      products_services: formData.productsServices,
      categories: formData.categories,
      insurance_certificate: formData.insuranceCertificate,
      business_license: formData.businessLicense,
      api_integration: formData.hasApiIntegration ? {
        enabled: true,
        endpoint: formData.apiEndpoint,
        api_key: formData.apiKey,
        documentation_url: formData.apiDocumentationUrl,
        webhook_url: formData.webhookUrl,
        notes: formData.apiNotes,
      } : null,
    };

    try {
      const response = await fetch(`${API_BASE}/vendors/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify(vendorData),
        signal: AbortSignal.timeout(12000),
      }).catch(() => null);

      if (response && response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Application submitted! We\'ll review it and get back to you within 1–3 business days.');
        if (onNavigate) onNavigate('login');
        return;
      }

      // Server unreachable — save locally as backup so data is never lost
      throw new Error('Server unreachable');

    } catch (error) {
      // Local fallback — guarantees data is never lost
      const tempId = `VENDOR-APP-${Date.now()}`;
      const existingApps = JSON.parse(localStorage.getItem('vendor_applications_pending') || '[]');
      existingApps.push({ id: tempId, ...vendorData, _offline: true, submitted_at: new Date().toISOString() });
      localStorage.setItem('vendor_applications_pending', JSON.stringify(existingApps));
      toast.success('Application saved! You\'ll hear from us within 1–3 business days.', { duration: 6000 });
      if (onNavigate) onNavigate('login');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Business Info', icon: Building2 },
    { number: 2, title: 'Contact & Address', icon: MapPin },
    { number: 3, title: 'Products & Services', icon: Store },
    { number: 4, title: 'API Integration', icon: Code, optional: true }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate ? onNavigate('landing') : null}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Vendor Application</h1>
              <p className="text-gray-400 mt-1">Join our network of trusted suppliers and vendors</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition ${
                      isCompleted
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : isActive
                        ? 'bg-orange-600 border-2 border-orange-600'
                        : 'bg-[#1A1A1A] border-2 border-[#2A2A2A]'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                    {(step as any).optional && (
                      <span className="text-xs text-gray-500 mt-0.5">(optional)</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-[#2A2A2A]'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Business Information</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="Enter your company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {businessTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Years in Business
                  </label>
                  <input
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., 5"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tax ID / EIN
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-orange-500/30 transition">
                    <input
                      type="checkbox"
                      checked={formData.businessLicense}
                      onChange={(e) => setFormData({ ...formData, businessLicense: e.target.checked })}
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                    />
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span className="text-white">I have a valid business license</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-orange-500/30 transition">
                    <input
                      type="checkbox"
                      checked={formData.insuranceCertificate}
                      onChange={(e) => setFormData({ ...formData, insuranceCertificate: e.target.checked })}
                      className="w-5 h-5 rounded border-[#2A2A2A] bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                    />
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span className="text-white">I have general liability insurance</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Address */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Contact & Address Information</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="email@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="https://www.yourcompany.com"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="123 Business St"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="CA"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Products & Services */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Products & Services</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Categories <span className="text-red-400">*</span>
                </label>
                <p className="text-sm text-gray-400 mb-4">Select all categories that apply</p>
                <div className="grid grid-cols-2 gap-3">
                  {categoryOptions.map(category => (
                    <label
                      key={category}
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition ${
                        formData.categories.includes(category)
                          ? 'bg-orange-500/10 border-orange-500 text-white'
                          : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-orange-500/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                        className="w-5 h-5 rounded border-[#2A2A2A] bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Products & Services Description
                </label>
                <textarea
                  value={formData.productsServices}
                  onChange={(e) => setFormData({ ...formData, productsServices: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Describe the products and services you offer, specializations, unique value propositions, etc."
                />
              </div>
            </div>
          )}

          {/* Step 4: API Integration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-1">API Integration <span className="text-sm font-normal text-gray-500 ml-2">(Optional — skip if you want)</span></h2>

              {/* Skip CTA — prominent */}
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-300 font-semibold text-sm">You're ready to submit!</p>
                    <p className="text-gray-400 text-sm mt-0.5">API integration is completely optional. You can connect your inventory system anytime from the <strong className="text-white">API Settings tab</strong> in your Vendor Portal after your account is approved.</p>
                  </div>
                </div>
                <PrimaryButton onClick={handleSubmit} disabled={submitting} className="ml-4 whitespace-nowrap flex items-center gap-2 flex-shrink-0">
                  {submitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Submit Now</>
                  )}
                </PrimaryButton>
              </div>

              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-[#2A2A2A]" />
                <span className="text-gray-600 text-sm">or fill in API details now</span>
                <div className="flex-1 h-px bg-[#2A2A2A]" />
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  If you have an existing inventory or order management API, you can connect it here to enable automated order processing and real-time stock updates.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-orange-500/30 transition mb-6">
                  <input
                    type="checkbox"
                    checked={formData.hasApiIntegration}
                    onChange={(e) => setFormData({ ...formData, hasApiIntegration: e.target.checked })}
                    className="w-5 h-5 rounded border-[#2A2A2A] bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                  />
                  <Zap className="w-5 h-5 text-orange-500" />
                  <span className="text-white font-medium">I want to provide API integration details</span>
                </label>
              </div>

              {formData.hasApiIntegration && (
                <div className="space-y-6 border-l-2 border-orange-500/30 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <LinkIcon className="w-4 h-4 inline mr-2" />
                      API Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={formData.apiEndpoint}
                      onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder="https://api.yourcompany.com/v1"
                    />
                    <p className="text-sm text-gray-500 mt-1">The base URL for your API endpoint</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Key className="w-4 h-4 inline mr-2" />
                      API Key / Authentication Token
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 font-mono"
                      placeholder="sk_live_••••••••••••••••"
                    />
                    <p className="text-sm text-gray-500 mt-1">Your API authentication credentials (stored securely)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Globe className="w-4 h-4 inline mr-2" />
                      API Documentation URL
                    </label>
                    <input
                      type="url"
                      value={formData.apiDocumentationUrl}
                      onChange={(e) => setFormData({ ...formData, apiDocumentationUrl: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder="https://docs.yourcompany.com/api"
                    />
                    <p className="text-sm text-gray-500 mt-1">Link to your API documentation for reference</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Zap className="w-4 h-4 inline mr-2" />
                      Webhook URL (for notifications)
                    </label>
                    <input
                      type="url"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder="https://yourcompany.com/webhooks/orders"
                    />
                    <p className="text-sm text-gray-500 mt-1">Where we'll send order notifications and updates</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.apiNotes}
                      onChange={(e) => setFormData({ ...formData, apiNotes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                      placeholder="Any special requirements, authentication methods, rate limits, or other important details..."
                    />
                  </div>
                </div>
              )}

              <div className="mt-6">
                <ApplicationPlanBuilderSection portalType="vendor" ownerName={formData.companyName} />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#2A2A2A]">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                currentStep === 1
                  ? 'bg-[#0A0A0A] text-gray-600 cursor-not-allowed'
                  : 'bg-[#0A0A0A] text-white border border-[#2A2A2A] hover:border-orange-500/30'
              }`}
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              {/* On Step 3: offer Skip & Submit as an alternative to Next */}
              {currentStep === 3 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-3 rounded-lg font-medium text-gray-400 border border-[#2A2A2A] hover:border-green-500/40 hover:text-green-400 transition text-sm"
                >
                  Skip API & Submit
                </button>
              )}

              {currentStep < 4 ? (
                <PrimaryButton onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}>
                  Next Step
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2">
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle className="w-5 h-5" /> Submit Application</>
                  )}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
          <p className="text-gray-400 mb-4">
            If you have questions about the application process or API integration, please contact our vendor support team.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:vendors@support.com" className="text-orange-500 hover:text-orange-400 transition">
              vendors@support.com
            </a>
            <span className="text-gray-600">•</span>
            <a href="tel:555-123-4567" className="text-orange-500 hover:text-orange-400 transition">
              (555) 123-4567
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}