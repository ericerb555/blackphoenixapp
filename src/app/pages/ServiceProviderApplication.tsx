import { useState } from 'react';
import {
  Sparkles, Building2, Mail, Phone, MapPin, User, Globe, FileText,
  ArrowLeft, CheckCircle, AlertCircle, DollarSign, Award, Shield, Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../components/ui/button/PrimaryButton';
import ApplicationPlanBuilderSection from '../components/ApplicationPlanBuilderSection';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface ServiceProviderForm {
  // Business Information
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Service Details
  serviceCategory: string;
  serviceDescription: string;
  yearsInBusiness: string;
  
  // Licensing & Insurance
  businessLicense: boolean;
  insuranceCertificate: boolean;
  licenseNumber: string;
  
  // Subscription
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
}

export default function ServiceProviderApplication({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ServiceProviderForm>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    serviceCategory: '',
    serviceDescription: '',
    yearsInBusiness: '',
    businessLicense: false,
    insuranceCertificate: false,
    licenseNumber: '',
    subscriptionTier: 'professional'
  });

  // Service categories from backend system
  const serviceCategories = [
    { value: 'pest-control', label: 'Pest Control', icon: '🐛' },
    { value: 'house-cleaning', label: 'House Cleaning', icon: '✨' },
    { value: 'home-inspection', label: 'Home Inspection', icon: '📋' },
    { value: 'real-estate', label: 'Real Estate Agent', icon: '🏠' },
    { value: 'moving-services', label: 'Moving Services', icon: '🚚' },
    { value: 'appliance-repair', label: 'Appliance Repair', icon: '🔧' },
    { value: 'locksmith', label: 'Locksmith', icon: '🔑' },
    { value: 'security-systems', label: 'Security Systems', icon: '🛡️' },
    { value: 'solar-installation', label: 'Solar Installation', icon: '☀️' },
    { value: 'window-treatment', label: 'Window Treatment', icon: '🪟' },
    { value: 'garage-doors', label: 'Garage Door Service', icon: '🚪' },
    { value: 'junk-removal', label: 'Junk Removal', icon: '🗑️' }
  ];

  const subscriptionTiers = [
    {
      id: 'starter',
      name: 'Starter',
      price: 99,
      leads: '10 leads/month',
      features: ['Basic profile', 'Email notifications', 'Standard support', 'Basic analytics'],
      icon: Zap,
      color: 'from-blue-600 to-blue-700'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 299,
      leads: '40 leads/month',
      features: ['Featured profile', 'SMS notifications', 'Priority support', 'Advanced analytics', 'Priority lead routing'],
      icon: Award,
      color: 'from-orange-600 to-orange-700',
      badge: 'Popular'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 699,
      leads: 'Unlimited leads',
      features: ['Top placement', 'Instant notifications', '24/7 support', 'Full analytics suite', 'First-in-line routing', 'Dedicated account manager'],
      icon: Shield,
      color: 'from-purple-600 to-purple-700',
      badge: 'Best Value'
    }
  ];

  const handleInputChange = (field: keyof ServiceProviderForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.serviceCategory) {
      toast.error('Please select a service category');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.companyName,
        company_name: formData.companyName,
        contact_name: formData.contactName,
        contact_email: formData.email,
        email: formData.email,
        contact_phone: formData.phone,
        phone: formData.phone,
        website: formData.website,
        service_category: formData.serviceCategory,
        applicationType: 'service_provider',
        ...formData,
      };

      const response = await fetch(`${API_BASE}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      }).catch(() => null);

      if (response && response.ok) {
        const result = await response.json();
        toast.success(result.message || "Application submitted! We'll review it within 24-48 hours.");
      } else {
        throw new Error('Server unreachable');
      }

      setTimeout(() => {
        if (onNavigate) onNavigate('contractor-network-landing-page');
        else window.location.href = '/contractor-network-landing-page';
      }, 2000);
    } catch (error) {
      // Local fallback
      const existing = JSON.parse(localStorage.getItem('service_provider_applications_pending') || '[]');
      existing.push({ id: `SP-APP-${Date.now()}`, ...formData, _offline: true, submitted_at: new Date().toISOString() });
      localStorage.setItem('service_provider_applications_pending', JSON.stringify(existing));
      toast.error('We could not submit your application. It is saved only on this device; please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Business Information</h2>
        <p className="text-gray-400">Tell us about your service business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Company Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="Your Company Name"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contact Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="john@company.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="(555) 123-4567"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Website
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Years in Business
          </label>
          <input
            type="number"
            value={formData.yearsInBusiness}
            onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
            placeholder="5"
            min="0"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Business Address</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="123 Main St"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
              placeholder="12345"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Service Details</h2>
        <p className="text-gray-400">What services do you provide?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Service Category <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {serviceCategories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => handleInputChange('serviceCategory', category.value)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.serviceCategory === category.value
                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <span className="text-white font-medium">{category.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Service Description
        </label>
        <textarea
          value={formData.serviceDescription}
          onChange={(e) => handleInputChange('serviceDescription', e.target.value)}
          rows={4}
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
          placeholder="Describe the services you offer, your specialties, and what makes your business unique..."
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Licensing & Insurance</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-[#ea580c]/50 transition-colors">
            <input
              type="checkbox"
              checked={formData.businessLicense}
              onChange={(e) => handleInputChange('businessLicense', e.target.checked)}
              className="w-5 h-5 rounded border-[#2A2A2A] text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0 bg-[#0A0A0A]"
            />
            <span className="text-white">I have a valid business license</span>
          </label>

          <label className="flex items-center gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-[#ea580c]/50 transition-colors">
            <input
              type="checkbox"
              checked={formData.insuranceCertificate}
              onChange={(e) => handleInputChange('insuranceCertificate', e.target.checked)}
              className="w-5 h-5 rounded border-[#2A2A2A] text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0 bg-[#0A0A0A]"
            />
            <span className="text-white">I have liability insurance</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            License Number (if applicable)
          </label>
          <input
            type="text"
            value={formData.licenseNumber}
            onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
            placeholder="License #"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-gray-400">Select a subscription tier that fits your business</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {subscriptionTiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => handleInputChange('subscriptionTier', tier.id)}
              className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                formData.subscriptionTier === tier.id
                  ? 'border-[#ea580c] bg-[#ea580c]/5 shadow-lg shadow-[#ea580c]/20'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/50'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-sm font-bold rounded-full">
                    {tier.badge}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {formData.subscriptionTier === tier.id && (
                  <CheckCircle className="w-6 h-6 text-[#ea580c]" />
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${tier.price}</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-sm font-medium text-[#ea580c] mb-4">{tier.leads}</p>
              
              <ul className="space-y-2">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-1">What happens after I apply?</p>
            <p className="text-blue-300">
              Once you submit your application, our team will review it within 24-48 hours. 
              You'll receive an email with next steps and instructions to complete your profile setup.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ApplicationPlanBuilderSection portalType="subcontractor" ownerName={formData.companyName} />
      </div>
    </div>
  );

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('unified-dashboard');
              } else {
                window.location.href = '/unified-dashboard';
              }
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Service Provider Application</h1>
              <p className="text-gray-400">Join our network and start receiving qualified leads</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-700 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={currentStep >= 1 ? 'text-[#ea580c] font-medium' : 'text-gray-500'}>
                Business Info
              </span>
              <span className={currentStep >= 2 ? 'text-[#ea580c] font-medium' : 'text-gray-500'}>
                Services
              </span>
              <span className={currentStep >= 3 ? 'text-[#ea580c] font-medium' : 'text-gray-500'}>
                Subscription
              </span>
            </div>
          </div>
        </div>

        {/* Form Steps */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 mb-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-3 border border-[#2A2A2A] text-white rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-colors font-medium"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Application
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
