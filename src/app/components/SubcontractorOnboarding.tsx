// Subcontractor Onboarding Flow
// Multi-step registration: Trade/Specialty → Subscription → Information Collection
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench, Zap, Droplet, Wind, Hammer, PaintBucket, Scissors, Trees,
  Building2, Truck, Shield, Crown, Star, Check, ChevronRight, ChevronLeft,
  User, Mail, Phone, MapPin, Calendar, Briefcase, Award, FileText,
  Camera, Upload, DollarSign, CreditCard, Building, Users, Globe,
  CheckCircle, Sparkles, ArrowRight, X, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface OnboardingData {
  // Step 1: Trade/Specialty
  contractorType: 'trade' | 'specialty' | null;
  selectedTrade?: string;
  selectedSpecialty?: string;
  
  // Step 2: Subscription
  subscriptionPlan: 'free' | 'starter' | 'professional' | 'gold' | null;
  
  // Step 3: Information
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  businessInfo: {
    companyName: string;
    businessType: 'sole-proprietor' | 'llc' | 'corporation' | 'partnership';
    yearsInBusiness: string;
    licenseNumber: string;
    insuranceProvider: string;
    insuranceAmount: string;
  };
  serviceInfo: {
    serviceArea: string;
    radius: string;
    serviceDescription: string;
    specializations: string[];
  };
  certifications: string[];
  coiFile: File | null;
}

interface SubcontractorOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: () => void;
}

const trades = [
  { id: 'electrical', name: 'Electrical', icon: Zap, color: 'from-yellow-500 to-orange-500' },
  { id: 'plumbing', name: 'Plumbing', icon: Droplet, color: 'from-blue-500 to-cyan-500' },
  { id: 'hvac', name: 'HVAC', icon: Wind, color: 'from-cyan-500 to-blue-500' },
  { id: 'carpentry', name: 'Carpentry', icon: Hammer, color: 'from-amber-700 to-orange-700' },
  { id: 'painting', name: 'Painting', icon: PaintBucket, color: 'from-purple-500 to-pink-500' },
  { id: 'roofing', name: 'Roofing', icon: Home, color: 'from-gray-600 to-gray-800' },
  { id: 'flooring', name: 'Flooring', icon: Scissors, color: 'from-orange-600 to-red-600' },
  { id: 'landscaping', name: 'Landscaping', icon: Trees, color: 'from-green-600 to-emerald-600' },
];

const specialties = [
  { id: 'commercial', name: 'Commercial Construction', icon: Building2, color: 'from-slate-600 to-slate-800' },
  { id: 'residential', name: 'Residential Construction', icon: Home, color: 'from-blue-600 to-indigo-600' },
  { id: 'industrial', name: 'Industrial Services', icon: Building, color: 'from-gray-700 to-zinc-800' },
  { id: 'restoration', name: 'Restoration & Repair', icon: Wrench, color: 'from-orange-600 to-red-600' },
  { id: 'maintenance', name: 'Maintenance Services', icon: Shield, color: 'from-green-600 to-teal-600' },
  { id: 'demolition', name: 'Demolition', icon: Truck, color: 'from-red-600 to-rose-700' },
  { id: 'inspection', name: 'Inspection Services', icon: FileText, color: 'from-cyan-600 to-blue-600' },
  { id: 'consulting', name: 'Consulting', icon: Users, color: 'from-purple-600 to-violet-600' },
];

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    hours: 0,
    features: [
      'Basic profile listing',
      'View available jobs',
      'Limited bid submissions (5/month)',
      'Basic analytics',
      'Email support'
    ],
    color: 'from-gray-600 to-gray-700',
    popular: false
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    hours: 3,
    features: [
      'Enhanced profile with photos',
      'Unlimited bid submissions',
      '3 hours business support/month',
      'Bid room access',
      'Advanced analytics',
      'Priority email support',
      'Featured in search results'
    ],
    color: 'from-blue-600 to-cyan-600',
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 198,
    hours: 6,
    features: [
      'Everything in Starter',
      '6 hours business support/month',
      'Premium profile badge',
      'Top search placement',
      'Dedicated account manager',
      'Marketing materials access',
      'Priority job notifications',
      'Chat support'
    ],
    color: 'from-orange-600 to-amber-600',
    popular: true
  },
  {
    id: 'gold',
    name: 'Gold Member',
    price: 265,
    hours: 8,
    features: [
      'Everything in Professional',
      '8 hours business support/month',
      'Gold badge & featured placement',
      'Exclusive job opportunities',
      '24/7 phone support',
      'Free marketing campaigns',
      'API access',
      'White-label options',
      'Unused hours roll over monthly'
    ],
    color: 'from-yellow-500 to-orange-500',
    popular: false,
    badge: true
  }
];

export default function SubcontractorOnboarding({ isOpen, onClose, onSignup }: SubcontractorOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    contractorType: null,
    subscriptionPlan: null,
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    businessInfo: {
      companyName: '',
      businessType: 'sole-proprietor',
      yearsInBusiness: '',
      licenseNumber: '',
      insuranceProvider: '',
      insuranceAmount: ''
    },
    serviceInfo: {
      serviceArea: '',
      radius: '25',
      serviceDescription: '',
      specializations: []
    },
    certifications: [],
    coiFile: null
  });

  const [certificationInput, setCertificationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!data.contractorType) {
        toast.error('Please select your contractor type');
        return;
      }
      if (data.contractorType === 'trade' && !data.selectedTrade) {
        toast.error('Please select your trade');
        return;
      }
      if (data.contractorType === 'specialty' && !data.selectedSpecialty) {
        toast.error('Please select your specialty');
        return;
      }
    }
    
    if (currentStep === 2) {
      if (!data.subscriptionPlan) {
        toast.error('Please select a subscription plan');
        return;
      }
    }

    if (currentStep === 3) {
      // Validate personal info
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
      if (!data.businessInfo.companyName) {
        toast.error('Please enter your company name');
        return;
      }
      if (!data.businessInfo.licenseNumber) {
        toast.error('Please enter your license number');
        return;
      }
      if (!data.serviceInfo.serviceArea) {
        toast.error('Please enter your service area');
        return;
      }

      // All validation passed, submit
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
      // Submit to backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/subcontractors/register`,
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
        const result = await response.json();
        toast.success('Registration successful! Welcome aboard!');
        onSignup();
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

  const addCertification = () => {
    if (certificationInput.trim()) {
      setData({
        ...data,
        certifications: [...data.certifications, certificationInput.trim()]
      });
      setCertificationInput('');
    }
  };

  const removeCertification = (index: number) => {
    setData({
      ...data,
      certifications: data.certifications.filter((_, i) => i !== index)
    });
  };

  const addSpecialization = (spec: string) => {
    if (!data.serviceInfo.specializations.includes(spec)) {
      setData({
        ...data,
        serviceInfo: {
          ...data.serviceInfo,
          specializations: [...data.serviceInfo.specializations, spec]
        }
      });
    } else {
      setData({
        ...data,
        serviceInfo: {
          ...data.serviceInfo,
          specializations: data.serviceInfo.specializations.filter(s => s !== spec)
        }
      });
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
              <div className="absolute w-96 h-96 bg-amber-600/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Header */}
            <div className="relative z-10 border-b border-[#2A2A2A]">
              <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Subcontractor Registration</h1>
                      <p className="text-sm text-gray-400">Join our network of trusted professionals</p>
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
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                          currentStep >= step
                            ? 'bg-gradient-to-br from-[#ea580c] to-orange-700 text-white'
                            : 'bg-[#1A1A1A] text-gray-500'
                        }`}>
                          {currentStep > step ? <Check className="w-5 h-5" /> : step}
                        </div>
                        <span className={`mt-2 text-xs font-medium ${
                          currentStep >= step ? 'text-[#ea580c]' : 'text-gray-500'
                        }`}>
                          {step === 1 && 'Type'}
                          {step === 2 && 'Plan'}
                          {step === 3 && 'Details'}
                        </span>
                      </div>
                      {step < 3 && (
                        <div className={`w-24 h-1 mx-4 rounded transition-all ${
                          currentStep > step ? 'bg-[#ea580c]' : 'bg-[#1A1A1A]'
                        }`}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
              <AnimatePresence mode="wait">
                {/* Step 1: Trade/Specialty Selection */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-12">
                      <h2 className="text-4xl font-black text-white mb-4">What type of contractor are you?</h2>
                      <p className="text-lg text-gray-400">Select your primary category to get started</p>
                    </div>

                    {/* Type Selection */}
                    <div className="grid grid-cols-2 gap-6 mb-12 max-w-3xl mx-auto">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setData({ ...data, contractorType: 'trade', selectedSpecialty: undefined })}
                        className={`p-8 rounded-2xl border-2 transition-all ${
                          data.contractorType === 'trade'
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/50'
                        }`}
                      >
                        <Wrench className={`w-16 h-16 mx-auto mb-4 ${
                          data.contractorType === 'trade' ? 'text-[#ea580c]' : 'text-gray-400'
                        }`} />
                        <h3 className="text-2xl font-bold text-white mb-2">Trade Contractor</h3>
                        <p className="text-gray-400">Specialized in specific trades like electrical, plumbing, HVAC, etc.</p>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setData({ ...data, contractorType: 'specialty', selectedTrade: undefined })}
                        className={`p-8 rounded-2xl border-2 transition-all ${
                          data.contractorType === 'specialty'
                            ? 'border-[#ea580c] bg-[#ea580c]/10'
                            : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/50'
                        }`}
                      >
                        <Building2 className={`w-16 h-16 mx-auto mb-4 ${
                          data.contractorType === 'specialty' ? 'text-[#ea580c]' : 'text-gray-400'
                        }`} />
                        <h3 className="text-2xl font-bold text-white mb-2">Specialty Contractor</h3>
                        <p className="text-gray-400">Focused on specialized services like commercial, industrial, restoration, etc.</p>
                      </motion.button>
                    </div>

                    {/* Trade Selection */}
                    {data.contractorType === 'trade' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                      >
                        <h3 className="text-2xl font-bold text-white mb-6 text-center">Select Your Trade</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {trades.map((trade) => (
                            <motion.button
                              key={trade.id}
                              whileHover={{ scale: 1.05, y: -4 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setData({ ...data, selectedTrade: trade.id })}
                              className={`p-6 rounded-xl border-2 transition-all ${
                                data.selectedTrade === trade.id
                                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/30'
                              }`}
                            >
                              <trade.icon className={`w-12 h-12 mx-auto mb-3 ${
                                data.selectedTrade === trade.id ? 'text-[#ea580c]' : 'text-gray-400'
                              }`} />
                              <h4 className="font-bold text-white text-sm">{trade.name}</h4>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Specialty Selection */}
                    {data.contractorType === 'specialty' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                      >
                        <h3 className="text-2xl font-bold text-white mb-6 text-center">Select Your Specialty</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {specialties.map((specialty) => (
                            <motion.button
                              key={specialty.id}
                              whileHover={{ scale: 1.05, y: -4 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setData({ ...data, selectedSpecialty: specialty.id })}
                              className={`p-6 rounded-xl border-2 transition-all ${
                                data.selectedSpecialty === specialty.id
                                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/30'
                              }`}
                            >
                              <specialty.icon className={`w-12 h-12 mx-auto mb-3 ${
                                data.selectedSpecialty === specialty.id ? 'text-[#ea580c]' : 'text-gray-400'
                              }`} />
                              <h4 className="font-bold text-white text-sm text-center">{specialty.name}</h4>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Subscription Plan */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-12">
                      <h2 className="text-4xl font-black text-white mb-4">Choose Your Plan</h2>
                      <p className="text-lg text-gray-400">All plans include access to the bid room</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {subscriptionPlans.map((plan) => (
                        <motion.div
                          key={plan.id}
                          whileHover={{ scale: 1.02, y: -8 }}
                          onClick={() => setData({ ...data, subscriptionPlan: plan.id as any })}
                          className={`relative cursor-pointer rounded-2xl border-2 transition-all ${
                            data.subscriptionPlan === plan.id
                              ? 'border-[#ea580c] bg-[#ea580c]/10'
                              : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#ea580c]/30'
                          } ${plan.popular ? 'ring-2 ring-[#ea580c]/50' : ''}`}
                        >
                          {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-full text-xs font-bold text-white">
                              MOST POPULAR
                            </div>
                          )}
                          
                          {plan.badge && (
                            <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                              <Crown className="w-6 h-6 text-white" />
                            </div>
                          )}

                          <div className="p-6">
                            <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                            <div className="mb-4">
                              <span className="text-4xl font-black bg-gradient-to-r from-[#ea580c] to-orange-400 bg-clip-text text-transparent">
                                ${plan.price}
                              </span>
                              <span className="text-gray-400 text-sm">/month</span>
                            </div>
                            
                            {plan.hours > 0 && (
                              <div className="mb-4 px-3 py-2 bg-[#ea580c]/10 rounded-lg border border-[#ea580c]/20">
                                <p className="text-xs text-[#ea580c] font-bold">{plan.hours} hours support/month</p>
                              </div>
                            )}

                            <div className="space-y-3 mb-6">
                              {plan.features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <CheckCircle className="w-5 h-5 text-[#ea580c] flex-shrink-0 mt-0.5" />
                                  <span className="text-sm text-gray-300">{feature}</span>
                                </div>
                              ))}
                            </div>

                            <div className={`w-full py-3 rounded-xl font-bold text-center transition-all ${
                              data.subscriptionPlan === plan.id
                                ? 'bg-gradient-to-r from-[#ea580c] to-orange-700 text-white'
                                : 'bg-[#2A2A2A] text-gray-400'
                            }`}>
                              {data.subscriptionPlan === plan.id ? 'Selected' : 'Select Plan'}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-8 p-6 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-[#ea580c] flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-white mb-2">Bid Room Access Included</h4>
                          <p className="text-sm text-gray-400">
                            All subscription plans include full access to our bid room where you can view and bid on available jobs. 
                            Higher tiers get priority notifications and featured placement in contractor search results.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Information Collection */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-12">
                      <h2 className="text-4xl font-black text-white mb-4">Complete Your Profile</h2>
                      <p className="text-lg text-gray-400">Tell us more about you and your business</p>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-8">
                      {/* Personal Information */}
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

                      {/* Business Information */}
                      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Business Information</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Company Name *</label>
                            <input
                              type="text"
                              value={data.businessInfo.companyName}
                              onChange={(e) => setData({
                                ...data,
                                businessInfo: { ...data.businessInfo, companyName: e.target.value }
                              })}
                              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                              placeholder="ABC Construction LLC"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Business Type</label>
                            <select
                              value={data.businessInfo.businessType}
                              onChange={(e) => setData({
                                ...data,
                                businessInfo: { ...data.businessInfo, businessType: e.target.value as any }
                              })}
                              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                            >
                              <option value="sole-proprietor">Sole Proprietor</option>
                              <option value="llc">LLC</option>
                              <option value="corporation">Corporation</option>
                              <option value="partnership">Partnership</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Years in Business</label>
                            <input
                              type="text"
                              value={data.businessInfo.yearsInBusiness}
                              onChange={(e) => setData({
                                ...data,
                                businessInfo: { ...data.businessInfo, yearsInBusiness: e.target.value }
                              })}
                              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                              placeholder="5"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">License Number *</label>
                            <input
                              type="text"
                              value={data.businessInfo.licenseNumber}
                              onChange={(e) => setData({
                                ...data,
                                businessInfo: { ...data.businessInfo, licenseNumber: e.target.value }
                              })}
                              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                              placeholder="LIC-123456"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Insurance Provider</label>
                            <input
                              type="text"
                              value={data.businessInfo.insuranceProvider}
                              onChange={(e) => setData({
                                ...data,
                                businessInfo: { ...data.businessInfo, insuranceProvider: e.target.value }
                              })}
                              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                              placeholder="State Farm"
                            />
                          </div>
                        </div>

                        {/* Certificate of Insurance Upload */}
                        <div className="mt-6">
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Certificate of Insurance (COI) <span className="text-red-500">*</span>
                          </label>
                          <div className="border-2 border-dashed border-[#ea580c]/30 rounded-xl p-6 bg-[#0A0A0A] hover:border-[#ea580c]/50 transition-colors">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
                                <Upload className="w-6 h-6 text-[#ea580c]" />
                              </div>
                              <div className="text-center">
                                <p className="text-white font-semibold mb-1">Upload Certificate of Insurance</p>
                                <p className="text-sm text-gray-400">PDF, JPG, or PNG (Max 10MB)</p>
                              </div>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast.error('File size must be less than 10MB');
                                      return;
                                    }
                                    setData({ ...data, coiFile: file });
                                    toast.success('COI uploaded successfully');
                                  }
                                }}
                                className="hidden"
                                id="subcontractor-coi-upload"
                              />
                              <label
                                htmlFor="subcontractor-coi-upload"
                                className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-lg hover:shadow-[#ea580c]/50 text-white rounded-xl font-semibold cursor-pointer transition-all"
                              >
                                Choose File
                              </label>
                              {data.coiFile && (
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-green-400 font-medium">{data.coiFile.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            * Required: Please upload a current Certificate of Insurance showing general liability coverage
                          </p>
                        </div>
                      </div>

                      {/* Service Information */}
                      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Service Information</h3>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">Primary Service Area *</label>
                              <input
                                type="text"
                                value={data.serviceInfo.serviceArea}
                                onChange={(e) => setData({
                                  ...data,
                                  serviceInfo: { ...data.serviceInfo, serviceArea: e.target.value }
                                })}
                                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                                placeholder="Los Angeles, CA"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">Service Radius (miles)</label>
                              <select
                                value={data.serviceInfo.radius}
                                onChange={(e) => setData({
                                  ...data,
                                  serviceInfo: { ...data.serviceInfo, radius: e.target.value }
                                })}
                                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                              >
                                <option value="10">10 miles</option>
                                <option value="25">25 miles</option>
                                <option value="50">50 miles</option>
                                <option value="100">100 miles</option>
                                <option value="unlimited">Unlimited</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Service Description</label>
                            <textarea
                              value={data.serviceInfo.serviceDescription}
                              onChange={(e) => setData({
                                ...data,
                                serviceInfo: { ...data.serviceInfo, serviceDescription: e.target.value }
                              })}
                              rows={4}
                              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition resize-none"
                              placeholder="Describe your services, expertise, and what makes you stand out..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Additional Specializations</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {['Emergency Services', 'Commercial', 'Residential', 'New Construction', 'Renovation', 'Repair'].map((spec) => (
                                <button
                                  key={spec}
                                  type="button"
                                  onClick={() => addSpecialization(spec)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    data.serviceInfo.specializations.includes(spec)
                                      ? 'bg-[#ea580c] text-white'
                                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:border-[#ea580c]/50'
                                  }`}
                                >
                                  {spec}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Certifications */}
                      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                            <Award className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Certifications & Credentials</h3>
                        </div>

                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={certificationInput}
                              onChange={(e) => setCertificationInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                              className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c] transition"
                              placeholder="e.g., OSHA 30, EPA Lead-Safe Certified"
                            />
                            <button
                              type="button"
                              onClick={addCertification}
                              className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-[#ea580c]/50 transition"
                            >
                              Add
                            </button>
                          </div>

                          {data.certifications.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {data.certifications.map((cert, index) => (
                                <div
                                  key={index}
                                  className="px-4 py-2 bg-[#ea580c]/10 border border-[#ea580c]/20 rounded-lg flex items-center gap-2 group"
                                >
                                  <Award className="w-4 h-4 text-[#ea580c]" />
                                  <span className="text-sm text-white">{cert}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeCertification(index)}
                                    className="ml-2 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-12 flex items-center justify-between max-w-4xl mx-auto">
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
                      {currentStep === 3 ? 'Complete Registration' : 'Continue'}
                      <ChevronRight className="w-5 h-5" />
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