/**
 * Subcontractor Setup Wizard
 * 
 * Multi-step wizard for adding subcontractors with:
 * - Basic information
 * - License & insurance details
 * - Skills & certifications
 * - Rate cards & pricing
 * - Document uploads
 * - Document requirements checklist
 * - QR code generation for mobile portal
 */

import { useState, useRef, useMemo } from 'react';
import {
  Building2, User, FileText, DollarSign, Upload, CheckCircle,
  ChevronLeft, ChevronRight, X, Phone, Mail, MapPin, Shield,
  Award, Briefcase, Wrench, Calendar, CreditCard, QrCode,
  Download, Copy, Check, AlertCircle, FileCheck, Camera,
  Smartphone, Globe, Key, Hash, BadgeCheck, Package, Zap,
  Clock, Target, Star, TrendingUp, Users, Settings, Home,
  Droplet, Lightbulb, Hammer, PaintBucket, Scissors, Plus,
  Trash2, ExternalLink, Info, AlertTriangle, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { copyToClipboard } from '../utils/clipboard';
import { SecondaryButton } from './ui/button/SecondaryButton';
import { DangerButton } from './ui/button/DangerButton';
import { JOB_CATEGORIES, JOB_CATEGORY_NAMES } from '../lib/constants/jobCategories';

interface SubcontractorFormData {
  // Step 1: Basic Info
  name: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  codingPrefix: string;
  
  // Step 2: License & Insurance
  licenseNumber: string;
  licenseState: string;
  licenseExpiration: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiration: string;
  liabilityCoverage: string;
  workersCompCoverage: string;
  bondNumber: string;
  
  // Step 3: Skills & Certifications
  primaryTrade: string;
  secondaryTrades: string[];
  certifications: string[];
  yearsExperience: string;
  serviceArea: string[];
  specialties: string[];
  
  // Step 4: Rate Cards & Pricing
  hourlyRate: string;
  overtimeRate: string;
  emergencyRate: string;
  minimumCharge: string;
  travelFee: string;
  paymentTerms: string;
  preferredPaymentMethod: string;
  
  // Step 5: Documents
  uploadedDocuments: {
    w9: File | null;
    insurance: File | null;
    license: File | null;
    bond: File | null;
    certifications: File[];
  };
  
  // Document Requirements
  documentChecklist: {
    w9: boolean;
    insurance: boolean;
    license: boolean;
    bond: boolean;
    certifications: boolean;
  };
  
  // Setup Options
  autoCreatePortal: boolean;
  generateQRCode: boolean;
  sendInvitation: boolean;
}

interface SubcontractorSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: SubcontractorFormData) => void;
}

// Using shared job categories from constants
const TRADES = JOB_CATEGORIES;

const CERTIFICATIONS = [
  'EPA Universal Certification',
  'OSHA 30-Hour',
  'Master Electrician',
  'Master Plumber',
  'Lead-Safe Certified',
  'Asbestos Abatement',
  'HVAC Excellence',
  'NATE Certified',
  'Home Inspector',
  'Energy Auditor'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const DOCUMENT_REQUIREMENTS = [
  { id: 'w9', name: 'W-9 Tax Form', required: true, icon: FileText },
  { id: 'insurance', name: 'Insurance Certificate', required: true, icon: Shield },
  { id: 'license', name: 'Trade License', required: true, icon: BadgeCheck },
  { id: 'bond', name: 'Surety Bond', required: false, icon: Award },
  { id: 'certifications', name: 'Certifications', required: false, icon: Award }
];

export default function SubcontractorSetupWizard({
  isOpen,
  onClose,
  onComplete
}: SubcontractorSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [allStepsView, setAllStepsView] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // Memoize QR pattern to prevent re-rendering
  const qrPattern = useMemo(() => {
    return Array.from({ length: 64 }).map(() => Math.random() > 0.5);
  }, [qrCodeGenerated]);
  
  const [formData, setFormData] = useState<SubcontractorFormData>({
    // Step 1
    name: '',
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    codingPrefix: '',
    
    // Step 2
    licenseNumber: '',
    licenseState: '',
    licenseExpiration: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiration: '',
    liabilityCoverage: '',
    workersCompCoverage: '',
    bondNumber: '',
    
    // Step 3
    primaryTrade: '',
    secondaryTrades: [],
    certifications: [],
    yearsExperience: '',
    serviceArea: [],
    specialties: [],
    
    // Step 4
    hourlyRate: '',
    overtimeRate: '',
    emergencyRate: '',
    minimumCharge: '',
    travelFee: '',
    paymentTerms: 'Net 30',
    preferredPaymentMethod: 'Check',
    
    // Step 5
    uploadedDocuments: {
      w9: null,
      insurance: null,
      license: null,
      bond: null,
      certifications: []
    },
    
    documentChecklist: {
      w9: false,
      insurance: false,
      license: false,
      bond: false,
      certifications: false
    },
    
    autoCreatePortal: true,
    generateQRCode: true,
    sendInvitation: true
  });

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData({
      ...formData,
      [parent]: {
        ...(formData[parent as keyof SubcontractorFormData] as any),
        [field]: value
      }
    });
  };

  const toggleArrayItem = (field: keyof SubcontractorFormData, item: string) => {
    const currentArray = formData[field] as string[];
    if (currentArray.includes(item)) {
      updateFormData(field, currentArray.filter(i => i !== item));
    } else {
      updateFormData(field, [...currentArray, item]);
    }
  };

  const handleFileUpload = (docType: keyof SubcontractorFormData['uploadedDocuments'], file: File | null) => {
    if (!file) return;
    
    if (docType === 'certifications') {
      const currentCerts = formData.uploadedDocuments.certifications;
      updateNestedFormData('uploadedDocuments', 'certifications', [...currentCerts, file]);
      updateNestedFormData('documentChecklist', docType, true);
      toast.success(`Certification document uploaded successfully`);
    } else {
      updateNestedFormData('uploadedDocuments', docType, file);
      updateNestedFormData('documentChecklist', docType, true);
      const docName = docType.replace(/([A-Z])/g, ' $1').trim();
      toast.success(`${docName.charAt(0).toUpperCase() + docName.slice(1)} uploaded successfully`);
    }
  };

  const generateQRCode = () => {
    const url = `https://portal.yourdomain.com/sub/${formData.codingPrefix || formData.name.substring(0, 3).toUpperCase()}`;
    setPortalUrl(url);
    setQrCodeGenerated(true);
    toast.success('QR Code generated!');
  };

  const copyPortalUrl = async () => {
    const success = await copyToClipboard(portalUrl);
    if (success) {
      toast.success('Portal URL copied to clipboard');
    } else {
      toast.error('Failed to copy URL. Please copy manually.');
    }
  };

  const downloadQRCode = () => {
    toast.success('QR Code downloaded');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.email) {
          toast.error('Please fill in required fields (Name & Email)');
          return false;
        }
        return true;
      case 2:
        // License & Insurance - optional but warn if missing
        return true;
      case 3:
        if (!formData.primaryTrade) {
          toast.error('Please select a primary trade');
          return false;
        }
        return true;
      case 4:
        // Pricing - optional
        return true;
      case 5:
        // Check required documents
        const missingDocs = DOCUMENT_REQUIREMENTS
          .filter(doc => doc.required && !formData.documentChecklist[doc.id as keyof typeof formData.documentChecklist])
          .map(doc => doc.name);
        
        if (missingDocs.length > 0) {
          toast.error(`Missing required documents: ${missingDocs.join(', ')}`);
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    // Skip validation in demo mode
    if (demoMode || validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      }
    }
  };
  
  const goToStep = (step: number) => {
    if (demoMode) {
      setCurrentStep(step);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Skip validation in demo mode
    if (demoMode || validateStep(currentStep)) {
      onComplete(formData);
      onClose();
      toast.success('Subcontractor added successfully!');
    }
  };

  const steps = [
    { num: 1, name: 'Basic Info', icon: Building2 },
    { num: 2, name: 'License & Insurance', icon: Shield },
    { num: 3, name: 'Skills & Trades', icon: Wrench },
    { num: 4, name: 'Rate Cards', icon: DollarSign },
    { num: 5, name: 'Documents', icon: FileText },
    { num: 6, name: 'Review & Setup', icon: CheckCircle }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border-2 border-orange-500/30 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A] bg-gradient-to-r from-orange-900/20 to-transparent">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-orange-400" />
              Add New Subcontractor
            </h2>
            <p className="text-sm text-gray-400 mt-1">Complete setup with portal & QR code generation</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => {
                  setDemoMode(e.target.checked);
                  if (!e.target.checked) setAllStepsView(false);
                }}
                className="w-4 h-4 rounded border-2 border-purple-500 bg-[#0A0A0A] checked:bg-purple-600"
              />
              <span className="text-sm font-medium text-purple-400">Demo Mode</span>
            </label>
            {demoMode && (
              <label className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition">
                <input
                  type="checkbox"
                  checked={allStepsView}
                  onChange={(e) => setAllStepsView(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-blue-500 bg-[#0A0A0A] checked:bg-blue-600"
                />
                <span className="text-sm font-medium text-blue-400">All Steps View</span>
              </label>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] bg-[#0F0F0F]">
          {demoMode && (
            <div className="mb-3 px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-center">
              <p className="text-sm text-purple-300 font-medium">
                🎯 Demo Mode Active - Click any step to navigate without validation
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <button
                    onClick={() => goToStep(step.num)}
                    disabled={!demoMode}
                    className={`flex flex-col items-center flex-1 ${demoMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                      isCompleted 
                        ? 'bg-green-600 border-green-500 text-white' 
                        : isActive 
                        ? 'bg-orange-600 border-orange-500 text-white' 
                        : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-500'
                    } ${demoMode ? 'hover:scale-110' : ''}`}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <p className={`text-xs mt-2 font-medium ${isActive ? 'text-orange-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}`}>
                      {step.name}
                    </p>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-green-600' : 'bg-[#2A2A2A]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {allStepsView && (
            <div className="mb-6 px-6 py-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Eye className="w-6 h-6 text-blue-400" />
                All Steps Preview Mode
              </h3>
              <p className="text-sm text-blue-300">
                Viewing all form sections at once. Scroll to see all 6 steps below.
              </p>
            </div>
          )}
          
          {/* Step 1: Basic Info */}
          {(currentStep === 1 || allStepsView) && (
            <div className="space-y-6">
              {allStepsView && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-500/30">
                  <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Step 1: Basic Information</h2>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Basic Company Information</p>
                  <p className="text-blue-400/80">Enter the subcontractor's business details and contact information.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      updateFormData('name', e.target.value);
                      if (!formData.codingPrefix) {
                        updateFormData('codingPrefix', e.target.value.substring(0, 3).toUpperCase());
                      }
                    }}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="ABC Construction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Legal Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="ABC Construction LLC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Primary Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => updateFormData('contactName', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="john@abc-construction.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Coding Prefix</label>
                  <input
                    type="text"
                    value={formData.codingPrefix}
                    onChange={(e) => updateFormData('codingPrefix', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="ABC"
                    maxLength={5}
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for tracking codes (max 5 characters)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="Los Angeles"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => updateFormData('state', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">Select</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => updateFormData('zip', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="90001"
                    maxLength={5}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: License & Insurance */}
          {(currentStep === 2 || allStepsView) && (
            <div className="space-y-6">
              {allStepsView && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-500/30 mt-8">
                  <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Step 2: License & Insurance</h2>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">License & Insurance Information</p>
                  <p className="text-blue-400/80">Enter licensing and insurance details to ensure compliance.</p>
                </div>
              </div>

              {/* License Information */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-orange-400" />
                  Trade License
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">License Number</label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder="123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">License State</label>
                    <select
                      value={formData.licenseState}
                      onChange={(e) => updateFormData('licenseState', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="">Select</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.licenseExpiration}
                      onChange={(e) => updateFormData('licenseExpiration', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-400" />
                  Insurance Coverage
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Provider</label>
                    <input
                      type="text"
                      value={formData.insuranceProvider}
                      onChange={(e) => updateFormData('insuranceProvider', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder="State Farm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Policy Number</label>
                    <input
                      type="text"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) => updateFormData('insurancePolicyNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder="POL-123456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.insuranceExpiration}
                      onChange={(e) => updateFormData('insuranceExpiration', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Liability Coverage</label>
                    <input
                      type="text"
                      value={formData.liabilityCoverage}
                      onChange={(e) => updateFormData('liabilityCoverage', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder="$1,000,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Workers Comp</label>
                    <input
                      type="text"
                      value={formData.workersCompCoverage}
                      onChange={(e) => updateFormData('workersCompCoverage', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder="$500,000"
                    />
                  </div>
                </div>
              </div>

              {/* Bond Information */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-400" />
                  Surety Bond (Optional)
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bond Number</label>
                  <input
                    type="text"
                    value={formData.bondNumber}
                    onChange={(e) => updateFormData('bondNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="BOND-123456"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Skills & Trades */}
          {(currentStep === 3 || allStepsView) && (
            <div className="space-y-6">
              {allStepsView && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-500/30 mt-8">
                  <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Step 3: Skills & Trades</h2>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <Wrench className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Skills, Trades & Certifications</p>
                  <p className="text-blue-400/80">Define the subcontractor's areas of expertise and qualifications.</p>
                </div>
              </div>

              {/* Primary Trade */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Primary Trade <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TRADES.map(trade => {
                    const Icon = trade.icon;
                    const isSelected = formData.primaryTrade === trade.id;
                    return (
                      <button
                        key={trade.id}
                        onClick={() => updateFormData('primaryTrade', trade.id)}
                        className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'bg-orange-600/20 border-orange-500 text-orange-400'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-orange-500/50'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{trade.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Trades */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Secondary Trades (Multi-select)</label>
                <div className="grid grid-cols-3 gap-3">
                  {TRADES.filter(t => t.id !== formData.primaryTrade).map(trade => {
                    const Icon = trade.icon;
                    const isSelected = formData.secondaryTrades.includes(trade.id);
                    return (
                      <button
                        key={trade.id}
                        onClick={() => toggleArrayItem('secondaryTrades', trade.id)}
                        className={`p-3 rounded-lg border transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-blue-500/50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{trade.name}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Certifications</label>
                <div className="grid grid-cols-2 gap-2">
                  {CERTIFICATIONS.map(cert => {
                    const isSelected = formData.certifications.includes(cert);
                    return (
                      <button
                        key={cert}
                        onClick={() => toggleArrayItem('certifications', cert)}
                        className={`p-3 rounded-lg border text-left transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-green-600/20 border-green-500 text-green-400'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-green-500/50'
                        }`}
                      >
                        <Award className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm flex-1">{cert}</span>
                        {isSelected && <CheckCircle className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Years of Experience */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => updateFormData('yearsExperience', e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="10"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Service Area Coverage</label>
                  <input
                    type="text"
                    value={formData.serviceArea.join(', ')}
                    onChange={(e) => updateFormData('serviceArea', e.target.value.split(',').map(s => s.trim()))}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="Los Angeles, Orange County, Riverside"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
                </div>
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Specialties & Notes</label>
                <textarea
                  value={formData.specialties.join('\n')}
                  onChange={(e) => updateFormData('specialties', e.target.value.split('\n').filter(s => s.trim()))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  rows={4}
                  placeholder="High-end residential&#10;Commercial HVAC systems&#10;Emergency 24/7 service"
                />
                <p className="text-xs text-gray-500 mt-1">One specialty per line</p>
              </div>
            </div>
          )}

          {/* Step 4: Rate Cards & Pricing */}
          {(currentStep === 4 || allStepsView) && (
            <div className="space-y-6">
              {allStepsView && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-500/30 mt-8">
                  <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Step 4: Rate Cards & Pricing</h2>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Rate Cards & Pricing Structure</p>
                  <p className="text-blue-400/80">Set standard rates and payment terms for this subcontractor.</p>
                </div>
              </div>

              {/* Hourly Rates */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  Hourly Rates
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Standard Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={formData.hourlyRate}
                        onChange={(e) => updateFormData('hourlyRate', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        placeholder="75.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Overtime Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={formData.overtimeRate}
                        onChange={(e) => updateFormData('overtimeRate', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        placeholder="112.50"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Emergency Rate</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={formData.emergencyRate}
                        onChange={(e) => updateFormData('emergencyRate', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        placeholder="150.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Fees */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-400" />
                  Additional Fees
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Charge</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={formData.minimumCharge}
                        onChange={(e) => updateFormData('minimumCharge', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        placeholder="150.00"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Travel Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={formData.travelFee}
                        onChange={(e) => updateFormData('travelFee', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        placeholder="25.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-400" />
                  Payment Terms
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => updateFormData('paymentTerms', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Payment Method</label>
                    <select
                      value={formData.preferredPaymentMethod}
                      onChange={(e) => updateFormData('preferredPaymentMethod', e.target.value)}
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="Check">Check</option>
                      <option value="ACH Transfer">ACH Transfer</option>
                      <option value="Wire Transfer">Wire Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {(currentStep === 5 || allStepsView) && (
            <div className="space-y-6">
              {allStepsView && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-500/30 mt-8">
                  <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Step 5: Document Requirements</h2>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Document Requirements</p>
                  <p className="text-blue-400/80">Upload required documents for compliance and verification.</p>
                </div>
              </div>

              {/* Document Checklist */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-orange-400" />
                  Document Checklist
                </h3>
                
                <div className="space-y-3">
                  {DOCUMENT_REQUIREMENTS.map(doc => {
                    const Icon = doc.icon;
                    const isUploaded = formData.documentChecklist[doc.id as keyof typeof formData.documentChecklist];
                    
                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-lg border-2 transition ${
                          isUploaded
                            ? 'bg-green-900/20 border-green-500/50'
                            : doc.required
                            ? 'bg-red-900/10 border-red-500/30'
                            : 'bg-[#0A0A0A] border-[#2A2A2A]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${isUploaded ? 'text-green-400' : doc.required ? 'text-red-400' : 'text-gray-400'}`} />
                            <div>
                              <h4 className="font-medium text-white">
                                {doc.name}
                                {doc.required && <span className="ml-2 text-xs text-red-400 font-bold">REQUIRED</span>}
                              </h4>
                              <p className="text-xs text-gray-400">
                                {isUploaded ? 'Uploaded ✓' : 'Not uploaded'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isUploaded && (
                              <div className="px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-full text-green-400 text-xs font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Complete
                              </div>
                            )}
                            <label className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium cursor-pointer transition flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              {isUploaded ? 'Replace' : 'Upload'}
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(doc.id as keyof SubcontractorFormData['uploadedDocuments'], file);
                                  }
                                }}
                                accept=".pdf,.jpg,.jpeg,.png"
                              />
                            </label>
                          </div>
                        </div>
                        
                        {formData.uploadedDocuments[doc.id as keyof typeof formData.uploadedDocuments] && (
                          <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#0A0A0A] rounded p-2">
                            <FileText className="w-4 h-4" />
                            <span>
                              {doc.id === 'certifications'
                                ? `${formData.uploadedDocuments.certifications.length} file(s)`
                                : (formData.uploadedDocuments[doc.id as keyof typeof formData.uploadedDocuments] as File)?.name}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload Summary */}
              <div className="bg-gradient-to-r from-orange-900/20 to-transparent border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-orange-300 font-medium mb-2">Document Upload Guidelines</p>
                    <ul className="text-orange-400/80 space-y-1 list-disc list-inside">
                      <li>Accepted formats: PDF, JPG, PNG</li>
                      <li>Maximum file size: 10MB per document</li>
                      <li>Ensure all documents are current and valid</li>
                      <li>Required documents must be uploaded before completion</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Review & Setup */}
          {(currentStep === 6 || allStepsView) && (
            <div className="space-y-6">
              {allStepsView && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-500/30 mt-8">
                  <div className="w-10 h-10 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Step 6: Review & Portal Setup</h2>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Review & Complete Setup</p>
                  <p className="text-blue-400/80">Review all information and configure portal settings.</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-orange-400" />
                    Company Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-medium">{formData.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{formData.email || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{formData.phone || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Coding:</span>
                      <span className="text-orange-400 font-bold">{formData.codingPrefix || 'AUTO'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-orange-400" />
                    Trade & Skills
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Primary:</span>
                      <span className="text-white font-medium capitalize">{formData.primaryTrade || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Secondary:</span>
                      <span className="text-white">{formData.secondaryTrades.length} trade(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Certifications:</span>
                      <span className="text-white">{formData.certifications.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Experience:</span>
                      <span className="text-white">{formData.yearsExperience || 'Not set'} years</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-400" />
                    Rates & Pricing
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hourly:</span>
                      <span className="text-white font-medium">${formData.hourlyRate || '0.00'}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overtime:</span>
                      <span className="text-white">${formData.overtimeRate || '0.00'}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Emergency:</span>
                      <span className="text-white">${formData.emergencyRate || '0.00'}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Terms:</span>
                      <span className="text-white">{formData.paymentTerms}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-400" />
                    Documents
                  </h3>
                  <div className="space-y-2 text-sm">
                    {DOCUMENT_REQUIREMENTS.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between">
                        <span className="text-gray-400">{doc.name}:</span>
                        {formData.documentChecklist[doc.id as keyof typeof formData.documentChecklist] ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Uploaded
                          </span>
                        ) : (
                          <span className={doc.required ? 'text-red-400' : 'text-gray-500'}>
                            {doc.required ? 'Missing' : 'Optional'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portal Setup Options */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  Portal Setup Options
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg cursor-pointer hover:bg-[#151515] transition">
                    <input
                      type="checkbox"
                      checked={formData.autoCreatePortal}
                      onChange={(e) => updateFormData('autoCreatePortal', e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-orange-400" />
                        Auto-Create Full Portal
                      </p>
                      <p className="text-xs text-gray-400">
                        Automatically create mobile portal with all features enabled
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg cursor-pointer hover:bg-[#151515] transition">
                    <input
                      type="checkbox"
                      checked={formData.generateQRCode}
                      onChange={(e) => updateFormData('generateQRCode', e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-orange-400" />
                        Generate QR Code for Portal Access
                      </p>
                      <p className="text-xs text-gray-400">
                        Create downloadable QR code for easy mobile portal access
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg cursor-pointer hover:bg-[#151515] transition">
                    <input
                      type="checkbox"
                      checked={formData.sendInvitation}
                      onChange={(e) => updateFormData('sendInvitation', e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-orange-400" />
                        Send Email Invitation
                      </p>
                      <p className="text-xs text-gray-400">
                        Email portal access link and setup instructions to {formData.email || 'subcontractor'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* QR Code Generator */}
              {formData.generateQRCode && (
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-orange-400" />
                    Mobile Portal QR Code
                  </h3>
                  
                  {!qrCodeGenerated ? (
                    <button
                      onClick={generateQRCode}
                      className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-5 h-5" />
                      Generate QR Code
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white p-8 rounded-xl flex items-center justify-center">
                        {/* QR Code Visual */}
                        <div ref={qrCodeRef} className="w-64 h-64 bg-white border-4 border-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                          {/* QR Code Pattern Simulation */}
                          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                            {qrPattern.map((isBlack, i) => (
                              <div
                                key={i}
                                className={`${isBlack ? 'bg-black' : 'bg-white'}`}
                              />
                            ))}
                          </div>
                          {/* Center Logo */}
                          <div className="relative z-10 bg-white p-2 rounded">
                            <Building2 className="w-8 h-8 text-orange-600" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-[#0A0A0A] rounded-lg p-3 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <code className="text-sm text-orange-400 flex-1">{portalUrl}</code>
                        <button
                          onClick={copyPortalUrl}
                          className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded text-gray-400 hover:text-white transition"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={downloadQRCode}
                          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download QR Code
                        </button>
                        <button
                          onClick={() => setQrCodeGenerated(false)}
                          className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!allStepsView && (
        <div className="px-6 py-4 border-t border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {demoMode && (
              <div className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full">
                <span className="text-xs font-bold text-purple-400">DEMO MODE</span>
              </div>
            )}
            <div className="text-sm text-gray-400">
              <span className="font-medium text-white">Step {currentStep} of 6</span>
            </div>
          </div>

          {currentStep < 6 ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg"
            >
              <Zap className="w-5 h-5" />
              Complete Setup
            </button>
          )}
        </div>
        )}

        {/* All Steps View Footer */}
        {allStepsView && (
          <div className="px-6 py-4 border-t border-[#2A2A2A] bg-[#0F0F0F] flex items-center justify-center">
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg"
            >
              <Zap className="w-5 h-5" />
              Complete Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
