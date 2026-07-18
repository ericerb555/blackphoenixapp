import { useState } from 'react';
import {
  FileText, User, Mail, Phone, MapPin, Building2, DollarSign,
  Calendar, CheckCircle, Upload, Download, X, AlertCircle, Shield,
  Briefcase, TrendingUp, Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';

interface InvestmentApplicationProps {
  opportunity: any;
  investmentAmount: number;
  onClose: () => void;
  onSubmit: (applicationData: any) => void;
}

export default function InvestmentApplication({
  opportunity,
  investmentAmount,
  onClose,
  onSubmit
}: InvestmentApplicationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',

    // Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',

    // Investment Details
    investmentAmount: investmentAmount,
    fundingSource: '',
    accreditedInvestor: '',
    investmentExperience: '',

    // Entity Information (if applicable)
    investingAs: 'individual',
    entityName: '',
    entityType: '',
    taxId: '',

    // Financial Information
    annualIncome: '',
    netWorth: '',
    employmentStatus: '',
    occupation: '',
    employer: '',

    // Documents
    idDocument: null as File | null,
    proofOfFunds: null as File | null,
    accreditationLetter: null as File | null,

    // Agreements
    termsAccepted: false,
    riskAcknowledged: false,
    accreditationConfirmed: false
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field: string, file: File | null) => {
    updateField(field, file);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName && formData.email && formData.phone && formData.dateOfBirth);
      case 2:
        return !!(formData.street && formData.city && formData.state && formData.zipCode);
      case 3:
        return !!(formData.investmentAmount && formData.fundingSource && formData.accreditedInvestor);
      case 4:
        return !!(formData.annualIncome && formData.netWorth && formData.employmentStatus);
      case 5:
        return !!(formData.idDocument && formData.proofOfFunds);
      case 6:
        return !!(formData.termsAccepted && formData.riskAcknowledged);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    } else {
      toast.error('Please complete all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep(6)) {
      toast.error('Please accept all required agreements');
      return;
    }

    const applicationData = {
      ...formData,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      submittedAt: new Date().toISOString(),
      status: 'pending_review'
    };

    onSubmit(applicationData);
  };

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Address', icon: MapPin },
    { number: 3, title: 'Investment', icon: DollarSign },
    { number: 4, title: 'Financial', icon: TrendingUp },
    { number: 5, title: 'Documents', icon: Upload },
    { number: 6, title: 'Review', icon: CheckCircle }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-4xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 rounded-t-2xl z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Investment Application</h2>
              <p className="text-gray-400">{opportunity.title}</p>
              <p className="text-sm text-gray-500 mt-1">Investment Amount: ${investmentAmount.toLocaleString()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-red-500/30 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                      isCompleted
                        ? 'bg-green-600 border-green-500'
                        : isActive
                        ? 'bg-orange-600 border-orange-500'
                        : 'bg-[#0A0A0A] border-[#2A2A2A]'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <p className={`text-xs mt-2 font-semibold ${
                      isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 transition ${
                      isCompleted ? 'bg-green-600' : 'bg-[#2A2A2A]'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Full Legal Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Social Security Number *</label>
                  <input
                    type="password"
                    value={formData.ssn}
                    onChange={(e) => updateField('ssn', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="XXX-XX-XXXX"
                  />
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Privacy & Security</p>
                  <p className="text-xs text-gray-400">Your personal information is encrypted and stored securely. We comply with all SEC and financial privacy regulations.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Residential Address</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                      placeholder="New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                      placeholder="NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => updateField('zipCode', e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                      placeholder="10001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Country *</label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Investment Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Investment Details</h3>

              <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Investment Amount</p>
                    <p className="text-3xl font-bold text-white">${formData.investmentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Projected Return ({opportunity.projectedROI}%)</p>
                    <p className="text-3xl font-bold text-green-400">
                      ${((formData.investmentAmount * opportunity.projectedROI) / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Investing As *</label>
                  <select
                    value={formData.investingAs}
                    onChange={(e) => updateField('investingAs', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="individual">Individual</option>
                    <option value="joint">Joint Account</option>
                    <option value="trust">Trust</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="ira">IRA / Retirement Account</option>
                  </select>
                </div>

                {formData.investingAs !== 'individual' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Entity Name *</label>
                      <input
                        type="text"
                        value={formData.entityName}
                        onChange={(e) => updateField('entityName', e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                        placeholder="ABC Investment LLC"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Tax ID / EIN *</label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => updateField('taxId', e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Source of Funds *</label>
                  <select
                    value={formData.fundingSource}
                    onChange={(e) => updateField('fundingSource', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select source</option>
                    <option value="savings">Savings</option>
                    <option value="investment_account">Investment Account</option>
                    <option value="retirement">Retirement Account</option>
                    <option value="business_income">Business Income</option>
                    <option value="inheritance">Inheritance</option>
                    <option value="property_sale">Property Sale</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Are you an Accredited Investor? *</label>
                  <select
                    value={formData.accreditedInvestor}
                    onChange={(e) => updateField('accreditedInvestor', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes - I meet accredited investor requirements</option>
                    <option value="no">No - I do not qualify</option>
                  </select>
                </div>

                <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Accredited Investor Definition</p>
                    <p className="text-xs text-gray-400">
                      An individual with income over $200K ($300K joint) for 2+ years, or net worth over $1M (excluding primary residence).
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Investment Experience *</label>
                  <select
                    value={formData.investmentExperience}
                    onChange={(e) => updateField('investmentExperience', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select experience level</option>
                    <option value="beginner">Beginner - First investment</option>
                    <option value="intermediate">Intermediate - Some investments</option>
                    <option value="experienced">Experienced - Multiple investments</option>
                    <option value="sophisticated">Sophisticated - Professional investor</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Financial Information */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Financial Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Annual Income *</label>
                  <select
                    value={formData.annualIncome}
                    onChange={(e) => updateField('annualIncome', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select range</option>
                    <option value="under_50k">Under $50,000</option>
                    <option value="50k_100k">$50,000 - $100,000</option>
                    <option value="100k_200k">$100,000 - $200,000</option>
                    <option value="200k_500k">$200,000 - $500,000</option>
                    <option value="500k_1m">$500,000 - $1,000,000</option>
                    <option value="over_1m">Over $1,000,000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Net Worth *</label>
                  <select
                    value={formData.netWorth}
                    onChange={(e) => updateField('netWorth', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select range</option>
                    <option value="under_100k">Under $100,000</option>
                    <option value="100k_500k">$100,000 - $500,000</option>
                    <option value="500k_1m">$500,000 - $1,000,000</option>
                    <option value="1m_5m">$1,000,000 - $5,000,000</option>
                    <option value="over_5m">Over $5,000,000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Employment Status *</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => updateField('employmentStatus', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">Select status</option>
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-Employed</option>
                    <option value="retired">Retired</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => updateField('occupation', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Employer</label>
                  <input
                    type="text"
                    value={formData.employer}
                    onChange={(e) => updateField('employer', e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="Company Name"
                  />
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Financial Suitability</p>
                  <p className="text-xs text-gray-400">
                    This information helps us ensure the investment is suitable for your financial situation and complies with investor protection regulations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Document Upload */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">Required Documents</h3>

              <div className="space-y-4">
                {/* ID Document */}
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-white font-semibold mb-1">Government-Issued ID *</h4>
                      <p className="text-sm text-gray-400">Driver's license, passport, or state ID</p>
                    </div>
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>

                  {formData.idDocument ? (
                    <div className="flex items-center justify-between bg-[#1A1A1A] border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">{formData.idDocument.name}</p>
                          <p className="text-xs text-gray-400">{(formData.idDocument.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileUpload('idDocument', null)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('idDocument', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center hover:border-orange-500/30 cursor-pointer transition">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Proof of Funds */}
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-white font-semibold mb-1">Proof of Funds *</h4>
                      <p className="text-sm text-gray-400">Bank statement or investment account statement</p>
                    </div>
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>

                  {formData.proofOfFunds ? (
                    <div className="flex items-center justify-between bg-[#1A1A1A] border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">{formData.proofOfFunds.name}</p>
                          <p className="text-xs text-gray-400">{(formData.proofOfFunds.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileUpload('proofOfFunds', null)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('proofOfFunds', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center hover:border-orange-500/30 cursor-pointer transition">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Accreditation Letter (if applicable) */}
                {formData.accreditedInvestor === 'yes' && (
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-white font-semibold mb-1">Accreditation Letter</h4>
                        <p className="text-sm text-gray-400">CPA or attorney verification letter (optional)</p>
                      </div>
                      <FileText className="w-6 h-6 text-purple-400" />
                    </div>

                    {formData.accreditationLetter ? (
                      <div className="flex items-center justify-between bg-[#1A1A1A] border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-sm font-semibold text-white">{formData.accreditationLetter.name}</p>
                            <p className="text-xs text-gray-400">{(formData.accreditationLetter.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFileUpload('accreditationLetter', null)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileUpload('accreditationLetter', e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center hover:border-orange-500/30 cursor-pointer transition">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-1">PDF only (max 10MB)</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Review & Agreements */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white mb-4">Review & Submit</h3>

              {/* Investment Summary */}
              <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4">Investment Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Opportunity</p>
                    <p className="text-sm font-semibold text-white">{opportunity.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Investment Amount</p>
                    <p className="text-sm font-semibold text-white">${formData.investmentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Projected ROI</p>
                    <p className="text-sm font-semibold text-green-400">{opportunity.projectedROI}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Term</p>
                    <p className="text-sm font-semibold text-white">{opportunity.term}</p>
                  </div>
                </div>
              </div>

              {/* Personal Info Summary */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
                <h4 className="font-bold text-white mb-4">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="text-white">{formData.fullName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="text-white">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Phone</p>
                    <p className="text-white">{formData.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Address</p>
                    <p className="text-white">{formData.city}, {formData.state}</p>
                  </div>
                </div>
              </div>

              {/* Agreements */}
              <div className="space-y-4">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.termsAccepted}
                      onChange={(e) => updateField('termsAccepted', e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Investment Agreement *</p>
                      <p className="text-xs text-gray-400">
                        I have read and agree to the Investment Agreement, Subscription Agreement, and all related documents for this investment opportunity.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-[#0A0A0A] border border-red-500/20 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.riskAcknowledged}
                      onChange={(e) => updateField('riskAcknowledged', e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Risk Acknowledgment *</p>
                      <p className="text-xs text-gray-400">
                        I understand that this investment involves risk, including potential loss of principal. I have reviewed all risk disclosures and understand that past performance does not guarantee future results.
                      </p>
                    </div>
                  </label>
                </div>

                {formData.accreditedInvestor === 'yes' && (
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.accreditationConfirmed}
                        onChange={(e) => updateField('accreditationConfirmed', e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-600 text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">Accredited Investor Certification</p>
                        <p className="text-xs text-gray-400">
                          I certify that I am an accredited investor as defined by SEC Rule 501 of Regulation D.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">What Happens Next?</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Your application will be reviewed (typically 2-3 business days)</li>
                    <li>You'll receive an investment contract for signature</li>
                    <li>Upon contract execution, funding instructions will be sent</li>
                    <li>Your investment will be confirmed once funds are received</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 rounded-b-2xl flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <SecondaryButton onClick={prevStep}>
                Previous
              </SecondaryButton>
            )}
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">Step {currentStep} of 6</p>
            {currentStep < 6 ? (
              <PrimaryButton onClick={nextStep}>
                Next Step
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={handleSubmit}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Submit Application
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
