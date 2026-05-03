import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/materials`;

export interface StoreMaterial {
  id: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  basePrice: number;
  unit: string;
  inStock: boolean;
  qualityRating: number;
  source: 'home_depot' | 'lowes' | 'grainger' | 'local';
  sku?: string;
  imageUrl?: string;
  storeUrl?: string;
}

export interface SearchResult {
  success: boolean;
  products: StoreMaterial[];
  total: number;
  byStore?: {
    home_depot: number;
    lowes: number;
    grainger: number;
  };
  error?: string;
}

// Generate comprehensive mock data for demo/fallback when backend isn't available
function generateMockMaterials(): StoreMaterial[] {
  const materials: StoreMaterial[] = [];
  
  // Home Depot Products (25 items)
  const homeDepotProducts = [
    { name: '2x4x8 Premium Kiln-Dried Lumber', category: 'Lumber', manufacturer: 'Weyerhaeuser', price: 8.97, unit: 'each', rating: 4.5 },
    { name: '2x6x10 Pressure Treated Lumber', category: 'Lumber', manufacturer: 'Severe Weather', price: 14.32, unit: 'each', rating: 4.6 },
    { name: 'Plywood 4x8 1/2" Sanded', category: 'Lumber', manufacturer: 'Columbia Forest Products', price: 42.98, unit: 'sheet', rating: 4.4 },
    { name: 'OSB Sheathing 7/16" 4x8', category: 'Lumber', manufacturer: 'LP', price: 18.67, unit: 'sheet', rating: 4.3 },
    { name: 'Concrete Mix 80lb Bag', category: 'Concrete & Cement', manufacturer: 'Quikrete', price: 4.95, unit: 'bag', rating: 4.6 },
    { name: 'Mortar Mix 80lb Bag', category: 'Concrete & Cement', manufacturer: 'Quikrete', price: 9.48, unit: 'bag', rating: 4.5 },
    { name: 'Sakrete Fast Setting Concrete 50lb', category: 'Concrete & Cement', manufacturer: 'Sakrete', price: 8.64, unit: 'bag', rating: 4.7 },
    { name: 'Interior Latex Paint Gallon - White', category: 'Paint', manufacturer: 'Behr', price: 28.98, unit: 'gallon', rating: 4.5 },
    { name: 'Exterior Paint + Primer Gallon', category: 'Paint', manufacturer: 'Behr Premium Plus', price: 38.98, unit: 'gallon', rating: 4.6 },
    { name: 'Paint Roller Kit 9"', category: 'Paint', manufacturer: 'Wooster', price: 12.97, unit: 'kit', rating: 4.4 },
    { name: 'Asphalt Roof Shingles Bundle', category: 'Roofing', manufacturer: 'GAF', price: 36.48, unit: 'bundle', rating: 4.7 },
    { name: 'Roofing Felt Paper 15lb', category: 'Roofing', manufacturer: 'GAF', price: 15.98, unit: 'roll', rating: 4.5 },
    { name: 'Galvanized Roofing Nails 5lb', category: 'Roofing', manufacturer: 'Grip-Rite', price: 18.97, unit: 'box', rating: 4.6 },
    { name: 'Vinyl Siding 10" x 12ft White', category: 'Siding', manufacturer: 'Georgia-Pacific', price: 8.48, unit: 'piece', rating: 4.4 },
    { name: 'Hardwood Flooring Oak 3/4" x 2-1/4"', category: 'Flooring', manufacturer: 'Bruce', price: 4.18, unit: 'sq ft', rating: 4.8 },
    { name: 'Laminate Flooring 12mm AC4', category: 'Flooring', manufacturer: 'TrafficMaster', price: 1.89, unit: 'sq ft', rating: 4.3 },
    { name: 'Carpet Tile 24x24 Commercial', category: 'Flooring', manufacturer: 'FLOR', price: 3.99, unit: 'tile', rating: 4.5 },
    { name: 'Fiberglass Insulation R-13', category: 'Insulation', manufacturer: 'Owens Corning', price: 42.98, unit: 'roll', rating: 4.6 },
    { name: 'Spray Foam Insulation Can', category: 'Insulation', manufacturer: 'Great Stuff', price: 8.48, unit: 'can', rating: 4.7 },
    { name: 'Drywall 1/2" 4x8 Sheet', category: 'Drywall', manufacturer: 'Sheetrock', price: 11.98, unit: 'sheet', rating: 4.5 },
    { name: 'Joint Compound 4.5 Gallon', category: 'Drywall', manufacturer: 'Sheetrock', price: 12.48, unit: 'pail', rating: 4.6 },
    { name: 'Fiberglass Mesh Tape', category: 'Drywall', manufacturer: 'FibaTape', price: 4.97, unit: 'roll', rating: 4.4 },
    { name: 'Wire Shelving 4ft White', category: 'Organization', manufacturer: 'ClosetMaid', price: 24.98, unit: 'each', rating: 4.5 },
    { name: 'Storage Bins 27 Gallon', category: 'Organization', manufacturer: 'Sterilite', price: 11.97, unit: 'each', rating: 4.6 },
    { name: 'Tool Cabinet 26" 5-Drawer', category: 'Storage', manufacturer: 'Husky', price: 229.00, unit: 'each', rating: 4.7 },
  ];
  
  homeDepotProducts.forEach((p, i) => {
    materials.push({
      id: `hd_${i + 1}`,
      name: p.name,
      description: `Professional-grade ${p.category.toLowerCase()} product from ${p.manufacturer}`,
      category: p.category,
      manufacturer: p.manufacturer,
      basePrice: p.price,
      unit: p.unit,
      inStock: Math.random() > 0.15,
      qualityRating: p.rating,
      source: 'home_depot',
      sku: `HD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 1000000}?w=400`,
      storeUrl: 'https://www.homedepot.com'
    });
  });
  
  // Lowe's Products (25 items)
  const lowesProducts = [
    { name: 'Framing Nails 16d 1lb', category: 'Fasteners', manufacturer: 'Grip-Rite', price: 7.48, unit: 'box', rating: 4.5 },
    { name: 'Drywall Screws 1-5/8" (1lb)', category: 'Fasteners', manufacturer: 'Grip-Rite', price: 6.48, unit: 'box', rating: 4.3 },
    { name: 'Wood Screws Deck 3" (5lb)', category: 'Fasteners', manufacturer: 'GRK', price: 28.97, unit: 'box', rating: 4.7 },
    { name: 'Construction Adhesive Heavy Duty', category: 'Adhesives', manufacturer: 'Loctite', price: 5.98, unit: 'tube', rating: 4.6 },
    { name: 'PVC Cement Medium Body 16oz', category: 'Adhesives', manufacturer: 'Oatey', price: 8.48, unit: 'can', rating: 4.5 },
    { name: 'PVC Pipe 1/2" x 10ft Schedule 40', category: 'Plumbing', manufacturer: 'Charlotte Pipe', price: 3.28, unit: 'each', rating: 4.4 },
    { name: 'PVC Pipe 3/4" x 10ft Schedule 40', category: 'Plumbing', manufacturer: 'Charlotte Pipe', price: 5.48, unit: 'each', rating: 4.5 },
    { name: 'Copper Pipe Type L 1/2" x 10ft', category: 'Plumbing', manufacturer: 'Mueller', price: 24.98, unit: 'each', rating: 4.6 },
    { name: 'PEX Tubing 1/2" x 100ft Red', category: 'Plumbing', manufacturer: 'SharkBite', price: 49.98, unit: 'coil', rating: 4.7 },
    { name: 'Ball Valve 1/2" Brass', category: 'Plumbing', manufacturer: 'BrassCraft', price: 8.97, unit: 'each', rating: 4.5 },
    { name: 'Toilet Flange 3" PVC', category: 'Plumbing', manufacturer: 'Oatey', price: 4.98, unit: 'each', rating: 4.4 },
    { name: 'Romex Wire 12/2 NM-B 250ft', category: 'Electrical', manufacturer: 'Southwire', price: 118.97, unit: 'roll', rating: 4.6 },
    { name: 'Electrical Outlet 15A White (10pk)', category: 'Electrical', manufacturer: 'Leviton', price: 12.98, unit: 'pack', rating: 4.5 },
    { name: 'Light Switch Single-Pole White (10pk)', category: 'Electrical', manufacturer: 'Leviton', price: 11.48, unit: 'pack', rating: 4.6 },
    { name: 'Circuit Breaker 20A Single Pole', category: 'Electrical', manufacturer: 'Square D', price: 8.97, unit: 'each', rating: 4.7 },
    { name: 'LED Light Bulb 60W Equivalent (8pk)', category: 'Lighting', manufacturer: 'Philips', price: 14.98, unit: 'pack', rating: 4.5 },
    { name: 'Ceiling Light Fixture Flush Mount', category: 'Lighting', manufacturer: 'Portfolio', price: 24.98, unit: 'each', rating: 4.4 },
    { name: 'Pendant Light Modern Black', category: 'Lighting', manufacturer: 'allen + roth', price: 79.98, unit: 'each', rating: 4.6 },
    { name: 'Kitchen Faucet Pull-Down Chrome', category: 'Fixtures', manufacturer: 'Moen', price: 128.00, unit: 'each', rating: 4.7 },
    { name: 'Bathroom Faucet 2-Handle Brushed Nickel', category: 'Fixtures', manufacturer: 'Delta', price: 98.00, unit: 'each', rating: 4.6 },
    { name: 'Shower Head Rain 8" Chrome', category: 'Fixtures', manufacturer: 'Pfister', price: 54.98, unit: 'each', rating: 4.5 },
    { name: 'Window Double Hung Vinyl 36x60', category: 'Windows', manufacturer: 'Pella', price: 298.00, unit: 'each', rating: 4.7 },
    { name: 'Storm Door Full View White 36"', category: 'Doors', manufacturer: 'LARSON', price: 228.00, unit: 'each', rating: 4.6 },
    { name: 'Interior Door Slab 6-Panel 30"', category: 'Doors', manufacturer: 'Masonite', price: 68.00, unit: 'each', rating: 4.5 },
    { name: 'Door Lockset Deadbolt Satin Nickel', category: 'Hardware', manufacturer: 'Kwikset', price: 38.98, unit: 'each', rating: 4.6 },
  ];
  
  lowesProducts.forEach((p, i) => {
    materials.push({
      id: `lowes_${i + 1}`,
      name: p.name,
      description: `High-quality ${p.category.toLowerCase()} from ${p.manufacturer}`,
      category: p.category,
      manufacturer: p.manufacturer,
      basePrice: p.price,
      unit: p.unit,
      inStock: Math.random() > 0.15,
      qualityRating: p.rating,
      source: 'lowes',
      sku: `LOW-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      imageUrl: `https://images.unsplash.com/photo-${1600000000000 + i * 1000000}?w=400`,
    });
  });
  
  // Grainger Products (20 items)
  const graingerProducts = [
    { name: 'DeWalt 20V MAX Cordless Drill Kit', category: 'Power Tools', manufacturer: 'DeWalt', price: 149.00, unit: 'each', rating: 4.8 },
    { name: 'Milwaukee M18 Impact Driver', category: 'Power Tools', manufacturer: 'Milwaukee', price: 179.00, unit: 'each', rating: 4.9 },
    { name: 'Makita 7-1/4" Circular Saw', category: 'Power Tools', manufacturer: 'Makita', price: 129.00, unit: 'each', rating: 4.7 },
    { name: 'Bosch Rotary Hammer SDS-Plus', category: 'Power Tools', manufacturer: 'Bosch', price: 199.00, unit: 'each', rating: 4.8 },
    { name: 'Ryobi 10" Miter Saw Compound', category: 'Power Tools', manufacturer: 'Ryobi', price: 169.00, unit: 'each', rating: 4.6 },
    { name: 'Safety Glasses Clear Lens ANSI Z87', category: 'Safety Equipment', manufacturer: '3M', price: 8.50, unit: 'each', rating: 4.7 },
    { name: 'Hard Hat Type 1 Class C White', category: 'Safety Equipment', manufacturer: 'MSA', price: 18.50, unit: 'each', rating: 4.6 },
    { name: 'Work Gloves Leather Palm XL', category: 'Safety Equipment', manufacturer: 'Ironclad', price: 12.98, unit: 'pair', rating: 4.5 },
    { name: 'Dust Mask N95 (20pk)', category: 'Safety Equipment', manufacturer: '3M', price: 24.98, unit: 'box', rating: 4.7 },
    { name: 'Hearing Protection Earmuffs NRR 27', category: 'Safety Equipment', manufacturer: 'Howard Leight', price: 19.98, unit: 'each', rating: 4.6 },
    { name: 'Safety Vest Class 2 Hi-Vis Orange', category: 'Safety Equipment', manufacturer: 'ML Kishigo', price: 14.98, unit: 'each', rating: 4.5 },
    { name: 'HVAC Filter 16x25x1 MERV 11 (6pk)', category: 'HVAC', manufacturer: 'Filtrete', price: 42.98, unit: 'pack', rating: 4.6 },
    { name: 'Duct Tape 2" x 60yd Silver', category: 'Tapes & Adhesives', manufacturer: 'Gorilla', price: 8.98, unit: 'roll', rating: 4.7 },
    { name: 'Masking Tape 1.5" x 60yd (6pk)', category: 'Tapes & Adhesives', manufacturer: '3M', price: 18.48, unit: 'pack', rating: 4.5 },
    { name: 'Steel Tape Measure 25ft', category: 'Hand Tools', manufacturer: 'Stanley', price: 24.98, unit: 'each', rating: 4.7 },
    { name: 'Torpedo Level 9" Magnetic', category: 'Hand Tools', manufacturer: 'Stanley', price: 12.98, unit: 'each', rating: 4.6 },
    { name: 'Utility Knife Heavy Duty Retractable', category: 'Hand Tools', manufacturer: 'Milwaukee', price: 16.98, unit: 'each', rating: 4.7 },
    { name: 'Hammer Claw 16oz Fiberglass Handle', category: 'Hand Tools', manufacturer: 'Estwing', price: 28.98, unit: 'each', rating: 4.8 },
    { name: 'Screwdriver Set 10-Piece', category: 'Hand Tools', manufacturer: 'Klein Tools', price: 34.98, unit: 'set', rating: 4.7 },
    { name: 'Socket Set 1/2" Drive 42-Piece', category: 'Hand Tools', manufacturer: 'Craftsman', price: 89.98, unit: 'set', rating: 4.6 },
  ];
  
  graingerProducts.forEach((p, i) => {
    materials.push({
      id: `grainger_${i + 1}`,
      name: p.name,
      description: `Professional ${p.category.toLowerCase()} equipment from ${p.manufacturer}`,
      category: p.category,
      manufacturer: p.manufacturer,
      basePrice: p.price,
      unit: p.unit,
      inStock: Math.random() > 0.15,
      qualityRating: p.rating,
      source: 'grainger',
      sku: `GRA-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      imageUrl: `https://images.unsplash.com/photo-${1700000000000 + i * 1000000}?w=400`,
    });
  });
  
  return materials;
}

const MOCK_MATERIALS: StoreMaterial[] = generateMockMaterials();

// Debug: Log the material counts by store
console.log('📊 MOCK_MATERIALS initialized:', {
  total: MOCK_MATERIALS.length,
  home_depot: MOCK_MATERIALS.filter(m => m.source === 'home_depot').length,
  lowes: MOCK_MATERIALS.filter(m => m.source === 'lowes').length,
  grainger: MOCK_MATERIALS.filter(m => m.source === 'grainger').length
});

class MaterialsStoreAPIService {
  private async fetchAPI(endpoint: string): Promise<any> {
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log(`📡 Calling Materials API: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`ℹ️  API not available: ${response.status} - falling back to demo data`);
        return { success: false, products: [], error: `${response.statusText}` };
      }

      return await response.json();
    } catch (error) {
      // Silently fall back to demo data when backend is not available
      console.log('ℹ️  Backend not connected - using demo data');
      return { success: false, products: [], error: 'Backend not available' };
    }
  }

  // Search all stores at once
  async searchAllStores(query: string, enabledStores: string[] = ['home_depot', 'lowes', 'grainger']): Promise<SearchResult> {
    console.log(`🔍 Searching all stores for: "${query}"`);
    console.log(`🏪 Enabled stores:`, enabledStores);
    const storesParam = enabledStores.join(',');
    const result = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&stores=${storesParam}`);
    
    // Fallback to mock data if API fails
    if (!result.success || result.error) {
      console.log('ℹ️  Using demo data - Supabase backend not connected');
      
      // If query is empty, return all materials from enabled stores
      const filtered = query.trim() === '' 
        ? MOCK_MATERIALS.filter(m => enabledStores.includes(m.source))
        : MOCK_MATERIALS.filter(m => 
            enabledStores.includes(m.source) && 
            (m.name.toLowerCase().includes(query.toLowerCase()) || 
             m.description.toLowerCase().includes(query.toLowerCase()) ||
             m.category.toLowerCase().includes(query.toLowerCase()))
          );
      
      const byStore = {
        home_depot: filtered.filter(m => m.source === 'home_depot').length,
        lowes: filtered.filter(m => m.source === 'lowes').length,
        grainger: filtered.filter(m => m.source === 'grainger').length
      };
      
      console.log('📦 Search results breakdown:', {
        query: query || '(empty - show all)',
        totalFiltered: filtered.length,
        byStore,
        sampleResults: filtered.slice(0, 3).map(m => ({ name: m.name, source: m.source }))
      });
      
      return {
        success: true,
        products: filtered,
        total: filtered.length,
        byStore
      };
    }
    
    console.log(`✅ Found ${result.products?.length || 0} products across all stores`);
    return result;
  }

  // Search individual stores
  async searchHomeDepot(query: string): Promise<SearchResult> {
    console.log(`🏠 Calling real Home Depot API for: "${query}"`);
    const result = await this.fetchAPI(`/home-depot/search?q=${encodeURIComponent(query)}`);
    
    if (!result.success || result.error) {
      console.log('⚠️  Home Depot API not available, using demo data');
      // Fallback to mock data only if API fails
      const filtered = query.trim() === '' 
        ? MOCK_MATERIALS.filter(m => m.source === 'home_depot')
        : MOCK_MATERIALS.filter(m => 
            m.source === 'home_depot' && 
            (m.name.toLowerCase().includes(query.toLowerCase()) || 
             m.description.toLowerCase().includes(query.toLowerCase()))
          );
      
      return {
        success: true,
        products: filtered,
        total: filtered.length
      };
    }
    
    console.log(`✅ Real Home Depot API returned ${result.products?.length || 0} products`);
    return result;
  }

  async searchLowes(query: string): Promise<SearchResult> {
    console.log(`🔵 Calling real Lowe's API for: "${query}"`);
    const result = await this.fetchAPI(`/lowes/search?q=${encodeURIComponent(query)}`);
    
    if (!result.success || result.error) {
      console.log('⚠️  Lowe\'s API not available, using demo data');
      const filtered = query.trim() === '' 
        ? MOCK_MATERIALS.filter(m => m.source === 'lowes')
        : MOCK_MATERIALS.filter(m => 
            m.source === 'lowes' && 
            (m.name.toLowerCase().includes(query.toLowerCase()) || 
             m.description.toLowerCase().includes(query.toLowerCase()))
          );
      
      return {
        success: true,
        products: filtered,
        total: filtered.length
      };
    }
    
    console.log(`✅ Real Lowe's API returned ${result.products?.length || 0} products`);
    return result;
  }

  async searchGrainger(query: string): Promise<SearchResult> {
    console.log(`⚙️ Calling real Grainger API for: "${query}"`);
    const result = await this.fetchAPI(`/grainger/search?q=${encodeURIComponent(query)}`);
    
    if (!result.success || result.error) {
      console.log('⚠️  Grainger API not available, using demo data');
      const filtered = query.trim() === '' 
        ? MOCK_MATERIALS.filter(m => m.source === 'grainger')
        : MOCK_MATERIALS.filter(m => 
            m.source === 'grainger' && 
            (m.name.toLowerCase().includes(query.toLowerCase()) || 
             m.description.toLowerCase().includes(query.toLowerCase()))
          );
      
      return {
        success: true,
        products: filtered,
        total: filtered.length
      };
    }
    
    console.log(`✅ Real Grainger API returned ${result.products?.length || 0} products`);
    return result;
  }

  // Get store icon/color
  getStoreInfo(source: string) {
    switch (source) {
      case 'home_depot':
        return {
          name: 'Home Depot',
          color: '#f96302',
          icon: '🏠',
          textColor: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30'
        };
      case 'lowes':
        return {
          name: "Lowe's",
          color: '#004990',
          icon: '🔵',
          textColor: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30'
        };
      case 'grainger':
        return {
          name: 'Grainger',
          color: '#cc0000',
          icon: '⚙️',
          textColor: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30'
        };
      case 'local':
        return {
          name: 'Local Database',
          color: '#ea580c',
          icon: '📦',
          textColor: 'text-[#ea580c]',
          bgColor: 'bg-[#ea580c]/10',
          borderColor: 'border-[#ea580c]/30'
        };
      default:
        return {
          name: 'Unknown',
          color: '#666',
          icon: '❓',
          textColor: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30'
        };
    }
  }
}

export const materialsStoreAPI = new MaterialsStoreAPIService();