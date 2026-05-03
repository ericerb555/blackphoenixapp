/**
 * Home Depot Vendor Plugin
 * 
 * Integration with Home Depot Pro API
 * https://www.homedepot.com/c/Pro_Xtra
 * 
 * NOTE: Currently using mock data. Replace with real API when access is granted.
 */

import { BaseVendor, Product, SearchParams, SearchResult, VendorConfig } from './vendorPlugin';

export class HomeDepotVendor extends BaseVendor {
  id = 'homedepot';
  name = 'The Home Depot';
  logo = 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=100';
  color = '#F96302';
  website = 'https://www.homedepot.com/c/Pro_Xtra';
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
    // MOCK DATA - Replace with Home Depot API when available
    // API Endpoint: TBD
    
    const mockProducts: Product[] = [
      {
        id: 'hd-001',
        name: '2x4x8 Premium Kiln-Dried Lumber',
        description: 'High-quality kiln-dried stud for framing, straight and true',
        vendor: 'homedepot',
        vendorId: '202532767',
        sku: 'HD-LBR-2X4-8',
        price: 4.25,
        originalPrice: 5.99,
        image: 'https://images.unsplash.com/photo-1601582589907-f92af5ed9db8?w=400',
        category: 'Lumber',
        inStock: true,
        stockQuantity: 450,
        rating: 4.7,
        reviewCount: 342,
        shippingTime: 'In-store pickup today',
        unit: 'ea',
        minOrder: 1,
        brand: 'Severe Weather',
        specifications: {
          'Grade': 'Premium',
          'Moisture Content': '19% or less',
          'Dimensions': '1.5" x 3.5" x 96"'
        },
        tags: ['lumber', 'framing', 'pro', 'in-stock']
      },
      {
        id: 'hd-002',
        name: 'Drywall 1/2" x 4\' x 8\' Regular',
        description: 'Standard gypsum drywall panel for walls and ceilings',
        vendor: 'homedepot',
        vendorId: '202532901',
        sku: 'HD-DW-12-48',
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
        category: 'Drywall',
        inStock: true,
        stockQuantity: 892,
        rating: 4.5,
        reviewCount: 445,
        shippingTime: 'Available for delivery',
        unit: 'sheet',
        brand: 'USG Sheetrock',
        specifications: {
          'Thickness': '1/2"',
          'Size': '4\' x 8\'',
          'Edge Type': 'Tapered',
          'Fire Rating': 'Type X available'
        },
        tags: ['drywall', 'sheetrock', 'pro', 'bulk']
      },
      {
        id: 'hd-003',
        name: 'Romex 12/2 NM-B Wire (250 ft Roll)',
        description: 'Non-metallic electrical wire, copper conductors',
        vendor: 'homedepot',
        vendorId: '202089117',
        sku: 'HD-WIRE-12-2-250',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
        category: 'Electrical',
        inStock: true,
        stockQuantity: 134,
        rating: 4.7,
        reviewCount: 412,
        shippingTime: 'In-store pickup',
        unit: 'roll',
        brand: 'Southwire',
        specifications: {
          'Wire Type': '12/2 NM-B',
          'Length': '250 feet',
          'Conductor': 'Copper',
          'Rating': '90°C'
        },
        tags: ['electrical', 'wire', 'romex', 'pro']
      },
      {
        id: 'hd-004',
        name: 'RIDGID 5 Gal. Wet/Dry Vacuum',
        description: 'Portable wet/dry shop vacuum for jobsite cleanup',
        vendor: 'homedepot',
        vendorId: '202077015',
        sku: 'HD-VAC-5G',
        price: 49.97,
        originalPrice: 69.97,
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
        category: 'Tools',
        inStock: true,
        stockQuantity: 67,
        rating: 4.6,
        reviewCount: 823,
        shippingTime: 'Same-day pickup',
        unit: 'ea',
        brand: 'RIDGID',
        specifications: {
          'Capacity': '5 Gallons',
          'HP': '4.25 Peak HP',
          'Hose Length': '7 feet',
          'Accessories': 'Included'
        },
        tags: ['tools', 'vacuum', 'cleanup', 'ridgid', 'deal']
      },
      {
        id: 'hd-005',
        name: 'Tuff Stuff Heavy Duty Trash Bags 42 Gal (50 Count)',
        description: 'Extra-strong contractor bags for construction debris',
        vendor: 'homedepot',
        vendorId: '300567890',
        sku: 'HD-BAG-42-50',
        price: 28.97,
        image: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400',
        category: 'Cleanup',
        inStock: true,
        stockQuantity: 234,
        rating: 4.8,
        reviewCount: 567,
        shippingTime: 'In-stock',
        unit: 'box',
        brand: 'Tuff Stuff',
        specifications: {
          'Capacity': '42 Gallon',
          'Quantity': '50 Count',
          'Thickness': '3 mil',
          'Color': 'Black'
        },
        tags: ['cleanup', 'bags', 'contractor', 'pro']
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
      'Drywall',
      'Electrical',
      'Plumbing',
      'Tools',
      'Paint',
      'Flooring',
      'Hardware',
      'Cleanup',
      'Safety'
    ];
  }
  
  protected transformProduct(vendorProduct: any): Product {
    // Transform Home Depot API response to standard format
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
