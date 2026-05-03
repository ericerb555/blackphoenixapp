/**
 * Media Consent Modal
 * 
 * Displays during customer signup to request permission
 * to use photos/videos for AI content generation and marketing
 */

import { useState } from 'react';
import { 
  Image, Video, Sparkles, Shield, Check, X, 
  Instagram, Facebook, FileText, Eye, AlertCircle,
  Camera, Film, Palette, Share2
} from 'lucide-react';
import { mediaConsentService, MediaConsent } from '../lib/services/mediaConsentService';
import { toast } from 'sonner@2.0.3';

interface MediaConsentModalProps {
  customerId: string;
  customerName: string;
  customerEmail: string;
  onComplete: (consent: MediaConsent) => void;
  onSkip?: () => void;
}

export default function MediaConsentModal({
  customerId,
  customerName,
  customerEmail,
  onComplete,
  onSkip
}: MediaConsentModalProps) {
  const [step, setStep] = useState<'intro' | 'details' | 'confirm'>('intro');
  const [consentGiven, setConsentGiven] = useState(false);
  const [allowedUsage, setAllowedUsage] = useState({
    aiContentGeneration: false,
    socialMedia: false,
    marketing: false,
    portfolio: false,
    beforeAfter: false
  });

  const handleSubmit = () => {
    const consent: MediaConsent = {
      customerId,
      customerName,
      email: customerEmail,
      consentGiven,
      consentDate: new Date().toISOString(),
      consentType: consentGiven ? 'full' : 'none',
      allowedUsage: consentGiven ? allowedUsage : {
        aiContentGeneration: false,
        socialMedia: false,
        marketing: false,
        portfolio: false,
        beforeAfter: false
      },
      signedBy: customerName,
      ipAddress: 'xxx.xxx.xxx.xxx' // In production, capture actual IP
    };

    mediaConsentService.saveConsent(consent);
    
    if (consentGiven) {
      toast.success('Thank you! Your photos can be used for AI content generation.');
    } else {
      toast.info('Your photos will remain private in your customer folder.');
    }
    
    onComplete(consent);
  };

  const usageOptions = [
    {
      id: 'aiContentGeneration',
      label: 'AI Content Generation',
      description: 'Use your photos to generate social media posts and marketing content',
      icon: Sparkles,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'socialMedia',
      label: 'Social Media',
      description: 'Share before/after photos on Instagram, Facebook, and other platforms',
      icon: Share2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'marketing',
      label: 'Marketing Materials',
      description: 'Include in brochures, website, and promotional materials',
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    {
      id: 'portfolio',
      label: 'Portfolio Showcase',
      description: 'Display in our portfolio to showcase quality work',
      icon: Eye,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30'
    },
    {
      id: 'beforeAfter',
      label: 'Before & After',
      description: 'Create transformation stories for marketing',
      icon: Camera,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                Photo & Video Usage Consent
              </h2>
              <p className="text-orange-100">
                Help us showcase amazing work like yours!
              </p>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-bold mb-1">Why We're Asking</h3>
                  <p className="text-sm text-gray-400">
                    We use AI to create engaging social media content from project photos. 
                    With your permission, we can showcase your transformation and help inspire 
                    other homeowners while promoting our work together.
                  </p>
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">AI-Powered Content</h3>
                  <p className="text-sm text-gray-400">
                    Your photos help train our AI to create beautiful social media posts 
                    automatically, showcasing quality work.
                  </p>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Your Privacy Protected</h3>
                  <p className="text-sm text-gray-400">
                    You choose what we can use. Your personal information is never shared, 
                    and you can revoke consent anytime.
                  </p>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4">
                    <Instagram className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Social Media Exposure</h3>
                  <p className="text-sm text-gray-400">
                    Your project could be featured on our Instagram, Facebook, and other 
                    platforms, gaining thousands of views.
                  </p>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-4">
                    <Eye className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Portfolio Showcase</h3>
                  <p className="text-sm text-gray-400">
                    Your transformation becomes part of our portfolio, helping future 
                    customers envision their projects.
                  </p>
                </div>
              </div>

              {/* Decision Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setConsentGiven(true);
                    setAllowedUsage({
                      aiContentGeneration: true,
                      socialMedia: true,
                      marketing: true,
                      portfolio: true,
                      beforeAfter: true
                    });
                    setStep('details');
                  }}
                  className="w-full p-6 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        Yes, Use My Photos
                        <span className="px-2 py-1 bg-white/20 text-xs font-bold rounded-full">
                          RECOMMENDED
                        </span>
                      </h3>
                      <p className="text-orange-100">
                        I consent to having my project photos used for AI content generation, 
                        social media, and marketing materials.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setConsentGiven(false);
                    handleSubmit();
                  }}
                  className="w-full p-5 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-500/10 border border-gray-500/30 flex items-center justify-center flex-shrink-0">
                      <X className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        No, Keep Photos Private
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Photos will only be stored in my private customer folder.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Details Step */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Choose What We Can Use Your Photos For
                </h3>
                <p className="text-gray-400">
                  Select the specific ways we can use your project photos. You can change 
                  these preferences anytime in your account settings.
                </p>
              </div>

              {/* Usage Options */}
              <div className="space-y-3">
                {usageOptions.map(option => {
                  const Icon = option.icon;
                  const isSelected = allowedUsage[option.id as keyof typeof allowedUsage];
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setAllowedUsage({
                          ...allowedUsage,
                          [option.id]: !isSelected
                        });
                      }}
                      className={`w-full p-5 rounded-xl border transition text-left ${
                        isSelected
                          ? `${option.bgColor} ${option.borderColor}`
                          : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${option.bgColor} border ${option.borderColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${option.color}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-bold mb-1">{option.label}</h4>
                          <p className="text-sm text-gray-400">{option.description}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-orange-600 border-orange-600'
                            : 'border-gray-500'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('intro')}
                  className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-300 font-bold rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition"
                >
                  Continue to Review
                </button>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Review Your Consent
                </h3>
                <p className="text-gray-400">
                  Please review your selections before confirming. You can modify these 
                  settings anytime from your account.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                <h4 className="text-white font-bold mb-4">Consent Summary</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Customer Name:</span>
                    <span className="text-white font-semibold">{customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white font-semibold">{customerEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white font-semibold">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Permissions */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                <h4 className="text-white font-bold mb-4">Granted Permissions</h4>
                <div className="space-y-2">
                  {Object.entries(allowedUsage).map(([key, value]) => {
                    const option = usageOptions.find(o => o.id === key);
                    if (!option) return null;
                    
                    const Icon = option.icon;
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          value ? 'bg-green-500/10' : 'bg-gray-500/10'
                        }`}
                      >
                        {value ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <X className="w-5 h-5 text-gray-500" />
                        )}
                        <Icon className={`w-5 h-5 ${value ? option.color : 'text-gray-500'}`} />
                        <span className={value ? 'text-white' : 'text-gray-500'}>
                          {option.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legal Text */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-gray-400">
                  By clicking "Confirm Consent", I agree to allow the use of my project photos 
                  and videos for the purposes I've selected. I understand that I can revoke 
                  this consent at any time through my account settings. My personal information 
                  will not be shared, and photos will only be used for the agreed purposes.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-300 font-bold rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  Confirm Consent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
