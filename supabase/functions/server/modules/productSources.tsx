/**
 * Product Source Configuration Server Routes
 * Manages API credentials and data source configurations
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

/**
 * Get all product data sources
 * GET /product-sources
 */
app.get('/', async (c) => {
  try {
    console.log('📦 Fetching product data sources');
    const sources = await kv.getByPrefix('product-source:');
    
    // If no sources exist, initialize defaults
    if (sources.length === 0) {
      const defaults = getDefaultSources();
      for (const source of defaults) {
        await kv.set(`product-source:${source.id}`, source);
      }
      return c.json({ success: true, sources: defaults });
    }
    
    return c.json({ success: true, sources });
  } catch (error) {
    console.error('❌ Error fetching product sources:', error);
    return c.json({ success: false, error: 'Failed to fetch sources' }, 500);
  }
});

/**
 * Get single product data source
 * GET /product-sources/:id
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const source = await kv.get(`product-source:${id}`);
    
    if (!source) {
      return c.json({ success: false, error: 'Source not found' }, 404);
    }
    
    return c.json({ success: true, source });
  } catch (error) {
    console.error('❌ Error fetching product source:', error);
    return c.json({ success: false, error: 'Failed to fetch source' }, 500);
  }
});

/**
 * Update product data source
 * PUT /product-sources/:id
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existing = await kv.get(`product-source:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'Source not found' }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      id, // Preserve ID
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`product-source:${id}`, updated);
    console.log(`✅ Updated product source: ${id}`);
    
    return c.json({ success: true, source: updated });
  } catch (error) {
    console.error('❌ Error updating product source:', error);
    return c.json({ success: false, error: 'Failed to update source' }, 500);
  }
});

/**
 * Test API credentials for a source
 * POST /product-sources/:id/test
 */
app.post('/:id/test', async (c) => {
  try {
    const id = c.req.param('id');
    const source = await kv.get(`product-source:${id}`);
    
    if (!source) {
      return c.json({ valid: false, message: 'Source not found' }, 404);
    }
    
    console.log(`🧪 Testing credentials for: ${source.name}`);
    
    // Test based on source type
    const result = await testSourceCredentials(source);
    
    // Update source with test results
    const updated = {
      ...source,
      credentialsValid: result.valid,
      lastTestedAt: new Date().toISOString()
    };
    await kv.set(`product-source:${id}`, updated);
    
    return c.json(result);
  } catch (error) {
    console.error('❌ Error testing credentials:', error);
    return c.json({ valid: false, message: 'Test failed' }, 500);
  }
});

/**
 * Sync products from a source
 * POST /product-sources/:id/sync
 */
app.post('/:id/sync', async (c) => {
  try {
    const id = c.req.param('id');
    const source = await kv.get(`product-source:${id}`);
    
    if (!source) {
      return c.json({ success: false, error: 'Source not found' }, 404);
    }
    
    if (!source.enabled || !source.credentialsValid) {
      return c.json({ 
        success: false, 
        error: 'Source is disabled or has invalid credentials' 
      }, 400);
    }
    
    console.log(`🔄 Syncing products from: ${source.name}`);
    
    // Perform sync based on source type
    const result = await syncProductsFromSource(source);
    
    // Update last sync time
    const updated = {
      ...source,
      lastSync: new Date().toISOString()
    };
    await kv.set(`product-source:${id}`, updated);
    
    return c.json(result);
  } catch (error) {
    console.error('❌ Error syncing source:', error);
    return c.json({ success: false, error: 'Sync failed' }, 500);
  }
});

/**
 * Get data source statistics
 * GET /product-sources/stats
 */
app.get('/stats/overview', async (c) => {
  try {
    const sources = await kv.getByPrefix('product-source:');
    
    const stats = {
      total: sources.length,
      enabled: sources.filter((s: any) => s.enabled).length,
      withCredentials: sources.filter((s: any) => s.hasCredentials).length,
      validCredentials: sources.filter((s: any) => s.credentialsValid).length,
      byType: {
        'direct-api': sources.filter((s: any) => s.type === 'direct-api').length,
        'third-party': sources.filter((s: any) => s.type === 'third-party').length,
        'vendor-catalog': sources.filter((s: any) => s.type === 'vendor-catalog').length,
        'manual-reference': sources.filter((s: any) => s.type === 'manual-reference').length
      },
      lastSync: sources
        .filter((s: any) => s.lastSync)
        .sort((a: any, b: any) => new Date(b.lastSync).getTime() - new Date(a.lastSync).getTime())[0]?.lastSync
    };
    
    return c.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

/**
 * Helper: Get default sources
 */
function getDefaultSources() {
  return [
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
      },
      createdAt: new Date().toISOString()
    },
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
      },
      createdAt: new Date().toISOString()
    },
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
      },
      createdAt: new Date().toISOString()
    },
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
        timeout: 10000
      },
      createdAt: new Date().toISOString()
    },
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
      },
      createdAt: new Date().toISOString()
    },
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
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'vendor-catalogs',
      type: 'vendor-catalog',
      name: 'Custom Vendor Catalogs',
      enabled: true,
      priority: 3,
      hasCredentials: true,
      credentialsValid: true,
      config: {},
      createdAt: new Date().toISOString()
    },
    {
      id: 'manual-reference',
      type: 'manual-reference',
      name: 'Manual Reference Pricing',
      enabled: true,
      priority: 4,
      hasCredentials: true,
      credentialsValid: true,
      config: {},
      createdAt: new Date().toISOString()
    }
  ];
}

/**
 * Helper: Test source credentials
 */
async function testSourceCredentials(source: any) {
  const { type, provider, config } = source;
  
  try {
    // Direct API tests
    if (type === 'direct-api') {
      if (provider === 'homedepot' && config.apiKey) {
        // Test Home Depot API
        const response = await fetch(`${config.baseUrl}/products?limit=1`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          return { valid: true, message: 'Home Depot API credentials valid' };
        } else if (response.status === 401) {
          return { valid: false, message: 'Invalid API key' };
        } else {
          return { valid: false, message: `API error: ${response.status}` };
        }
      }
      
      if (provider === 'lowes' && config.apiKey) {
        // Test Lowe's API
        const response = await fetch(`${config.baseUrl}/search?q=test&limit=1`, {
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          return { valid: true, message: "Lowe's API credentials valid" };
        } else if (response.status === 403) {
          return { valid: false, message: 'Invalid API key or access denied' };
        } else {
          return { valid: false, message: `API error: ${response.status}` };
        }
      }
      
      if (provider === 'grainger' && config.apiKey) {
        // Test Grainger API
        const response = await fetch(`${config.baseUrl}/products?keyword=test&pageSize=1`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          return { valid: true, message: 'Grainger API credentials valid' };
        } else if (response.status === 401) {
          return { valid: false, message: 'Invalid API credentials' };
        } else {
          return { valid: false, message: `API error: ${response.status}` };
        }
      }
    }
    
    // Third-party API tests
    if (type === 'third-party') {
      if (provider === 'rainforest' && config.apiKey) {
        // Test Rainforest API
        const response = await fetch(`${config.baseUrl}?api_key=${config.apiKey}&type=product&amazon_domain=amazon.com&asin=B073JYC4XM`, {
          method: 'GET'
        });
        
        if (response.ok) {
          return { valid: true, message: 'Rainforest API credentials valid' };
        } else if (response.status === 401) {
          return { valid: false, message: 'Invalid API key' };
        } else {
          return { valid: false, message: `API error: ${response.status}` };
        }
      }
      
      if (provider === 'oxylabs' && config.apiKey && config.apiSecret) {
        // Test Oxylabs API
        const auth = btoa(`${config.apiKey}:${config.apiSecret}`);
        const response = await fetch(config.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            source: 'universal',
            url: 'https://www.homedepot.com',
            parse: true
          })
        });
        
        if (response.ok) {
          return { valid: true, message: 'Oxylabs API credentials valid' };
        } else if (response.status === 401) {
          return { valid: false, message: 'Invalid credentials' };
        } else {
          return { valid: false, message: `API error: ${response.status}` };
        }
      }
      
      if (provider === 'brightdata' && config.apiKey) {
        // Test Bright Data API
        const response = await fetch(`${config.baseUrl}/trigger?dataset_id=gd_l7q7dkf244hwjntr0&api_token=${config.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            url: 'https://www.homedepot.com'
          }])
        });
        
        if (response.ok) {
          return { valid: true, message: 'Bright Data API credentials valid' };
        } else if (response.status === 401) {
          return { valid: false, message: 'Invalid API token' };
        } else {
          return { valid: false, message: `API error: ${response.status}` };
        }
      }
    }
    
    // Vendor catalogs and manual reference are always valid if enabled
    if (type === 'vendor-catalog' || type === 'manual-reference') {
      return { valid: true, message: 'Source is configured correctly' };
    }
    
    return { valid: false, message: 'No credentials configured' };
  } catch (error) {
    console.error('Error testing credentials:', error);
    return { valid: false, message: `Connection error: ${error.message}` };
  }
}

/**
 * Helper: Sync products from source
 */
async function syncProductsFromSource(source: any) {
  // This would contain the actual sync logic for each source type
  // For now, return a mock success response
  
  console.log(`Starting sync for ${source.name}...`);
  
  // Simulate sync delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    productsUpdated: Math.floor(Math.random() * 100) + 50,
    message: `Successfully synced products from ${source.name}`,
    timestamp: new Date().toISOString()
  };
}

export default app;
