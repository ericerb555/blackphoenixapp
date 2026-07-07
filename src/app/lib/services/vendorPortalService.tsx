/**
 * Vendor Portal Service
 * Manages vendor authentication, profiles, and connections
 */

export interface VendorProfile {
  id: string;
  vendorKey: string;
  companyName: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  logo?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  categories: string[];
  certifications?: string[];
  taxId?: string;
  subscriptionTier?: 'none' | 'bronze' | 'silver' | 'gold';
  subscriptionId?: string;
  connectedAt: string;
  status: 'pending' | 'active' | 'suspended';
  stats?: {
    totalMaterials: number;
    activeQuotes: number;
    totalSales: number;
    rating: number;
  };
}

const STORAGE_KEY = 'vendor_profiles';

class VendorPortalService {
  // Get all vendor profiles
  getAllVendors(): VendorProfile[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize with demo vendors
    const defaultVendors: VendorProfile[] = [
      {
        id: 'vendor_001',
        vendorKey: 'ferguson',
        companyName: 'Ferguson Enterprises',
        email: 'vendor@ferguson.com',
        phone: '(555) 123-4567',
        website: 'https://www.ferguson.com',
        description: 'Leading distributor of plumbing, HVAC, and industrial products',
        categories: ['Plumbing', 'HVAC', 'Fixtures', 'Appliances'],
        certifications: ['ISO 9001', 'Energy Star Partner'],
        subscriptionTier: 'gold',
        subscriptionId: 'SUB-FG-001',
        connectedAt: '2024-12-01',
        status: 'active',
        stats: {
          totalMaterials: 1247,
          activeQuotes: 89,
          totalSales: 284750,
          rating: 4.8
        }
      },
      {
        id: 'vendor_002',
        vendorKey: 'home-depot',
        companyName: 'The Home Depot',
        email: 'vendor@homedepot.com',
        phone: '(555) 234-5678',
        website: 'https://www.homedepot.com',
        description: 'Home improvement retailer with professional contractor supplies',
        categories: ['Hardware', 'Lumber', 'Electrical', 'Kitchen', 'Bathroom'],
        certifications: ['Green Building Council Member'],
        subscriptionTier: 'silver',
        subscriptionId: 'SUB-HD-001',
        connectedAt: '2025-01-01',
        status: 'active',
        stats: {
          totalMaterials: 892,
          activeQuotes: 56,
          totalSales: 156900,
          rating: 4.6
        }
      },
      {
        id: 'vendor_003',
        vendorKey: 'lowes',
        companyName: "Lowe's Companies, Inc.",
        email: 'vendor@lowes.com',
        phone: '(555) 345-6789',
        website: 'https://www.lowes.com',
        description: 'Home improvement and appliance retailer serving contractors',
        categories: ['Appliances', 'Flooring', 'Roofing', 'Windows', 'Doors'],
        certifications: ['EPA Lead-Safe Certified'],
        subscriptionTier: 'bronze',
        subscriptionId: 'SUB-LW-001',
        connectedAt: '2025-02-01',
        status: 'active',
        stats: {
          totalMaterials: 634,
          activeQuotes: 34,
          totalSales: 89500,
          rating: 4.5
        }
      }
    ];
    
    this.saveVendors(defaultVendors);
    return defaultVendors;
  }

  // Get vendor by ID
  getVendorById(id: string): VendorProfile | null {
    const vendors = this.getAllVendors();
    return vendors.find(v => v.id === id) || null;
  }

  // Get vendor by key
  getVendorByKey(vendorKey: string): VendorProfile | null {
    const vendors = this.getAllVendors();
    return vendors.find(v => v.vendorKey === vendorKey) || null;
  }

  // Get vendor by email
  getVendorByEmail(email: string): VendorProfile | null {
    const vendors = this.getAllVendors();
    return vendors.find(v => v.email.toLowerCase() === email.toLowerCase()) || null;
  }

  // Create new vendor
  createVendor(data: Omit<VendorProfile, 'id' | 'connectedAt' | 'status'>): VendorProfile {
    const vendors = this.getAllVendors();
    
    const newVendor: VendorProfile = {
      ...data,
      id: `vendor_${Date.now()}`,
      connectedAt: new Date().toISOString(),
      status: 'pending' // Requires approval
    };
    
    vendors.push(newVendor);
    this.saveVendors(vendors);
    
    return newVendor;
  }

  // Update vendor profile
  updateVendor(id: string, updates: Partial<VendorProfile>): VendorProfile | null {
    const vendors = this.getAllVendors();
    const index = vendors.findIndex(v => v.id === id);
    
    if (index === -1) return null;
    
    vendors[index] = {
      ...vendors[index],
      ...updates,
      id: vendors[index].id, // Preserve ID
      connectedAt: vendors[index].connectedAt // Preserve connection date
    };
    
    this.saveVendors(vendors);
    return vendors[index];
  }

  // Update vendor status
  updateStatus(id: string, status: 'pending' | 'active' | 'suspended'): void {
    this.updateVendor(id, { status });
  }

  // Update subscription tier
  updateSubscriptionTier(id: string, tier: 'none' | 'bronze' | 'silver' | 'gold', subscriptionId?: string): void {
    this.updateVendor(id, { 
      subscriptionTier: tier,
      subscriptionId 
    });
  }

  // Delete vendor
  deleteVendor(id: string): boolean {
    const vendors = this.getAllVendors();
    const filtered = vendors.filter(v => v.id !== id);
    
    if (filtered.length === vendors.length) return false;
    
    this.saveVendors(filtered);
    return true;
  }

  // Vendor login (simple auth for prototype)
  login(email: string, password: string): { success: boolean; vendor?: VendorProfile; error?: string } {
    const vendor = this.getVendorByEmail(email);
    
    if (!vendor) {
      return { success: false, error: 'Vendor not found' };
    }
    
    if (vendor.status === 'suspended') {
      return { success: false, error: 'Account suspended. Please contact support.' };
    }
    
    if (vendor.status === 'pending') {
      return { success: false, error: 'Account pending approval. Please wait for administrator approval.' };
    }
    
    // In a real app, you'd verify the password hash
    // For prototype, just return success
    localStorage.setItem('current_vendor', JSON.stringify(vendor));
    return { success: true, vendor };
  }

  // Get current logged-in vendor
  getCurrentVendor(): VendorProfile | null {
    const stored = localStorage.getItem('current_vendor');
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  }

  // Logout
  logout(): void {
    localStorage.removeItem('current_vendor');
  }

  // Check if vendor is logged in
  isLoggedIn(): boolean {
    return this.getCurrentVendor() !== null;
  }

  // Get vendors by category
  getVendorsByCategory(category: string): VendorProfile[] {
    const vendors = this.getAllVendors();
    return vendors.filter(v => 
      v.status === 'active' && 
      v.categories.includes(category)
    );
  }

  // Get vendors by subscription tier
  getVendorsByTier(tier: 'bronze' | 'silver' | 'gold'): VendorProfile[] {
    const vendors = this.getAllVendors();
    return vendors.filter(v => v.subscriptionTier === tier);
  }

  // Search vendors
  searchVendors(query: string): VendorProfile[] {
    const vendors = this.getAllVendors();
    const lowerQuery = query.toLowerCase();
    
    return vendors.filter(v => 
      v.companyName.toLowerCase().includes(lowerQuery) ||
      v.email.toLowerCase().includes(lowerQuery) ||
      v.categories.some(cat => cat.toLowerCase().includes(lowerQuery))
    );
  }

  // Get pending vendors (for admin approval)
  getPendingVendors(): VendorProfile[] {
    const vendors = this.getAllVendors();
    return vendors.filter(v => v.status === 'pending');
  }

  // Save vendors to storage
  private saveVendors(vendors: VendorProfile[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors));
  }
}

export const vendorPortalService = new VendorPortalService();
