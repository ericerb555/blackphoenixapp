/**
 * Universal Signup Flow - Handles all account types
 * Employee, Vendor, Advertiser, Job Applicant, Property Manager, Landlord, Investor, etc.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Mail, Phone, MapPin, Building, Briefcase, Calendar,
  CheckCircle, ArrowRight, ChevronLeft, Upload, FileText, Shield,
  DollarSign, Users, TrendingUp, Megaphone, Store, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SignupData {
  accountType: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  businessInfo?: {
    companyName?: string;
    businessType?: string;
    taxId?: string;
    website?: string;
  };
  addressInfo: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  additionalInfo?: Record<string, any>;
}

interface UniversalSignupFlowProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: string;
  accountTitle: string;
  icon: React.ReactNode;
  onSuccess: () => void;
}

export default function UniversalSignupFlow({
  isOpen,
  onClose,
  accountType,
  accountTitle,
  icon,
  onSuccess
}: UniversalSignupFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<SignupData>({
    accountType,
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    addressInfo: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  });

  const totalSteps = needsBusinessInfo() ? 3 : 2;

  function needsBusinessInfo(): boolean {
    return ['vendor', 'advertiser', 'property-manager', 'landlord', 'investor', 'service-provider'].includes(accountType);
  }

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!data.personalInfo.firstName || !data.personalInfo.lastName) {
        toast.error('Please enter your full name');
        return;
      }
      if (!data.personalInfo.email) {
        toast.error('Please enter your email');
        return;
      }
      if (!data.personalInfo.phone) {
        toast.error('Please enter your phone number');
        return;
      }
    }

    if (currentStep === 2 && needsBusinessInfo()) {
      if (!data.businessInfo?.companyName) {
        toast.error('Please enter your company name');
        return;
      }
    }

    if (currentStep === totalSteps) {
      if (!data.addressInfo.street || !data.addressInfo.city || !data.addressInfo.state || !data.addressInfo.zip) {
        toast.error('Please complete your address');
        return;
      }
      handleSubmit();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/signup/universal`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        }
      );

      if (response.ok) {
        toast.success('Application received. We will review your portal access request and follow up shortly.');
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Registration failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
              <div className="absolute w-96 h-96 bg-orange-600/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
              <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Header */}
            <div className="relative z-10 border-b border-[#2A2A2A]">
              <div className="max-w-4xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                      {icon}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">{accountTitle} Registration</h1>
                      <p className="text-sm text-gray-400">Create your account to get started</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-[#1A1A1A] rounded-lg transition text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="mt-8 flex items-center justify-center gap-4">
                  {Array.from({ length: totalSteps }).map((_, index) => {
                    const step = index + 1;
                    return (
                      <div key={step} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                            currentStep >= step
                              ? 'bg-gradient-to-br from-[#ea580c] to-orange-700 text-white'
                              : 'bg-[#1A1A1A] text-gray-500'
                          }`}>
                            {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                          </div>
                          <span className={`mt-2 text-xs font-medium ${
                            currentStep >= step ? 'text-[#ea580c]' : 'text-gray-500'
                          }`}>
                            {step === 1 && 'Personal'}
                            {step === 2 && (needsBusinessInfo() ? 'Business' : 'Address')}
                            {step === 3 && 'Address'}
                          </span>
                        </div>
                        {step < totalSteps && (
                          <div className={`w-24 h-1 mx-4 rounded transition-all ${
                            currentStep > step ? 'bg-[#ea580c]' : 'bg-[#1A1A1A]'
                          }`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
              <AnimatePresence mode="wait">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Personal Information</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">First Name *</label>
                          <input
                            type="text"
                            value={data.personalInfo.firstName}
                            onChange={(e) => setData({
                              ...data,
                              personalInfo: { ...data.personalInfo, firstName: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Last Name *</label>
                          <input
                            type="text"
                            value={data.personalInfo.lastName}
                            onChange={(e) => setData({
                              ...data,
                              personalInfo: { ...data.personalInfo, lastName: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Email *</label>
                          <input
                            type="email"
                            value={data.personalInfo.email}
                            onChange={(e) => setData({
                              ...data,
                              personalInfo: { ...data.personalInfo, email: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Phone *</label>
                          <input
                            type="tel"
                            value={data.personalInfo.phone}
                            onChange={(e) => setData({
                              ...data,
                              personalInfo: { ...data.personalInfo, phone: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Business Information (if needed) */}
                {currentStep === 2 && needsBusinessInfo() && (
                  <motion.div
                    key="step2-business"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                          <Building className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Business Information</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-2">Company Name *</label>
                          <input
                            type="text"
                            value={data.businessInfo?.companyName || ''}
                            onChange={(e) => setData({
                              ...data,
                              businessInfo: { ...data.businessInfo, companyName: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="ABC Company LLC"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Business Type</label>
                          <select
                            value={data.businessInfo?.businessType || ''}
                            onChange={(e) => setData({
                              ...data,
                              businessInfo: { ...data.businessInfo, businessType: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                          >
                            <option value="">Select type...</option>
                            <option value="sole-proprietor">Sole Proprietor</option>
                            <option value="llc">LLC</option>
                            <option value="corporation">Corporation</option>
                            <option value="partnership">Partnership</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Tax ID / EIN</label>
                          <input
                            type="text"
                            value={data.businessInfo?.taxId || ''}
                            onChange={(e) => setData({
                              ...data,
                              businessInfo: { ...data.businessInfo, taxId: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="12-3456789"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                          <input
                            type="url"
                            value={data.businessInfo?.website || ''}
                            onChange={(e) => setData({
                              ...data,
                              businessInfo: { ...data.businessInfo, website: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2 or 3: Address Information */}
                {((currentStep === 2 && !needsBusinessInfo()) || (currentStep === 3 && needsBusinessInfo())) && (
                  <motion.div
                    key="step-address"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Address Information</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-2">Street Address *</label>
                          <input
                            type="text"
                            value={data.addressInfo.street}
                            onChange={(e) => setData({
                              ...data,
                              addressInfo: { ...data.addressInfo, street: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">City *</label>
                          <input
                            type="text"
                            value={data.addressInfo.city}
                            onChange={(e) => setData({
                              ...data,
                              addressInfo: { ...data.addressInfo, city: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="Los Angeles"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">State *</label>
                          <input
                            type="text"
                            value={data.addressInfo.state}
                            onChange={(e) => setData({
                              ...data,
                              addressInfo: { ...data.addressInfo, state: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="CA"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-400 mb-2">ZIP Code *</label>
                          <input
                            type="text"
                            value={data.addressInfo.zip}
                            onChange={(e) => setData({
                              ...data,
                              addressInfo: { ...data.addressInfo, zip: e.target.value }
                            })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            placeholder="90001"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                    currentStep === 1
                      ? 'bg-[#1A1A1A] text-gray-600 cursor-not-allowed'
                      : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-[#ea580c]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {currentStep === totalSteps ? 'Complete Registration' : 'Continue'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
