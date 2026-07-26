/**
 * Product Data Source Manager
 * Unified system supporting multiple product data sources:
 * - Direct APIs (Home Depot, Lowe's, Grainger)
 * - Third-party providers (Rainforest, Oxylabs, Bright Data)
 * - Custom vendor catalogs
 * - Manual/reference pricing
 */

import { projectId, publicAnonKey } from '../../utils/supabase/info';

export type DataSourceType = 
  | 'direct-api'          // Official store APIs (Home Depot, Lowe's, Grainger)
  | 'third-party'         // Rainforest API, Oxylabs, Bright Data
  | 'vendor-catalog'      // Custom vendor uploads
  | 'manual-reference';   // Manual price entry

export type StoreProvider = 'homedepot' | 'lowes' | 'grainger' | 'menards' | 'acehardware';
export type ThirdPartyProvider = 'rainforest' | 'oxylabs' | 'brightdata' | 'scrapingbee';

export interface DataSourceConfig {
  id: string;
  type: DataSourceType;
  name: string;
  enabled: boolean;
  priority: number; // Lower = higher priority
  provider?: StoreProvider | ThirdPartyProvider | string;
  hasCredentials: boolean;
  credentialsValid: boolean;
  lastSync?: string;
  config: {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    rateLimit?: number;
    timeout?: number;
    customSettings?: Record<string, any>;
  };
}

export interface ProductSearchOptions {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  minRating?: number;
  stores?: string[];
  limit?: number;
  dataSources?: DataSourceType[]; // Which sources to search
  forceFallback?: boolean; // Skip to fallback even if APIs available
}

export interface UnifiedProduct {
  id: string;
  source: string; // 'homedepot-api', 'rainforest-homedepot', 'vendor-abc', 'manual'
  sourceType: DataSourceType;
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
  productUrl?: string;
  category: string;
  subcategory?: string;
  specifications: Record<string, string>;
  store?: StoreProvider;
  storeLogoColor?: string;
  vendor?: {
    id: string;
    name: string;
    rating: number;
  };
  lastUpdated: string;
  dataFreshness: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
}

class ProductDataSourceManager {
  private serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
  private configKey = 'product-data-sources-config';

  /**
   * Get all configured data sources
   */
  async getDataSources(): Promise<DataSourceConfig[]> {
    try {
      const response = await fetch(`${this.serverUrl}/product-sources`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.sources || this.getDefaultSources();
      }
      
      return this.getDefaultSources();
    } catch (error) {
      // Server endpoint not available - using default sources (this is expected)
      console.log('📦 Using default product data sources (server endpoint not configured)');
      return this.getDefaultSources();
    }
  }

  /**
   * Update data source configuration
   */
  async updateDataSource(config: DataSourceConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/product-sources/${config.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(config)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to update data source:', error);
      return false;
    }
  }

  /**
   * Test API credentials
   */
  async testCredentials(sourceId: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch(`${this.serverUrl}/product-sources/${sourceId}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      const data = await response.json();
      return {
        valid: data.valid || false,
        message: data.message || 'Connection test completed'
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Failed to test credentials'
      };
    }
  }

  /**
   * Unified product search across all enabled sources
   */
  async searchProducts(options: ProductSearchOptions): Promise<UnifiedProduct[]> {
    try {
      const response = await fetch(`${this.serverUrl}/products/unified-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        console.error('Unified search failed, using fallback');
        return this.getFallbackProducts(options);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error in unified search:', error);
      return this.getFallbackProducts(options);
    }
  }

  /**
   * Get products from specific source
   */
  async searchBySource(sourceId: string, options: ProductSearchOptions): Promise<UnifiedProduct[]> {
    try {
      const response = await fetch(`${this.serverUrl}/products/source/${sourceId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error(`Error searching source ${sourceId}:`, error);
      return [];
    }
  }

  /**
   * Get data source statistics
   */
  async getSourceStats(): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.serverUrl}/product-sources/stats`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      return {};
    } catch (error) {
      console.error('Failed to fetch source stats:', error);
      return {};
    }
  }

  /**
   * Sync products from a specific source
   */
  async syncSource(sourceId: string): Promise<{ success: boolean; productsUpdated: number }> {
    try {
      const response = await fetch(`${this.serverUrl}/product-sources/${sourceId}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      return { success: false, productsUpdated: 0 };
    } catch (error) {
      console.error(`Failed to sync source ${sourceId}:`, error);
      return { success: false, productsUpdated: 0 };
    }
  }

  /**
   * Default data source configurations
   */
  private getDefaultSources(): DataSourceConfig[] {
    return [
      // Direct API - Home Depot
      {
        id: 'direct-homedepot',
        type: 'direct-api',
        name: 'Home Depot Official API',
        enabled: false,
        priority: 1,
        provider: 'homedepot',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.homedepot.com/v1',
          rateLimit: 100,
          timeout: 5000
        }
      },
      // Direct API - Lowe's
      {
        id: 'direct-lowes',
        type: 'direct-api',
        name: "Lowe's Official API",
        enabled: false,
        priority: 1,
        provider: 'lowes',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.lowes.com/v1',
          rateLimit: 100,
          timeout: 5000
        }
      },
      // Direct API - Grainger
      {
        id: 'direct-grainger',
        type: 'direct-api',
        name: 'Grainger Official API',
        enabled: false,
        priority: 1,
        provider: 'grainger',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.grainger.com/v1',
          rateLimit: 50,
          timeout: 5000
        }
      },
      // Third Party - Rainforest API
      {
        id: 'thirdparty-rainforest',
        type: 'third-party',
        name: 'Rainforest API (Multi-Store)',
        enabled: false,
        priority: 2,
        provider: 'rainforest',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.rainforestapi.com/request',
          rateLimit: 200,
          timeout: 10000,
          customSettings: {
            supportedStores: ['homedepot', 'lowes', 'walmart', 'amazon']
          }
        }
      },
      // Third Party - Oxylabs
      {
        id: 'thirdparty-oxylabs',
        type: 'third-party',
        name: 'Oxylabs E-Commerce API',
        enabled: false,
        priority: 2,
        provider: 'oxylabs',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://realtime.oxylabs.io/v1/queries',
          rateLimit: 150,
          timeout: 15000
        }
      },
      // Third Party - Bright Data
      {
        id: 'thirdparty-brightdata',
        type: 'third-party',
        name: 'Bright Data Web Scraping',
        enabled: false,
        priority: 2,
        provider: 'brightdata',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.brightdata.com/datasets/v3',
          rateLimit: 100,
          timeout: 20000
        }
      },
      // Vendor Catalogs
      {
        id: 'vendor-catalogs',
        type: 'vendor-catalog',
        name: 'Custom Vendor Catalogs',
        enabled: true,
        priority: 3,
        hasCredentials: true,
        credentialsValid: true,
        config: {}
      },
      // Manual Reference
      {
        id: 'manual-reference',
        type: 'manual-reference',
        name: 'Manual Reference Pricing',
        enabled: true,
        priority: 4,
        hasCredentials: true,
        credentialsValid: true,
        config: {}
      }
    ];
  }

  /**
   * Fallback products (used when APIs unavailable)
   */
  private getFallbackProducts(options: ProductSearchOptions): UnifiedProduct[] {
    // Use the existing bigBoxProductService mock data
    const mockProducts: UnifiedProduct[] = [
      {
        id: 'fallback-hd-1',
        source: 'manual-homedepot',
        sourceType: 'manual-reference',
        name: 'Milwaukee M18 18V Brushless Cordless Drill',
        description: 'High-performance brushless motor. Compact design. LED light.',
        brand: 'Milwaukee',
        sku: '305385213',
        modelNumber: '2804-20',
        price: 129.00,
        currency: 'USD',
        inStock: true,
        inventory: 45,
        rating: 4.8,
        reviewCount: 1243,
        imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
        productUrl: 'https://www.homedepot.com/p/305385213',
        category: 'Tools',
        subcategory: 'Power Tools',
        specifications: {
          'Voltage': '18V',
          'Chuck Size': '1/2 in',
          'Speed': '0-450/1800 RPM'
        },
        store: 'homedepot',
        storeLogoColor: '#F96302',
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'manual'
      },
      {
        id: 'fallback-lw-1',
        source: 'manual-lowes',
        sourceType: 'manual-reference',
        name: 'DEWALT 20V MAX XR Brushless Drill Kit',
        description: 'Compact lightweight design. 2-speed transmission. Includes 2 batteries.',
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
          'Speed': '0-450/1500 RPM'
        },
        store: 'lowes',
        storeLogoColor: '#004990',
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'manual'
      }
    ];

    // Apply basic filtering
    let filtered = mockProducts;

    if (options.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }

    if (options.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= options.minPrice!);
    }

    if (options.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= options.maxPrice!);
    }

    if (options.inStockOnly) {
      filtered = filtered.filter(p => p.inStock);
    }

    if (options.stores && options.stores.length > 0) {
      filtered = filtered.filter(p => p.store && options.stores!.includes(p.store));
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }
}

export const productDataSourceManager = new ProductDataSourceManager();
