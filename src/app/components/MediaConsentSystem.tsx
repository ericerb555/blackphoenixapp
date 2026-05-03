import { useState } from 'react';
import {
  Shield, FileText, Camera, Video, Image as ImageIcon, CheckCircle,
  AlertCircle, Download, Eye, Lock, Users, Calendar, X, Check,
  Printer, Mail, Copy, Edit3, Trash2, Search, Filter, ChevronDown,
  ChevronUp, FileSignature, UserCheck, Clock, Building, Briefcase
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface ConsentAgreement {
  id: string;
  clientId: string;
  clientName: string;
  agreementType: 'full' | 'limited' | 'none';
  agreedAt: string;
  ipAddress: string;
  userAgent: string;
  consentDetails: {
    photos: boolean;
    videos: boolean;
    beforeAfter: boolean;
    testimonials: boolean;
    socialMedia: boolean;
    website: boolean;
    printMarketing: boolean;
    aiGeneration: boolean;
    designPlans: boolean;
    duration: 'perpetual' | '1year' | '5years' | 'project';
    attribution: boolean;
    revocable: boolean;
  };
  signature: string;
  witnessName?: string;
  witnessSignature?: string;
  documentUrl: string;
  status: 'active' | 'revoked' | 'expired';
  revokedAt?: string;
  revokedReason?: string;
  expiresAt?: string;
}

interface MediaConsentSystemProps {
  mode: 'onboarding' | 'management';
  clientId?: string;
  onConsentComplete?: (agreement: ConsentAgreement) => void;
}

export default function MediaConsentSystem({ mode, clientId, onConsentComplete }: MediaConsentSystemProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [consentType, setConsentType] = useState<'full' | 'limited' | 'none'>('full');
  const [consentDetails, setConsentDetails] = useState({
    photos: true,
    videos: true,
    beforeAfter: true,
    testimonials: true,
    socialMedia: true,
    website: true,
    printMarketing: true,
    aiGeneration: true,
    designPlans: true,
    duration: 'perpetual' as const,
    attribution: false,
    revocable: true
  });
  const [clientInfo, setClientInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    businessName: ''
  });
  const [signature, setSignature] = useState('');
  const [hasRead, setHasRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  const handleSubmitConsent = async () => {
    if (!signature) {
      toast.error('Please provide your signature');
      return;
    }

    if (!hasRead) {
      toast.error('Please confirm you have read and understood the terms');
      return;
    }

    setIsSubmitting(true);

    try {
      const agreement: ConsentAgreement = {
        id: `CONSENT-${Date.now()}`,
        clientId: clientId || `CLIENT-${Date.now()}`,
        clientName: clientInfo.fullName,
        agreementType: consentType,
        agreedAt: new Date().toISOString(),
        ipAddress: '192.168.1.1', // Would get from request
        userAgent: navigator.userAgent,
        consentDetails,
        signature,
        documentUrl: `/documents/consent-${Date.now()}.pdf`,
        status: 'active',
        expiresAt: calculateExpiration(consentDetails.duration)
      };

      // Save to database
      await saveConsentAgreement(agreement);

      // Generate PDF
      await generateConsentPDF(agreement);

      // Save to client folder
      await saveToClientFolder(agreement);

      // Send confirmation email
      await sendConsentConfirmation(agreement);

      toast.success('✅ Consent agreement signed and saved!');
      
      if (onConsentComplete) {
        onConsentComplete(agreement);
      }
    } catch (error) {
      toast.error('Failed to save consent agreement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateExpiration = (duration: string): string | undefined => {
    if (duration === 'perpetual') return undefined;
    
    const now = new Date();
    if (duration === '1year') {
      now.setFullYear(now.getFullYear() + 1);
    } else if (duration === '5years') {
      now.setFullYear(now.getFullYear() + 5);
    }
    return now.toISOString();
  };

  const saveConsentAgreement = async (agreement: ConsentAgreement) => {
    // Save to database
    console.log('Saving consent agreement:', agreement);
  };

  const generateConsentPDF = async (agreement: ConsentAgreement) => {
    // Generate PDF document
    console.log('Generating PDF:', agreement);
  };

  const saveToClientFolder = async (agreement: ConsentAgreement) => {
    // Save to client's personal folder
    console.log('Saving to client folder:', agreement);
  };

  const sendConsentConfirmation = async (agreement: ConsentAgreement) => {
    // Send email confirmation
    console.log('Sending confirmation email:', agreement);
  };

  if (mode === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Media Usage & Consent Agreement</h1>
            <p className="text-gray-400">Required before account activation</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { num: 1, label: 'Agreement Type' },
                { num: 2, label: 'Terms Review' },
                { num: 3, label: 'Your Information' },
                { num: 4, label: 'Signature' }
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= step.num
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#1A1A1A] text-gray-500 border border-[#2A2A2A]'
                    }`}>
                      {currentStep > step.num ? <Check className="w-5 h-5" /> : step.num}
                    </div>
                    <span className="text-xs text-gray-400 mt-2 text-center">{step.label}</span>
                  </div>
                  {idx < 3 && (
                    <div className={`h-0.5 flex-1 ${
                      currentStep > step.num ? 'bg-orange-600' : 'bg-[#2A2A2A]'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8">
            {/* Step 1: Agreement Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Choose Your Consent Level</h2>
                
                <div className="grid gap-4">
                  {/* Full Consent */}
                  <button
                    onClick={() => setConsentType('full')}
                    className={`p-6 rounded-xl border-2 transition text-left ${
                      consentType === 'full'
                        ? 'border-green-500 bg-green-600/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">Full Marketing Consent (Recommended)</h3>
                        <p className="text-sm text-gray-400 mb-3">
                          Grant permission to use all project photos, videos, designs, and plans in our marketing materials including social media, website, print advertising, and AI-generated content.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-500/30">
                            ✓ Social Media
                          </span>
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-500/30">
                            ✓ Website
                          </span>
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-500/30">
                            ✓ Print Marketing
                          </span>
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-500/30">
                            ✓ AI Content
                          </span>
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-500/30">
                            ✓ Before/After
                          </span>
                        </div>
                      </div>
                      {consentType === 'full' && (
                        <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Limited Consent */}
                  <button
                    onClick={() => setConsentType('limited')}
                    className={`p-6 rounded-xl border-2 transition text-left ${
                      consentType === 'limited'
                        ? 'border-yellow-500 bg-yellow-600/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">Limited Consent</h3>
                        <p className="text-sm text-gray-400 mb-3">
                          You choose exactly what we can use and where. Customize permissions for photos, videos, designs, and usage channels.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                            Customizable
                          </span>
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                            Selective Permissions
                          </span>
                        </div>
                      </div>
                      {consentType === 'limited' && (
                        <CheckCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* No Consent */}
                  <button
                    onClick={() => setConsentType('none')}
                    className={`p-6 rounded-xl border-2 transition text-left ${
                      consentType === 'none'
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">No Marketing Consent</h3>
                        <p className="text-sm text-gray-400 mb-3">
                          Do not use any project materials for marketing purposes. Your project will remain completely private.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded border border-red-500/30">
                            Private Only
                          </span>
                          <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded border border-red-500/30">
                            No Marketing Use
                          </span>
                        </div>
                      </div>
                      {consentType === 'none' && (
                        <CheckCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Limited Consent Options */}
                {consentType === 'limited' && (
                  <div className="mt-6 p-6 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                    <h4 className="font-bold text-white mb-4">Customize Your Permissions</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'photos', label: 'Project Photos', icon: Camera },
                        { key: 'videos', label: 'Project Videos', icon: Video },
                        { key: 'beforeAfter', label: 'Before/After Comparisons', icon: ImageIcon },
                        { key: 'testimonials', label: 'Testimonials & Reviews', icon: Users },
                        { key: 'socialMedia', label: 'Social Media Posts', icon: Users },
                        { key: 'website', label: 'Website Portfolio', icon: Building },
                        { key: 'printMarketing', label: 'Print Marketing', icon: Printer },
                        { key: 'aiGeneration', label: 'AI-Generated Content', icon: Shield },
                        { key: 'designPlans', label: 'Design Plans & Drawings', icon: FileText }
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <label
                            key={item.key}
                            className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition"
                          >
                            <input
                              type="checkbox"
                              checked={consentDetails[item.key as keyof typeof consentDetails] as boolean}
                              onChange={(e) => setConsentDetails({
                                ...consentDetails,
                                [item.key]: e.target.checked
                              })}
                              className="w-5 h-5"
                            />
                            <Icon className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-white">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Duration */}
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-white mb-2">
                        Consent Duration
                      </label>
                      <select
                        value={consentDetails.duration}
                        onChange={(e) => setConsentDetails({
                          ...consentDetails,
                          duration: e.target.value as any
                        })}
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition"
                      >
                        <option value="perpetual">Perpetual (No expiration)</option>
                        <option value="1year">1 Year</option>
                        <option value="5years">5 Years</option>
                        <option value="project">Project Duration Only</option>
                      </select>
                    </div>

                    {/* Additional Options */}
                    <div className="mt-4 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentDetails.attribution}
                          onChange={(e) => setConsentDetails({
                            ...consentDetails,
                            attribution: e.target.checked
                          })}
                          className="w-5 h-5"
                        />
                        <span className="text-sm text-white">Require attribution (credit to me/my business)</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentDetails.revocable}
                          onChange={(e) => setConsentDetails({
                            ...consentDetails,
                            revocable: e.target.checked
                          })}
                          className="w-5 h-5"
                        />
                        <span className="text-sm text-white">Allow me to revoke consent at any time</span>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold"
                >
                  Continue to Terms Review
                </button>
              </div>
            )}

            {/* Step 2: Terms Review */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Legal Terms & Conditions</h2>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6 max-h-[500px] overflow-y-auto">
                  <FullLegalTerms consentType={consentType} consentDetails={consentDetails} />
                </div>

                <label className="flex items-start gap-3 p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRead}
                    onChange={(e) => setHasRead(e.target.checked)}
                    className="w-5 h-5 mt-1"
                  />
                  <div>
                    <p className="text-white font-semibold">I have read and understood these terms</p>
                    <p className="text-sm text-gray-400 mt-1">
                      By checking this box, you confirm that you have read, understood, and agree to the above terms and conditions.
                    </p>
                  </div>
                </label>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 py-4 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#1A1A1A] transition font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!hasRead}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Information
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Client Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Your Information</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      value={clientInfo.fullName}
                      onChange={(e) => setClientInfo({ ...clientInfo, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={clientInfo.email}
                      onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
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
                      value={clientInfo.phone}
                      onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={clientInfo.address}
                      onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                      placeholder="123 Main St, City, State ZIP"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">
                      Business Name (if applicable)
                    </label>
                    <input
                      type="text"
                      value={clientInfo.businessName}
                      onChange={(e) => setClientInfo({ ...clientInfo, businessName: e.target.value })}
                      placeholder="ABC Company"
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-4 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#1A1A1A] transition font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    disabled={!clientInfo.fullName || !clientInfo.email || !clientInfo.phone || !clientInfo.address}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Signature
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Signature */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Electronic Signature</h2>

                <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                  <label className="block text-sm font-semibold text-white mb-2">
                    Type Your Full Name to Sign *
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Type your full legal name"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition font-['Brush_Script_MT',cursive] text-2xl"
                  />
                  {signature && (
                    <div className="mt-4 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                      <p className="text-sm text-gray-400 mb-2">Your signature will appear as:</p>
                      <p className="text-3xl font-['Brush_Script_MT',cursive] text-white">{signature}</p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-400 mb-1">Legal Binding Agreement</h4>
                      <p className="text-sm text-blue-300">
                        By signing below, you acknowledge that:
                      </p>
                      <ul className="text-sm text-blue-300 mt-2 space-y-1 list-disc list-inside">
                        <li>This is a legally binding electronic signature</li>
                        <li>You have read and agree to all terms and conditions</li>
                        <li>You grant the permissions specified in your consent selection</li>
                        <li>A copy will be sent to your email and saved to your client folder</li>
                        <li>Date: {new Date().toLocaleDateString()}</li>
                        <li>Time: {new Date().toLocaleTimeString()}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 py-4 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#1A1A1A] transition font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitConsent}
                    disabled={!signature || signature !== clientInfo.fullName || isSubmitting}
                    className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving Agreement...
                      </>
                    ) : (
                      <>
                        <FileSignature className="w-5 h-5" />
                        Sign & Complete Agreement
                      </>
                    )}
                  </button>
                </div>

                {signature && signature !== clientInfo.fullName && (
                  <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">
                        Signature must match your full legal name: <strong>{clientInfo.fullName}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Management mode (for admin to view/manage consents)
  return <ConsentManagementDashboard />;
}

// Full Legal Terms Component
function FullLegalTerms({ consentType, consentDetails }: any) {
  return (
    <div className="prose prose-invert max-w-none text-sm">
      <h3 className="text-lg font-bold text-white mb-4">MEDIA USAGE & RELEASE AGREEMENT</h3>
      
      <p className="text-gray-300 mb-4">
        <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">1. GRANT OF RIGHTS</h4>
      <p className="text-gray-300">
        {consentType === 'full' && (
          <>
            I hereby grant to [Company Name] and its authorized representatives, the absolute and irrevocable right and permission to use, 
            publish, republish, and copyright photographs, videos, designs, plans, drawings, and any other visual or audio recordings 
            ("Media") of my property, project, and/or my likeness, in whole or in part, for use in all forms of media and in all manners, 
            including but not limited to:
          </>
        )}
        {consentType === 'limited' && (
          <>
            I hereby grant to [Company Name] limited rights to use specific Media as selected in my consent preferences. The company may only 
            use the types of media and channels I have explicitly authorized.
          </>
        )}
        {consentType === 'none' && (
          <>
            I expressly DO NOT grant permission to [Company Name] to use any Media related to my project for marketing or promotional purposes. 
            All project materials shall remain strictly confidential and for project documentation purposes only.
          </>
        )}
      </p>

      {consentType !== 'none' && (
        <>
          <ul className="text-gray-300 list-disc list-inside space-y-1 ml-4 my-4">
            {consentDetails.socialMedia && <li>Social media platforms (Instagram, Facebook, TikTok, LinkedIn, Twitter, YouTube, etc.)</li>}
            {consentDetails.website && <li>Company website and online portfolios</li>}
            {consentDetails.printMarketing && <li>Print marketing materials (brochures, flyers, business cards, magazines, etc.)</li>}
            {consentDetails.beforeAfter && <li>Before and after comparisons</li>}
            {consentDetails.testimonials && <li>Testimonials and customer reviews</li>}
            {consentDetails.aiGeneration && <li>AI-generated content creation and enhancement</li>}
            {consentDetails.designPlans && <li>Architectural designs, floor plans, and technical drawings</li>}
            <li>Advertising and promotional materials in any media format</li>
            <li>Trade shows, presentations, and demonstrations</li>
            <li>Training and educational materials</li>
          </ul>

          <h4 className="text-white font-bold mt-6 mb-2">2. AI-GENERATED CONTENT</h4>
          <p className="text-gray-300 mb-4">
            I understand and consent that the Media may be used as input for artificial intelligence (AI) systems to:
          </p>
          <ul className="text-gray-300 list-disc list-inside space-y-1 ml-4 mb-4">
            <li>Generate promotional social media posts, captions, and descriptions</li>
            <li>Create marketing videos, reels, and short-form content</li>
            <li>Enhance, modify, or improve image and video quality</li>
            <li>Generate derivative works including graphics, animations, and stylized versions</li>
            <li>Combine with other media to create composite marketing materials</li>
            <li>Analyze for performance optimization and content strategy</li>
          </ul>

          <h4 className="text-white font-bold mt-6 mb-2">3. MODIFICATIONS AND ALTERATIONS</h4>
          <p className="text-gray-300">
            I consent to the editing, cropping, retouching, and modification of the Media, and to the use of composite or 
            derivative works created from the Media. I understand that AI systems may be used to enhance, modify, or transform 
            the Media in ways that may differ significantly from the original.
          </p>

          <h4 className="text-white font-bold mt-6 mb-2">4. WAIVER OF CLAIMS</h4>
          <p className="text-gray-300">
            I waive any right to inspect or approve the finished materials or the use to which they may be applied. I release 
            and hold harmless [Company Name], its officers, employees, agents, and assigns from any and all claims, damages, 
            or liability arising from or related to the use of the Media, including but not limited to claims of defamation, 
            invasion of privacy, or infringement of moral rights, rights of publicity, or copyright.
          </p>

          <h4 className="text-white font-bold mt-6 mb-2">5. NO COMPENSATION</h4>
          <p className="text-gray-300">
            I understand that I will not receive any compensation, royalties, or payment of any kind for the use of the Media. 
            All rights granted herein are provided on a royalty-free, perpetual basis unless otherwise specified in my consent preferences.
          </p>

          <h4 className="text-white font-bold mt-6 mb-2">6. DURATION OF CONSENT</h4>
          <p className="text-gray-300">
            This consent is effective as of the date signed and shall remain in effect for:
            {consentDetails.duration === 'perpetual' && ' perpetual use with no expiration date.'}
            {consentDetails.duration === '1year' && ' one (1) year from the date signed.'}
            {consentDetails.duration === '5years' && ' five (5) years from the date signed.'}
            {consentDetails.duration === 'project' && ' the duration of the project only.'}
          </p>

          {consentDetails.revocable && (
            <>
              <h4 className="text-white font-bold mt-6 mb-2">7. REVOCATION RIGHTS</h4>
              <p className="text-gray-300">
                I understand that I may revoke this consent at any time by providing written notice to [Company Name]. Upon 
                revocation, [Company Name] will cease future use of the Media but is not required to remove or recall materials 
                already published or distributed prior to the revocation date. Materials already in circulation, including but 
                not limited to social media posts, printed materials, and archived content, may continue to exist.
              </p>
            </>
          )}

          {consentDetails.attribution && (
            <>
              <h4 className="text-white font-bold mt-6 mb-2">8. ATTRIBUTION</h4>
              <p className="text-gray-300">
                [Company Name] agrees to provide attribution credit when reasonably feasible in the following format: 
                "Project: [Client Name/Business Name]" or as otherwise agreed upon. Attribution may not be possible in all 
                formats or contexts, such as video content, small-format materials, or certain social media posts.
              </p>
            </>
          )}
        </>
      )}

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '2' : '9'}. OWNERSHIP AND COPYRIGHT</h4>
      <p className="text-gray-300">
        I understand that [Company Name] or its designated photographer/videographer retains all ownership rights and copyrights 
        to the original Media. {consentType !== 'none' && 'This release grants usage rights only and does not transfer ownership or copyright.'}
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '3' : '10'}. PRIVACY AND DATA PROTECTION</h4>
      <p className="text-gray-300">
        I acknowledge that [Company Name] will handle my personal information in accordance with applicable privacy laws and 
        regulations. Media and associated data will be stored securely. I have the right to request access to, correction of, 
        or deletion of my personal data in accordance with applicable law.
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '4' : '11'}. THIRD-PARTY PLATFORMS</h4>
      <p className="text-gray-300">
        {consentType !== 'none' ? (
          <>
            I understand that Media posted on third-party platforms (such as social media) will be subject to those platforms' 
            terms of service and privacy policies. [Company Name] cannot control how third parties may use or share content once 
            posted on their platforms.
          </>
        ) : (
          <>
            [Company Name] agrees not to post any Media on third-party platforms or share with external parties for marketing purposes.
          </>
        )}
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '5' : '12'}. REPRESENTATIONS AND WARRANTIES</h4>
      <p className="text-gray-300">
        I represent and warrant that:
      </p>
      <ul className="text-gray-300 list-disc list-inside space-y-1 ml-4 my-4">
        <li>I am at least 18 years of age and have the legal capacity to enter into this agreement</li>
        <li>I am the legal owner of the property depicted in the Media or have obtained all necessary permissions</li>
        <li>I have the authority to grant the rights specified in this agreement</li>
        <li>No other person's consent is required for the use of the Media as specified</li>
        <li>The information provided in this agreement is true and accurate</li>
      </ul>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '6' : '13'}. GOVERNING LAW</h4>
      <p className="text-gray-300">
        This agreement shall be governed by and construed in accordance with the laws of [State/Province], without regard to 
        its conflict of law provisions.
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '7' : '14'}. ENTIRE AGREEMENT</h4>
      <p className="text-gray-300">
        This agreement constitutes the entire agreement between the parties concerning the subject matter hereof and supersedes 
        all prior agreements, understandings, negotiations, and discussions, whether oral or written.
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '8' : '15'}. SEVERABILITY</h4>
      <p className="text-gray-300">
        If any provision of this agreement is found to be invalid or unenforceable, the remaining provisions shall continue in 
        full force and effect.
      </p>

      <h4 className="text-white font-bold mt-6 mb-2">{consentType === 'none' ? '9' : '16'}. ELECTRONIC SIGNATURE</h4>
      <p className="text-gray-300 mb-4">
        I acknowledge that my electronic signature on this document is legally binding and has the same force and effect as a 
        handwritten signature. I understand that a copy of this signed agreement will be provided to me via email and stored 
        in my secure client folder.
      </p>

      <div className="bg-orange-600/10 border border-orange-500/30 rounded-lg p-4 mt-6">
        <p className="text-orange-400 font-semibold mb-2">IMPORTANT NOTICE:</p>
        <p className="text-orange-300 text-sm">
          Please read this agreement carefully before signing. If you have any questions or concerns, please contact us before 
          proceeding. You may wish to consult with legal counsel before signing this agreement. Keep a copy of this agreement 
          for your records.
        </p>
      </div>
    </div>
  );
}

// Consent Management Dashboard (for admins)
function ConsentManagementDashboard() {
  const [consents, setConsents] = useState<ConsentAgreement[]>([
    {
      id: 'CONSENT-001',
      clientId: 'CLIENT-001',
      clientName: 'John Smith',
      agreementType: 'full',
      agreedAt: '2024-01-15T10:30:00Z',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      consentDetails: {
        photos: true,
        videos: true,
        beforeAfter: true,
        testimonials: true,
        socialMedia: true,
        website: true,
        printMarketing: true,
        aiGeneration: true,
        designPlans: true,
        duration: 'perpetual',
        attribution: false,
        revocable: true
      },
      signature: 'John Smith',
      documentUrl: '/documents/consent-001.pdf',
      status: 'active'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter consents based on search and status
  const filteredConsents = consents.filter(consent => {
    const matchesSearch = consent.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         consent.clientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || consent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Consent table columns
  const consentColumns: DataTableColumn<ConsentAgreement>[] = [
    {
      key: 'clientName',
      header: 'Client',
      render: (row) => (
        <div>
          <p className="font-semibold text-white">{row.clientName}</p>
          <p className="text-sm text-gray-400">{row.clientId}</p>
        </div>
      ),
    },
    {
      key: 'agreementType',
      header: 'Type',
      render: (row) => (
        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
          row.agreementType === 'full'
            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
            : row.agreementType === 'limited'
            ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-red-600/20 text-red-400 border border-red-500/30'
        }`}>
          {row.agreementType === 'full' ? 'Full' : row.agreementType === 'limited' ? 'Limited' : 'None'}
        </span>
      ),
    },
    {
      key: 'agreedAt',
      header: 'Signed',
      render: (row) => (
        <div>
          <p className="text-white">{new Date(row.agreedAt).toLocaleDateString()}</p>
          <p className="text-sm text-gray-400">{new Date(row.agreedAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
          row.status === 'active'
            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
            : row.status === 'revoked'
            ? 'bg-red-600/20 text-red-400 border border-red-500/30'
            : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition border border-blue-500/30"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition border border-green-500/30"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition border border-purple-500/30"
            title="Send Copy"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Media Consent Management</h1>
          <p className="text-gray-400">View and manage all client media usage agreements</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {consents.filter(c => c.status === 'active').length}
                </p>
                <p className="text-sm text-gray-400">Active Consents</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {consents.filter(c => c.agreementType === 'full').length}
                </p>
                <p className="text-sm text-gray-400">Full Consent</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {consents.filter(c => c.agreementType === 'limited').length}
                </p>
                <p className="text-sm text-gray-400">Limited Consent</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {consents.filter(c => c.status === 'revoked').length}
                </p>
                <p className="text-sm text-gray-400">Revoked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name..."
              className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none transition"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Consents Table */}
        <DataTable
          columns={consentColumns}
          data={filteredConsents}
          emptyMessage="No consent agreements found"
          rowHoverEffect={true}
          containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
        />
      </div>
    </div>
  );
}
