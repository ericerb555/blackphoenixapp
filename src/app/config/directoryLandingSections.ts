/**
 * Directory Landing Page Sections Configuration
 *
 * SINGLE SOURCE OF TRUTH for all business sections on the directory landing page
 * This configuration is linked to the cohort system and subscription plans
 *
 * When you update this file, the DirectoryLandingPage will automatically reflect changes
 */

import { Building2, Wrench, ShoppingCart, Trash2, Users, Megaphone, Building, TrendingUp, PhoneCall, Map, Briefcase, Gift } from 'lucide-react';

export interface DirectorySection {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  gradient: string;
  glowColor: string;
  image: string;
  navigate: string;
  portalRoute?: string;
  benefits: string[];
  cohortType: string;
  showQuoteButton?: boolean;
  subscriptionPlans?: Array<{
    name: string;
    hours: string;
    price: string;
    cohortId: string;
  }>;
}

export const DIRECTORY_SECTIONS: DirectorySection[] = [
  {
    id: 1,
    title: 'Black Phoenix Builds',
    subtitle: 'Construction & Renovation',
    description: 'Full-scale construction, ground-up builds, complete home renovations, additions, and commercial construction projects. Subscribe for monthly build hours.',
    icon: Building2,
    gradient: 'from-orange-600 to-red-600',
    glowColor: 'orange',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
    navigate: 'builds-landing-page',
    portalRoute: 'customer-portal',
    benefits: ['Ground-Up Construction', 'Complete Renovations', 'Subscription Build Hours', 'Future Product Access'],
    cohortType: 'construction',
    showQuoteButton: true,
    subscriptionPlans: [
      { name: 'Basic', hours: '10 hrs/mo', price: '$999', cohortId: 'construction-basic' },
      { name: 'Pro', hours: '25 hrs/mo', price: '$2,199', cohortId: 'construction-pro' },
      { name: 'Enterprise', hours: '50 hrs/mo', price: '$3,999', cohortId: 'construction-enterprise' }
    ]
  },
  {
    id: 2,
    title: 'Black Phoenix Handyman',
    subtitle: 'Service & Repairs',
    description: 'Professional handyman services, maintenance plans, emergency repairs, and subscription-based home care for all your property needs.',
    icon: Wrench,
    gradient: 'from-blue-600 to-cyan-600',
    glowColor: 'blue',
    image: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&q=80',
    navigate: 'handyman-landing-page',
    portalRoute: 'customer-portal',
    benefits: ['24/7 Emergency Service', 'Monthly Maintenance', 'Priority Scheduling', 'Licensed Technicians'],
    cohortType: 'handyman',
    showQuoteButton: true,
    subscriptionPlans: [
      { name: 'Basic', hours: '4 hrs/mo', price: '$149', cohortId: 'customer-basic' },
      { name: 'Standard', hours: '8 hrs/mo', price: '$299', cohortId: 'customer-standard' },
      { name: 'Premium', hours: '8+ hrs/mo', price: '$439', cohortId: 'customer-premium' }
    ]
  },
  {
    id: 3,
    title: 'Black Phoenix Marketplace',
    subtitle: 'eCommerce & Products',
    description: 'Online marketplace for construction materials, tools, equipment, and home improvement products from trusted vendors.',
    icon: ShoppingCart,
    gradient: 'from-green-600 to-emerald-600',
    glowColor: 'green',
    image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&q=80',
    navigate: 'public-store',
    portalRoute: 'vendor-portal',
    benefits: ['Bulk Discounts', 'Same-Day Delivery', 'Quality Guarantee', 'Contractor Pricing'],
    cohortType: 'ecommerce'
  },
  {
    id: 4,
    title: 'Black Phoenix Trash Removal',
    subtitle: 'Demo & Removal',
    description: 'Professional demolition services and comprehensive trash removal for residential, commercial, and construction waste management. Subscribe and save 15% on all quotes!',
    icon: Trash2,
    gradient: 'from-red-600 to-pink-600',
    glowColor: 'red',
    image: 'https://images.unsplash.com/photo-1707960190213-1ee0c16e054a?w=800&q=80',
    navigate: 'demo-landing-page',
    portalRoute: 'customer-portal',
    benefits: ['Safe Demolition', 'Debris Removal', '15% Subscriber Discount', 'Same-Day Service'],
    cohortType: 'demolition',
    showQuoteButton: true,
    subscriptionPlans: [
      { name: 'Basic', hours: '4 trips/mo', price: '$199', cohortId: 'demolition-basic' },
      { name: 'Standard', hours: '8 trips/mo', price: '$379', cohortId: 'demolition-standard' },
      { name: 'Premium', hours: '12 trips/mo', price: '$539', cohortId: 'demolition-premium' }
    ]
  },
  {
    id: 5,
    title: 'Contractor Network',
    subtitle: 'Vendors & Subcontractors',
    description: 'Join our network of professional vendors and subcontractors. Access projects, manage bids, and grow your business with our platform.',
    icon: Users,
    gradient: 'from-purple-600 to-indigo-600',
    glowColor: 'purple',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
    navigate: 'contractor-network-landing-page',
    portalRoute: 'subcontractor-portal',
    benefits: ['Phoenix Exchange & Lead Marketplace', 'Change Order Camera', 'Integrated Payments', 'Professional Network'],
    cohortType: 'contractor'
  },
  {
    id: 6,
    title: 'Brand Partners',
    subtitle: 'Advertising & Marketing',
    description: 'Advertise your products and services to our growing network of contractors, property managers, and homeowners.',
    icon: Megaphone,
    gradient: 'from-yellow-600 to-orange-600',
    glowColor: 'yellow',
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
    navigate: 'brand-partners',
    portalRoute: 'advertiser-portal',
    benefits: ['Ad Studio AI Creative', 'Marketing Command Center', 'Retargeting & Social Hub', 'Performance Tracking'],
    cohortType: 'advertiser'
  },
  {
    id: 7,
    title: 'Property Management',
    subtitle: 'Portfolio Services',
    description: 'Comprehensive property management solutions for landlords, property managers, and real estate investors with multiple properties.',
    icon: Building,
    gradient: 'from-indigo-600 to-blue-600',
    glowColor: 'indigo',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    navigate: 'property-management-landing-page',
    portalRoute: 'property-manager-portal',
    benefits: ['Multi-Property Dashboard', 'Tenant Portal', 'Maintenance Tracking', 'Financial Reports'],
    cohortType: 'property-management'
  },
  {
    id: 8,
    title: 'Investor Hub',
    subtitle: 'Investment Opportunities',
    description: 'Explore investment opportunities in construction projects, property development, and real estate ventures with transparent tracking.',
    icon: TrendingUp,
    gradient: 'from-teal-600 to-green-600',
    glowColor: 'teal',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    navigate: 'investment-opportunities',
    portalRoute: 'investor-portal',
    benefits: ['Verified Projects', 'Investor App & Deal Room', 'ROI & Distribution Tracking', 'Transparent Reporting'],
    cohortType: 'investor'
  },
  {
    id: 9,
    title: '24/7 Emergency Services',
    subtitle: 'On-Call Support',
    description: 'Round-the-clock emergency response for urgent repairs, disasters, and critical property issues. Our on-call team is always ready.',
    icon: PhoneCall,
    gradient: 'from-red-600 to-orange-600',
    glowColor: 'red',
    image: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&q=80',
    navigate: 'emergency-services-landing-page',
    portalRoute: 'on-call-portal',
    benefits: ['24/7 Availability', 'Rapid Response', 'Emergency Dispatch', 'Priority Service'],
    cohortType: 'emergency'
  },
  {
    id: 10,
    title: 'Territory Partners',
    subtitle: 'Franchise & Expansion',
    description: 'Join our growing network as a territory partner. Manage your own region, build your team, and grow with our proven business model.',
    icon: Map,
    gradient: 'from-cyan-600 to-blue-600',
    glowColor: 'cyan',
    image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
    navigate: 'territory-landing-page',
    portalRoute: 'territory-portal',
    benefits: ['Territory Rights', 'Business Model', 'Training & Support', 'Brand Recognition'],
    cohortType: 'territory'
  },
  {
    id: 11,
    title: 'Join Our Team',
    subtitle: 'Partner With Us & Grow',
    description: 'Join our contractor network as a subcontractor, vendor, service provider, or advertiser. Get in early and grow your business with Black Phoenix.',
    icon: Briefcase,
    gradient: 'from-violet-600 to-purple-600',
    glowColor: 'violet',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
    navigate: 'contractor-network-landing-page',
    portalRoute: 'contractor-network-landing-page',
    benefits: ['Founding Member Status', 'Early Project Access', 'Clear Payment Terms', 'Real Support'],
    cohortType: 'contractor'
  },
  {
    id: 12,
    title: 'Marketing Hub',
    subtitle: 'Promotions & Special Offers',
    description: 'Exclusive promotional packages, subscription plans, maintenance bundles, special offers, and giveaways. Grow your business with our marketing solutions.',
    icon: Gift,
    gradient: 'from-pink-600 to-rose-600',
    glowColor: 'pink',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    navigate: 'marketing-hub-landing-page',
    portalRoute: 'advertiser-portal',
    benefits: ['Custom Packages', 'Subscription Plans', 'Special Offers', 'Giveaway Campaigns'],
    cohortType: 'marketing'
  }
];

// Helper function to get section by cohort type
export const getSectionByCohortType = (cohortType: string): DirectorySection | undefined => {
  return DIRECTORY_SECTIONS.find(section => section.cohortType === cohortType);
};

// Helper function to get subscription plans for a section
export const getSubscriptionPlansForSection = (sectionId: number) => {
  const section = DIRECTORY_SECTIONS.find(s => s.id === sectionId);
  return section?.subscriptionPlans || [];
};

// Helper function to update section pricing
export const updateSectionPricing = (sectionId: number, newPlans: DirectorySection['subscriptionPlans']) => {
  const section = DIRECTORY_SECTIONS.find(s => s.id === sectionId);
  if (section) {
    section.subscriptionPlans = newPlans;
  }
};
