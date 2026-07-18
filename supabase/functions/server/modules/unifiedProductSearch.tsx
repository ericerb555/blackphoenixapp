/**
 * Unified Product Search Server Routes
 * Searches across all enabled data sources with intelligent fallback
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

/**
 * GET all products (for marketplace listing)
 * GET /
 */
app.get('/', async (c) => {
  console.log("🛍️ GET /products called");
  try {
    const url = new URL(c.req.url);
    const isActive = url.searchParams.get('isActive');
    const vendorId = url.searchParams.get('vendorId');
    const category = url.searchParams.get('category');
    
    console.log("Query params:", { isActive, vendorId, category });
    
    // Get all products from KV store
    let allProducts = await kv.getByPrefix('product_');
    console.log(`Found ${allProducts.length} total products in KV`);
    
    // Apply filters
    let products = allProducts;
    
    if (isActive === 'true') {
      products = products.filter((p: any) => p.isActive === true);
    }
    
    if (vendorId) {
      products = products.filter((p: any) => p.vendorId === vendorId);
    }
    
    if (category) {
      products = products.filter((p: any) => p.category === category);
    }
    
    console.log(`Returning ${products.length} filtered products`);
    
    return c.json({
      success: true,
      products,
      total: products.length,
      page: 1,
      limit: products.length,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: 'Failed to fetch products', details: String(error) }, 500);
  }
});

/**
 * Unified product search across all enabled sources
 * POST /unified-search
 */
app.post('/unified-search', async (c) => {
  try {
    const options = await c.req.json();
    console.log('🔍 Unified product search:', options.query);
    
    // Get all enabled sources sorted by priority
    const allSources = await kv.getByPrefix('product-source:');
    const enabledSources = allSources
      .filter((s: any) => s.enabled && s.credentialsValid)
      .sort((a: any, b: any) => a.priority - b.priority);
    
    console.log(`📊 Searching ${enabledSources.length} enabled sources`);
    
    const products = [];
    
    // Search each source in priority order
    for (const source of enabledSources) {
      try {
        const sourceProducts = await searchSource(source, options);
        products.push(...sourceProducts);
        
        // If we have enough products, stop searching
        if (products.length >= (options.limit || 50)) {
          break;
        }
      } catch (error) {
        console.error(`Failed to search ${source.name}:`, error);
        continue;
      }
    }
    
    // If no products found, use fallback
    if (products.length === 0) {
      console.log('⚠️ No products from enabled sources, using fallback');
      const fallbackProducts = getFallbackProducts(options);
      return c.json({
        success: true,
        products: fallbackProducts,
        source: 'fallback',
        message: 'Using demo data - configure API credentials for live data'
      });
    }
    
    // Deduplicate and limit results
    const uniqueProducts = deduplicateProducts(products);
    const limitedProducts = uniqueProducts.slice(0, options.limit || 50);
    
    return c.json({
      success: true,
      products: limitedProducts,
      sourcesSearched: enabledSources.length,
      totalResults: uniqueProducts.length
    });
  } catch (error) {
    console.error('❌ Error in unified search:', error);
    return c.json({
      success: false,
      error: 'Search failed',
      products: getFallbackProducts(await c.req.json())
    }, 500);
  }
});

/**
 * Search specific source
 * POST /source/:sourceId/search
 */
app.post('/source/:sourceId/search', async (c) => {
  try {
    const sourceId = c.req.param('sourceId');
    const options = await c.req.json();
    
    const source = await kv.get(`product-source:${sourceId}`);
    if (!source) {
      return c.json({ success: false, error: 'Source not found' }, 404);
    }
    
    if (!source.enabled || !source.credentialsValid) {
      return c.json({ 
        success: false, 
        error: 'Source is disabled or has invalid credentials' 
      }, 400);
    }
    
    const products = await searchSource(source, options);
    
    return c.json({
      success: true,
      products,
      source: source.name
    });
  } catch (error) {
    console.error('❌ Error searching source:', error);
    return c.json({ success: false, error: 'Search failed' }, 500);
  }
});

/**
 * Helper: Search a specific data source
 */
async function searchSource(source: any, options: any) {
  const { type, provider, config } = source;
  
  // Direct API searches
  if (type === 'direct-api') {
    if (provider === 'homedepot') {
      return await searchHomeDepotAPI(config, options);
    }
    if (provider === 'lowes') {
      return await searchLowesAPI(config, options);
    }
    if (provider === 'grainger') {
      return await searchGraingerAPI(config, options);
    }
  }
  
  // Third-party API searches
  if (type === 'third-party') {
    if (provider === 'rainforest') {
      return await searchRainforestAPI(config, options);
    }
    if (provider === 'oxylabs') {
      return await searchOxylabsAPI(config, options);
    }
    if (provider === 'brightdata') {
      return await searchBrightDataAPI(config, options);
    }
  }
  
  // Vendor catalogs
  if (type === 'vendor-catalog') {
    return await searchVendorCatalogs(options);
  }
  
  // Manual reference data
  if (type === 'manual-reference') {
    return getFallbackProducts(options);
  }
  
  return [];
}

/**
 * Home Depot API search
 */
async function searchHomeDepotAPI(config: any, options: any) {
  if (!config.apiKey) {
    return [];
  }
  
  try {
    const url = new URL(`${config.baseUrl}/products/search`);
    url.searchParams.set('keyword', options.query);
    if (options.limit) url.searchParams.set('limit', options.limit);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Home Depot API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    return transformHomeDepotProducts(data.products || []);
  } catch (error) {
    console.error('Home Depot API search failed:', error);
    return [];
  }
}

/**
 * Lowe's API search
 */
async function searchLowesAPI(config: any, options: any) {
  if (!config.apiKey) {
    return [];
  }
  
  try {
    const url = new URL(`${config.baseUrl}/search`);
    url.searchParams.set('q', options.query);
    if (options.limit) url.searchParams.set('limit', options.limit);
    
    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("Lowe's API error:", response.status);
      return [];
    }
    
    const data = await response.json();
    return transformLowesProducts(data.products || []);
  } catch (error) {
    console.error("Lowe's API search failed:", error);
    return [];
  }
}

/**
 * Grainger API search
 */
async function searchGraingerAPI(config: any, options: any) {
  if (!config.apiKey) {
    return [];
  }
  
  try {
    const url = new URL(`${config.baseUrl}/products`);
    url.searchParams.set('keyword', options.query);
    if (options.limit) url.searchParams.set('pageSize', options.limit);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Grainger API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    return transformGraingerProducts(data.products || []);
  } catch (error) {
    console.error('Grainger API search failed:', error);
    return [];
  }
}

/**
 * Rainforest API search (searches multiple stores)
 */
async function searchRainforestAPI(config: any, options: any) {
  if (!config.apiKey) {
    return [];
  }
  
  try {
    const stores = options.stores || ['homedepot', 'lowes'];
    const allProducts = [];
    
    for (const store of stores) {
      const params = new URLSearchParams({
        api_key: config.apiKey,
        type: 'search',
        search_term: options.query,
        retailer: store
      });
      
      const response = await fetch(`${config.baseUrl}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        const products = transformRainforestProducts(data.search_results || [], store);
        allProducts.push(...products);
      }
    }
    
    return allProducts;
  } catch (error) {
    console.error('Rainforest API search failed:', error);
    return [];
  }
}

/**
 * Oxylabs API search
 */
async function searchOxylabsAPI(config: any, options: any) {
  if (!config.apiKey || !config.apiSecret) {
    return [];
  }
  
  try {
    const auth = btoa(`${config.apiKey}:${config.apiSecret}`);
    const stores = options.stores || ['homedepot'];
    const allProducts = [];
    
    for (const store of stores) {
      const storeUrl = getStoreSearchUrl(store, options.query);
      
      const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          source: 'universal_ecommerce',
          url: storeUrl,
          parse: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const products = transformOxylabsProducts(data.results || [], store);
        allProducts.push(...products);
      }
    }
    
    return allProducts;
  } catch (error) {
    console.error('Oxylabs API search failed:', error);
    return [];
  }
}

/**
 * Bright Data API search
 */
async function searchBrightDataAPI(config: any, options: any) {
  if (!config.apiKey) {
    return [];
  }
  
  try {
    // Bright Data requires dataset creation and async processing
    // This is a simplified version
    const stores = options.stores || ['homedepot'];
    const urls = stores.map(store => ({
      url: getStoreSearchUrl(store, options.query)
    }));
    
    const response = await fetch(
      `${config.baseUrl}/trigger?dataset_id=gd_l7q7dkf244hwjntr0&api_token=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urls)
      }
    );
    
    if (response.ok) {
      // In production, you'd poll for results or use webhooks
      // For now, return empty and note that it's async
      console.log('Bright Data job queued - results are asynchronous');
      return [];
    }
    
    return [];
  } catch (error) {
    console.error('Bright Data API search failed:', error);
    return [];
  }
}

/**
 * Search vendor catalogs
 */
async function searchVendorCatalogs(options: any) {
  try {
    const allMaterials = await kv.getByPrefix('material:');
    let filtered = allMaterials;
    
    // Apply search filters
    if (options.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter((m: any) =>
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.manufacturer?.toLowerCase().includes(q)
      );
    }
    
    if (options.category) {
      filtered = filtered.filter((m: any) => 
        m.category?.toLowerCase() === options.category.toLowerCase()
      );
    }
    
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((m: any) => m.basePrice >= options.minPrice);
    }
    
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((m: any) => m.basePrice <= options.maxPrice);
    }
    
    if (options.inStockOnly) {
      filtered = filtered.filter((m: any) => m.inStock);
    }
    
    // Transform to unified format
    return filtered.map((m: any) => ({
      id: m.id,
      source: `vendor-${m.vendorId || 'custom'}`,
      sourceType: 'vendor-catalog',
      name: m.name,
      description: m.description,
      brand: m.manufacturer,
      sku: m.sku,
      price: m.basePrice,
      currency: 'USD',
      inStock: m.inStock,
      rating: m.qualityRating,
      imageUrl: m.imageUrl,
      category: m.category,
      subcategory: m.subcategory,
      specifications: m.specifications || {},
      vendor: m.vendorId ? {
        id: m.vendorId,
        name: m.vendorName,
        rating: 4.5
      } : undefined,
      lastUpdated: m.updatedAt,
      dataFreshness: 'manual'
    }));
  } catch (error) {
    console.error('Error searching vendor catalogs:', error);
    return [];
  }
}

/**
 * Helper: Get store search URL
 */
function getStoreSearchUrl(store: string, query: string) {
  const encodedQuery = encodeURIComponent(query);
  const urls: Record<string, string> = {
    homedepot: `https://www.homedepot.com/s/${encodedQuery}`,
    lowes: `https://www.lowes.com/search?text=${encodedQuery}`,
    grainger: `https://www.grainger.com/search?searchQuery=${encodedQuery}`
  };
  return urls[store] || urls.homedepot;
}

/**
 * Helper: Transform products from different sources to unified format
 */
function transformHomeDepotProducts(products: any[]) {
  return products.map(p => ({
    id: `hd-${p.itemId || p.sku}`,
    source: 'homedepot-api',
    sourceType: 'direct-api',
    name: p.productLabel || p.name,
    description: p.description || '',
    brand: p.brand || p.manufacturer,
    sku: p.sku,
    modelNumber: p.modelNumber,
    price: parseFloat(p.price?.value || p.price || 0),
    currency: 'USD',
    inStock: p.availabilityType === 'AVAILABLE',
    inventory: p.inventory,
    rating: p.averageRating,
    reviewCount: p.reviewCount,
    imageUrl: p.media?.images?.[0]?.url || p.imageUrl,
    productUrl: `https://www.homedepot.com${p.url}`,
    category: p.primaryCategory || 'General',
    specifications: p.specifications || {},
    store: 'homedepot',
    storeLogoColor: '#F96302',
    lastUpdated: new Date().toISOString(),
    dataFreshness: 'realtime'
  }));
}

function transformLowesProducts(products: any[]) {
  return products.map(p => ({
    id: `lw-${p.productId || p.itemNumber}`,
    source: 'lowes-api',
    sourceType: 'direct-api',
    name: p.title || p.name,
    description: p.description || '',
    brand: p.brand,
    sku: p.itemNumber,
    modelNumber: p.modelId,
    price: parseFloat(p.pricing?.value || p.price || 0),
    currency: 'USD',
    inStock: p.availability?.status === 'IN_STOCK',
    rating: p.rating?.average,
    reviewCount: p.rating?.count,
    imageUrl: p.image?.url,
    productUrl: `https://www.lowes.com${p.url}`,
    category: p.category || 'General',
    specifications: p.attributes || {},
    store: 'lowes',
    storeLogoColor: '#004990',
    lastUpdated: new Date().toISOString(),
    dataFreshness: 'realtime'
  }));
}

function transformGraingerProducts(products: any[]) {
  return products.map(p => ({
    id: `gr-${p.graingerId || p.sku}`,
    source: 'grainger-api',
    sourceType: 'direct-api',
    name: p.description || p.name,
    description: p.longDescription || '',
    brand: p.brandName,
    sku: p.graingerId,
    modelNumber: p.manufacturerPartNumber,
    price: parseFloat(p.pricing?.listPrice || 0),
    currency: 'USD',
    inStock: p.availability?.status === 'AVAILABLE',
    rating: p.rating,
    imageUrl: p.imageUrl,
    productUrl: `https://www.grainger.com/product/${p.graingerId}`,
    category: p.category || 'Industrial',
    specifications: p.specifications || {},
    store: 'grainger',
    storeLogoColor: '#CC0000',
    lastUpdated: new Date().toISOString(),
    dataFreshness: 'realtime'
  }));
}

function transformRainforestProducts(products: any[], store: string) {
  const storeColors: Record<string, string> = {
    homedepot: '#F96302',
    lowes: '#004990'
  };
  
  return products.map(p => ({
    id: `rf-${store}-${p.asin || p.product_id}`,
    source: `rainforest-${store}`,
    sourceType: 'third-party',
    name: p.title,
    description: p.description || '',
    brand: p.brand,
    sku: p.product_id,
    price: parseFloat(p.price?.value || 0),
    currency: 'USD',
    inStock: p.availability?.type === 'in_stock',
    rating: p.rating,
    reviewCount: p.ratings_total,
    imageUrl: p.image,
    productUrl: p.link,
    category: p.category || 'General',
    specifications: {},
    store: store as any,
    storeLogoColor: storeColors[store],
    lastUpdated: new Date().toISOString(),
    dataFreshness: 'hourly'
  }));
}

function transformOxylabsProducts(products: any[], store: string) {
  // Similar transformation for Oxylabs data
  return products.map(p => ({
    id: `ox-${store}-${p.id}`,
    source: `oxylabs-${store}`,
    sourceType: 'third-party',
    // ... rest of transformation
  }));
}

/**
 * Helper: Deduplicate products by SKU
 */
function deduplicateProducts(products: any[]) {
  const seen = new Set();
  return products.filter(p => {
    if (seen.has(p.sku)) {
      return false;
    }
    seen.add(p.sku);
    return true;
  });
}

/**
 * Helper: Get fallback demo products
 */
function getFallbackProducts(options: any) {
  // Return the demo products from bigBoxProductService
  const mockProducts = [
    {
      id: 'demo-hd-1',
      source: 'demo-homedepot',
      sourceType: 'manual-reference',
      name: 'Milwaukee M18 18V Brushless Drill',
      description: 'Professional-grade cordless drill with brushless motor',
      brand: 'Milwaukee',
      sku: '305385213',
      price: 129.00,
      currency: 'USD',
      inStock: true,
      rating: 4.8,
      reviewCount: 1243,
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
      category: 'Tools',
      store: 'homedepot',
      storeLogoColor: '#F96302',
      specifications: { Voltage: '18V', Chuck: '1/2 in' },
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
      p.description.toLowerCase().includes(q)
    );
  }
  
  return filtered;
}

export default app;