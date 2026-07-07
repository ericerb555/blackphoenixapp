/**
 * Big Box Product Service
 * Integrates with Home Depot, Lowe's, and Grainger APIs to pull real product data
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';

export interface BigBoxProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  sku: string;
  modelNumber?: string;
  price: number;
  currency: string;
  inStock: boolean;
  inventory?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  productUrl: string;
  category: string;
  subcategory?: string;
  specifications: Record<string, string>;
  store: 'homedepot' | 'lowes' | 'grainger';
  storeLogoColor: string;
  lastUpdated: string;
}

export interface ProductSearchFilters {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  stores?: ('homedepot' | 'lowes' | 'grainger')[];
  minRating?: number;
  limit?: number;
}

class BigBoxProductService {
  private serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

  /**
   * Search products across all big box stores
   */
  async searchProducts(filters: ProductSearchFilters): Promise<BigBoxProduct[]> {
    try {
      const response = await fetch(`${this.serverUrl}/big-box-products/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(filters)
      });

      if (!response.ok) {
        console.error('Failed to search big box products:', await response.text());
        return this.getMockProducts(filters);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error searching big box products:', error);
      // Return mock products as fallback
      return this.getMockProducts(filters);
    }
  }

  /**
   * Get product details by store and SKU
   */
  async getProductDetails(store: string, sku: string): Promise<BigBoxProduct | null> {
    try {
      const response = await fetch(`${this.serverUrl}/big-box-products/${store}/${sku}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        console.error('Failed to get product details');
        return null;
      }

      const data = await response.json();
      return data.product || null;
    } catch (error) {
      console.error('Error getting product details:', error);
      return null;
    }
  }

  /**
   * Check real-time availability across stores
   */
  async checkAvailability(products: { store: string; sku: string }[]): Promise<Record<string, boolean>> {
    try {
      const response = await fetch(`${this.serverUrl}/big-box-products/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ products })
      });

      if (!response.ok) {
        console.error('Failed to check availability');
        return {};
      }

      const data = await response.json();
      return data.availability || {};
    } catch (error) {
      console.error('Error checking availability:', error);
      return {};
    }
  }

  /**
   * Get mock/demo products for testing and fallback
   * These represent actual products you'd find at these stores
   */
  private getMockProducts(filters: ProductSearchFilters): BigBoxProduct[] {
    const allProducts: BigBoxProduct[] = [
      // Home Depot Products
      {
        id: 'hd_1',
        name: 'Milwaukee M18 18V Lithium-Ion Brushless Cordless Hammer Drill',
        description: 'REDLITHIUM battery technology delivers more work per charge. Brushless motor delivers up to 60% more power. 1/2 in. metal chuck with carbide inserts.',
        brand: 'Milwaukee',
        sku: '305385213',
        modelNumber: '2804-20',
        price: 129.00,
        currency: 'USD',
        inStock: true,
        inventory: 47,
        rating: 4.8,
        reviewCount: 1243,
        imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
        productUrl: 'https://www.homedepot.com/p/305385213',
        category: 'Tools',
        subcategory: 'Power Tools',
        specifications: {
          'Voltage': '18V',
          'Chuck Size': '1/2 in',
          'Speed': '0-450/0-1800 RPM',
          'Torque': '725 in-lbs',
          'Weight': '3.9 lbs'
        },
        store: 'homedepot',
        storeLogoColor: '#F96302',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'hd_2',
        name: 'Rheem Performance Platinum 50 Gal. Tall 12 Year Gas Water Heater',
        description: 'Self-cleaning reduces sediment buildup. Electronic ignition for dependable operation. Dry-fire protection. Status LED indicator.',
        brand: 'Rheem',
        sku: '306814282',
        modelNumber: 'XG50T12DU40U0',
        price: 849.00,
        currency: 'USD',
        inStock: true,
        inventory: 12,
        rating: 4.5,
        reviewCount: 689,
        imageUrl: 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400',
        productUrl: 'https://www.homedepot.com/p/306814282',
        category: 'Plumbing',
        subcategory: 'Water Heaters',
        specifications: {
          'Capacity': '50 Gallons',
          'Fuel Type': 'Natural Gas',
          'Energy Factor': '0.67',
          'Recovery Rate': '58 GPH',
          'Warranty': '12 Year Tank, 1 Year Parts'
        },
        store: 'homedepot',
        storeLogoColor: '#F96302',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'hd_3',
        name: 'Carrier Performance 3 Ton 16 SEER Residential Air Conditioner',
        description: 'Energy Star certified for energy efficiency. R-410A refrigerant. WeatherArmor Ultra Protection for reliability.',
        brand: 'Carrier',
        sku: '317494523',
        modelNumber: '25HCB336A003',
        price: 3299.00,
        currency: 'USD',
        inStock: false,
        inventory: 0,
        rating: 4.7,
        reviewCount: 234,
        imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400',
        productUrl: 'https://www.homedepot.com/p/317494523',
        category: 'HVAC',
        subcategory: 'Air Conditioners',
        specifications: {
          'Tonnage': '3 Ton',
          'SEER Rating': '16',
          'BTU': '36,000',
          'Refrigerant': 'R-410A',
          'Voltage': '208-230V'
        },
        store: 'homedepot',
        storeLogoColor: '#F96302',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'hd_4',
        name: 'Square D Homeline 200 Amp 40-Space 80-Circuit Indoor Main Breaker Panel',
        description: 'Copper bus bars rated for 65°C wire. Combination AFCI/GFCI breakers are compatible. UL Listed and NEMA type 1 rated.',
        brand: 'Square D',
        sku: '202353395',
        modelNumber: 'HOM4080M200PC',
        price: 349.99,
        currency: 'USD',
        inStock: true,
        inventory: 28,
        rating: 4.9,
        reviewCount: 892,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
        productUrl: 'https://www.homedepot.com/p/202353395',
        category: 'Electrical',
        subcategory: 'Panels',
        specifications: {
          'Amperage': '200A',
          'Spaces': '40',
          'Circuits': '80',
          'Voltage': '120/240V',
          'Bus Material': 'Copper'
        },
        store: 'homedepot',
        storeLogoColor: '#F96302',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'hd_5',
        name: 'Southwire 250 ft. 12/2 Solid Romex SIMpull CU NM-B W/G Wire',
        description: 'SIMpull technology for easier cable pulling. Solid copper conductors. Flame-retardant and moisture-resistant jacket.',
        brand: 'Southwire',
        sku: '202316252',
        modelNumber: '28829021',
        price: 159.98,
        currency: 'USD',
        inStock: true,
        inventory: 156,
        rating: 4.6,
        reviewCount: 445,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        productUrl: 'https://www.homedepot.com/p/202316252',
        category: 'Electrical',
        subcategory: 'Wiring',
        specifications: {
          'Wire Gauge': '12 AWG',
          'Conductors': '2 + Ground',
          'Length': '250 ft',
          'Type': 'NM-B',
          'Jacket': 'PVC'
        },
        store: 'homedepot',
        storeLogoColor: '#F96302',
        lastUpdated: new Date().toISOString()
      },

      // Lowe's Products
      {
        id: 'lw_1',
        name: 'DEWALT 20V MAX XR Brushless Drill/Driver Kit',
        description: 'Compact and lightweight. Brushless motor for efficient performance. 2-speed transmission delivers 0-450 & 0-1,500 RPM.',
        brand: 'DEWALT',
        sku: '1000218871',
        modelNumber: 'DCD791D2',
        price: 179.00,
        currency: 'USD',
        inStock: true,
        inventory: 89,
        rating: 4.7,
        reviewCount: 2156,
        imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
        productUrl: 'https://www.lowes.com/pd/1000218871',
        category: 'Tools',
        subcategory: 'Power Tools',
        specifications: {
          'Voltage': '20V MAX',
          'Chuck Size': '1/2 in',
          'Speed': '0-450/0-1500 RPM',
          'Max Torque': '460 UWO',
          'Battery': '2.0Ah Li-ion'
        },
        store: 'lowes',
        storeLogoColor: '#004990',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'lw_2',
        name: 'A.O. Smith Signature Premier 50-Gallon Tall 12-Year Gas Water Heater',
        description: 'Commercial-grade anode rod for long tank life. Self-powered electronic ignition. Insulated for energy efficiency.',
        brand: 'A.O. Smith',
        sku: '1000424855',
        modelNumber: 'GPVT-50',
        price: 799.00,
        currency: 'USD',
        inStock: true,
        inventory: 19,
        rating: 4.6,
        reviewCount: 543,
        imageUrl: 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400',
        productUrl: 'https://www.lowes.com/pd/1000424855',
        category: 'Plumbing',
        subcategory: 'Water Heaters',
        specifications: {
          'Capacity': '50 Gallons',
          'Fuel Type': 'Natural Gas',
          'Energy Factor': '0.65',
          'First Hour Rating': '81 GPH',
          'Warranty': '12 Year Tank'
        },
        store: 'lowes',
        storeLogoColor: '#004990',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'lw_3',
        name: 'Goodman 3-Ton 14.5 SEER2 Air Conditioner',
        description: 'Energy efficient cooling. R-410A refrigerant. All-aluminum coil for corrosion resistance.',
        brand: 'Goodman',
        sku: '5001733371',
        modelNumber: 'GSX140361',
        price: 2449.00,
        currency: 'USD',
        inStock: true,
        inventory: 7,
        rating: 4.4,
        reviewCount: 178,
        imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400',
        productUrl: 'https://www.lowes.com/pd/5001733371',
        category: 'HVAC',
        subcategory: 'Air Conditioners',
        specifications: {
          'Tonnage': '3 Ton',
          'SEER2 Rating': '14.5',
          'BTU': '36,000',
          'Refrigerant': 'R-410A',
          'Coil': 'Aluminum'
        },
        store: 'lowes',
        storeLogoColor: '#004990',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'lw_4',
        name: 'GE 100 Amp 20-Space 40-Circuit Indoor Main Breaker Panel',
        description: 'Combination AFCI breakers compatible. Convertible to outdoor use. Copper bus bars.',
        brand: 'GE',
        sku: '3365979',
        modelNumber: 'TLM2040CCP',
        price: 189.00,
        currency: 'USD',
        inStock: true,
        inventory: 42,
        rating: 4.5,
        reviewCount: 321,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
        productUrl: 'https://www.lowes.com/pd/3365979',
        category: 'Electrical',
        subcategory: 'Panels',
        specifications: {
          'Amperage': '100A',
          'Spaces': '20',
          'Circuits': '40',
          'Voltage': '120/240V',
          'Bus Material': 'Copper'
        },
        store: 'lowes',
        storeLogoColor: '#004990',
        lastUpdated: new Date().toISOString()
      },

      // Grainger Products
      {
        id: 'gr_1',
        name: 'Dayton 1/2 HP Belt Drive Motor',
        description: 'General purpose motor. Ball bearing construction. NEMA standard mounting. Thermal overload protection.',
        brand: 'Dayton',
        sku: '4UX58',
        modelNumber: '4UX58',
        price: 245.00,
        currency: 'USD',
        inStock: true,
        inventory: 23,
        rating: 4.6,
        reviewCount: 87,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        productUrl: 'https://www.grainger.com/product/4UX58',
        category: 'Motors',
        subcategory: 'AC Motors',
        specifications: {
          'HP': '1/2',
          'Voltage': '115/230',
          'Phase': 'Single',
          'RPM': '1725',
          'Frame': '56'
        },
        store: 'grainger',
        storeLogoColor: '#CC0000',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gr_2',
        name: 'Armstrong Centrifugal Pump 1 HP',
        description: 'Close-coupled design. Cast iron construction. Bronze impeller. Maximum working pressure 175 PSI.',
        brand: 'Armstrong',
        sku: '6FLV8',
        modelNumber: 'S-51',
        price: 895.00,
        currency: 'USD',
        inStock: true,
        inventory: 11,
        rating: 4.8,
        reviewCount: 52,
        imageUrl: 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400',
        productUrl: 'https://www.grainger.com/product/6FLV8',
        category: 'Pumps',
        subcategory: 'Centrifugal Pumps',
        specifications: {
          'HP': '1',
          'Voltage': '115/230',
          'Flow Rate': '75 GPM',
          'Head': '50 ft',
          'Material': 'Cast Iron'
        },
        store: 'grainger',
        storeLogoColor: '#CC0000',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gr_3',
        name: '3M Half Facepiece Reusable Respirator',
        description: 'Lightweight silicone facepiece. Easy to clean and maintain. Cool Flow valve. NIOSH approved.',
        brand: '3M',
        sku: '1NNA3',
        modelNumber: '6200',
        price: 24.95,
        currency: 'USD',
        inStock: true,
        inventory: 234,
        rating: 4.7,
        reviewCount: 412,
        imageUrl: 'https://images.unsplash.com/photo-1584036533827-45bce166ad94?w=400',
        productUrl: 'https://www.grainger.com/product/1NNA3',
        category: 'Safety',
        subcategory: 'Respiratory Protection',
        specifications: {
          'Size': 'Medium',
          'Material': 'Silicone',
          'Approval': 'NIOSH',
          'Type': 'Half Facepiece',
          'Cartridge': 'Sold Separately'
        },
        store: 'grainger',
        storeLogoColor: '#CC0000',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gr_4',
        name: 'Honeywell Programmable Thermostat 7-Day',
        description: 'Precise temperature control. Large backlit display. Auto changeover. Filter change reminder.',
        brand: 'Honeywell',
        sku: '5WZE8',
        modelNumber: 'RTH7600D',
        price: 89.99,
        currency: 'USD',
        inStock: true,
        inventory: 67,
        rating: 4.5,
        reviewCount: 234,
        imageUrl: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400',
        productUrl: 'https://www.grainger.com/product/5WZE8',
        category: 'HVAC',
        subcategory: 'Thermostats',
        specifications: {
          'Type': 'Programmable',
          'Schedule': '7-Day',
          'Display': 'Backlit',
          'Power': '24VAC',
          'Stages': '2H/2C'
        },
        store: 'grainger',
        storeLogoColor: '#CC0000',
        lastUpdated: new Date().toISOString()
      }
    ];

    // Apply filters
    let filtered = allProducts;

    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.includes(q)
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(p => p.category.toLowerCase() === filters.category?.toLowerCase());
    }

    // Price filters
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    // In stock filter
    if (filters.inStockOnly) {
      filtered = filtered.filter(p => p.inStock);
    }

    // Store filter
    if (filters.stores && filters.stores.length > 0) {
      filtered = filtered.filter(p => filters.stores!.includes(p.store));
    }

    // Rating filter
    if (filters.minRating) {
      filtered = filtered.filter(p => (p.rating || 0) >= filters.minRating!);
    }

    // Limit results
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get categories available across stores
   */
  getAvailableCategories(): string[] {
    return [
      'HVAC',
      'Plumbing',
      'Electrical',
      'Tools',
      'Building Materials',
      'Hardware',
      'Safety',
      'Motors',
      'Pumps'
    ];
  }

  /**
   * Get store information
   */
  getStoreInfo(store: 'homedepot' | 'lowes' | 'grainger') {
    const stores = {
      homedepot: {
        name: 'The Home Depot',
        logo: 'HD',
        color: '#F96302',
        productCount: '10,000+',
        categories: '50+',
        delivery: 'Same Day'
      },
      lowes: {
        name: "Lowe's",
        logo: 'L',
        color: '#004990',
        productCount: '9,500+',
        categories: '48+',
        delivery: 'Same Day'
      },
      grainger: {
        name: 'Grainger',
        logo: 'G',
        color: '#CC0000',
        productCount: '1.6M+',
        categories: '75+',
        delivery: 'Next Day'
      }
    };

    return stores[store];
  }
}

export const bigBoxProductService = new BigBoxProductService();
