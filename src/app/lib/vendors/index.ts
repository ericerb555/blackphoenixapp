/**
 * Vendor Registry - Central Hub for All Material Suppliers
 * 
 * To add a new vendor:
 * 1. Create a new file in /lib/vendors/{vendorname}.ts
 * 2. Implement the VendorPlugin interface
 * 3. Import and register it here
 * 4. Done! The vendor will automatically appear in the Materials Hub
 */

import { VendorRegistry } from './vendorPlugin';
import { AmazonVendor } from './amazon';
import { HomeDepotVendor } from './homedepot';
import { LowesVendor } from './lowes';
import { GraingerVendor } from './grainger';

// ==================== VENDOR REGISTRATION ====================

/**
 * Initialize all vendors
 * Call this once at app startup
 */
export function initializeVendors() {
  // Register Amazon Business
  VendorRegistry.register(new AmazonVendor({
    // In production, load from environment variables
    accessKey: process.env.AMAZON_ACCESS_KEY,
    secretKey: process.env.AMAZON_SECRET_KEY,
    associateTag: process.env.AMAZON_ASSOCIATE_TAG
  }));
  
  // Register Home Depot
  VendorRegistry.register(new HomeDepotVendor({
    apiKey: process.env.HOME_DEPOT_API_KEY
  }));
  
  // Register Lowe's
  VendorRegistry.register(new LowesVendor({
    apiKey: process.env.LOWES_API_KEY
  }));
  
  // Register Grainger
  VendorRegistry.register(new GraingerVendor({
    apiKey: process.env.GRAINGER_API_KEY
  }));
  
  console.log('✅ All vendors initialized');
}

// ==================== EXPORTS ====================

// Export the registry for direct access
export { VendorRegistry };

// Export individual vendors for custom usage
export { AmazonVendor } from './amazon';
export { HomeDepotVendor } from './homedepot';
export { LowesVendor } from './lowes';
export { GraingerVendor } from './grainger';

// Export types
export type { 
  VendorPlugin, 
  Product, 
  SearchParams, 
  SearchResult,
  VendorConfig 
} from './vendorPlugin';

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all available vendors
 */
export function getAllVendors() {
  return VendorRegistry.getAllVendors();
}

/**
 * Search across all vendors
 */
export async function searchAllVendors(params: any) {
  const vendorIds = VendorRegistry.getVendorIds();
  return await VendorRegistry.searchAllCombined(vendorIds, params);
}

/**
 * Search specific vendors
 */
export async function searchVendors(vendorIds: string[], params: any) {
  return await VendorRegistry.searchAllCombined(vendorIds, params);
}

/**
 * Get vendor by ID
 */
export function getVendor(vendorId: string) {
  return VendorRegistry.getVendor(vendorId);
}

// ==================== VENDOR METADATA ====================

/**
 * Vendor display information for UI
 */
export const VENDOR_INFO = {
  amazon: {
    id: 'amazon',
    name: 'Amazon Business',
    shortName: 'Amazon',
    color: '#FF9900',
    logo: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100',
    website: 'https://business.amazon.com',
    description: 'Fast shipping, extensive selection, Business Prime benefits',
    features: ['Prime Shipping', 'Bulk Pricing', 'Business Exclusive', 'Tax Exempt'],
    apiDocs: 'https://developer.amazonservices.com'
  },
  homedepot: {
    id: 'homedepot',
    name: 'The Home Depot',
    shortName: 'Home Depot',
    color: '#F96302',
    logo: 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=100',
    website: 'https://www.homedepot.com/c/Pro_Xtra',
    description: 'Pro pricing, in-store pickup, contractor perks',
    features: ['Pro Pricing', 'Same-Day Pickup', 'Volume Discounts', 'Pro Xtra'],
    apiDocs: 'https://www.homedepot.com/c/Pro_Xtra'
  },
  lowes: {
    id: 'lowes',
    name: "Lowe's",
    shortName: "Lowe's",
    color: '#004990',
    logo: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=100',
    website: 'https://www.lowes.com/l/pros',
    description: 'MVP rewards, pro services, competitive pricing',
    features: ['MVP Rewards', 'Pro Services', 'Price Match', 'Delivery'],
    apiDocs: 'https://www.lowes.com/l/pros'
  },
  grainger: {
    id: 'grainger',
    name: 'Grainger',
    shortName: 'Grainger',
    color: '#EE3124',
    logo: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=100',
    website: 'https://www.grainger.com',
    description: 'Industrial supplies, safety equipment, MRO products',
    features: ['Industrial Focus', 'Safety Certified', 'Technical Support', 'Next-Day'],
    apiDocs: 'https://developer.grainger.com'
  }
} as const;

/**
 * Get vendor colors for UI styling
 */
export const VENDOR_COLORS = {
  amazon: 'bg-orange-500',
  homedepot: 'bg-orange-600',
  lowes: 'bg-blue-600',
  grainger: 'bg-red-600'
} as const;

/**
 * Get vendor names for display
 */
export const VENDOR_NAMES = {
  amazon: 'Amazon Business',
  homedepot: 'Home Depot',
  lowes: "Lowe's",
  grainger: 'Grainger'
} as const;
