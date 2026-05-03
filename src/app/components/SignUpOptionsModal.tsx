// Updated: 2026-04-23 - Fixed deployment issues
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Wrench, Briefcase, Store, Megaphone,
  FileText, Building2, Home, Users, ShoppingCart, TrendingUp,
  ArrowRight, Sparkles, Hammer, Camera, Clipboard, Award, Calendar
} from 'lucide-react';
import { useState } from 'react';
import CustomerSubscriptionSelectionModal from './CustomerSubscriptionSelectionModal';
import SubcontractorOnboarding from './SubcontractorOnboarding';
import UniversalSignupFlow from './UniversalSignupFlow';
import AdvertiserSubscriptionSelectionModal from './AdvertiserSubscriptionSelectionModal';
import { GenericApplicationForm } from './GenericApplicationForm';

interface SignUpOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  shadowColor: string;
  route: string;
  popular?: boolean;
}

interface SignUpOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignUpOptionsModal({ isOpen, onClose }: SignUpOptionsModalProps) {
  const [showCustomerSubscription, setShowCustomerSubscription] = useState(false);
  const [showSubcontractorOnboarding, setShowSubcontractorOnboarding] = useState(false);
  const [showUniversalSignup, setShowUniversalSignup] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<SignUpOption | null>(null);
  const [showAdvertiserSubscription, setShowAdvertiserSubscription] = useState(false);
  const [showEmploymentApplication, setShowEmploymentApplication] = useState(false);
  const [showFieldTechApplication, setShowFieldTechApplication] = useState(false);

  // Debug logging
  console.log('🔍 SignUpOptionsModal - isOpen:', isOpen, 'v4');

  const signUpOptions: SignUpOption[] = [
    {
      id: 'customer',
      title: 'Customer',
      description: 'Request services, track projects, and manage your property maintenance needs',
      icon: <User className="w-6 h-6" />,
      color: 'text-blue-400',
      gradient: 'from-blue-600 to-blue-700',
      shadowColor: 'shadow-blue-500/20',
      route: '/customer-registration',
      popular: true
    },
    {
      id: 'subcontractor',
      title: 'Subcontractor',
      description: 'Access job opportunities, submit bids, and grow your trade business',
      icon: <Wrench className="w-6 h-6" />,
      color: 'text-orange-400',
      gradient: 'from-orange-600 to-orange-700',
      shadowColor: 'shadow-orange-500/20',
      route: '/service-provider-application',
      popular: true
    },
    {
      id: 'field-tech',
      title: 'Field Tech / Maintenance Tech',
      description: 'Apply for maintenance, repair, and field service positions',
      icon: <Wrench className="w-6 h-6" />,
      color: 'text-green-400',
      gradient: 'from-green-600 to-green-700',
      shadowColor: 'shadow-green-500/20',
      route: '/field-tech-application'
    },
    {
      id: 'vendor',
      title: 'Vendor / Supplier',
      description: 'List your products, manage inventory, and connect with contractors',
      icon: <Store className="w-6 h-6" />,
      color: 'text-purple-400',
      gradient: 'from-purple-600 to-purple-700',
      shadowColor: 'shadow-purple-500/20',
      route: '/vendor-application'
    },
    {
      id: 'advertiser',
      title: 'Advertiser',
      description: 'Promote your business with targeted advertising to our contractor network',
      icon: <Megaphone className="w-6 h-6" />,
      color: 'text-pink-400',
      gradient: 'from-pink-600 to-pink-700',
      shadowColor: 'shadow-pink-500/20',
      route: '/advertiser-application'
    },
    {
      id: 'job-applicant',
      title: 'Job Applicant',
      description: 'Apply for positions in skilled trades and join our professional team',
      icon: <FileText className="w-6 h-6" />,
      color: 'text-cyan-400',
      gradient: 'from-cyan-600 to-cyan-700',
      shadowColor: 'shadow-cyan-500/20',
      route: '/service-provider-application'
    },
    {
      id: 'property-manager',
      title: 'Property Manager',
      description: 'Manage multi-unit portfolios, coordinate maintenance, and track budgets',
      icon: <Building2 className="w-6 h-6" />,
      color: 'text-teal-400',
      gradient: 'from-teal-600 to-teal-700',
      shadowColor: 'shadow-teal-500/20',
      route: '/service-provider-application'
    },
    {
      id: 'landlord',
      title: 'Landlord',
      description: 'Manage rental properties, track ROI, and coordinate emergency repairs',
      icon: <Home className="w-6 h-6" />,
      color: 'text-indigo-400',
      gradient: 'from-indigo-600 to-indigo-700',
      shadowColor: 'shadow-indigo-500/20',
      route: '/service-provider-application'
    },
    {
      id: 'condo-association',
      title: 'Condo Association',
      description: 'Manage building maintenance, budgets, and resident communications',
      icon: <Users className="w-6 h-6" />,
      color: 'text-amber-400',
      gradient: 'from-amber-600 to-amber-700',
      shadowColor: 'shadow-amber-500/20',
      route: '/service-provider-application'
    },
    {
      id: 'investor',
      title: 'Investor',
      description: 'Track property investments, monitor ROI, and manage renovation projects',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-emerald-400',
      gradient: 'from-emerald-600 to-emerald-700',
      shadowColor: 'shadow-emerald-500/20',
      route: '/investor-application'
    },
    {
      id: 'service-provider',
      title: 'Service Provider',
      description: 'Offer specialized services and connect with property owners',
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'text-rose-400',
      gradient: 'from-rose-600 to-rose-700',
      shadowColor: 'shadow-rose-500/20',
      route: '/service-provider-application'
    }
  ];

  const handleOptionClick = (route: string, optionId: string) => {
    // Special handling for job applicant - show employment application
    if (optionId === 'job-applicant') {
      setShowEmploymentApplication(true);
      return;
    }

    // Special handling for field tech - show field tech application
    if (optionId === 'field-tech') {
      setShowFieldTechApplication(true);
      return;
    }

    // Special handling for subcontractor - show subcontractor onboarding
    if (optionId === 'subcontractor') {
      setShowSubcontractorOnboarding(true);
      return;
    }

    // Route to the appropriate application/registration page for each account type
    onClose();
    window.location.href = route;
  };

  const handleCustomerClick = () => {
    onClose();
    window.location.href = '/sign-up';
  };

  const handleCustomerFreeSignup = () => {
    setShowCustomerSubscription(false);
    window.location.href = '/sign-up';
  };

  const handleCustomerPaidSignup = () => {
    setShowCustomerSubscription(false);
    window.location.href = '/sign-up';
  };

  const handleSubcontractorClick = () => {
    onClose();
    window.location.href = '/sign-up';
  };

  const handleSubcontractorSignupAction = () => {
    setShowSubcontractorOnboarding(false);
    window.location.href = '/sign-up';
  };

  const handleUniversalSignupFlowClick = (option: SignUpOption) => {
    onClose();
    setShowUniversalSignup(true);
    setSelectedAccountType(option);
  };

  const handleUniversalSignupFlowSignup = () => {
    setShowUniversalSignup(false);
    setSelectedAccountType(null);
    window.location.href = '/universal-signup-flow';
  };

  const handleAdvertiserClick = () => {
    onClose();
    window.location.href = '/sign-up';
  };

  const handleAdvertiserPlanSelection = (plan: string) => {
    setShowAdvertiserSubscription(false);
    window.location.href = '/sign-up';
  };

  return (
    <>
      {/* Employment Application Form */}
      {showEmploymentApplication && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0A0A0A]">
          <GenericApplicationForm
            config={{
              title: "Employment Application",
              description: "Join our team of skilled professionals",
              color: "#ea580c",
              apiEndpoint: "/applications/submit",
              steps: [
                {
                  title: "Personal Information",
                  description: "Tell us about yourself",
                  icon: User,
                  fields: [
                    { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Smith' },
                    { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
                    { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                    { id: 'address', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main Street' },
                    { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
                    { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
                    { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
                  ]
                },
                {
                  title: "Maintenance Skills",
                  description: "Select your maintenance skills",
                  icon: Wrench,
                  fields: [
                    {
                      id: 'maintenance_skills',
                      label: 'Maintenance Skills',
                      type: 'skill',
                      required: false,
                      skills: [
                        { id: 'roofing_maintenance', label: 'Roofing Maintenance', description: 'Inspect and repair roof leaks' },
                        { id: 'plumbing_repairs', label: 'Plumbing Repairs', description: 'Fix leaks, unclog drains' },
                        { id: 'electrical_maintenance', label: 'Electrical Maintenance', description: 'Replace fixtures, repair wiring' },
                        { id: 'hvac_maintenance', label: 'HVAC Maintenance', description: 'Service heating and cooling systems' },
                        { id: 'groundskeeping', label: 'Groundskeeping', description: 'Lawn care, snow removal' },
                        { id: 'painting_walls', label: 'Painting', description: 'Paint and wall repairs' },
                      ]
                    }
                  ]
                },
                {
                  title: "Carpentry Skills",
                  description: "Select your carpentry skills",
                  icon: Hammer,
                  fields: [
                    {
                      id: 'carpentry_skills',
                      label: 'Carpentry Skills',
                      type: 'skill',
                      required: false,
                      skills: [
                        { id: 'framing', label: 'Framing', description: 'Build structural frames' },
                        { id: 'roofing', label: 'Roofing', description: 'Install roof structures' },
                        { id: 'door_window', label: 'Doors & Windows', description: 'Install doors and windows' },
                        { id: 'cabinetry', label: 'Cabinetry', description: 'Build and install cabinets' },
                        { id: 'finish_carpentry', label: 'Finish Carpentry', description: 'Install trim and moldings' },
                      ]
                    }
                  ]
                },
                {
                  title: "Work Portfolio",
                  description: "Showcase your work",
                  icon: Camera,
                  fields: [
                    { id: 'portfolio_photos', label: 'Upload Photos of Your Work', type: 'file', accept: 'image/*', multiple: true, dragDrop: true },
                    { id: 'years_experience', label: 'Years of Experience', type: 'number', required: true, placeholder: '5' },
                    { id: 'best_project', label: 'Proudest Project', type: 'textarea', required: true, placeholder: 'Describe your best project', rows: 5 },
                  ]
                },
                {
                  title: "Availability",
                  description: "Your schedule and references",
                  icon: Clipboard,
                  fields: [
                    { id: 'availability', label: 'Availability', type: 'select', required: true, options: ['', 'Full-time', 'Part-time', 'Weekends Only', 'Flexible'] },
                    { id: 'start_date', label: 'Earliest Start Date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
                    { id: 'transportation', label: 'Reliable Transportation', type: 'select', required: true, options: ['', 'Yes - Own Vehicle', 'Yes - Public Transit', 'Need Assistance'] },
                    { id: 'reference_1_name', label: 'Reference 1 - Name', type: 'text', required: true },
                    { id: 'reference_1_phone', label: 'Reference 1 - Phone', type: 'tel', required: true },
                    { id: 'why_join', label: 'Why join our team?', type: 'textarea', required: true, rows: 5 },
                  ]
                }
              ]
            }}
            onNavigate={() => {
              setShowEmploymentApplication(false);
              onClose();
            }}
          />
          {/* Close button overlay */}
          <button
            onClick={() => setShowEmploymentApplication(false)}
            className="fixed top-6 right-6 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Field Tech Application Form */}
      {showFieldTechApplication && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0A0A0A]">
          <GenericApplicationForm
            config={{
              title: "Field Tech / Maintenance Tech Application",
              description: "Join our maintenance and field service team",
              color: "#16a34a",
              apiEndpoint: "/applications/submit",
              steps: [
                {
                  title: "Personal Information",
                  description: "Tell us about yourself",
                  icon: User,
                  fields: [
                    { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Smith' },
                    { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
                    { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(617) 555-0123' },
                    { id: 'address', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main Street' },
                    { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Boston' },
                    { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'MA' },
                    { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '02108' },
                  ]
                },
                {
                  title: "Technical Skills",
                  description: "Select your technical expertise",
                  icon: Wrench,
                  fields: [
                    {
                      id: 'technical_skills',
                      label: 'Technical Skills',
                      type: 'skill',
                      required: true,
                      skills: [
                        { id: 'hvac', label: 'HVAC Systems', description: 'Heating, ventilation, air conditioning' },
                        { id: 'plumbing', label: 'Plumbing', description: 'Pipes, fixtures, water systems' },
                        { id: 'electrical', label: 'Electrical', description: 'Wiring, fixtures, circuits' },
                        { id: 'carpentry', label: 'Carpentry', description: 'Woodwork, framing, repairs' },
                        { id: 'appliance_repair', label: 'Appliance Repair', description: 'Washers, dryers, refrigerators' },
                        { id: 'painting', label: 'Painting & Drywall', description: 'Interior/exterior painting' },
                        { id: 'flooring', label: 'Flooring', description: 'Tile, carpet, hardwood' },
                        { id: 'landscaping', label: 'Landscaping', description: 'Lawn care, snow removal' },
                      ]
                    }
                  ]
                },
                {
                  title: "Experience & Certifications",
                  description: "Your qualifications",
                  icon: Award,
                  fields: [
                    { id: 'years_experience', label: 'Years of Experience', type: 'number', required: true, placeholder: '5' },
                    { id: 'certifications', label: 'Certifications (if any)', type: 'textarea', placeholder: 'EPA 608, OSHA 10, etc.', rows: 3 },
                    { id: 'tools', label: 'Do you have your own tools?', type: 'select', required: true, options: ['', 'Yes - Full Set', 'Yes - Partial Set', 'No'] },
                    { id: 'vehicle', label: 'Reliable Transportation', type: 'select', required: true, options: ['', 'Yes - Own Vehicle', 'Yes - Public Transit', 'Need Assistance'] },
                  ]
                },
                {
                  title: "Availability",
                  description: "Your schedule and preferences",
                  icon: Calendar,
                  fields: [
                    { id: 'availability', label: 'Employment Type', type: 'select', required: true, options: ['', 'Full-time', 'Part-time', 'On-Call', 'Seasonal'] },
                    { id: 'shift_preference', label: 'Shift Preference', type: 'select', required: true, options: ['', 'Day Shift', 'Evening Shift', 'Night Shift', 'Flexible'] },
                    { id: 'start_date', label: 'Earliest Start Date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
                    { id: 'emergency_calls', label: 'Available for Emergency Calls?', type: 'select', required: true, options: ['', 'Yes', 'No', 'Sometimes'] },
                  ]
                },
                {
                  title: "References",
                  description: "Professional references",
                  icon: Briefcase,
                  fields: [
                    { id: 'reference_1_name', label: 'Reference 1 - Name', type: 'text', required: true },
                    { id: 'reference_1_company', label: 'Reference 1 - Company', type: 'text', required: true },
                    { id: 'reference_1_phone', label: 'Reference 1 - Phone', type: 'tel', required: true },
                    { id: 'reference_2_name', label: 'Reference 2 - Name', type: 'text', required: false },
                    { id: 'reference_2_company', label: 'Reference 2 - Company', type: 'text', required: false },
                    { id: 'reference_2_phone', label: 'Reference 2 - Phone', type: 'tel', required: false },
                    { id: 'why_join', label: 'Why do you want to join our team?', type: 'textarea', required: true, rows: 5 },
                  ]
                }
              ]
            }}
            onNavigate={() => {
              setShowFieldTechApplication(false);
              onClose();
            }}
          />
          {/* Close button overlay */}
          <button
            onClick={() => setShowFieldTechApplication(false)}
            className="fixed top-6 right-6 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Customer Subscription Selection Modal */}
      <CustomerSubscriptionSelectionModal
        isOpen={showCustomerSubscription}
        onClose={() => setShowCustomerSubscription(false)}
        onSelectFree={handleCustomerFreeSignup}
        onSelectPaid={handleCustomerPaidSignup}
      />

      {/* Subcontractor Onboarding Modal */}
      <SubcontractorOnboarding
        isOpen={showSubcontractorOnboarding}
        onClose={() => setShowSubcontractorOnboarding(false)}
        onSignup={handleSubcontractorSignupAction}
      />

      {/* Universal Signup Flow Modal */}
      {selectedAccountType && (
        <UniversalSignupFlow
          isOpen={showUniversalSignup}
          onClose={() => {
            setShowUniversalSignup(false);
            setSelectedAccountType(null);
          }}
          accountType={selectedAccountType.id}
          accountTitle={selectedAccountType.title}
          icon={selectedAccountType.icon}
          onSuccess={() => {
            setShowUniversalSignup(false);
            setSelectedAccountType(null);
            window.location.href = selectedAccountType.route;
          }}
        />
      )}

      {/* Advertiser Subscription Selection Modal */}
      <AdvertiserSubscriptionSelectionModal
        isOpen={showAdvertiserSubscription}
        onClose={() => setShowAdvertiserSubscription(false)}
        onSelectPlan={handleAdvertiserPlanSelection}
      />

      {/* Main Sign Up Options Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative z-[10000]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-b border-orange-500/30 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-orange-400" />
                      Monthly Subscriptions & Maintenance Plans
                    </h2>
                    <p className="text-orange-200">Select the account type that best fits your needs</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Options Grid */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {signUpOptions.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleOptionClick(option.route, option.id)}
                      className="relative group bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl p-6 text-left transition-all overflow-hidden"
                    >
                      {/* Popular Badge */}
                      {option.popular && (
                        <div className="absolute top-4 right-4">
                          <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs font-bold rounded-full border border-orange-500/30">
                            POPULAR
                          </span>
                        </div>
                      )}

                      {/* Gradient Background on Hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

                      {/* Icon */}
                      <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} ${option.shadowColor} shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <div className="text-white">
                          {option.icon}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative">
                        <h3 className={`text-xl font-bold ${option.color} mb-2 flex items-center gap-2`}>
                          {option.title}
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {option.description}
                        </p>
                      </div>

                      {/* Hover Border Glow */}
                      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
                        <div className={`absolute inset-0 rounded-xl shadow-lg ${option.shadowColor}`} />
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Help Text */}
                <div className="mt-8 p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Need help choosing?</h4>
                      <p className="text-sm text-gray-400 leading-relaxed mb-3">
                        Not sure which account type is right for you? Here's a quick guide:
                      </p>
                      <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span><strong className="text-white">Customers</strong> - Homeowners or businesses requesting services</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span><strong className="text-white">Subcontractors</strong> - Licensed trade professionals offering services</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span><strong className="text-white">Vendors</strong> - Material suppliers and product distributors</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span><strong className="text-white">Property Managers</strong> - Managing multiple properties or units</span>
                        </li>
                      </ul>
                      <button className="mt-4 text-sm text-orange-400 hover:text-orange-300 font-medium transition">
                        Contact support for assistance →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-400">
                    Already have an account?{' '}
                    <button 
                      onClick={onClose}
                      className="text-orange-400 hover:text-orange-300 font-medium transition"
                    >
                      Sign in instead
                    </button>
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] text-white rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}