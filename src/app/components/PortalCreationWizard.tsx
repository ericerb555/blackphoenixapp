/**
 * Portal Creation Wizard
 * 
 * Comprehensive wizard for creating new mobile portals with:
 * - AI-powered configuration suggestions
 * - Automatic workflow attachment
 * - Coding/tracking system setup
 * - Template-based creation
 * - Step-by-step guided setup
 * - Feature recommendations
 * - Security configuration
 * - Branding setup
 */

import { useState } from 'react';
import {
  Smartphone, Sparkles, ChevronRight, ChevronLeft, Check, X,
  User, Briefcase, Wrench, ShoppingBag, Building2, Crown,
  Zap, Home, Award, Wallet, CheckCircle, FileText,
  Settings, Palette, Lock, BarChart3, Layout, Target,
  Code, Database, Workflow, Package, MessageSquare, Calendar,
  DollarSign, Image, Video, Users, Activity, Shield, Globe,
  Brain, Lightbulb, TrendingUp, Star, Clock, Bell, Info,
  AlertCircle, Copy, Download, RefreshCw, Layers, Box, XCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TextArea } from './ui/input/TextArea';

type PortalType = 
  | 'customer' 
  | 'employee' 
  | 'subcontractor' 
  | 'vendor' 
  | 'property-manager'
  | 'portfolio-manager'
  | 'technician'
  | 'owners'
  | 'professional'
  | 'bank'
  | 'custom';

interface PortalTemplate {
  id: string;
  name: string;
  type: PortalType;
  description: string;
  icon: any;
  color: string;
  recommendedFor: string[];
  features: string[];
  workflows: string[];
  trackingSystems: string[];
  aiSuggestion?: string;
}

interface WizardStep {
  id: number;
  name: string;
  description: string;
  icon: any;
}

interface PortalCreationWizardProps {
  onClose: () => void;
  onComplete: (portalData: any) => void;
}

export default function PortalCreationWizard({ onClose, onComplete }: PortalCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<PortalTemplate | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  
  // Portal Configuration State
  const [portalName, setPortalName] = useState('');
  const [portalDescription, setPortalDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [codingSystemPrefix, setCodingSystemPrefix] = useState('');
  
  // Branding
  const [primaryColor, setPrimaryColor] = useState('#ea580c');
  const [secondaryColor, setSecondaryColor] = useState('#0A0A0A');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Security
  const [requireLogin, setRequireLogin] = useState(true);
  const [allowSignup, setAllowSignup] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  
  // AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiRecommendedFeatures, setAiRecommendedFeatures] = useState<string[]>([]);

  const steps: WizardStep[] = [
    { id: 1, name: 'Portal Type', description: 'Choose portal template', icon: Layout },
    { id: 2, name: 'Basic Info', description: 'Name and details', icon: FileText },
    { id: 3, name: 'Features', description: 'Select features', icon: Package },
    { id: 4, name: 'Workflows', description: 'Attach workflows', icon: Workflow },
    { id: 5, name: 'Tracking', description: 'Coding & tracking', icon: Code },
    { id: 6, name: 'Branding', description: 'Customize appearance', icon: Palette },
    { id: 7, name: 'Security', description: 'Access control', icon: Shield },
    { id: 8, name: 'Review', description: 'Review & create', icon: CheckCircle }
  ];

  const portalTemplates: PortalTemplate[] = [
    {
      id: 'customer',
      name: 'Customer Portal',
      type: 'customer',
      description: 'Customer-facing portal for projects, quotes, invoices, and support',
      icon: User,
      color: 'blue',
      recommendedFor: ['Client Communication', 'Project Tracking', 'Invoice Management'],
      features: ['Dashboard', 'Projects', 'Quotes', 'Invoices', 'Payments', 'Messages', 'Media', 'Subscription'],
      workflows: ['Quote Approval', 'Invoice Payment', 'Project Updates', 'Work Requests'],
      trackingSystems: ['Customer ID', 'Project Codes', 'Invoice Numbers', 'Quote Tracking'],
      aiSuggestion: 'Ideal for B2C businesses needing customer self-service portals'
    },
    {
      id: 'employee',
      name: 'Employee Portal',
      type: 'employee',
      description: 'Internal portal for task management, scheduling, and time tracking',
      icon: Briefcase,
      color: 'green',
      recommendedFor: ['Internal Team', 'Time Tracking', 'Task Management'],
      features: ['Dashboard', 'Tasks', 'Schedule', 'Timesheet', 'Team', 'Resources', 'Payroll', 'Announcements'],
      workflows: ['Clock In/Out', 'Task Assignment', 'Leave Requests', 'Timesheet Approval'],
      trackingSystems: ['Employee ID', 'Time Tracking', 'Task Codes', 'Department Codes'],
      aiSuggestion: 'Perfect for managing internal teams and workforce operations'
    },
    {
      id: 'subcontractor',
      name: 'Subcontractor Portal',
      type: 'subcontractor',
      description: 'Portal for managing subcontractors, jobs, and payments',
      icon: Wrench,
      color: 'orange',
      recommendedFor: ['Contractor Management', 'Job Tracking', 'Payment Processing'],
      features: ['Dashboard', 'Jobs', 'Invoices', 'Schedule', 'Payments', 'Messages', 'Profile', 'Resources'],
      workflows: ['Job Assignment', 'Invoice Submission', 'Payment Processing', 'Schedule Coordination'],
      trackingSystems: ['Contractor ID', 'Job Codes', 'Invoice Tracking', 'Payment Records'],
      aiSuggestion: 'Essential for construction and service businesses with subcontractors'
    },
    {
      id: 'vendor',
      name: 'Vendor Portal',
      type: 'vendor',
      description: 'Advertising and promotion portal for vendor partnerships',
      icon: ShoppingBag,
      color: 'purple',
      recommendedFor: ['Vendor Management', 'Advertising', 'Lead Generation'],
      features: ['Dashboard', 'Promotions', 'Analytics', 'Studio', 'Leads', 'Profile', 'Billing'],
      workflows: ['Promotion Approval', 'Lead Distribution', 'Billing Cycles', 'Content Creation'],
      trackingSystems: ['Vendor ID', 'Promotion Codes', 'Lead Tracking', 'Campaign Analytics'],
      aiSuggestion: 'Great for platforms with advertising or marketplace features'
    },
    {
      id: 'technician',
      name: 'Technician App',
      type: 'technician',
      description: 'Mobile-first app for field technicians with GPS tracking',
      icon: Zap,
      color: 'yellow',
      recommendedFor: ['Field Service', 'Mobile Workforce', 'GPS Tracking'],
      features: ['Dashboard', 'Time Tracking', 'Jobs', 'Messages', 'Referrals', 'Earnings', 'Assets'],
      workflows: ['GPS Clock In', 'Job Check-In', 'Work Completion', 'Photo Upload'],
      trackingSystems: ['Tech ID', 'GPS Tracking', 'Job Codes', 'Time Stamps', 'Asset Tracking'],
      aiSuggestion: 'Optimized for mobile field workers with real-time location tracking'
    },
    {
      id: 'property-manager',
      name: 'Property Manager Portal',
      type: 'property-manager',
      description: 'Portal for property managers to handle maintenance and residents',
      icon: Building2,
      color: 'pink',
      recommendedFor: ['Property Management', 'Maintenance', 'Resident Relations'],
      features: ['Dashboard', 'Maintenance', 'Vendors', 'Budget', 'Residents', 'Reports'],
      workflows: ['Maintenance Requests', 'Vendor Assignment', 'Budget Approval', 'Resident Communication'],
      trackingSystems: ['Property Code', 'Unit Numbers', 'Work Orders', 'Vendor Tracking'],
      aiSuggestion: 'Designed for residential and commercial property management'
    },
    {
      id: 'portfolio-manager',
      name: 'Portfolio Manager Portal',
      type: 'portfolio-manager',
      description: 'Executive portal for managing property portfolios and investments',
      icon: Crown,
      color: 'cyan',
      recommendedFor: ['Executive Management', 'Portfolio Analysis', 'Investment Tracking'],
      features: ['Dashboard', 'Properties', 'Performance', 'Cash Flow', 'Acquisitions', 'Reports'],
      workflows: ['Property Analysis', 'Acquisition Pipeline', 'ROI Tracking', 'Financial Reporting'],
      trackingSystems: ['Portfolio Code', 'Property IDs', 'Investment Tracking', 'Performance Metrics'],
      aiSuggestion: 'For executives managing multiple properties or investments'
    },
    {
      id: 'owners',
      name: 'Owners Portal',
      type: 'owners',
      description: 'High-level portal for business owners and executives',
      icon: Home,
      color: 'indigo',
      recommendedFor: ['Business Owners', 'Executive Dashboard', 'Financial Overview'],
      features: ['Dashboard', 'Projects', 'Properties', 'Cash Flow', 'Performance', 'Analytics', 'Reports'],
      workflows: ['Executive Reporting', 'Financial Analysis', 'Strategic Planning', 'Performance Review'],
      trackingSystems: ['Owner ID', 'Business Metrics', 'Financial KPIs', 'Project Codes'],
      aiSuggestion: 'Perfect for business owners needing high-level oversight'
    },
    {
      id: 'custom',
      name: 'Custom Portal',
      type: 'custom',
      description: 'Build a custom portal from scratch with AI assistance',
      icon: Sparkles,
      color: 'gradient',
      recommendedFor: ['Unique Requirements', 'Special Use Cases', 'Custom Solutions'],
      features: [],
      workflows: [],
      trackingSystems: [],
      aiSuggestion: 'Let AI help you design a portal tailored to your specific needs'
    }
  ];

  const allAvailableFeatures = [
    'Dashboard', 'Overview', 'Profile', 'Notifications',
    'Projects', 'Tasks', 'Jobs', 'Work Orders',
    'Quotes', 'Invoices', 'Payments', 'Earnings',
    'Calendar', 'Schedule', 'Appointments',
    'Time Tracking', 'Timesheet', 'Clock In/Out',
    'Messaging', 'Announcements', 'Support',
    'Documents', 'Photos', 'Videos', 'Gallery', 'Media',
    'Reports', 'Analytics', 'Performance',
    'Vendors', 'Promotions', 'Subscription', 'Referrals',
    'Team', 'Resources', 'Payroll', 'Assets',
    'Maintenance', 'Residents', 'Properties',
    'Cash Flow', 'Acquisitions', 'Budget',
    'Studio', 'Leads', 'Billing',
    'AI Assistant', 'Integrations', 'Custom Forms'
  ];

  const allAvailableWorkflows = [
    'Quote Approval Workflow',
    'Invoice Payment Processing',
    'Project Status Updates',
    'Work Request Management',
    'Clock In/Out Automation',
    'Task Assignment System',
    'Leave Request Processing',
    'Timesheet Approval Chain',
    'Job Assignment Distribution',
    'Invoice Submission Review',
    'Payment Processing Pipeline',
    'Schedule Coordination',
    'Promotion Approval Flow',
    'Lead Distribution System',
    'Billing Cycle Automation',
    'Content Creation Workflow',
    'GPS Check-In Verification',
    'Job Completion Validation',
    'Photo Upload Processing',
    'Maintenance Request Routing',
    'Vendor Assignment Logic',
    'Budget Approval Chain',
    'Resident Communication Flow',
    'Property Analysis Pipeline',
    'Acquisition Due Diligence',
    'ROI Calculation Automation',
    'Financial Report Generation',
    'Executive Dashboard Updates',
    'Performance Review Scheduling',
    'Strategic Planning Workflow'
  ];

  const handleAIAnalysis = () => {
    setAiAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const suggestions = [
        `Based on "${portalName}", I recommend enabling customer communication features`,
        `Your ${selectedTemplate?.type} portal would benefit from automated workflows`,
        `Consider enabling 2FA for enhanced security`,
        `Suggested prefix: ${codingSystemPrefix || 'AUTO'} for tracking codes`
      ];
      
      const recommendedFeatures = selectedTemplate?.features || [];
      
      setAiSuggestions(suggestions);
      setAiRecommendedFeatures(recommendedFeatures);
      setAiAnalyzing(false);
      
      toast.success('AI analysis complete!');
    }, 2000);
  };

  const handleApplyAISuggestions = () => {
    if (aiRecommendedFeatures.length > 0) {
      setSelectedFeatures([...new Set([...selectedFeatures, ...aiRecommendedFeatures])]);
      toast.success('AI suggestions applied!');
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedTemplate) {
      toast.error('Please select a portal template');
      return;
    }
    
    if (currentStep === 2) {
      if (!portalName.trim()) {
        toast.error('Please enter a portal name');
        return;
      }
      
      // Auto-generate coding prefix if not set
      if (!codingSystemPrefix) {
        const prefix = portalName
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 4);
        setCodingSystemPrefix(prefix);
      }
      
      // Trigger AI analysis if enabled
      if (useAI && selectedTemplate?.type !== 'custom') {
        handleAIAnalysis();
      }
    }
    
    if (currentStep === 3 && selectedFeatures.length === 0) {
      toast.error('Please select at least one feature');
      return;
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreatePortal = () => {
    const portalData = {
      id: `portal_${Date.now()}`,
      name: portalName,
      description: portalDescription,
      type: selectedTemplate?.type,
      companyName,
      status: 'draft',
      url: `/${portalName.toLowerCase().replace(/\s+/g, '-')}`,
      
      features: selectedFeatures.reduce((acc, feature) => {
        acc[feature.toLowerCase().replace(/\s+/g, '')] = true;
        return acc;
      }, {} as any),
      
      workflows: selectedWorkflows,
      
      tracking: {
        enabled: trackingEnabled,
        prefix: codingSystemPrefix,
        systems: selectedTemplate?.trackingSystems || []
      },
      
      branding: {
        primaryColor,
        secondaryColor,
        logo: logoUrl
      },
      
      access: {
        requireLogin,
        allowSignup,
        twoFactorAuth,
        ipWhitelist: [],
        allowedDomains: []
      },
      
      metadata: {
        createdAt: new Date(),
        createdBy: 'Current Admin',
        template: selectedTemplate?.id,
        aiAssisted: useAI
      }
    };
    
    onComplete(portalData);
    toast.success('Portal created successfully!');
  };

  const getTemplateColor = (color: string) => {
    const colors: any = {
      blue: 'from-blue-600 to-blue-700',
      green: 'from-green-600 to-green-700',
      orange: 'from-orange-600 to-orange-700',
      purple: 'from-purple-600 to-purple-700',
      yellow: 'from-yellow-600 to-yellow-700',
      pink: 'from-pink-600 to-pink-700',
      cyan: 'from-cyan-600 to-cyan-700',
      indigo: 'from-indigo-600 to-indigo-700',
      gradient: 'from-orange-600 via-purple-600 to-pink-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Smartphone className="w-7 h-7 text-orange-400" />
                Create New Portal
              </h2>
              <p className="text-gray-400 mt-1">Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className={`flex items-center gap-2 flex-1 p-3 rounded-xl transition ${
                    isActive 
                      ? 'bg-orange-600/20 border border-orange-500/30' 
                      : isCompleted 
                      ? 'bg-green-600/20 border border-green-500/30'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A]'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive 
                        ? 'bg-orange-600' 
                        : isCompleted 
                        ? 'bg-green-600'
                        : 'bg-[#2A2A2A]'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div className="hidden md:block">
                      <p className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-600 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Toggle */}
          <div className="mt-4 flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">AI-Assisted Portal Creation</p>
                <p className="text-xs text-gray-400">Get smart recommendations and configurations</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Portal Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Choose Your Portal Template</h3>
                <p className="text-gray-400">Select a template that best matches your needs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portalTemplates.map(template => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate?.id === template.id;
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-6 rounded-2xl border-2 transition text-left ${
                        isSelected
                          ? 'border-orange-500 bg-orange-600/10'
                          : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTemplateColor(template.color)} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <h4 className="text-lg font-bold text-white mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-400 mb-4">{template.description}</p>
                      
                      {template.aiSuggestion && useAI && (
                        <div className="flex items-start gap-2 p-3 bg-purple-600/10 rounded-lg border border-purple-500/30 mb-4">
                          <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-purple-300">{template.aiSuggestion}</p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-400">Recommended For:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.recommendedFor.map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-[#2A2A2A] rounded text-xs text-gray-300">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="mt-4 flex items-center gap-2 text-orange-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Portal Basic Information</h3>
                <p className="text-gray-400">Tell us about your new portal</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Portal Name *</label>
                  <input
                    type="text"
                    value={portalName}
                    onChange={(e) => setPortalName(e.target.value)}
                    placeholder="e.g., Premium Customer Portal"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Portal Description</label>
                  <TextArea
                    value={portalDescription}
                    onChange={setPortalDescription}
                    placeholder="Brief description of the portal's purpose..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Company/Organization Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., ABC Construction LLC"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Coding System Prefix</label>
                  <input
                    type="text"
                    value={codingSystemPrefix}
                    onChange={(e) => setCodingSystemPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g., PCP"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for generating unique tracking codes (auto-generated if left empty)</p>
                </div>
              </div>

              {useAI && aiAnalyzing && (
                <div className="flex items-center gap-3 p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                  <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-white">AI is analyzing your inputs...</p>
                    <p className="text-xs text-gray-400">Generating smart recommendations</p>
                  </div>
                </div>
              )}

              {useAI && aiSuggestions.length > 0 && (
                <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-purple-400" />
                    <p className="text-sm font-bold text-white">AI Suggestions</p>
                  </div>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Star className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-300">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Features Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Select Portal Features</h3>
                <p className="text-gray-400">Choose the features you want to enable</p>
              </div>

              {useAI && aiRecommendedFeatures.length > 0 && (
                <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <p className="text-sm font-bold text-white">AI Recommended Features</p>
                    </div>
                    <button
                      onClick={handleApplyAISuggestions}
                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition"
                    >
                      Apply All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiRecommendedFeatures.map((feature, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-xs text-purple-300">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {allAvailableFeatures.map(feature => {
                  const isSelected = selectedFeatures.includes(feature);
                  const isRecommended = aiRecommendedFeatures.includes(feature);
                  
                  return (
                    <label
                      key={feature}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-orange-500 bg-orange-600/10'
                          : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFeatures([...selectedFeatures, feature]);
                          } else {
                            setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-white">{feature}</p>
                        {isRecommended && (
                          <span className="text-xs text-purple-400">
                            <Sparkles className="w-3 h-3 inline" /> AI
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <p className="text-sm text-gray-400">
                  <span className="font-bold text-white">{selectedFeatures.length}</span> features selected
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Workflows */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Attach Workflows</h3>
                <p className="text-gray-400">Select automated workflows for your portal</p>
              </div>

              {selectedTemplate && selectedTemplate.workflows.length > 0 && (
                <div className="p-4 bg-green-600/10 rounded-xl border border-green-500/30 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-sm font-bold text-white">Recommended Workflows for {selectedTemplate.name}</p>
                  </div>
                  <div className="space-y-2">
                    {selectedTemplate.workflows.map((workflow, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <p className="text-sm text-gray-300">{workflow}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allAvailableWorkflows.map(workflow => {
                  const isSelected = selectedWorkflows.includes(workflow);
                  const isRecommended = selectedTemplate?.workflows.some(w => workflow.includes(w));
                  
                  return (
                    <label
                      key={workflow}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                        isSelected
                          ? 'border-orange-500 bg-orange-600/10'
                          : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWorkflows([...selectedWorkflows, workflow]);
                          } else {
                            setSelectedWorkflows(selectedWorkflows.filter(w => w !== workflow));
                          }
                        }}
                        className="w-4 h-4 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-white">{workflow}</p>
                        {isRecommended && (
                          <span className="text-xs text-green-400">
                            <Star className="w-3 h-3 inline" /> Recommended
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <p className="text-sm text-gray-400">
                  <span className="font-bold text-white">{selectedWorkflows.length}</span> workflows selected
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Tracking & Coding */}
          {currentStep === 5 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Tracking & Coding Systems</h3>
                <p className="text-gray-400">Configure tracking and coding for your portal</p>
              </div>

              <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                <label className="flex items-center gap-3 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackingEnabled}
                    onChange={(e) => setTrackingEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                  />
                  <div>
                    <p className="text-white font-semibold">Enable Tracking Systems</p>
                    <p className="text-xs text-gray-400">Automatically generate and track IDs, codes, and numbers</p>
                  </div>
                </label>

                {trackingEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                        <p className="text-xs text-gray-400 mb-1">Coding Prefix</p>
                        <p className="text-2xl font-bold text-white">{codingSystemPrefix || 'AUTO'}</p>
                      </div>
                      <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
                        <p className="text-xs text-gray-400 mb-1">Sample ID</p>
                        <p className="text-2xl font-bold text-orange-400">{codingSystemPrefix || 'AUTO'}-00001</p>
                      </div>
                    </div>

                    {selectedTemplate && selectedTemplate.trackingSystems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-white mb-3">Enabled Tracking Systems:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTemplate.trackingSystems.map((system, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                              <Code className="w-4 h-4 text-orange-400" />
                              <span className="text-sm text-white">{system}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white mb-1">How It Works</p>
                          <p className="text-xs text-gray-400">
                            Every item in your portal (customers, projects, invoices, etc.) will automatically get a unique ID
                            starting with your prefix. Example: {codingSystemPrefix || 'AUTO'}-00001, {codingSystemPrefix || 'AUTO'}-00002, etc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Branding */}
          {currentStep === 6 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Customize Portal Branding</h3>
                <p className="text-gray-400">Set colors and visual identity</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Primary Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-12 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Secondary Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20 h-12 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Logo URL (Optional)</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Preview */}
              <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                <p className="text-sm font-medium text-white mb-4">Preview</p>
                <div className="p-6 rounded-xl" style={{ backgroundColor: secondaryColor }}>
                  <div 
                    className="px-6 py-3 rounded-xl inline-block font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {portalName || 'Portal Button'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Security */}
          {currentStep === 7 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Security & Access Control</h3>
                <p className="text-gray-400">Configure who can access your portal</p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLogin}
                    onChange={(e) => setRequireLogin(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                  />
                  <div>
                    <p className="text-white font-semibold">Require Login</p>
                    <p className="text-xs text-gray-400">Users must authenticate to access the portal</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowSignup}
                    onChange={(e) => setAllowSignup(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                  />
                  <div>
                    <p className="text-white font-semibold">Allow Self-Registration</p>
                    <p className="text-xs text-gray-400">Let new users sign up on their own</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactorAuth}
                    onChange={(e) => setTwoFactorAuth(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-orange-500 bg-[#0A0A0A] checked:bg-orange-600"
                  />
                  <div>
                    <p className="text-white font-semibold">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-400">Require 2FA for enhanced security</p>
                  </div>
                </label>
              </div>

              {useAI && (
                <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white mb-1">AI Recommendation</p>
                      <p className="text-xs text-gray-400">
                        For {selectedTemplate?.type} portals, we recommend {
                          selectedTemplate?.type === 'employee' || selectedTemplate?.type === 'owners'
                            ? 'enabling 2FA and requiring login for maximum security'
                            : selectedTemplate?.type === 'customer'
                            ? 'requiring login but allowing self-registration for better user experience'
                            : 'requiring login to protect sensitive information'
                        }.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 8: Review & Create */}
          {currentStep === 8 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Review Your Portal</h3>
                <p className="text-gray-400">Everything looks good? Let's create your portal!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-orange-400" />
                    <h4 className="text-sm font-bold text-white">Basic Information</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-400">Portal Name</p>
                      <p className="text-white font-medium">{portalName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Type</p>
                      <p className="text-white font-medium">{selectedTemplate?.name}</p>
                    </div>
                    {companyName && (
                      <div>
                        <p className="text-gray-400">Company</p>
                        <p className="text-white font-medium">{companyName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-400">Coding Prefix</p>
                      <p className="text-white font-medium">{codingSystemPrefix || 'AUTO'}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-orange-400" />
                    <h4 className="text-sm font-bold text-white">Features ({selectedFeatures.length})</h4>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFeatures.slice(0, 10).map((feature, i) => (
                      <span key={i} className="px-2 py-1 bg-[#2A2A2A] rounded text-xs text-gray-300">
                        {feature}
                      </span>
                    ))}
                    {selectedFeatures.length > 10 && (
                      <span className="px-2 py-1 bg-orange-600/20 border border-orange-500/30 rounded text-xs text-orange-400">
                        +{selectedFeatures.length - 10} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Workflows */}
                <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-4">
                    <Workflow className="w-5 h-5 text-orange-400" />
                    <h4 className="text-sm font-bold text-white">Workflows ({selectedWorkflows.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedWorkflows.slice(0, 5).map((workflow, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check className="w-3 h-3 text-green-400" />
                        <span>{workflow}</span>
                      </div>
                    ))}
                    {selectedWorkflows.length > 5 && (
                      <p className="text-xs text-gray-400">+{selectedWorkflows.length - 5} more workflows</p>
                    )}
                  </div>
                </div>

                {/* Security */}
                <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-orange-400" />
                    <h4 className="text-sm font-bold text-white">Security</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {requireLogin ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-gray-300">Login Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {allowSignup ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-gray-300">Self-Registration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {twoFactorAuth ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-gray-300">Two-Factor Auth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {trackingEnabled ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-gray-300">Tracking Systems</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Branding Preview */}
              <div className="p-6 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-orange-400" />
                  <h4 className="text-sm font-bold text-white">Branding</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 rounded-xl" style={{ backgroundColor: secondaryColor }}>
                    <div 
                      className="px-4 py-2 rounded-lg inline-block text-sm font-bold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {portalName}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400">Primary: </span>
                      <span className="text-white font-mono">{primaryColor}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Secondary: </span>
                      <span className="text-white font-mono">{secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {useAI && (
                <div className="p-4 bg-green-600/10 rounded-xl border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-sm font-medium text-white">
                      AI-assisted portal configuration complete! Ready to create.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                Step {currentStep} of {steps.length}
              </p>
            </div>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleCreatePortal}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-green-500/20"
              >
                <Sparkles className="w-5 h-5" />
                Create Portal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
