/**
 * Lowe's Vendor Plugin
 * 
 * Integration with Lowe's for Pros API
 * https://www.lowes.com/l/pros
 * 
 * NOTE: Currently using mock data. Replace with real API when access is granted.
 */

import { BaseVendor, Product, SearchParams, SearchResult, VendorConfig } from './vendorPlugin';

export class LowesVendor extends BaseVendor {
  id = 'lowes';
  name = "Lowe's";
  logo = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=100';
  color = '#004990';
  website = 'https://www.lowes.com/l/pros';
  requiresAuth = true;
  
  private apiKey?: string;
  private authenticated = false;
  
  constructor(config?: VendorConfig) {
    super();
    if (config?.apiKey) {
      this.apiKey = config.apiKey;
      this.authenticated = true;
    }
  }
  
  async authenticate(credentials: VendorConfig): Promise<boolean> {
    this.apiKey = credentials.apiKey;
    this.authenticated = !!this.apiKey;
    return this.authenticated;
  }
  
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  
  async search(params: SearchParams): Promise<SearchResult> {
    // MOCK DATA - Replace with Lowe's API when available
    
    const mockProducts: Product[] = [
      {
        id: 'lw-001',
        name: '2x4x8 Pressure Treated Lumber',
        description: 'Weather-resistant pressure treated wood for outdoor use',
        vendor: 'lowes',
        vendorId: 'LW-PT-2X4-8',
        sku: 'LW-PT-2X4-8',
        price: 7.89,
        image: 'https://images.unsplash.com/photo-1601582589907-f92af5ed9db8?w=400',
        category: 'Lumber',
        inStock: true,
        stockQuantity: 356,
        rating: 4.6,
        reviewCount: 289,
        shippingTime: 'Ships in 2-3 days',
        unit: 'ea',
        brand: 'Severe Weather',
        specifications: {
          'Treatment': 'Pressure Treated',
          'Use': 'Ground Contact',
          'Dimensions': '1.5" x 3.5" x 96"'
        },
        tags: ['lumber', 'treated', 'outdoor', 'pro']
      },
      {
        id: 'lw-002',
        name: 'Valspar Interior Paint 5 Gal - Eggshell White',
        description: 'Premium interior latex paint with primer, eggshell finish',
        vendor: 'lowes',
        vendorId: 'LW-PNT-INT-5G',
        sku: 'LW-PNT-INT-5G',
        price: 124.99,
        originalPrice: 149.99,
        image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400',
        category: 'Paint',
        inStock: true,
        stockQuantity: 156,
        rating: 4.8,
        reviewCount: 723,
        shippingTime: 'In-store pickup today',
        unit: 'bucket',
        brand: 'Valspar',
        specifications: {
          'Size': '5 Gallon',
          'Finish': 'Eggshell',
          'Coverage': '~2000 sq ft',
          'VOC': 'Low VOC'
        },
        tags: ['paint', 'interior', 'pro', 'deal']
      },
      {
        id: 'lw-003',
        name: 'PEX Tubing 1/2" Red (300 ft Coil)',
        description: 'Cross-linked polyethylene tubing for hot water lines',
        vendor: 'lowes',
        vendorId: 'LW-PEX-12-300',
        sku: 'LW-PEX-12-300',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400',
        category: 'Plumbing',
        inStock: true,
        stockQuantity: 89,
        rating: 4.8,
        reviewCount: 356,
        shippingTime: 'Available for delivery',
        unit: 'coil',
        brand: 'SharkBite',
        specifications: {
          'Size': '1/2 inch',
          'Color': 'Red (hot)',
          'Length': '300 feet',
          'Pressure Rating': '160 PSI @ 73°F'
        },
        tags: ['plumbing', 'pex', 'pro', 'contractor']
      },
      {
        id: 'lw-004',
        name: 'DEWALT 20V MAX Drill/Driver Combo Kit',
        description: 'Brushless drill and impact driver with 2 batteries',
        vendor: 'lowes',
        vendorId: 'LW-DEWALT-20V',
        sku: 'LW-DEWALT-20V',
        price: 199.00,
        originalPrice: 249.00,
        image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400',
        category: 'Power Tools',
        inStock: true,
        stockQuantity: 45,
        rating: 4.9,
        reviewCount: 1245,
        shippingTime: 'In-store pickup today',
        unit: 'kit',
        brand: 'DEWALT',
        specifications: {
          'Voltage': '20V MAX',
          'Type': 'Brushless',
          'Batteries': '2x 2.0Ah',
          'Includes': 'Drill, Impact Driver, Charger, Bag'
        },
        tags: ['power tools', 'dewalt', 'combo', 'deal', 'pro']
      },
      {
        id: 'lw-005',
        name: 'Owens Corning R-13 Insulation Batts (88.6 sq ft)',
        description: 'Fiberglass insulation batts for 2x4 walls',
        vendor: 'lowes',
        vendorId: 'LW-INS-R13',
        sku: 'LW-INS-R13',
        price: 39.98,
        image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400',
        category: 'Insulation',
        inStock: true,
        stockQuantity: 234,
        rating: 4.5,
        reviewCount: 178,
        shippingTime: 'Ships in 1-2 days',
        unit: 'bundle',
        brand: 'Owens Corning',
        specifications: {
          'R-Value': 'R-13',
          'Thickness': '3.5"',
          'Coverage': '88.6 sq ft',
          'Facing': 'Kraft'
        },
        tags: ['insulation', 'fiberglass', 'pro', 'energy']
      }
    ];
    
    return this.filterAndPaginate(mockProducts, params);
  }
  
  async getProduct(productId: string): Promise<Product | null> {
    const result = await this.search({ query: productId, pageSize: 1 });
    return result.products[0] || null;
  }
  
  async getCategories(): Promise<string[]> {
    return [
      'Lumber',
      'Paint',
      'Plumbing',
      'Electrical',
      'Power Tools',
      'Insulation',
      'Flooring',
      'Hardware',
      'HVAC',
      'Appliances'
    ];
  }
  
  protected transformProduct(vendorProduct: any): Product {
    return vendorProduct;
  }
  
  private filterAndPaginate(products: Product[], params: SearchParams): SearchResult {
    let filtered = products;
    
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }
    
    if (params.category) {
      filtered = filtered.filter(p => p.category === params.category);
    }
    
    if (params.inStockOnly) {
      filtered = filtered.filter(p => p.inStock);
    }
    
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      products: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      hasMore: end < filtered.length
    };
  }
}
