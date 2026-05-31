/**
 * Vendor Plugin System
 * 
 * Extensible architecture for adding new material suppliers.
 * Each vendor implements the VendorPlugin interface for consistent integration.
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  vendor: string;
  vendorId: string; // Vendor's internal product ID
  sku: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  stockQuantity?: number;
  rating?: number;
  reviewCount?: number;
  shippingTime: string;
  unit: string;
  minOrder?: number;
  brand?: string;
  specifications?: Record<string, string>;
  tags?: string[];
}

export interface SearchParams {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'price-low' | 'price-high' | 'rating' | 'name' | 'relevance';
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface VendorConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  accountId?: string;
  [key: string]: any;
}

/**
 * Base Vendor Plugin Interface
 * All vendor integrations must implement this interface
 */
export interface VendorPlugin {
  // Vendor Information
  id: string;                    // Unique vendor ID (e.g., 'homedepot', 'amazon')
  name: string;                  // Display name (e.g., 'Home Depot', 'Amazon Business')
  logo: string;                  // Logo URL or component
  color: string;                 // Brand color (e.g., '#ea580c')
  website: string;               // Vendor website
  
  // Configuration
  requiresAuth: boolean;         // Does this vendor require API authentication?
  config: VendorConfig;          // Vendor-specific configuration
  
  // Core Methods
  search(params: SearchParams): Promise<SearchResult>;
  getProduct(productId: string): Promise<Product | null>;
  
  // Optional Methods
  getCategories?(): Promise<string[]>;
  getDeals?(): Promise<Product[]>;
  checkInventory?(sku: string, location?: string): Promise<number>;
  getShippingOptions?(sku: string, quantity: number, zipCode: string): Promise<any[]>;
  
  // Auth Methods (if requiresAuth is true)
  authenticate?(credentials: VendorConfig): Promise<boolean>;
  isAuthenticated?(): boolean;
  refreshToken?(): Promise<void>;
}

/**
 * Vendor Registry
 * Central registry for all available vendor plugins
 */
export class VendorRegistry {
  private static vendors: Map<string, VendorPlugin> = new Map();
  
  /**
   * Register a new vendor plugin
   */
  static register(vendor: VendorPlugin): void {
    this.vendors.set(vendor.id, vendor);
    console.log(`✅ Registered vendor: ${vendor.name}`);
  }
  
  /**
   * Get a specific vendor by ID
   */
  static getVendor(vendorId: string): VendorPlugin | undefined {
    return this.vendors.get(vendorId);
  }
  
  /**
   * Get all registered vendors
   */
  static getAllVendors(): VendorPlugin[] {
    return Array.from(this.vendors.values());
  }
  
  /**
   * Get all vendor IDs
   */
  static getVendorIds(): string[] {
    return Array.from(this.vendors.keys());
  }
  
  /**
   * Search across multiple vendors in parallel
   */
  static async searchAll(
    vendorIds: string[],
    params: SearchParams
  ): Promise<Map<string, SearchResult>> {
    const results = new Map<string, SearchResult>();
    
    const searches = vendorIds.map(async (vendorId) => {
      const vendor = this.getVendor(vendorId);
      if (!vendor) return;
      
      try {
        const result = await vendor.search(params);
        results.set(vendorId, result);
      } catch (error) {
        console.error(`Error searching ${vendorId}:`, error);
        results.set(vendorId, {
          products: [],
          total: 0,
          page: 1,
          pageSize: params.pageSize || 20,
          hasMore: false
        });
      }
    });
    
    await Promise.all(searches);
    return results;
  }
  
  /**
   * Get combined products from multiple vendors
   */
  static async searchAllCombined(
    vendorIds: string[],
    params: SearchParams
  ): Promise<Product[]> {
    const results = await this.searchAll(vendorIds, params);
    const allProducts: Product[] = [];
    
    results.forEach((result) => {
      allProducts.push(...result.products);
    });
    
    // Sort combined results
    return this.sortProducts(allProducts, params.sortBy || 'relevance');
  }
  
  /**
   * Sort products by specified criteria
   */
  private static sortProducts(products: Product[], sortBy: string): Product[] {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }
}

/**
 * Base Vendor Class
 * Provides common functionality for vendor implementations
 */
export abstract class BaseVendor implements VendorPlugin {
  abstract id: string;
  abstract name: string;
  abstract logo: string;
  abstract color: string;
  abstract website: string;
  abstract requiresAuth: boolean;
  
  config: VendorConfig = {};
  
  abstract search(params: SearchParams): Promise<SearchResult>;
  abstract getProduct(productId: string): Promise<Product | null>;
  
  /**
   * Helper: Build URL with query parameters
   */
  protected buildUrl(base: string, params: Record<string, any>): string {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }
  
  /**
   * Helper: Make API request with error handling
   */
  protected async fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error (${this.name}):`, error);
      throw error;
    }
  }
  
  /**
   * Helper: Transform vendor-specific product to standard format
   */
  protected abstract transformProduct(vendorProduct: any): Product;
}

/**
 * Mock Vendor for Testing
 * Provides sample data without API calls
 */
export class MockVendor extends BaseVendor {
  id = 'mock';
  name = 'Mock Vendor';
  logo = '';
  color = '#666666';
  website = 'https://example.com';
  requiresAuth = false;
  
  private mockProducts: Product[] = [];
  
  constructor(products: Product[]) {
    super();
    this.mockProducts = products;
  }
  
  async search(params: SearchParams): Promise<SearchResult> {
    let filtered = [...this.mockProducts];
    
    // Filter by query
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (params.category) {
      filtered = filtered.filter(p => p.category === params.category);
    }
    
    // Filter by price
    if (params.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= params.minPrice!);
    }
    if (params.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= params.maxPrice!);
    }
    
    // Filter by stock
    if (params.inStockOnly) {
      filtered = filtered.filter(p => p.inStock);
    }
    
    // Sort
    filtered = this.sortProducts(filtered, params.sortBy || 'relevance');
    
    // Paginate
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedProducts = filtered.slice(start, end);
    
    return {
      products: paginatedProducts,
      total: filtered.length,
      page,
      pageSize,
      hasMore: end < filtered.length
    };
  }
  
  async getProduct(productId: string): Promise<Product | null> {
    return this.mockProducts.find(p => p.id === productId) || null;
  }
  
  protected transformProduct(vendorProduct: any): Product {
    return vendorProduct;
  }
  
  private sortProducts(products: Product[], sortBy: string): Product[] {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }
}

/**
 * Helper function to create a vendor configuration
 */
export function createVendorConfig(config: VendorConfig): VendorConfig {
  return config;
}

/**
 * Helper function to validate vendor plugin
 */
export function validateVendorPlugin(vendor: VendorPlugin): boolean {
  const required = ['id', 'name', 'logo', 'color', 'website', 'search', 'getProduct'];
  
  for (const field of required) {
    if (!(field in vendor)) {
      console.error(`Vendor plugin missing required field: ${field}`);
      return false;
    }
  }
  
  if (vendor.requiresAuth && !vendor.authenticate) {
    console.error('Vendor requires auth but no authenticate method provided');
    return false;
  }
  
  return true;
}
