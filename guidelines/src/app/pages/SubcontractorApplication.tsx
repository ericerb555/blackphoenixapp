import { useState } from 'react';
import {
  Hammer, Building2, Mail, Phone, MapPin, User, Globe, FileText,
  ArrowLeft, CheckCircle, AlertCircle, Award, Shield, Briefcase
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../components/ui/button/PrimaryButton';
import ApplicationPlanBuilderSection from '../components/ApplicationPlanBuilderSection';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface SubcontractorApplicationForm {
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

  // Trade Details
  tradeSpecialty: string[];
  serviceDescription: string;
  licenseNumber: string;
  licenseState: string;
  insuranceCertificate: boolean;
  bondedInsured: boolean;

  // Certifications
  certifications: string;
  crewSize: string;
  workRadius: string;
}

interface SubcontractorApplicationProps {
  onNavigate?: (page: string) => void;
}

export default function SubcontractorApplication({ onNavigate }: SubcontractorApplicationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<SubcontractorApplicationForm>({
    companyName: '',
    businessType: 'sole-proprietor',
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
    tradeSpecialty: [],
    serviceDescription: '',
    licenseNumber: '',
    licenseState: '',
    insuranceCertificate: false,
    bondedInsured: false,
    certifications: '',
    crewSize: '',
    workRadius: '50'
  });

  const businessTypes = [
    { value: 'sole-proprietor', label: 'Sole Proprietor' },
    { value: 'llc', label: 'LLC' },
    { value: 'corporation', label: 'Corporation' },
    { value: 'partnership', label: 'Partnership' }
  ];

  const tradeOptions = [
    'Electrical',
    'Plumbing',
    'HVAC',
    'Roofing',
    'Framing/Carpentry',
    'Drywall',
    'Painting',
    'Flooring',
    'Tile/Masonry',
    'Concrete',
    'Excavation',
    'Landscaping',
    'Fencing',
    'Siding',
    'Windows/Doors',
    'Kitchen/Bath Remodel',
    'Insulation',
    'Demolition'
  ];

  const handleTradeToggle = (trade: string) => {
    setFormData(prev => ({
      ...prev,
      tradeSpecialty: prev.tradeSpecialty.includes(trade)
        ? prev.tradeSpecialty.filter(t => t !== trade)
        : [...prev.tradeSpecialty, trade]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.companyName || !formData.email || !formData.phone || !formData.contactName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.tradeSpecialty.length === 0) {
      toast.error('Please select at least one trade specialty');
      return;
    }

    if (!formData.licenseNumber) {
      toast.error('License number is required');
      return;
    }

    setSubmitting(true);

    try {
      const subcontractorData = {
        name: formData.companyName,
        business_type: formData.businessType,
        contact_name: formData.contactName,
        contact_email: formData.email,
        contact_phone: formData.phone,
        website: formData.website,
        address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
        tax_id: formData.taxId,
        years_in_business: formData.yearsInBusiness,
        trade_specialty: formData.tradeSpecialty,
        service_description: formData.serviceDescription,
        license_number: formData.licenseNumber,
        license_state: formData.licenseState,
        insurance_certificate: formData.insuranceCertificate,
        bonded_insured: formData.bondedInsured,
        certifications: formData.certifications,
        crew_size: formData.crewSize,
        work_radius: formData.workRadius,
        applicationType: 'subcontractor',
        application_status: 'pending',
        submitted_at: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE}/applications`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(subcontractorData),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.error || `Submission failed (HTTP ${response.status})`);
      }

      toast.success(result.message || "Application submitted! We'll review it and contact you soon.");
      if (onNavigate) setTimeout(() => onNavigate('contractor-network-landing-page'), 1600);
    } catch (error) {
      console.error('Application error:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate?.('contractor-network-landing-page')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Contractor Network</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <Hammer className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Subcontractor Application</h1>
              <p className="text-gray-400">Join our network of professional trade specialists</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`h-2 rounded-full flex-1 transition ${
                    step <= currentStep ? 'bg-blue-600' : 'bg-[#2A2A2A]'
                  }`}
                />
                {step < totalSteps && <div className="w-2" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className={currentStep >= 1 ? 'text-blue-400' : 'text-gray-500'}>Business Info</span>
            <span className={currentStep >= 2 ? 'text-blue-400' : 'text-gray-500'}>Trade Details</span>
            <span className={currentStep >= 3 ? 'text-blue-400' : 'text-gray-500'}>Review</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Business Information</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Your Company LLC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                  >
                    {businessTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tax ID / EIN
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="XX-XXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Years in Business *
                  </label>
                  <input
                    type="text"
                    value={formData.yearsInBusiness}
                    onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="5"
                  />
                </div>
              </div>

              <hr className="border-[#2A2A2A]" />

              <h3 className="text-xl font-bold text-white">Contact Information</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="contact@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>

              <hr className="border-[#2A2A2A]" />

              <h3 className="text-xl font-bold text-white">Business Address</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="123 Main St"
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
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="New York"
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
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Trade Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Trade & Licensing Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Trade Specialty * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {tradeOptions.map(trade => (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => handleTradeToggle(trade)}
                      className={`px-4 py-3 rounded-xl border-2 transition text-left ${
                        formData.tradeSpecialty.includes(trade)
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400 hover:border-[#3A3A3A]'
                      }`}
                    >
                      {trade}
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
                  onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none h-32"
                  placeholder="Describe your services, experience, and what makes your company stand out..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="License #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    License State *
                  </label>
                  <input
                    type="text"
                    value={formData.licenseState}
                    onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Crew Size
                  </label>
                  <input
                    type="text"
                    value={formData.crewSize}
                    onChange={(e) => setFormData({ ...formData, crewSize: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="5-10 employees"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Work Radius (miles)
                  </label>
                  <input
                    type="text"
                    value={formData.workRadius}
                    onChange={(e) => setFormData({ ...formData, workRadius: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Certifications & Training
                </label>
                <textarea
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-blue-500 focus:outline-none h-24"
                  placeholder="List any relevant certifications, training, or specializations..."
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl cursor-pointer hover:border-blue-500 transition">
                  <input
                    type="checkbox"
                    checked={formData.insuranceCertificate}
                    onChange={(e) => setFormData({ ...formData, insuranceCertificate: e.target.checked })}
                    className="w-5 h-5 rounded border-[#2A2A2A] text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-white">General Liability Insurance</div>
                    <div className="text-sm text-gray-400">I have current general liability insurance</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl cursor-pointer hover:border-blue-500 transition">
                  <input
                    type="checkbox"
                    checked={formData.bondedInsured}
                    onChange={(e) => setFormData({ ...formData, bondedInsured: e.target.checked })}
                    className="w-5 h-5 rounded border-[#2A2A2A] text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-white">Bonded & Insured</div>
                    <div className="text-sm text-gray-400">My business is bonded and insured</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Review Your Application</h2>

              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Company Name</div>
                  <div className="text-white font-medium">{formData.companyName || 'Not provided'}</div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Contact</div>
                    <div className="text-white">{formData.contactName || 'Not provided'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Email</div>
                    <div className="text-white">{formData.email || 'Not provided'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Trade Specialties</div>
                  <div className="text-white">
                    {formData.tradeSpecialty.length > 0 ? formData.tradeSpecialty.join(', ') : 'Not provided'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">License Number</div>
                  <div className="text-white">{formData.licenseNumber || 'Not provided'}</div>
                </div>

                <div className="flex gap-4">
                  {formData.insuranceCertificate && (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Insured</span>
                    </div>
                  )}
                  {formData.bondedInsured && (
                    <div className="flex items-center gap-2 text-green-400">
                      <Shield className="w-5 h-5" />
                      <span>Bonded</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-white mb-2">Application Review Process</div>
                    <p className="text-sm text-gray-300">
                      Our team will review your application within 2-3 business days. You'll receive an email with next steps, including verification of your license and insurance documentation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <ApplicationPlanBuilderSection portalType="subcontractor" ownerName={formData.companyName} onPlanDraftChange={(planPreference) => setFormData(prev => ({ ...prev, planPreference } as any))} />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#2A2A2A]">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-3 rounded-xl border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
    </div>
  );
}
