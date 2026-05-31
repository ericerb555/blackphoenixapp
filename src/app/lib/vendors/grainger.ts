/**
 * Grainger Vendor Plugin
 * 
 * Integration with Grainger API
 * https://www.grainger.com
 * 
 * NOTE: Currently using mock data. Replace with real API when access is granted.
 */

import { BaseVendor, Product, SearchParams, SearchResult, VendorConfig } from './vendorPlugin';

export class GraingerVendor extends BaseVendor {
  id = 'grainger';
  name = 'Grainger';
  logo = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=100';
  color = '#EE3124';
  website = 'https://www.grainger.com';
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
    // MOCK DATA - Replace with Grainger API when available
    
    const mockProducts: Product[] = [
      {
        id: 'gr-001',
        name: 'Heavy Duty Trash Bags 55 Gal (100 Pack)',
        description: 'Industrial strength contractor bags, 3 mil thick',
        vendor: 'grainger',
        vendorId: 'GR-BAG-55-100',
        sku: 'GR-BAG-55-100',
        price: 32.99,
        image: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=400',
        category: 'Cleanup',
        inStock: true,
        stockQuantity: 445,
        rating: 4.9,
        reviewCount: 567,
        shippingTime: 'Ships next day',
        unit: 'box',
        brand: 'Grainger',
        specifications: {
          'Capacity': '55 Gallon',
          'Quantity': '100 Count',
          'Thickness': '3 mil',
          'Color': 'Black'
        },
        tags: ['cleanup', 'industrial', 'contractor', 'bulk']
      },
      {
        id: 'gr-002',
        name: 'Safety Cones 36" (Set of 12)',
        description: 'High-visibility traffic cones with reflective collars',
        vendor: 'grainger',
        vendorId: 'GR-SAFE-CONE-36',
        sku: 'GR-SAFE-CONE-36',
        price: 191.88,
        image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
        category: 'Safety',
        inStock: true,
        stockQuantity: 89,
        rating: 4.6,
        reviewCount: 234,
        shippingTime: 'Ships in 1-2 days',
        unit: 'set',
        brand: 'Grainger',
        specifications: {
          'Height': '36 inches',
          'Quantity': '12 Cones',
          'Reflective': 'Yes',
          'Weight': '10 lbs each'
        },
        tags: ['safety', 'traffic', 'construction', 'high-vis']
      },
      {
        id: 'gr-003',
        name: '3M N95 Respirator Masks (Box of 20)',
        description: 'NIOSH-approved N95 particulate respirators',
        vendor: 'grainger',
        vendorId: 'GR-N95-20',
        sku: 'GR-N95-20',
        price: 47.99,
        image: 'https://images.unsplash.com/photo-1584573698823-ef06b68c7c64?w=400',
        category: 'Safety',
        inStock: true,
        stockQuantity: 234,
        rating: 4.8,
        reviewCount: 892,
        shippingTime: 'Ships next day',
        unit: 'box',
        brand: '3M',
        specifications: {
          'Type': 'N95 Particulate',
          'Quantity': '20 Count',
          'Certification': 'NIOSH N95',
          'Style': 'Cup Style'
        },
        tags: ['ppe', 'safety', 'respirator', 'n95', 'certified']
      },
      {
        id: 'gr-004',
        name: 'Milwaukee High-Vis Safety Vest Class 2 (Pack of 5)',
        description: 'ANSI Class 2 reflective safety vests, orange',
        vendor: 'grainger',
        vendorId: 'GR-VEST-C2-5',
        sku: 'GR-VEST-C2-5',
        price: 44.99,
        image: 'https://images.unsplash.com/photo-1621340674449-3a99d08c1b7d?w=400',
        category: 'Safety',
        inStock: true,
        stockQuantity: 167,
        rating: 4.7,
        reviewCount: 345,
        shippingTime: 'In stock',
        unit: 'pack',
        brand: 'Milwaukee',
        specifications: {
          'Class': 'ANSI Class 2',
          'Size': 'One Size Fits Most',
          'Color': 'Orange',
          'Quantity': '5 Pack'
        },
        tags: ['safety', 'ppe', 'high-vis', 'ansi', 'vest']
      },
      {
        id: 'gr-005',
        name: 'First Aid Kit Industrial 150 Piece',
        description: 'OSHA compliant first aid kit for 50 people',
        vendor: 'grainger',
        vendorId: 'GR-FA-150',
        sku: 'GR-FA-150',
        price: 39.99,
        image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400',
        category: 'Safety',
        inStock: true,
        stockQuantity: 123,
        rating: 4.9,
        reviewCount: 456,
        shippingTime: 'Ships next day',
        unit: 'kit',
        brand: 'First Aid Only',
        specifications: {
          'Pieces': '150',
          'For': '50 People',
          'Compliance': 'OSHA',
          'Case': 'Metal Cabinet'
        },
        tags: ['safety', 'first-aid', 'osha', 'medical']
      },
      {
        id: 'gr-006',
        name: 'WD-40 Multi-Use Product (Case of 12)',
        description: 'Industrial lubricant and penetrant, 11 oz aerosol',
        vendor: 'grainger',
        vendorId: 'GR-WD40-12',
        sku: 'GR-WD40-12',
        price: 56.88,
        image: 'https://images.unsplash.com/photo-1589894935051-e7b5ea13f8f7?w=400',
        category: 'Maintenance',
        inStock: true,
        stockQuantity: 345,
        rating: 4.8,
        reviewCount: 678,
        shippingTime: 'Ships next day',
        unit: 'case',
        brand: 'WD-40',
        specifications: {
          'Size': '11 oz Aerosol',
          'Quantity': '12 Cans',
          'Use': 'Multi-Purpose',
          'Flammable': 'Yes'
        },
        tags: ['maintenance', 'lubricant', 'industrial', 'bulk']
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
      'Safety Equipment',
      'Cleanup',
      'Maintenance',
      'Tools',
      'Electrical',
      'Plumbing',
      'HVAC',
      'Material Handling',
      'Lighting',
      'Fasteners'
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
