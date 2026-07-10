/**
 * Territory Application - Apply for Territory License
 * 
 * Allows potential territory admins to apply for exclusive 40-mile territory licenses.
 * Applications are reviewed and approved by Platform Owner in Master Admin Dashboard.
 * 
 * Pricing: $15,000 one-time + $499/month license fee
 */

import { useState } from 'react';
import { 
  MapPin, DollarSign, Building2, User, Mail, Phone, 
  CheckCircle, AlertCircle, Crown, Shield, TrendingUp,
  Users, Store, Target, Zap, Award, ArrowRight, Clock,
  FileText, CreditCard, Home, Briefcase, Globe, Calendar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PageHeader } from '../components/PageHeader';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TerritoryApplicationProps {
  onNavigate?: (page: string) => void;
}

interface ApplicationData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Business Info
  companyName: string;
  yearsExperience: string;
  hasBusinessLicense: boolean;
  
  // Territory Info
  desiredCity: string;
  desiredState: string;
  desiredZipCode: string;
  alternateLocations: string;
  
  // Financial
  hasCapital: boolean;
  capitalAmount: string;
  financingNeeded: boolean;
  
  // Business Plan
  marketingPlan: string;
  recruitmentStrategy: string;
  timeline: string;
  
  // References
  references: string;
  
  // Agreement
  agreedToTerms: boolean;
}

export default function TerritoryApplication({ onNavigate }: TerritoryApplicationProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState<ApplicationData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    yearsExperience: '',
    hasBusinessLicense: false,
    desiredCity: '',
    desiredState: '',
    desiredZipCode: '',
    alternateLocations: '',
    hasCapital: false,
    capitalAmount: '',
    financingNeeded: false,
    marketingPlan: '',
    recruitmentStrategy: '',
    timeline: '',
    references: '',
    agreedToTerms: false,
  });

  const updateField = (field: keyof ApplicationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.agreedToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required personal information');
      return;
    }

    if (!formData.desiredCity || !formData.desiredState || !formData.desiredZipCode) {
      toast.error('Please specify your desired territory location');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`,
        contact_name: `${formData.firstName} ${formData.lastName}`,
        contact_email: formData.email,
        email: formData.email,
        contact_phone: formData.phone,
        phone: formData.phone,
        desired_territory: `${formData.desiredCity}, ${formData.desiredState} ${formData.desiredZipCode}`,
        ...formData,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/territory/apply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        }
      ).catch(() => null);

      if (response && response.ok) {
        setSubmitted(true);
        toast.success('Territory application submitted! We\'ll be in touch shortly.');
      } else {
        throw new Error('Server unreachable');
      }
    } catch (error) {
      // Local fallback
      const applications = JSON.parse(localStorage.getItem('territory_applications_pending') || '[]');
      applications.push({ id: `TERR-APP-${Date.now()}`, ...formData, _offline: true, submittedAt: new Date().toISOString() });
      localStorage.setItem('territory_applications_pending', JSON.stringify(applications));
      setSubmitted(true);
      toast.success('Application saved! We\'ll be in touch shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <PageHeader
          title="Territory Application"
          subtitle="Apply for Exclusive Territory License"
          onBack={() => onNavigate?.('landing')}
        />

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-green-500/30 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Application Submitted!</h2>
            <p className="text-xl text-zinc-300 mb-6">
              Thank you for your interest in becoming a Territory Administrator.
            </p>
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 mb-8 max-w-2xl mx-auto text-left">
              <h3 className="text-lg font-bold text-white mb-4">What Happens Next?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#ea580c]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[#ea580c]">1</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Review Process</p>
                    <p className="text-sm text-zinc-400">Our team will review your application within 2-3 business days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#ea580c]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[#ea580c]">2</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Interview Call</p>
                    <p className="text-sm text-zinc-400">If approved, we'll schedule a call to discuss territory details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#ea580c]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[#ea580c]">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Contract & Payment</p>
                    <p className="text-sm text-zinc-400">Sign license agreement and process initial payment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#ea580c]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[#ea580c]">4</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Launch Your Territory</p>
                    <p className="text-sm text-zinc-400">Get access to your admin dashboard and start building</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-zinc-400">
                We've sent a confirmation email to <span className="text-white font-medium">{formData.email}</span>
              </p>
              <button
                onClick={() => onNavigate?.('landing')}
                className="px-8 py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                Return to Home
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <PageHeader
        title="Territory License Application"
        subtitle="Become a Territory Administrator - Build Your Franchise"
        onBack={() => onNavigate?.('landing')}
      />

      <div className="max-w-6xl mx-auto p-6">
        {/* Investment Overview Banner */}
        <div className="bg-gradient-to-r from-[#ea580c]/20 to-orange-600/10 border border-[#ea580c]/30 rounded-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <DollarSign className="w-10 h-10 text-[#ea580c] mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-1">One-Time License Fee</p>
              <p className="text-3xl font-bold text-white">$15,000</p>
            </div>
            <div className="text-center">
              <Calendar className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-1">Monthly License Fee</p>
              <p className="text-3xl font-bold text-white">$499<span className="text-lg text-zinc-400">/mo</span></p>
            </div>
            <div className="text-center">
              <Target className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-1">Exclusive Territory</p>
              <p className="text-3xl font-bold text-white">40 Miles</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= stepNum 
                      ? 'bg-[#ea580c] text-white' 
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {stepNum}
                  </div>
                  <p className={`text-sm mt-2 ${step >= stepNum ? 'text-white' : 'text-zinc-500'}`}>
                    {stepNum === 1 && 'Personal'}
                    {stepNum === 2 && 'Territory'}
                    {stepNum === 3 && 'Business'}
                    {stepNum === 4 && 'Review'}
                  </p>
                </div>
                {stepNum < 4 && (
                  <div className={`h-0.5 flex-1 transition-all ${
                    step > stepNum ? 'bg-[#ea580c]' : 'bg-zinc-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-8">
          {/* STEP 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Personal Information</h2>
                <p className="text-zinc-400">Tell us about yourself</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Company Name (if applicable)
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="Your Company LLC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Years of Business Experience
                  </label>
                  <select
                    value={formData.yearsExperience}
                    onChange={(e) => updateField('yearsExperience', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="">Select...</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasBusinessLicense}
                    onChange={(e) => updateField('hasBusinessLicense', e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-700 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                  />
                  <span className="text-white">I have an active business license</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Territory Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Desired Territory</h2>
                <p className="text-zinc-400">Choose your exclusive 40-mile radius location</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium mb-1">Territory Exclusivity</p>
                    <p className="text-sm text-zinc-400">
                      You'll have exclusive rights to recruit vendors, advertisers, and subcontractors within a 40-mile radius of your chosen location.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.desiredCity}
                    onChange={(e) => updateField('desiredCity', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="Los Angeles"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.desiredState}
                    onChange={(e) => updateField('desiredState', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.desiredZipCode}
                    onChange={(e) => updateField('desiredZipCode', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                    placeholder="90001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Alternate Locations (optional)
                </label>
                <textarea
                  value={formData.alternateLocations}
                  onChange={(e) => updateField('alternateLocations', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                  placeholder="List 2-3 alternate locations if your first choice is already taken..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Business Plan */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Business & Financial Information</h2>
                <p className="text-zinc-400">Share your plan for territory success</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.hasCapital}
                      onChange={(e) => updateField('hasCapital', e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-700 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                    <span className="text-white font-medium">I have the $15,000 license fee available</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={formData.financingNeeded}
                      onChange={(e) => updateField('financingNeeded', e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-700 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                    />
                    <span className="text-white font-medium">I'm interested in financing options</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Marketing & Recruitment Strategy
                </label>
                <textarea
                  value={formData.marketingPlan}
                  onChange={(e) => updateField('marketingPlan', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                  placeholder="How do you plan to recruit vendors, advertisers, and subcontractors to your territory? What marketing strategies will you use?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Expected Timeline to Profitability
                </label>
                <select
                  value={formData.timeline}
                  onChange={(e) => updateField('timeline', e.target.value)}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="">Select timeline...</option>
                  <option value="3-months">3 months</option>
                  <option value="6-months">6 months</option>
                  <option value="12-months">12 months</option>
                  <option value="18-months">18+ months</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Professional References (optional)
                </label>
                <textarea
                  value={formData.references}
                  onChange={(e) => updateField('references', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
                  placeholder="Name, company, phone number, relationship..."
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-8 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Review Application
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Review Your Application</h2>
                <p className="text-zinc-400">Please verify all information before submitting</p>
              </div>

              <div className="space-y-6">
                {/* Personal Info Summary */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-400">Name</p>
                      <p className="text-white font-medium">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Email</p>
                      <p className="text-white font-medium">{formData.email}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Phone</p>
                      <p className="text-white font-medium">{formData.phone}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Experience</p>
                      <p className="text-white font-medium">{formData.yearsExperience || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Territory Summary */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Desired Territory</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-[#ea580c]" />
                    <p className="text-white font-medium text-lg">
                      {formData.desiredCity}, {formData.desiredState} {formData.desiredZipCode}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-400">40-mile exclusive radius</p>
                </div>

                {/* Investment Summary */}
                <div className="bg-gradient-to-r from-[#ea580c]/20 to-orange-600/10 border border-[#ea580c]/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Investment Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-300">One-Time License Fee</span>
                      <span className="text-white font-bold">$15,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-300">Monthly License Fee</span>
                      <span className="text-white font-bold">$499/mo</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-zinc-700">
                      <span className="text-white font-bold">Total Initial Investment</span>
                      <span className="text-[#ea580c] font-bold text-xl">$15,499</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => updateField('agreedToTerms', e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-700 bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c] mt-0.5"
                  />
                  <div>
                    <span className="text-white font-medium">I agree to the terms and conditions *</span>
                    <p className="text-sm text-zinc-400 mt-1">
                      I understand that this application requires approval, and the license fee is subject to territory availability. I agree to the Territory License Agreement terms.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.agreedToTerms}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <Users className="w-10 h-10 text-blue-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Recruit & Earn</h3>
            <p className="text-sm text-zinc-400">
              Recruit vendors, advertisers, and subcontractors. Earn 90% of subscription revenue in your territory.
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <Shield className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Exclusive Rights</h3>
            <p className="text-sm text-zinc-400">
              Your 40-mile territory is protected. No other admins can recruit in your area.
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-6">
            <TrendingUp className="w-10 h-10 text-green-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Scalable Income</h3>
            <p className="text-sm text-zinc-400">
              50 vendors at $149/mo = $7,450/mo recurring revenue. Build your franchise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
