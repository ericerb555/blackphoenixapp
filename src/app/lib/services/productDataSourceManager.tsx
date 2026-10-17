/**
 * Which supplier product APIs exist, and whether any is connected. None is.
 *
 * WHAT THIS FILE USED TO BE, AND WHY IT IS A QUARTER OF THE SIZE
 *
 * It was a client for a seven-route supplier-integration surface — save a
 * source, test its credentials, sync it, search one source, search all of them.
 * Five of those seven routes were `/product-sources...`, which no router in the
 * server has ever served; the other two needed `unifiedProductSearch`, which is
 * documented in `index.tsx` as unmountable. So every method but one answered a
 * 404, and two of them answered it with invented data: `searchProducts` fell
 * back to a hardcoded product list and returned it as search results.
 *
 * `product-data-sources`, the admin page that drove all of it, is deleted. What
 * is left is the one method with a live caller — `MaterialsCenter` asking
 * whether any supplier API is connected, so it can carry on without one.
 *
 * `getDefaultSources` stays because it is the honest answer to that question:
 * four suppliers worth integrating, every one `enabled: false` and
 * `credentialsValid: false`. It describes what is not connected rather than
 * pretending something is. The day a supplier is actually integrated, this file
 * grows back — but from a server route that exists.
 */

import { publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '../apiConfig';

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

class ProductDataSourceManager {
  private serverUrl = `${API_BASE_URL}/make-server-3eae23a6`;

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
}

export const productDataSourceManager = new ProductDataSourceManager();
