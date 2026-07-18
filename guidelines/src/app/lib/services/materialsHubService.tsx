/**
 * Materials Hub Service
 * Manages product catalog, vendor materials, AI search, and real-time pricing
 */

export interface Material {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  sku: string;
  unit: string;
  
  // Pricing
  basePrice: number;
  vendorPrices: VendorPrice[];
  bulkDiscounts?: BulkDiscount[];
  
  // Quality & Specs
  qualityRating: number; // 1-5
  specifications: Record<string, string>;
  certifications: string[];
  warranty?: string;
  
  // Availability
  inStock: boolean;
  leadTime: string;
  minOrderQuantity: number;
  
  // Media
  imageUrl?: string;
  dataSheetUrl?: string;
  
  // Vendor Info
  vendorId?: string;
  vendorName?: string;
  isPublic: boolean;
  isPremium: boolean;
  
  // Metadata
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorPrice {
  vendorId: string;
  vendorName: string;
  price: number;
  availability: 'in-stock' | 'low-stock' | 'out-of-stock' | 'made-to-order';
  leadTime: string;
  shippingCost?: number;
  minOrderQty: number;
  lastUpdated: string;
  vendorRating: number;
}

export interface BulkDiscount {
  minQuantity: number;
  discountPercent: number;
  price: number;
}

export interface MaterialCategory {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
  productCount: number;
}

export interface AISearchRequest {
  query: string;
  context?: string;
  budget?: number;
  qualityPreference?: 'economy' | 'standard' | 'premium';
  urgency?: 'standard' | 'rush';
}

export interface AISearchResult {
  materials: Material[];
  suggestion: string;
  alternatives: Material[];
  estimatedTotal: number;
  confidence: number;
}

class MaterialsHubService {
  private materialsKey = 'materials_hub';
  private categoriesKey = 'material_categories';
  private versionKey = 'materials_hub_version';
  private currentVersion = 10; // Increment this when adding new default materials

  // Get all materials
  getAllMaterials(): Material[] {
    // FORCE CLEAR - Check if we need to update the materials database
    const savedVersion = localStorage.getItem(this.versionKey);
    const version = savedVersion ? parseInt(savedVersion) : 0;
    
    // If version is outdated, FORCE CLEAR and reload default materials
    if (version < this.currentVersion) {
      console.log('🔄 Materials database updating from version', version, 'to', this.currentVersion);
      // NUCLEAR OPTION: Clear ALL materials cache completely
      localStorage.removeItem(this.materialsKey);
      localStorage.removeItem(this.categoriesKey);
      localStorage.removeItem(this.versionKey); // Clear version too to force fresh
      console.log('💥 Old cache completely cleared');
      // Generate fresh materials
      const materials = this.getDefaultMaterials();
      // Save new version
      localStorage.setItem(this.versionKey, this.currentVersion.toString());
      console.log('✅ Loaded', materials.length, 'fresh materials (cache rebuilt)');
      console.log('🔍 Sample materials:', materials.slice(0, 5).map(m => m.name));
      return materials;
    }
    
    const data = localStorage.getItem(this.materialsKey);
    if (data) {
      const materials = JSON.parse(data);
      console.log('📦 Loaded', materials.length, 'materials from cache (version', version, ')');
      return materials;
    }
    
    console.log('⚠️ No cache found, loading defaults');
    return this.getDefaultMaterials();
  }

  // Search materials
  searchMaterials(query: string, filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minQuality?: number;
    inStockOnly?: boolean;
    vendorId?: string;
  }): Material[] {
    let materials = this.getAllMaterials();
    
    // Text search
    if (query) {
      const q = query.toLowerCase();
      materials = materials.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    
    // Apply filters
    if (filters) {
      if (filters.category) {
        materials = materials.filter(m => m.category === filters.category);
      }
      if (filters.minPrice !== undefined) {
        materials = materials.filter(m => m.basePrice >= filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        materials = materials.filter(m => m.basePrice <= filters.maxPrice);
      }
      if (filters.minQuality) {
        materials = materials.filter(m => m.qualityRating >= filters.minQuality);
      }
      if (filters.inStockOnly) {
        materials = materials.filter(m => m.inStock);
      }
      if (filters.vendorId) {
        materials = materials.filter(m => m.vendorId === filters.vendorId);
      }
    }
    
    return materials;
  }

  // AI-powered search
  async aiSearch(request: AISearchRequest): Promise<AISearchResult> {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const materials = this.intelligentSearch(request);
    const alternatives = this.findAlternatives(materials, request);
    
    return {
      materials: materials.slice(0, 10),
      suggestion: this.generateSuggestion(request, materials),
      alternatives: alternatives.slice(0, 5),
      estimatedTotal: materials.reduce((sum, m) => sum + m.basePrice, 0),
      confidence: 0.85 + Math.random() * 0.15
    };
  }

  private intelligentSearch(request: AISearchRequest): Material[] {
    let materials = this.searchMaterials(request.query);
    
    // Apply quality preference
    if (request.qualityPreference === 'premium') {
      materials = materials.filter(m => m.qualityRating >= 4);
    } else if (request.qualityPreference === 'economy') {
      materials = materials.filter(m => m.qualityRating >= 3);
    }
    
    // Apply budget filter
    if (request.budget) {
      materials = materials.filter(m => m.basePrice <= request.budget);
    }
    
    // Apply urgency filter
    if (request.urgency === 'rush') {
      materials = materials.filter(m => m.inStock);
    }
    
    // Sort by relevance (quality + price)
    materials.sort((a, b) => {
      const scoreA = a.qualityRating - (a.basePrice / 1000);
      const scoreB = b.qualityRating - (b.basePrice / 1000);
      return scoreB - scoreA;
    });
    
    return materials;
  }

  private findAlternatives(primaryMaterials: Material[], request: AISearchRequest): Material[] {
    if (primaryMaterials.length === 0) return [];
    
    const primary = primaryMaterials[0];
    const all = this.getAllMaterials();
    
    return all.filter(m => 
      m.id !== primary.id &&
      m.category === primary.category &&
      Math.abs(m.basePrice - primary.basePrice) < primary.basePrice * 0.3
    ).slice(0, 5);
  }

  private generateSuggestion(request: AISearchRequest, materials: Material[]): string {
    if (materials.length === 0) {
      return "No materials found matching your criteria. Try broadening your search or adjusting filters.";
    }
    
    const avgPrice = materials.reduce((sum, m) => sum + m.basePrice, 0) / materials.length;
    const avgQuality = materials.reduce((sum, m) => sum + m.qualityRating, 0) / materials.length;
    
    return `Found ${materials.length} materials matching "${request.query}". Average price: $${avgPrice.toFixed(2)}, Average quality: ${avgQuality.toFixed(1)}/5. ${
      request.qualityPreference === 'premium' 
        ? 'Showing premium options with higher quality ratings.' 
        : request.qualityPreference === 'economy'
        ? 'Showing economical options with good value.'
        : 'Showing balanced options for quality and price.'
    }`;
  }

  // Get best price for material across vendors
  getBestPrice(materialId: string): VendorPrice | null {
    const material = this.getAllMaterials().find(m => m.id === materialId);
    if (!material || material.vendorPrices.length === 0) return null;
    
    return material.vendorPrices.reduce((best, current) => 
      current.price < best.price ? current : best
    );
  }

  // Compare materials
  compareMaterials(materialIds: string[]): Material[] {
    const all = this.getAllMaterials();
    return materialIds.map(id => all.find(m => m.id === id)).filter(Boolean) as Material[];
  }

  // Get categories
  getCategories(): MaterialCategory[] {
    const data = localStorage.getItem(this.categoriesKey);
    return data ? JSON.parse(data) : this.getDefaultCategories();
  }

  // Add material to quote
  addToQuote(materialId: string, quantity: number, quoteId: string): void {
    const material = this.getAllMaterials().find(m => m.id === materialId);
    if (!material) return;
    
    const quoteItems = JSON.parse(localStorage.getItem(`quote_items_${quoteId}`) || '[]');
    quoteItems.push({
      materialId,
      material,
      quantity,
      unitPrice: material.basePrice,
      total: material.basePrice * quantity,
      addedAt: new Date().toISOString()
    });
    
    localStorage.setItem(`quote_items_${quoteId}`, JSON.stringify(quoteItems));
  }

  // Get vendor's materials
  getVendorMaterials(vendorId: string): Material[] {
    return this.getAllMaterials().filter(m => m.vendorId === vendorId);
  }

  // Default categories
  private getDefaultCategories(): MaterialCategory[] {
    const categories: MaterialCategory[] = [
      {
        id: 'hvac',
        name: 'HVAC Equipment',
        icon: '❄️',
        subcategories: ['Air Conditioners', 'Furnaces', 'Heat Pumps', 'Thermostats', 'Ductwork', 'Vents'],
        productCount: 45
      },
      {
        id: 'plumbing',
        name: 'Plumbing',
        icon: '🚰',
        subcategories: ['Pipes', 'Fittings', 'Fixtures', 'Valves', 'Water Heaters', 'Drains'],
        productCount: 67
      },
      {
        id: 'electrical',
        name: 'Electrical',
        icon: '⚡',
        subcategories: ['Wiring', 'Outlets', 'Switches', 'Panels', 'Breakers', 'Lighting'],
        productCount: 89
      },
      {
        id: 'building',
        name: 'Building Materials',
        icon: '🏗️',
        subcategories: ['Lumber', 'Drywall', 'Insulation', 'Roofing', 'Flooring', 'Paint'],
        productCount: 123
      },
      {
        id: 'tools',
        name: 'Tools & Equipment',
        icon: '🔧',
        subcategories: ['Power Tools', 'Hand Tools', 'Safety Equipment', 'Ladders', 'Storage'],
        productCount: 78
      },
      {
        id: 'hardware',
        name: 'Hardware & Fasteners',
        icon: '🔩',
        subcategories: ['Screws', 'Nails', 'Bolts', 'Anchors', 'Brackets', 'Hinges'],
        productCount: 156
      }
    ];
    
    localStorage.setItem(this.categoriesKey, JSON.stringify(categories));
    return categories;
  }

  // Default materials
  private getDefaultMaterials(): Material[] {
    const materials: Material[] = [
      // HVAC Equipment
      {
        id: 'mat_hvac_001',
        name: 'Carrier 3-Ton Central Air Conditioner',
        description: 'High-efficiency 16 SEER central air conditioning unit with R-410A refrigerant. Ideal for residential applications up to 1,800 sq ft.',
        category: 'HVAC Equipment',
        subcategory: 'Air Conditioners',
        manufacturer: 'Carrier',
        sku: 'CA-25HCB336A',
        unit: 'unit',
        basePrice: 2850.00,
        vendorPrices: [
          {
            vendorId: 'vendor_1',
            vendorName: 'HVAC Supply Pro',
            price: 2850.00,
            availability: 'in-stock',
            leadTime: '2-3 days',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.8
          },
          {
            vendorId: 'vendor_2',
            vendorName: 'Climate Control Distributors',
            price: 2920.00,
            availability: 'in-stock',
            leadTime: '1-2 days',
            shippingCost: 75,
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.6
          }
        ],
        bulkDiscounts: [
          { minQuantity: 3, discountPercent: 5, price: 2707.50 },
          { minQuantity: 5, discountPercent: 8, price: 2622.00 }
        ],
        qualityRating: 4.8,
        specifications: {
          'SEER Rating': '16',
          'Cooling Capacity': '36,000 BTU',
          'Refrigerant Type': 'R-410A',
          'Voltage': '208-230V',
          'Warranty': '10 years compressor, 5 years parts'
        },
        certifications: ['ENERGY STAR', 'AHRI Certified'],
        warranty: '10 years compressor, 5 years parts',
        inStock: true,
        leadTime: '2-3 days',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400',
        isPublic: true,
        isPremium: true,
        tags: ['hvac', 'air conditioner', 'residential', 'energy efficient', 'carrier'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_hvac_002',
        name: 'Honeywell T6 Pro Programmable Thermostat',
        description: 'WiFi-enabled smart thermostat with 7-day programming and energy-saving features. Compatible with most HVAC systems.',
        category: 'HVAC Equipment',
        subcategory: 'Thermostats',
        manufacturer: 'Honeywell',
        sku: 'TH6320WF2003',
        unit: 'unit',
        basePrice: 145.00,
        vendorPrices: [
          {
            vendorId: 'vendor_1',
            vendorName: 'HVAC Supply Pro',
            price: 145.00,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.8
          },
          {
            vendorId: 'vendor_3',
            vendorName: 'Smart Home Supply',
            price: 138.00,
            availability: 'in-stock',
            leadTime: '1-2 days',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.9
          }
        ],
        qualityRating: 4.6,
        specifications: {
          'Display': 'Color touchscreen',
          'WiFi': 'Yes',
          'Compatibility': 'Most HVAC systems',
          'Power': '24VAC',
          'App Control': 'iOS and Android'
        },
        certifications: ['UL Listed'],
        warranty: '3 years',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['thermostat', 'smart home', 'wifi', 'programmable', 'honeywell'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Plumbing
      {
        id: 'mat_plumb_001',
        name: 'Rheem 50 Gallon Gas Water Heater',
        description: 'Natural gas water heater with 50-gallon capacity. Energy-efficient with electronic ignition and status LED.',
        category: 'Plumbing',
        subcategory: 'Water Heaters',
        manufacturer: 'Rheem',
        sku: 'XG50T09HE40U0',
        unit: 'unit',
        basePrice: 685.00,
        vendorPrices: [
          {
            vendorId: 'vendor_4',
            vendorName: 'Plumbing Wholesale Direct',
            price: 685.00,
            availability: 'in-stock',
            leadTime: '3-5 days',
            shippingCost: 95,
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.7
          }
        ],
        qualityRating: 4.5,
        specifications: {
          'Capacity': '50 gallons',
          'Fuel Type': 'Natural Gas',
          'Recovery Rate': '53 gallons/hour',
          'Energy Factor': '0.67',
          'Dimensions': '22" D x 60" H'
        },
        certifications: ['UL Listed', 'Energy Star'],
        warranty: '6 year tank and parts',
        inStock: true,
        leadTime: '3-5 days',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['water heater', 'gas', 'residential', 'rheem'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_plumb_002',
        name: 'Copper Pipe Type L - 3/4 inch',
        description: 'Premium copper tubing Type L for potable water and HVAC applications. Sold per foot.',
        category: 'Plumbing',
        subcategory: 'Pipes',
        manufacturer: 'Mueller Industries',
        sku: 'CP-075-L',
        unit: 'foot',
        basePrice: 4.85,
        vendorPrices: [
          {
            vendorId: 'vendor_4',
            vendorName: 'Plumbing Wholesale Direct',
            price: 4.85,
            availability: 'in-stock',
            leadTime: '1-2 days',
            minOrderQty: 10,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.7
          },
          {
            vendorId: 'vendor_5',
            vendorName: 'Metro Supply House',
            price: 4.65,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 20,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.8
          }
        ],
        bulkDiscounts: [
          { minQuantity: 100, discountPercent: 10, price: 4.37 },
          { minQuantity: 500, discountPercent: 15, price: 4.12 }
        ],
        qualityRating: 4.9,
        specifications: {
          'Type': 'Type L',
          'Size': '3/4 inch',
          'Material': 'Copper',
          'Wall Thickness': '0.045"',
          'Working Pressure': '420 PSI'
        },
        certifications: ['ASTM B88', 'NSF-61'],
        warranty: 'Manufacturer defects',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 10,
        isPublic: true,
        isPremium: true,
        tags: ['copper', 'pipe', 'plumbing', 'water line'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Electrical
      {
        id: 'mat_elec_001',
        name: 'Square D 200A Main Breaker Panel',
        description: '200 amp main breaker load center with 40 circuit spaces. Indoor rated with copper bus bars.',
        category: 'Electrical',
        subcategory: 'Panels',
        manufacturer: 'Square D',
        sku: 'HOM4080M200PC',
        unit: 'unit',
        basePrice: 285.00,
        vendorPrices: [
          {
            vendorId: 'vendor_6',
            vendorName: 'Electrical Supplies Inc',
            price: 285.00,
            availability: 'in-stock',
            leadTime: '2-3 days',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.9
          }
        ],
        qualityRating: 4.8,
        specifications: {
          'Amperage': '200A',
          'Spaces': '40 circuits',
          'Bus Rating': 'Copper',
          'Voltage': '120/240V',
          'Type': 'Main breaker'
        },
        certifications: ['UL Listed', 'CSA Approved'],
        warranty: '1 year',
        inStock: true,
        leadTime: '2-3 days',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
        isPublic: true,
        isPremium: true,
        tags: ['electrical panel', 'breaker box', 'square d', 'load center'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_elec_002',
        name: 'Romex 12/2 NM-B Cable',
        description: 'Non-metallic sheathed cable with ground for residential wiring. 12 AWG, 2 conductor plus ground.',
        category: 'Electrical',
        subcategory: 'Wiring',
        manufacturer: 'Southwire',
        sku: 'ROM-122-250',
        unit: 'foot',
        basePrice: 0.68,
        vendorPrices: [
          {
            vendorId: 'vendor_6',
            vendorName: 'Electrical Supplies Inc',
            price: 0.68,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 50,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.9
          }
        ],
        bulkDiscounts: [
          { minQuantity: 250, discountPercent: 8, price: 0.63 },
          { minQuantity: 1000, discountPercent: 12, price: 0.60 }
        ],
        qualityRating: 4.7,
        specifications: {
          'Wire Size': '12 AWG',
          'Conductors': '2 + Ground',
          'Insulation': 'PVC',
          'Temperature Rating': '90°C',
          'Ampacity': '20A'
        },
        certifications: ['UL Listed', 'NEC Compliant'],
        warranty: 'Manufacturer defects',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 50,
        isPublic: true,
        isPremium: false,
        tags: ['wire', 'romex', 'electrical', 'nm-b', 'cable'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Building Materials
      {
        id: 'mat_build_001',
        name: '2x4x8 Premium Kiln-Dried Lumber',
        description: 'Premium grade kiln-dried dimensional lumber. Straight, minimal knots, ideal for framing.',
        category: 'Building Materials',
        subcategory: 'Lumber',
        manufacturer: 'Various',
        sku: 'LUM-2X4X8-KD',
        unit: 'piece',
        basePrice: 6.85,
        vendorPrices: [
          {
            vendorId: 'vendor_7',
            vendorName: 'Builders Supply Co',
            price: 6.85,
            availability: 'in-stock',
            leadTime: '1-2 days',
            minOrderQty: 10,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.6
          }
        ],
        bulkDiscounts: [
          { minQuantity: 100, discountPercent: 10, price: 6.17 },
          { minQuantity: 500, discountPercent: 15, price: 5.82 }
        ],
        qualityRating: 4.4,
        specifications: {
          'Dimensions': '1.5" x 3.5" x 8\'',
          'Grade': 'Premium',
          'Moisture Content': '<19%',
          'Treatment': 'Kiln-dried',
          'Species': 'SPF'
        },
        certifications: ['Graded'],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1-2 days',
        minOrderQuantity: 10,
        imageUrl: 'https://images.unsplash.com/photo-1601821765780-754fa98637c1?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['lumber', 'wood', 'framing', '2x4', 'dimensional'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_build_002',
        name: '1/2" x 4x8 Drywall Sheet',
        description: 'Standard gypsum drywall panel for interior walls and ceilings. Tapered edges for easy finishing.',
        category: 'Building Materials',
        subcategory: 'Drywall',
        manufacturer: 'USG',
        sku: 'DW-1248-R',
        unit: 'sheet',
        basePrice: 12.50,
        vendorPrices: [
          {
            vendorId: 'vendor_7',
            vendorName: 'Builders Supply Co',
            price: 12.50,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 10,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.6
          }
        ],
        bulkDiscounts: [
          { minQuantity: 50, discountPercent: 8, price: 11.50 },
          { minQuantity: 100, discountPercent: 12, price: 11.00 }
        ],
        qualityRating: 4.5,
        specifications: {
          'Thickness': '1/2"',
          'Size': '4\' x 8\'',
          'Edge': 'Tapered',
          'Type': 'Regular',
          'Weight': '54 lbs'
        },
        certifications: ['ASTM C36'],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 10,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['drywall', 'sheetrock', 'gypsum', 'walls'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Tools
      {
        id: 'mat_tool_001',
        name: 'DeWalt 20V MAX Cordless Drill/Driver Kit',
        description: 'Brushless motor cordless drill with 2 batteries, charger, and case. 1/2" chuck, 2-speed transmission.',
        category: 'Tools & Equipment',
        subcategory: 'Power Tools',
        manufacturer: 'DeWalt',
        sku: 'DCD791D2',
        unit: 'kit',
        basePrice: 179.00,
        vendorPrices: [
          {
            vendorId: 'vendor_8',
            vendorName: 'Tool Depot',
            price: 179.00,
            availability: 'in-stock',
            leadTime: '1-2 days',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.9
          }
        ],
        qualityRating: 4.9,
        specifications: {
          'Voltage': '20V MAX',
          'Chuck Size': '1/2"',
          'Max Torque': '460 UWO',
          'Speed': '0-450/0-1,500 RPM',
          'Battery': '2.0Ah Li-ion (2 included)'
        },
        certifications: ['UL Listed'],
        warranty: '3 year limited',
        inStock: true,
        leadTime: '1-2 days',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
        isPublic: true,
        isPremium: true,
        tags: ['drill', 'power tool', 'cordless', 'dewalt', 'battery'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Paint & Finishing Supplies
      {
        id: 'mat_paint_001',
        name: '3M Pro-Grade Sandpaper Assortment (60-220 Grit)',
        description: 'Professional grade aluminum oxide sandpaper sheets. Includes 60, 80, 120, 150, 220 grit. 9x11 sheets, 25-pack.',
        category: 'Building Materials',
        subcategory: 'Paint',
        manufacturer: '3M',
        sku: '3M-SAND-ASST',
        unit: 'pack',
        basePrice: 18.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 18.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          },
          {
            vendorId: 'vendor_10',
            vendorName: "Lowe's",
            price: 19.49,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.4
          }
        ],
        qualityRating: 4.7,
        specifications: {
          'Grit Range': '60-220',
          'Sheet Size': '9" x 11"',
          'Quantity': '25 sheets',
          'Material': 'Aluminum Oxide',
          'Backing': 'Paper'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['sandpaper', 'abrasive', 'finishing', 'paint prep', 'sanding'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_paint_002',
        name: 'Sherwin-Williams ProClassic Interior Paint (Gallon)',
        description: 'Premium acrylic latex paint with excellent coverage and durability. Low VOC, smooth finish.',
        category: 'Building Materials',
        subcategory: 'Paint',
        manufacturer: 'Sherwin-Williams',
        sku: 'SW-PROCLASSIC-GAL',
        unit: 'gallon',
        basePrice: 54.99,
        vendorPrices: [
          {
            vendorId: 'vendor_11',
            vendorName: 'Sherwin-Williams Store',
            price: 54.99,
            availability: 'in-stock',
            leadTime: 'same day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.8
          }
        ],
        qualityRating: 4.8,
        specifications: {
          'Type': 'Acrylic Latex',
          'Coverage': '350-400 sq ft/gallon',
          'Finish': 'Semi-Gloss',
          'VOC': 'Low',
          'Dry Time': '1 hour'
        },
        certifications: ['GreenGuard Gold'],
        warranty: 'N/A',
        inStock: true,
        leadTime: 'same day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
        isPublic: true,
        isPremium: true,
        tags: ['paint', 'interior', 'latex', 'premium', 'low voc'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_paint_003',
        name: 'Purdy White Dove 9" Paint Roller Cover',
        description: 'Premium woven roller cover for smooth to semi-smooth surfaces. 3/8" nap, lint-free finish.',
        category: 'Building Materials',
        subcategory: 'Paint',
        manufacturer: 'Purdy',
        sku: 'PURDY-WD-9',
        unit: 'piece',
        basePrice: 7.49,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 7.49,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.6,
        specifications: {
          'Width': '9 inches',
          'Nap': '3/8 inch',
          'Material': 'Woven',
          'Core': 'Polypropylene'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['roller', 'paint', 'applicator', 'purdy'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_paint_004',
        name: 'FrogTape Multi-Surface Painter\'s Tape (1.41" x 60yd)',
        description: 'Premium painter\'s tape with PaintBlock Technology for sharp paint lines. Removes cleanly up to 21 days.',
        category: 'Building Materials',
        subcategory: 'Paint',
        manufacturer: 'FrogTape',
        sku: 'FROG-MS-60',
        unit: 'roll',
        basePrice: 8.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 8.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.8,
        specifications: {
          'Width': '1.41 inches',
          'Length': '60 yards',
          'Surface': 'Multi-Surface',
          'Removal': 'Up to 21 days'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['tape', 'painter tape', 'masking', 'frogtape'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Fasteners & Hardware
      {
        id: 'mat_fastener_001',
        name: 'Grip-Rite #8 x 2-1/2" Wood Screws (1 lb Box)',
        description: 'Phillips flat-head wood screws, coarse thread. Approximately 100 screws per pound.',
        category: 'Building Materials',
        subcategory: 'Hardware',
        manufacturer: 'Grip-Rite',
        sku: 'GR-WS-825',
        unit: 'box',
        basePrice: 6.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 6.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.3,
        specifications: {
          'Size': '#8 x 2-1/2"',
          'Head Type': 'Phillips Flat',
          'Thread': 'Coarse',
          'Material': 'Steel',
          'Finish': 'Zinc Plated'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['screws', 'fasteners', 'wood screws', 'hardware'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_fastener_002',
        name: '16d Common Nails (5 lb Box)',
        description: 'Hot-dipped galvanized common nails for framing. 3-1/2" length, smooth shank.',
        category: 'Building Materials',
        subcategory: 'Hardware',
        manufacturer: 'Various',
        sku: 'NAIL-16D-5LB',
        unit: 'box',
        basePrice: 14.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 14.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.4,
        specifications: {
          'Size': '16d (3-1/2")',
          'Type': 'Common Nail',
          'Finish': 'Hot-Dipped Galvanized',
          'Weight': '5 lbs',
          'Shank': 'Smooth'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['nails', 'framing', 'fasteners', 'galvanized'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Adhesives & Sealants
      {
        id: 'mat_adhesive_001',
        name: 'Liquid Nails Heavy Duty Construction Adhesive',
        description: 'Premium construction adhesive for interior/exterior use. Bonds wood, drywall, concrete, metal.',
        category: 'Building Materials',
        subcategory: 'Adhesives',
        manufacturer: 'Liquid Nails',
        sku: 'LN-HD-10oz',
        unit: 'tube',
        basePrice: 4.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 4.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.5,
        specifications: {
          'Size': '10 oz',
          'Type': 'Construction Adhesive',
          'Application': 'Interior/Exterior',
          'Cure Time': '24 hours',
          'Temperature Range': '-20°F to 140°F'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['adhesive', 'construction', 'glue', 'liquid nails'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_sealant_001',
        name: 'DAP Alex Plus Acrylic Latex Caulk (10.1 oz)',
        description: 'Paintable acrylic latex caulk for interior/exterior. Seals cracks and gaps. White.',
        category: 'Building Materials',
        subcategory: 'Adhesives',
        manufacturer: 'DAP',
        sku: 'DAP-ALEX-WHITE',
        unit: 'tube',
        basePrice: 3.49,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 3.49,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.4,
        specifications: {
          'Size': '10.1 oz',
          'Type': 'Acrylic Latex',
          'Color': 'White',
          'Paintable': 'Yes',
          'Cure Time': '24 hours'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['caulk', 'sealant', 'latex', 'paintable'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Additional Building Materials
      {
        id: 'mat_build_003',
        name: 'Plywood 3/4" x 4x8 BC Grade',
        description: 'Sanded plywood for general construction and shelving. BC grade with one good face.',
        category: 'Building Materials',
        subcategory: 'Lumber',
        manufacturer: 'Various',
        sku: 'PLY-34-48-BC',
        unit: 'sheet',
        basePrice: 48.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 48.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.3,
        specifications: {
          'Thickness': '3/4 inch',
          'Size': '4x8 feet',
          'Grade': 'BC',
          'Type': 'Sanded Plywood',
          'Plies': '7-ply'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1601158935942-52255782d322?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['plywood', 'lumber', 'wood', 'sheet goods'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_build_004',
        name: 'Joint Compound (5 Gallon Bucket)',
        description: 'Pre-mixed all-purpose joint compound for drywall finishing. Ready to use.',
        category: 'Building Materials',
        subcategory: 'Drywall',
        manufacturer: 'USG',
        sku: 'USG-JC-5GAL',
        unit: 'bucket',
        basePrice: 24.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 24.99,
            availability: 'in-stock',
            leadTime: '1 day',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.5,
        specifications: {
          'Size': '5 gallon',
          'Type': 'All-Purpose',
          'Finish': 'Ready-Mixed',
          'Coverage': '~100 sq ft',
          'Dry Time': '24 hours'
        },
        certifications: [],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1 day',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['joint compound', 'drywall mud', 'finishing', 'drywall'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mat_build_005',
        name: 'R-13 Fiberglass Insulation Batt (15" x 93", 10-Pack)',
        description: 'Kraft-faced fiberglass insulation for 2x4 walls. R-13 thermal resistance.',
        category: 'Building Materials',
        subcategory: 'Insulation',
        manufacturer: 'Owens Corning',
        sku: 'OC-R13-15-10',
        unit: 'pack',
        basePrice: 44.99,
        vendorPrices: [
          {
            vendorId: 'vendor_9',
            vendorName: 'Home Depot',
            price: 44.99,
            availability: 'in-stock',
            leadTime: '1-2 days',
            minOrderQty: 1,
            lastUpdated: new Date().toISOString(),
            vendorRating: 4.5
          }
        ],
        qualityRating: 4.4,
        specifications: {
          'R-Value': 'R-13',
          'Width': '15 inches',
          'Length': '93 inches',
          'Thickness': '3.5 inches',
          'Facing': 'Kraft Paper'
        },
        certifications: ['GREENGUARD Gold'],
        warranty: 'N/A',
        inStock: true,
        leadTime: '1-2 days',
        minOrderQuantity: 1,
        imageUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1b9b6d6?w=400',
        isPublic: true,
        isPremium: false,
        tags: ['insulation', 'fiberglass', 'thermal', 'r-13'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    localStorage.setItem(this.materialsKey, JSON.stringify(materials));
    return materials;
  }

  // Save materials
  saveMaterials(materials: Material[]): void {
    localStorage.setItem(this.materialsKey, JSON.stringify(materials));
  }

  // Add new material
  addMaterial(material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Material {
    const materials = this.getAllMaterials();
    const newMaterial: Material = {
      ...material,
      id: `mat_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    materials.push(newMaterial);
    this.saveMaterials(materials);
    
    return newMaterial;
  }
}

export const materialsHubService = new MaterialsHubService();