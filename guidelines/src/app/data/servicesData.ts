/**
 * Services Data - Extracted from old landing page
 * Categorized by business section for easy filtering
 */

import {
  Hammer, Home, Droplets, PaintBucket, Zap, Wrench, Building2,
  Building, Key, ClipboardList, Wind, HardHat, Trash2, Boxes,
  Ruler, Trees, AirVent
} from 'lucide-react';

export interface Service {
  icon: any;
  title: string;
  description: string;
  image: string;
  category: 'construction' | 'handyman' | 'demolition' | 'property-management';
}

export const ALL_SERVICES: Service[] = [
  // CONSTRUCTION SERVICES
  {
    icon: Home,
    title: 'Kitchen Remodeling',
    description: 'Complete kitchen renovations, cabinet installation, countertops',
    image: 'https://images.unsplash.com/photo-1749704647283-3ad79f4acc6a?w=800&q=80',
    category: 'construction'
  },
  {
    icon: Droplets,
    title: 'Bathroom Renovation',
    description: 'Modern bathroom remodels, tile work, fixture installation',
    image: 'https://images.unsplash.com/photo-1758448018619-4cbe2250b9ad?w=800&q=80',
    category: 'construction'
  },
  {
    icon: Home,
    title: 'Home Additions',
    description: 'Room additions, second story construction, bump-outs, and expansions',
    image: 'https://images.unsplash.com/photo-1685425481910-71c174ad7341?w=800&q=80',
    category: 'construction'
  },
  {
    icon: Ruler,
    title: 'Design & Build',
    description: 'Custom home design, architectural planning, 3D rendering, and build services',
    image: 'https://images.unsplash.com/photo-1721244653757-b76cc4679dfb?w=800&q=80',
    category: 'construction'
  },
  {
    icon: Home,
    title: 'Roofing & Repairs',
    description: 'Roof installation, repairs, maintenance, and inspections',
    image: 'https://images.unsplash.com/photo-1760331840361-d751cfc1becf?w=800&q=80',
    category: 'construction'
  },

  // HANDYMAN SERVICES
  {
    icon: Hammer,
    title: 'General Carpentry',
    description: 'Custom woodwork, framing, trim installation, and finish carpentry',
    image: 'https://images.unsplash.com/photo-1684406401783-b599f9e03d64?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: PaintBucket,
    title: 'Painting & Finishing',
    description: 'Interior and exterior painting, drywall repair, texture work',
    image: 'https://images.unsplash.com/photo-1759406066673-f76869a4e6db?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: Zap,
    title: 'Electrical Services',
    description: 'Licensed electrical work, wiring, lighting, panel upgrades',
    image: 'https://images.unsplash.com/photo-1751486289947-4f5f5961b3aa?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: Wrench,
    title: 'Plumbing Services',
    description: 'Professional plumbing repairs, fixture installation, pipe work',
    image: 'https://images.unsplash.com/photo-1761642119720-1ce47b16d09b?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: Building2,
    title: 'Flooring Installation',
    description: 'Hardwood, tile, laminate, and vinyl flooring installation',
    image: 'https://images.unsplash.com/photo-1693948568453-a3564f179a84?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: AirVent,
    title: 'HVAC Services',
    description: 'Heating and cooling installation, repairs, maintenance, and system upgrades',
    image: 'https://images.unsplash.com/photo-1761642119720-1ce47b16d09b?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: Wind,
    title: 'Power Washing',
    description: 'High-pressure cleaning for driveways, siding, decks, and exterior surfaces',
    image: 'https://images.unsplash.com/photo-1735399588751-3cdd6effeac4?w=800&q=80',
    category: 'handyman'
  },
  {
    icon: Trees,
    title: 'Landscaping & Yard Work',
    description: 'Lawn care, garden design, hardscaping, irrigation, and landscape maintenance',
    image: 'https://images.unsplash.com/photo-1728881667082-06be928f08d0?w=800&q=80',
    category: 'handyman'
  },

  // DEMOLITION SERVICES
  {
    icon: HardHat,
    title: 'Demolition Services',
    description: 'Safe and efficient demolition, interior tear-outs, structural removal',
    image: 'https://images.unsplash.com/photo-1678944827354-fb54b9040a04?w=800&q=80',
    category: 'demolition'
  },
  {
    icon: Trash2,
    title: 'Trash Removal & Hauling',
    description: 'Construction debris removal, junk hauling, dumpster rental services',
    image: 'https://images.unsplash.com/photo-1680847307417-b6ae9b78cda6?w=800&q=80',
    category: 'demolition'
  },
  {
    icon: Boxes,
    title: 'Clean Outs & Organizing',
    description: 'Estate clean outs, hoarding cleanup, garage and basement organization',
    image: 'https://images.unsplash.com/photo-1709831917664-804b57448953?w=800&q=80',
    category: 'demolition'
  },

  // PROPERTY MANAGEMENT SERVICES
  {
    icon: Building,
    title: 'Condo Association Maintenance',
    description: 'HOA maintenance, common area repairs, scheduled maintenance plans',
    image: 'https://images.unsplash.com/photo-1760478869977-a1b4cf15e929?w=800&q=80',
    category: 'property-management'
  },
  {
    icon: Key,
    title: 'Landlord Property Services',
    description: 'Rental property maintenance, tenant turnover repairs, emergency services',
    image: 'https://images.unsplash.com/photo-1758836113725-a1b082c622bd?w=800&q=80',
    category: 'property-management'
  },
  {
    icon: ClipboardList,
    title: 'Property Management Solutions',
    description: 'Multi-unit maintenance, preventive maintenance programs, vendor coordination',
    image: 'https://images.unsplash.com/photo-1758448721162-0c77cf477d6f?w=800&q=80',
    category: 'property-management'
  },
];

// Helper functions to filter services by category
export const getServicesByCategory = (category: Service['category']) => {
  return ALL_SERVICES.filter(service => service.category === category);
};

export const CONSTRUCTION_SERVICES = getServicesByCategory('construction');
export const HANDYMAN_SERVICES = getServicesByCategory('handyman');
export const DEMOLITION_SERVICES = getServicesByCategory('demolition');
export const PROPERTY_MANAGEMENT_SERVICES = getServicesByCategory('property-management');
