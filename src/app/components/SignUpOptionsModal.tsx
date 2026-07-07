// Updated: 2026-04-23 - Fixed deployment issues
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Wrench, Briefcase, Store, Megaphone,
  FileText, Building2, Home, Users, ShoppingCart, TrendingUp,
  ArrowRight, Sparkles, Hammer, Camera, Clipboard, Award, Calendar, DollarSign, Key, Shield
} from 'lucide-react';
import { useState } from 'react';
import CustomerSubscriptionSelectionModal from './CustomerSubscriptionSelectionModal';
import SubcontractorOnboarding from './SubcontractorOnboarding';
import UniversalSignupFlow from './UniversalSignupFlow';
import AdvertiserSubscriptionSelectionModal from './AdvertiserSubscriptionSelectionModal';
import { GenericApplicationForm } from './GenericApplicationForm';
import { trackSignUp, SignUpType } from '../utils/signUpTracker';

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
  const [showPropertyManagerApplication, setShowPropertyManagerApplication] = useState(false);
  const [showLandlordApplication, setShowLandlordApplication] = useState(false);
  const [showCondoAssociationApplication, setShowCondoAssociationApplication] = useState(false);
  const [showEmployeeApplication, setShowEmployeeApplication] = useState(false);

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
      id: 'employee',
      title: 'Employee Portal',
      description: 'Access for admins, project managers, office staff, and internal team members',
      icon: <Shield className="w-6 h-6" />,
      color: 'text-cyan-400',
      gradient: 'from-cyan-600 to-cyan-700',
      shadowColor: 'shadow-cyan-500/20',
      route: '/employee-registration'
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
    // Track sign-up initiation for main categories
    if (optionId === 'customer' || optionId === 'subcontractor' || optionId === 'advertiser' || optionId === 'vendor') {
      trackSignUp(optionId as SignUpType);
    }

    // Special handling for employee portal - show employee application
    if (optionId === 'employee') {
      setShowEmployeeApplication(true);
      return;
    }

    // Special handling for field tech - show field tech application
    if (optionId === 'field-tech') {
      setShowFieldTechApplication(true);
      return;
    }

    // Special handling for property manager
    if (optionId === 'property-manager') {
      setShowPropertyManagerApplication(true);
      return;
    }

    // Special handling for landlord
    if (optionId === 'landlord') {
      setShowLandlordApplication(true);
      return;
    }

    // Special handling for condo association
    if (optionId === 'condo-association') {
      setShowCondoAssociationApplication(true);
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
      {/* Employee Portal Application Form */}
      {showEmployeeApplication && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0A0A0A]">
          <GenericApplicationForm
            config={{
              title: "Employee Portal Application",
              description: "Join our internal team - for admins, project managers, and office staff",
              color: "#06b6d4",
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
                  title: "Position & Department",
                  description: "Which role are you applying for?",
                  icon: Briefcase,
                  fields: [
                    {
                      id: 'desired_role',
                      label: 'Desired Position',
                      type: 'select',
                      required: true,
                      options: [
                        '',
                        'Office Manager',
                        'Project Manager',
                        'Assistant Project Manager',
                        'Operations Manager',
                        'Administrative Assistant',
                        'Estimator',
                        'Sales Manager',
                        'Customer Service Representative',
                        'Accounts Payable/Receivable',
                        'HR Coordinator',
                        'Other'
                      ]
                    },
                    { id: 'other_role', label: 'If Other, please specify', type: 'text', placeholder: 'Specify role' },
                    {
                      id: 'preferred_department',
                      label: 'Preferred Department',
                      type: 'select',
                      required: true,
                      options: ['', 'Operations', 'Administration', 'Finance', 'Sales & Marketing', 'HR', 'Project Management', 'Customer Service']
                    },
                  ]
                },
                {
                  title: "Experience & Skills",
                  description: "Your professional background",
                  icon: Award,
                  fields: [
                    { id: 'years_experience', label: 'Years of Relevant Experience', type: 'number', required: true, placeholder: '5' },
                    { id: 'previous_employer', label: 'Most Recent Employer', type: 'text', required: true, placeholder: 'ABC Company' },
                    { id: 'previous_role', label: 'Most Recent Role', type: 'text', required: true, placeholder: 'Project Coordinator' },
                    {
                      id: 'skills',
                      label: 'Core Skills',
                      type: 'skill',
                      required: true,
                      skills: [
                        { id: 'project_management', label: 'Project Management', description: 'Planning and coordinating projects' },
                        { id: 'customer_service', label: 'Customer Service', description: 'Client communication and support' },
                        { id: 'budgeting', label: 'Budgeting & Finance', description: 'Financial planning and analysis' },
                        { id: 'software', label: 'Software Proficiency', description: 'Microsoft Office, CRM systems, etc.' },
                        { id: 'scheduling', label: 'Scheduling & Coordination', description: 'Managing calendars and resources' },
                        { id: 'team_leadership', label: 'Team Leadership', description: 'Managing and motivating teams' },
                      ]
                    },
                    { id: 'certifications', label: 'Certifications (if any)', type: 'textarea', placeholder: 'PMP, Six Sigma, etc.', rows: 3 },
                  ]
                },
                {
                  title: "Availability & Preferences",
                  description: "Your schedule and work preferences",
                  icon: Calendar,
                  fields: [
                    {
                      id: 'employment_type',
                      label: 'Employment Type',
                      type: 'select',
                      required: true,
                      options: ['', 'Full-time', 'Part-time', 'Contract']
                    },
                    { id: 'start_date', label: 'Earliest Start Date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
                    { id: 'salary_expectation', label: 'Salary Expectation (Annual)', type: 'text', required: true, placeholder: '$60,000 - $70,000' },
                    {
                      id: 'work_location',
                      label: 'Work Location Preference',
                      type: 'select',
                      required: true,
                      options: ['', 'Office-based', 'Remote', 'Hybrid']
                    },
                  ]
                },
                {
                  title: "References",
                  description: "Professional references",
                  icon: Users,
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
              setShowEmployeeApplication(false);
              onClose();
            }}
          />
          {/* Close button overlay */}
          <button
            onClick={() => setShowEmployeeApplication(false)}
            className="fixed top-6 right-6 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

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

      {/* Property Manager Application Form */}
      {showPropertyManagerApplication && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0A0A0A]">
          <GenericApplicationForm
            config={{
              title: "Property Manager Application",
              description: "Professional property management account setup",
              color: "#14b8a6",
              endpoint: "/applications",
              steps: [
                {
                  title: "Company Information",
                  description: "Tell us about your property management company",
                  icon: Building2,
                  fields: [
                    { id: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'ABC Property Management' },
                    { id: 'contact_name', label: 'Primary Contact Name', type: 'text', required: true, placeholder: 'John Smith' },
                    { id: 'email', label: 'Business Email', type: 'email', required: true, placeholder: 'john@abcproperties.com' },
                    { id: 'phone', label: 'Business Phone', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                    { id: 'address', label: 'Business Address', type: 'text', required: true, placeholder: '123 Main Street' },
                    { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
                    { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
                    { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
                  ]
                },
                {
                  title: "Portfolio Details",
                  description: "Information about your property portfolio",
                  icon: Home,
                  fields: [
                    { id: 'num_properties', label: 'Number of Properties Managed', type: 'number', required: true, placeholder: '25' },
                    { id: 'num_units', label: 'Total Number of Units', type: 'number', required: true, placeholder: '150' },
                    { id: 'property_types', label: 'Property Types', type: 'textarea', required: true, placeholder: 'Multi-family residential, commercial, mixed-use, etc.', rows: 3 },
                    { id: 'service_area', label: 'Service Area', type: 'text', required: true, placeholder: 'Southern NH, Greater Boston' },
                  ]
                },
                {
                  title: "Service Needs",
                  description: "What services do you need?",
                  icon: Wrench,
                  fields: [
                    {
                      id: 'service_needs',
                      label: 'Services Needed',
                      type: 'skill',
                      required: true,
                      skills: [
                        { id: 'emergency_repairs', label: 'Emergency Repairs', description: '24/7 emergency maintenance' },
                        { id: 'preventive_maintenance', label: 'Preventive Maintenance', description: 'Scheduled maintenance programs' },
                        { id: 'unit_turnover', label: 'Unit Turnover', description: 'Cleaning and repairs between tenants' },
                        { id: 'hvac_service', label: 'HVAC Service', description: 'Heating and cooling maintenance' },
                        { id: 'plumbing_electrical', label: 'Plumbing & Electrical', description: 'Licensed trade services' },
                        { id: 'landscaping_snow', label: 'Landscaping & Snow Removal', description: 'Grounds maintenance' },
                        { id: 'vendor_coordination', label: 'Vendor Coordination', description: 'Multi-vendor project management' },
                      ]
                    }
                  ]
                },
                {
                  title: "Budget & Volume",
                  description: "Help us understand your service requirements",
                  icon: DollarSign,
                  fields: [
                    { id: 'monthly_budget', label: 'Estimated Monthly Maintenance Budget', type: 'text', required: true, placeholder: '$10,000 - $25,000' },
                    { id: 'service_frequency', label: 'How often do you need services?', type: 'select', required: true, options: ['', 'Daily', 'Multiple times per week', 'Weekly', 'As needed'] },
                    { id: 'priority_response', label: 'Priority Response Time Needed?', type: 'select', required: true, options: ['', 'Yes - 24/7 emergency', 'Yes - Same day', 'Next business day', 'Standard scheduling'] },
                  ]
                }
              ]
            }}
            onNavigate={() => {
              setShowPropertyManagerApplication(false);
              onClose();
            }}
          />
          <button
            onClick={() => setShowPropertyManagerApplication(false)}
            className="fixed top-6 right-6 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Landlord Application Form */}
      {showLandlordApplication && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0A0A0A]">
          <GenericApplicationForm
            config={{
              title: "Landlord Account Application",
              description: "Setup your landlord portal account",
              color: "#6366f1",
              endpoint: "/applications",
              steps: [
                {
                  title: "Personal Information",
                  description: "Tell us about yourself",
                  icon: User,
                  fields: [
                    { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Smith' },
                    { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
                    { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                    { id: 'address', label: 'Mailing Address', type: 'text', required: true, placeholder: '123 Main Street' },
                    { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
                    { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
                    { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
                  ]
                },
                {
                  title: "Property Portfolio",
                  description: "Information about your rental properties",
                  icon: Home,
                  fields: [
                    { id: 'num_properties', label: 'Number of Properties You Own', type: 'number', required: true, placeholder: '3' },
                    { id: 'num_units', label: 'Total Number of Rental Units', type: 'number', required: true, placeholder: '8' },
                    { id: 'property_locations', label: 'Property Locations', type: 'textarea', required: true, placeholder: 'List cities/towns where your properties are located', rows: 3 },
                    { id: 'property_types', label: 'Property Types', type: 'select', required: true, options: ['', 'Single-family homes', 'Multi-family (2-4 units)', 'Small apartment buildings (5-10 units)', 'Mixed residential', 'Other'] },
                  ]
                },
                {
                  title: "Service Needs",
                  description: "What maintenance services do you need?",
                  icon: Wrench,
                  fields: [
                    {
                      id: 'service_needs',
                      label: 'Services Needed',
                      type: 'skill',
                      required: true,
                      skills: [
                        { id: 'tenant_turnover', label: 'Tenant Turnover Services', description: 'Cleaning, painting, repairs between tenants' },
                        { id: 'emergency_repairs', label: 'Emergency Repairs', description: 'After-hours emergency services' },
                        { id: 'routine_maintenance', label: 'Routine Maintenance', description: 'Regular property upkeep' },
                        { id: 'seasonal_services', label: 'Seasonal Services', description: 'Snow removal, lawn care' },
                        { id: 'hvac_plumbing', label: 'HVAC & Plumbing', description: 'Licensed mechanical services' },
                        { id: 'appliance_repair', label: 'Appliance Repair', description: 'Washer, dryer, refrigerator repairs' },
                      ]
                    }
                  ]
                },
                {
                  title: "Portal Features",
                  description: "Which portal features interest you?",
                  icon: Briefcase,
                  fields: [
                    {
                      id: 'portal_features',
                      label: 'Features of Interest',
                      type: 'skill',
                      required: false,
                      skills: [
                        { id: 'portfolio_tracker', label: 'Portfolio Tracker', description: 'Track property values and ROI' },
                        { id: 'budget_manager', label: 'Budget Manager', description: 'Expense tracking and budgeting' },
                        { id: 'social_media', label: 'Social Media Tools', description: 'Auto-generate listing posts' },
                        { id: 'maintenance_scheduling', label: 'Maintenance Scheduling', description: 'Schedule and track repairs' },
                        { id: 'tenant_communication', label: 'Tenant Communication', description: 'Message tenants through portal' },
                      ]
                    },
                    { id: 'additional_needs', label: 'Any other specific needs?', type: 'textarea', placeholder: 'Tell us about any other features or services you need', rows: 3 },
                  ]
                }
              ]
            }}
            onNavigate={() => {
              setShowLandlordApplication(false);
              onClose();
            }}
          />
          <button
            onClick={() => setShowLandlordApplication(false)}
            className="fixed top-6 right-6 z-[10001] p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Condo Association Application Form */}
      {showCondoAssociationApplication && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0A0A0A]">
          <GenericApplicationForm
            config={{
              title: "Condo Association / HOA Application",
              description: "Setup your association account with role-based access",
              color: "#f59e0b",
              endpoint: "/applications",
              steps: [
                {
                  title: "Association Information",
                  description: "Tell us about your condo association",
                  icon: Building2,
                  fields: [
                    { id: 'association_name', label: 'Association Name', type: 'text', required: true, placeholder: 'Maple Ridge Condo Association' },
                    { id: 'property_address', label: 'Property Address', type: 'text', required: true, placeholder: '123 Maple Ridge Drive' },
                    { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
                    { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
                    { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
                    { id: 'num_units', label: 'Number of Units', type: 'number', required: true, placeholder: '48' },
                    { id: 'num_buildings', label: 'Number of Buildings', type: 'number', required: true, placeholder: '3' },
                  ]
                },
                {
                  title: "Your Role & Contact Info",
                  description: "Tell us about yourself",
                  icon: User,
                  fields: [
                    { id: 'your_name', label: 'Your Full Name', type: 'text', required: true, placeholder: 'John Smith' },
                    { id: 'your_role', label: 'Your Role', type: 'select', required: true, options: ['', 'Board President', 'Board Vice President', 'Board Treasurer', 'Board Secretary', 'Board Member', 'Property Manager', 'Resident'] },
                    { id: 'your_email', label: 'Your Email', type: 'email', required: true, placeholder: 'john@example.com' },
                    { id: 'your_phone', label: 'Your Phone', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                  ]
                },
                {
                  title: "Property Management",
                  description: "Do you have a property manager?",
                  icon: Briefcase,
                  fields: [
                    { id: 'has_property_manager', label: 'Does your association use a property manager?', type: 'select', required: true, options: ['', 'Yes - We have a property manager', 'No - Board self-managed', 'Looking to hire one'] },
                    { id: 'pm_company_name', label: 'Property Management Company Name (if applicable)', type: 'text', placeholder: 'ABC Property Management' },
                    { id: 'pm_contact_name', label: 'Property Manager Contact Name (if applicable)', type: 'text', placeholder: 'Jane Doe' },
                    { id: 'pm_email', label: 'Property Manager Email (if applicable)', type: 'email', placeholder: 'jane@abcpm.com' },
                    { id: 'pm_phone', label: 'Property Manager Phone (if applicable)', type: 'tel', placeholder: '(603) 555-0199' },
                  ]
                },
                {
                  title: "Additional Board Members",
                  description: "Add other board members to the account (optional)",
                  icon: Users,
                  fields: [
                    { id: 'board_member_2_name', label: 'Board Member 2 - Name', type: 'text', placeholder: 'Optional' },
                    { id: 'board_member_2_role', label: 'Board Member 2 - Role', type: 'select', options: ['', 'Board President', 'Board Vice President', 'Board Treasurer', 'Board Secretary', 'Board Member'] },
                    { id: 'board_member_2_email', label: 'Board Member 2 - Email', type: 'email', placeholder: 'Optional' },
                    { id: 'board_member_3_name', label: 'Board Member 3 - Name', type: 'text', placeholder: 'Optional' },
                    { id: 'board_member_3_role', label: 'Board Member 3 - Role', type: 'select', options: ['', 'Board President', 'Board Vice President', 'Board Treasurer', 'Board Secretary', 'Board Member'] },
                    { id: 'board_member_3_email', label: 'Board Member 3 - Email', type: 'email', placeholder: 'Optional' },
                  ]
                },
                {
                  title: "Building Details",
                  description: "Information about your property",
                  icon: Home,
                  fields: [
                    { id: 'building_age', label: 'Building Age (Years)', type: 'number', required: true, placeholder: '25' },
                    { id: 'common_areas', label: 'Common Areas & Amenities', type: 'textarea', required: true, placeholder: 'Lobby, fitness center, pool, parking garage, etc.', rows: 3 },
                    { id: 'annual_budget', label: 'Annual Maintenance Budget', type: 'text', required: true, placeholder: '$50,000 - $100,000' },
                  ]
                },
                {
                  title: "Service Needs",
                  description: "What maintenance services do you need?",
                  icon: Wrench,
                  fields: [
                    {
                      id: 'service_needs',
                      label: 'Services Needed',
                      type: 'skill',
                      required: true,
                      skills: [
                        { id: 'common_area_maintenance', label: 'Common Area Maintenance', description: 'Lobbies, hallways, amenities' },
                        { id: 'hvac_systems', label: 'HVAC Systems', description: 'Central heating/cooling maintenance' },
                        { id: 'plumbing_electrical', label: 'Plumbing & Electrical', description: 'Building system repairs' },
                        { id: 'exterior_maintenance', label: 'Exterior Maintenance', description: 'Roofing, siding, grounds' },
                        { id: 'landscaping_snow', label: 'Landscaping & Snow Removal', description: 'Grounds and parking lot maintenance' },
                        { id: 'elevator_service', label: 'Elevator Service', description: 'Elevator maintenance and repairs' },
                        { id: 'emergency_services', label: 'Emergency Services', description: '24/7 emergency repairs' },
                      ]
                    }
                  ]
                },
                {
                  title: "Account Permissions",
                  description: "Define who can do what in your account",
                  icon: Key,
                  fields: [
                    {
                      id: 'permission_notes',
                      label: 'Permission Structure',
                      type: 'info',
                      infoText: 'Property Managers will have full access to: Work Request Management, Budget Tracking, Vendor Coordination, and Maintenance Scheduling.\n\nBoard Members will have: Approval Rights, Budget Oversight, Reporting Access, and Vendor Review.\n\nResidents (if enabled) can: Submit Work Requests and View Status Updates.'
                    },
                    { id: 'allow_resident_requests', label: 'Allow residents to submit work requests?', type: 'select', required: true, options: ['', 'Yes - All residents', 'Yes - Unit owners only', 'No - Board/PM only'] },
                    { id: 'approval_threshold', label: 'Require board approval for expenses over:', type: 'select', required: true, options: ['', '$500', '$1,000', '$2,500', '$5,000', '$10,000', 'All expenses'] },
                  ]
                }
              ]
            }}
            onNavigate={() => {
              setShowCondoAssociationApplication(false);
              onClose();
            }}
          />
          <button
            onClick={() => setShowCondoAssociationApplication(false)}
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