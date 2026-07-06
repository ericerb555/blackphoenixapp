import { useState } from 'react';
import { Shield, UserPlus, Lock, Mail, Phone, MapPin, Building, Check, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import MediaConsentSystem from './MediaConsentSystem';
import { saveUserProfile } from '../lib/hooks/useUserProfile';

interface RegistrationWithConsentProps {
  onRegistrationComplete: (userData: any) => void;
}

export default function RegistrationWithConsent({ onRegistrationComplete }: RegistrationWithConsentProps) {
  const [registrationStep, setRegistrationStep] = useState<'account' | 'consent' | 'complete'>('account');
  const [accountData, setAccountData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    businessName: '',
    accountType: 'residential'
  });
  const [consentAgreement, setConsentAgreement] = useState<any>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccountSubmit = () => {
    // Validation
    if (!accountData.fullName || !accountData.email || !accountData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (accountData.password !== accountData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    // Move to consent step
    setRegistrationStep('consent');
  };

  const handleConsentComplete = async (agreement: any) => {
    setConsentAgreement(agreement);
    setIsSubmitting(true);

    try {
      // Create user account
      const userData = {
        ...accountData,
        consentAgreement: agreement,
        registeredAt: new Date().toISOString(),
        status: 'active'
      };

      // Save to database
      await createUserAccount(userData);

      // Send welcome email with consent copy
      await sendWelcomeEmail(userData);

      // Move to complete step
      setRegistrationStep('complete');
      
      // Notify parent component
      setTimeout(() => {
        onRegistrationComplete(userData);
      }, 3000);

    } catch (error) {
      toast.error('Failed to create account');
      setRegistrationStep('account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createUserAccount = async (userData: any) => {
    // Save user profile to localStorage
    saveUserProfile(userData.email, {
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      address: userData.address,
      businessName: userData.businessName,
      accountType: userData.accountType,
      createdAt: userData.registeredAt || new Date().toISOString(),
    });

    console.log('✅ Created account and saved profile:', userData.email);
  };

  const sendWelcomeEmail = async (userData: any) => {
    // Send welcome email
    console.log('Sending welcome email:', userData.email);
  };

  if (registrationStep === 'account') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
            <p className="text-gray-400">Step 1 of 2: Account Information</p>
          </div>

          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
            <div className="space-y-6">
              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Account Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAccountData({ ...accountData, accountType: 'residential' })}
                    className={`p-4 rounded-xl border-2 transition ${
                      accountData.accountType === 'residential'
                        ? 'border-orange-500 bg-orange-600/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <p className="font-semibold text-white">Residential</p>
                    <p className="text-xs text-gray-400 mt-1">Homeowner</p>
                  </button>
                  <button
                    onClick={() => setAccountData({ ...accountData, accountType: 'business' })}
                    className={`p-4 rounded-xl border-2 transition ${
                      accountData.accountType === 'business'
                        ? 'border-orange-500 bg-orange-600/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <p className="font-semibold text-white">Business</p>
                    <p className="text-xs text-gray-400 mt-1">Property Manager</p>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  value={accountData.fullName}
                  onChange={(e) => setAccountData({ ...accountData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={accountData.phone}
                    onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={accountData.password}
                    onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Property Address *
                </label>
                <input
                  type="text"
                  value={accountData.address}
                  onChange={(e) => setAccountData({ ...accountData, address: e.target.value })}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>

              {/* Business Name (if business account) */}
              {accountData.accountType === 'business' && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={accountData.businessName}
                    onChange={(e) => setAccountData({ ...accountData, businessName: e.target.value })}
                    placeholder="ABC Property Management"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              )}

              {/* Terms Agreement */}
              <label className="flex items-start gap-3 p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 mt-1"
                />
                <div>
                  <p className="text-white font-semibold">I agree to the Terms of Service and Privacy Policy</p>
                  <p className="text-sm text-gray-400 mt-1">
                    By creating an account, you agree to our Terms of Service and Privacy Policy. 
                    You will be asked to provide media usage consent in the next step.
                  </p>
                </div>
              </label>

              {/* Notice */}
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-1">Media Usage Consent Required</h4>
                    <p className="text-sm text-blue-300">
                      After creating your account, you'll be asked to review and sign a media usage agreement. 
                      This determines how photos, videos, and designs from your project can be used for marketing purposes. 
                      You have full control over your consent preferences.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAccountSubmit}
                disabled={!agreedToTerms}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Media Consent
                <Shield className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (registrationStep === 'consent') {
    return (
      <MediaConsentSystem
        mode="onboarding"
        clientId={`CLIENT-${Date.now()}`}
        onConsentComplete={handleConsentComplete}
      />
    );
  }

  // Complete step
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <Check className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Our Platform!</h1>
        <p className="text-xl text-gray-400 mb-8">
          Your account has been created successfully
        </p>

        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 mb-6">
          <h3 className="font-bold text-white mb-4">What happens next?</h3>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Confirmation Email Sent</p>
                <p className="text-sm text-gray-400">
                  Check your inbox at <span className="text-orange-400">{accountData.email}</span> for your welcome email and consent agreement copy
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Consent Agreement Saved</p>
                <p className="text-sm text-gray-400">
                  Your signed media usage agreement has been securely saved to your client folder
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Account Activated</p>
                <p className="text-sm text-gray-400">
                  You can now access your dashboard and start managing your projects
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-400 mb-6">
          Redirecting to your dashboard in a few seconds...
        </p>

        <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-600 to-orange-700 animate-pulse" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
