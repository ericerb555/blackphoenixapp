import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, User, Mail, Lock, Phone, MapPin, Building2, 
  CreditCard, Crown, Star, CheckCircle2, Eye, EyeOff, Sparkles
} from 'lucide-react';

interface CustomerRegistrationFormProps {
  onNavigate?: (page: string) => void;
}

export default function CustomerRegistrationForm({ onNavigate }: CustomerRegistrationFormProps) {
  // Parse URL query parameters manually
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan') || 'free';
  const isPremium = plan === 'premium';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Address Information
    streetAddress: '',
    aptUnit: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Additional Information
    propertyType: '',
    howHeard: '',
    
    // Payment (for premium)
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    billingZip: '',
    
    // Agreement
    termsAccepted: false,
    marketingEmails: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill with test data
  const fillWithTestData = () => {
    setFormData({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      password: 'TestPassword123',
      confirmPassword: 'TestPassword123',
      streetAddress: '123 Main Street',
      aptUnit: 'Apt 4B',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      propertyType: 'single-family',
      howHeard: 'google',
      cardNumber: '4532015112830366',
      cardExpiry: '12/25',
      cardCVC: '123',
      billingZip: '62701',
      termsAccepted: true,
      marketingEmails: true
    });
    setErrors({});
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phone)) {
        newErrors.phone = 'Invalid phone format (xxx-xxx-xxxx)';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 2) {
      if (!formData.streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state.trim()) newErrors.state = 'State is required';
      if (!formData.zipCode.trim()) {
        newErrors.zipCode = 'ZIP code is required';
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
        newErrors.zipCode = 'Invalid ZIP code format';
      }
      if (!formData.propertyType) newErrors.propertyType = 'Property type is required';
    }

    if (step === 3 && isPremium) {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Invalid card number';
      }
      if (!formData.cardExpiry.trim()) {
        newErrors.cardExpiry = 'Expiry date is required';
      } else if (!/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        newErrors.cardExpiry = 'Invalid format (MM/YY)';
      }
      if (!formData.cardCVC.trim()) {
        newErrors.cardCVC = 'CVC is required';
      } else if (!/^\d{3,4}$/.test(formData.cardCVC)) {
        newErrors.cardCVC = 'Invalid CVC';
      }
      if (!formData.billingZip.trim()) newErrors.billingZip = 'Billing ZIP is required';
    }

    if ((step === 3 && !isPremium) || (step === 4 && isPremium)) {
      if (!formData.termsAccepted) {
        newErrors.termsAccepted = 'You must accept the terms and conditions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalStep = isPremium ? 4 : 3;
    if (!validateStep(finalStep)) return;

    setLoading(true);

    try {
      // TODO: Implement actual API call to create customer account
      // const response = await fetch('/api/customers/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...formData, plan })
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to dashboard or success page
      if (onNavigate) {
        onNavigate('customer-portal');
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = isPremium ? 4 : 3;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('landing-page');
                } else {
                  window.location.href = '/';
                }
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fillWithTestData}
                className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg transition-colors font-medium text-sm"
                title="Auto-fill form with test data for quick testing"
              >
                <Sparkles className="w-4 h-4" />
                <span>Fill with Test Data</span>
              </button>
              {isPremium ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                  <Crown className="w-5 h-5" />
                  <span className="font-semibold">Premium Plan</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] rounded-lg">
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">Free Plan</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-semibold text-blue-400">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-700"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit}>
          
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <User className="w-8 h-8 text-blue-400" />
                  Personal Information
                </h2>
                <p className="text-gray-400">Let's start with your basic information</p>
              </div>

              <div className="space-y-6">
                {/* Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.firstName ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.lastName ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.email ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.phone ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                    placeholder="555-123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.password ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors pr-12`}
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.confirmPassword ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors pr-12`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Address Information */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-blue-400" />
                  Property Address
                </h2>
                <p className="text-gray-400">Where do you need services?</p>
              </div>

              <div className="space-y-6">
                {/* Street Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                    className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.streetAddress ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                    placeholder="123 Main Street"
                  />
                  {errors.streetAddress && (
                    <p className="mt-1 text-sm text-red-400">{errors.streetAddress}</p>
                  )}
                </div>

                {/* Apt/Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Apartment / Unit (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.aptUnit}
                    onChange={(e) => handleInputChange('aptUnit', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors"
                    placeholder="Apt 4B"
                  />
                </div>

                {/* City, State, ZIP */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.city ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                      placeholder="Boston"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-400">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      State <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="e.g., MA, NY, CA"
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.state ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500 transition-colors`}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-400">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ZIP Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.zipCode ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                      placeholder="02101"
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-red-400">{errors.zipCode}</p>
                    )}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Property Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                    className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.propertyType ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                  >
                    <option value="">Select property type...</option>
                    <option value="single-family">Single Family Home</option>
                    <option value="condo">Condo / Townhouse</option>
                    <option value="apartment">Apartment</option>
                    <option value="multi-family">Multi-Family Building</option>
                    <option value="commercial">Commercial Property</option>
                  </select>
                  {errors.propertyType && (
                    <p className="mt-1 text-sm text-red-400">{errors.propertyType}</p>
                  )}
                </div>

                {/* How did you hear */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    How did you hear about us? (Optional)
                  </label>
                  <select
                    value={formData.howHeard}
                    onChange={(e) => handleInputChange('howHeard', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="google">Google Search</option>
                    <option value="social">Social Media</option>
                    <option value="referral">Referral from Friend</option>
                    <option value="contractor">Contractor Recommendation</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment Information (Premium Only) */}
          {currentStep === 3 && isPremium && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-blue-400" />
                  Payment Information
                </h2>
                <p className="text-gray-400">Your 14-day free trial starts today</p>
              </div>

              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">14-Day Free Trial</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      You won't be charged today. Your card will only be charged $29 after your 14-day trial ends. 
                      Cancel anytime before then at no cost.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Card Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.cardNumber ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                  {errors.cardNumber && (
                    <p className="mt-1 text-sm text-red-400">{errors.cardNumber}</p>
                  )}
                </div>

                {/* Expiry and CVC */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Expiry Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cardExpiry}
                      onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.cardExpiry ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                    {errors.cardExpiry && (
                      <p className="mt-1 text-sm text-red-400">{errors.cardExpiry}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CVC <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cardCVC}
                      onChange={(e) => handleInputChange('cardCVC', e.target.value)}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.cardCVC ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                      placeholder="123"
                      maxLength={4}
                    />
                    {errors.cardCVC && (
                      <p className="mt-1 text-sm text-red-400">{errors.cardCVC}</p>
                    )}
                  </div>
                </div>

                {/* Billing ZIP */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Billing ZIP Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.billingZip}
                    onChange={(e) => handleInputChange('billingZip', e.target.value)}
                    className={`w-full px-4 py-3 bg-[#1A1A1A] border ${errors.billingZip ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-lg focus:outline-none focus:border-blue-500 text-white transition-colors`}
                    placeholder="02101"
                  />
                  {errors.billingZip && (
                    <p className="mt-1 text-sm text-red-400">{errors.billingZip}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3/4: Review & Submit */}
          {((currentStep === 3 && !isPremium) || (currentStep === 4 && isPremium)) && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-blue-400" />
                  Review & Confirm
                </h2>
                <p className="text-gray-400">Almost done! Please review your information</p>
              </div>

              {/* Summary */}
              <div className="space-y-6 mb-8">
                {/* Personal Info Summary */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Name</p>
                      <p className="text-white">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="text-white">{formData.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Phone</p>
                      <p className="text-white">{formData.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Address Summary */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Property Address</h3>
                  <div className="text-sm">
                    <p className="text-white">
                      {formData.streetAddress}
                      {formData.aptUnit && `, ${formData.aptUnit}`}
                    </p>
                    <p className="text-white">
                      {formData.city}, {formData.state} {formData.zipCode}
                    </p>
                    <p className="text-gray-400 mt-2">
                      Property Type: <span className="text-white">{formData.propertyType}</span>
                    </p>
                  </div>
                </div>

                {/* Plan Summary */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Selected Plan</h3>
                  {isPremium ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Premium Plan</p>
                          <p className="text-sm text-gray-400">14-day free trial, then $29/month</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white">$29<span className="text-sm text-gray-400">/mo</span></p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                          <Star className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Free Plan</p>
                          <p className="text-sm text-gray-400">No credit card required</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white">$0</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.termsAccepted}
                    onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                    className="mt-1 w-5 h-5 bg-[#1A1A1A] border-[#2A2A2A] rounded focus:ring-blue-500 text-blue-600"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-300">
                    I agree to the <button type="button" className="text-blue-400 hover:text-blue-300">Terms of Service</button> and{' '}
                    <button type="button" className="text-blue-400 hover:text-blue-300">Privacy Policy</button>
                    <span className="text-red-400"> *</span>
                  </label>
                </div>
                {errors.termsAccepted && (
                  <p className="text-sm text-red-400 ml-8">{errors.termsAccepted}</p>
                )}

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={formData.marketingEmails}
                    onChange={(e) => handleInputChange('marketingEmails', e.target.checked)}
                    className="mt-1 w-5 h-5 bg-[#1A1A1A] border-[#2A2A2A] rounded focus:ring-blue-500 text-blue-600"
                  />
                  <label htmlFor="marketing" className="text-sm text-gray-300">
                    Send me updates, tips, and special offers via email
                  </label>
                </div>
              </div>

              {errors.submit && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{errors.submit}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-[#2A2A2A]">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/30"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-lg font-bold transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Create Account
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}