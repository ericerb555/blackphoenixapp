/**
 * Shared Job Categories
 * Used across: Bid Room, Subcontractor Setup, Application Submissions, Portals
 * Single source of truth for all job/trade categories
 */

import {
  Wrench, Droplet, Zap, Hammer, PaintBucket, Home, Package, Scissors, 
  Building2, Trash2, Construction, TreePine, Mountain, User, MapPin,
  Wind, Ruler, CloudRain, DoorOpen, Plus, Droplets, Drill, WallpaperIcon,
  HardHat, Warehouse
} from 'lucide-react';

export interface JobCategory {
  id: string;
  name: string;
  icon: any;
  description?: string;
  color?: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  { id: 'addition', name: 'Addition', icon: Plus, color: 'purple', description: 'Home additions and expansions' },
  { id: 'basement-remodel', name: 'Basement Remodel', icon: Warehouse, color: 'indigo', description: 'Basement renovations and finishing' },
  { id: 'bathroom-renovation', name: 'Bathroom Renovation', icon: Droplets, color: 'cyan', description: 'Bathroom remodeling and upgrades' },
  { id: 'concrete-work', name: 'Concrete Work', icon: Mountain, color: 'gray', description: 'Concrete pouring, finishing, and repair' },
  { id: 'decks', name: 'Decks', icon: Package, color: 'amber', description: 'Deck building and repair' },
  { id: 'demolition', name: 'Demolition', icon: Construction, color: 'red', description: 'Demolition and tear-down services' },
  { id: 'drywall', name: 'Drywall', icon: WallpaperIcon, color: 'stone', description: 'Drywall installation and repair' },
  { id: 'electrical', name: 'Electrical', icon: Zap, color: 'yellow', description: 'Electrical installations and repairs' },
  { id: 'exterior-painting', name: 'Exterior Painting', icon: PaintBucket, color: 'blue', description: 'Exterior painting services' },
  { id: 'flooring', name: 'Flooring', icon: Package, color: 'brown', description: 'Flooring installation and refinishing' },
  { id: 'framing', name: 'Framing', icon: HardHat, color: 'orange', description: 'Structural framing and carpentry' },
  { id: 'gutters', name: 'Gutters', icon: CloudRain, color: 'sky', description: 'Gutter installation and cleaning' },
  { id: 'hvac', name: 'HVAC', icon: Wind, color: 'teal', description: 'Heating, ventilation, and air conditioning' },
  { id: 'insulation', name: 'Insulation', icon: Warehouse, color: 'slate', description: 'Insulation installation and upgrades' },
  { id: 'interior-painting', name: 'Interior Painting', icon: PaintBucket, color: 'pink', description: 'Interior painting services' },
  { id: 'kitchen-renovation', name: 'Kitchen Renovation', icon: Home, color: 'emerald', description: 'Kitchen remodeling and upgrades' },
  { id: 'landscaping', name: 'Landscaping', icon: TreePine, color: 'green', description: 'Landscaping and outdoor design' },
  { id: 'plumbing', name: 'Plumbing', icon: Droplet, color: 'blue', description: 'Plumbing installations and repairs' },
  { id: 'power-washing', name: 'Power Washing', icon: Droplets, color: 'cyan', description: 'Pressure washing services' },
  { id: 'real-estate-agent', name: 'Real Estate Agent', icon: User, color: 'violet', description: 'Real estate services' },
  { id: 'roofing', name: 'Roofing', icon: Home, color: 'red', description: 'Roofing installation and repair' },
  { id: 'siding', name: 'Siding', icon: Building2, color: 'zinc', description: 'Siding installation and repair' },
  { id: 'site-work', name: 'Site Work', icon: MapPin, color: 'orange', description: 'Site preparation and excavation' },
  { id: 'surveyor', name: 'Surveyor', icon: Ruler, color: 'yellow', description: 'Land surveying services' },
  { id: 'trash-removal', name: 'Trash Removal', icon: Trash2, color: 'gray', description: 'Waste removal and disposal' },
  { id: 'windows-doors', name: 'Windows & Doors', icon: DoorOpen, color: 'blue', description: 'Window and door installation' },
  { id: 'other', name: 'Other', icon: Wrench, color: 'gray', description: 'Other specialized services' },
];

// Alphabetically sorted category names for dropdowns
export const JOB_CATEGORY_NAMES = JOB_CATEGORIES
  .map(cat => cat.name)
  .sort();

// Helper function to get category by ID
export const getCategoryById = (id: string): JobCategory | undefined => {
  return JOB_CATEGORIES.find(cat => cat.id === id);
};

// Helper function to get category by name
export const getCategoryByName = (name: string): JobCategory | undefined => {
  return JOB_CATEGORIES.find(cat => cat.name === name);
};

// Get icon component by category name
export const getCategoryIcon = (categoryName: string) => {
  const category = getCategoryByName(categoryName);
  return category?.icon || Wrench;
};

// AI Auto-Post Configuration
export interface BidRoomAutoPostConfig {
  enabled: boolean;
  minimumBudget: number;
  autoPostPriorities: ('low' | 'medium' | 'high' | 'urgent')[];
  requireAdminApproval: boolean;
  notifyAdminOnAutoPost: boolean;
}

export const DEFAULT_AUTO_POST_CONFIG: BidRoomAutoPostConfig = {
  enabled: true,
  minimumBudget: 2500,
  autoPostPriorities: ['high', 'urgent'],
  requireAdminApproval: false,
  notifyAdminOnAutoPost: true,
};
