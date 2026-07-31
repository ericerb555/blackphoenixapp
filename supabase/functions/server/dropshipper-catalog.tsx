/**
 * Dropshipper Catalog Import Module
 * Handles staging, browsing, and importing products from dropshipper catalogs
 */

import * as kv from './kv_store.tsx';
import * as dropshipperConfig from './dropshipper-config.tsx';
import { isAdultProduct } from './content-filter.tsx';

// Storage keys
const STAGING_KEY_PREFIX = 'dropshipper_staging';
const IMPORT_LOG_PREFIX = 'dropshipper_import_log';
const LIVE_PRODUCT_PREFIX = 'product_';

// ============================
// TYPES
// ============================

export interface StagedProduct {
  stagingId: string;
  providerId: string;
  providerName: string;
  providerProductId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  images: string[];
  primaryImage: string;
  category: string;
  tags: string[];
  variants?: ProductVariant[];
  specifications?: Record<string, string>;
  stock: number;
  weight?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  brand?: string;
  manufacturer?: string;
  stagedAt: string;
  importedToLive: boolean;
  importedAt?: string;
  lastUpdated: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price?: number;
  stock: number;
  attributes: Record<string, string>; // e.g., { color: 'Red', size: 'Large' }
  image?: string;
}

export interface ImportLog {
  id: string;
  providerId: string;
  action: 'catalog_import' | 'product_added' | 'product_updated' | 'product_removed';
  productCount?: number;
  productIds?: string[];
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
  timestamp: string;
  performedBy?: string;
}

// ============================
// CATALOG IMPORT
// ============================

/**
 * Fetch and stage entire catalog from a provider
 */
export async function importCatalogFromProvider(
  providerId: string
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  try {
    const provider = await dropshipperConfig.getProvider(providerId);
    if (!provider) {
      return { success: false, imported: 0, errors: ['Provider not found'] };
    }

    console.log(`[Catalog Import] Fetching catalog from ${provider.name}...`);

    // Fetch full catalog from provider API
    const products = await fetchCatalogFromAPI(provider);
    
    let imported = 0;
    const errors: string[] = [];

    let skippedAdult = 0;
    for (const product of products) {
      try {
        // Never stage/import adult or sexual-wellness products into the store.
        if (isAdultProduct(product)) { skippedAdult++; continue; }

        // Transform to staged product format
        const stagedProduct: StagedProduct = {
          stagingId: `staging_${providerId}_${product.id}_${Date.now()}`,
          providerId: provider.id,
          providerName: provider.name,
          providerProductId: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description || '',
          price: applyMarkup(product.price, provider.settings.markupPercentage),
          compareAtPrice: product.compare_at_price,
          costPrice: product.price, // Store original price as cost
          images: product.images || [],
          primaryImage: product.images?.[0] || '',
          category: product.category || 'Uncategorized',
          tags: product.tags || [],
          variants: product.variants?.map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            stock: v.stock || 0,
            attributes: v.attributes || {},
            image: v.image,
          })),
          specifications: product.specifications || {},
          stock: product.stock || 0,
          weight: product.weight,
          dimensions: product.dimensions,
          brand: product.brand,
          manufacturer: product.manufacturer,
          stagedAt: new Date().toISOString(),
          importedToLive: false,
          lastUpdated: new Date().toISOString(),
        };

        await saveStagedProduct(stagedProduct);
        imported++;
      } catch (error) {
        errors.push(`Failed to stage product ${product.id}: ${error}`);
        console.error(`[Catalog Import] Error staging product:`, error);
      }
    }

    // Log the import
    await logImport({
      id: `import_${Date.now()}`,
      providerId,
      action: 'catalog_import',
      productCount: imported,
      status: errors.length > 0 ? 'partial' : 'success',
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Catalog Import] Completed: ${imported} products staged, ${errors.length} errors${skippedAdult ? `, ${skippedAdult} adult items skipped` : ''}`);

    return { success: errors.length === 0, imported, errors };
  } catch (error) {
    const errorMsg = `Catalog import failed: ${error}`;
    console.error(`[Catalog Import Error]`, error);
    
    await logImport({
      id: `import_${Date.now()}`,
      providerId,
      action: 'catalog_import',
      status: 'failed',
      errors: [errorMsg],
      timestamp: new Date().toISOString(),
    });

    return { success: false, imported: 0, errors: [errorMsg] };
  }
}

/**
 * Fetch catalog from provider's API
 */
async function fetchCatalogFromAPI(provider: any): Promise<any[]> {
  // Handle different API patterns
  const response = await fetch(`${provider.apiUrl}/catalog`, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Support different response formats
  return data.products || data.items || data.catalog || data;
}

/**
 * Apply markup to price
 */
function applyMarkup(price: number, markupPercentage?: number): number {
  if (!markupPercentage) return price;
  return Number((price * (1 + markupPercentage / 100)).toFixed(2));
}

// ============================
// STAGING MANAGEMENT
// ============================

/**
 * Save product to staging area
 */
async function saveStagedProduct(product: StagedProduct): Promise<void> {
  const key = `${STAGING_KEY_PREFIX}:${product.stagingId}`;
  await kv.set(key, JSON.stringify(product));
}

/**
 * Get all staged products
 */
export async function getAllStagedProducts(filters?: {
  providerId?: string;
  category?: string;
  importedToLive?: boolean;
  search?: string;
}): Promise<StagedProduct[]> {
  const allStaged = await kv.getByPrefix(STAGING_KEY_PREFIX);
  let products = allStaged.map(p => JSON.parse(p) as StagedProduct);

  // Apply filters
  if (filters?.providerId) {
    products = products.filter(p => p.providerId === filters.providerId);
  }

  if (filters?.category) {
    products = products.filter(p => p.category === filters.category);
  }

  if (filters?.importedToLive !== undefined) {
    products = products.filter(p => p.importedToLive === filters.importedToLive);
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  return products;
}

/**
 * Get single staged product
 */
export async function getStagedProduct(stagingId: string): Promise<StagedProduct | null> {
  const key = `${STAGING_KEY_PREFIX}:${stagingId}`;
  const data = await kv.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Get staged products by provider
 */
export async function getStagedProductsByProvider(providerId: string): Promise<StagedProduct[]> {
  return getAllStagedProducts({ providerId });
}

/**
 * Get categories from staged products
 */
export async function getStagedCategories(): Promise<string[]> {
  const products = await getAllStagedProducts();
  const categories = new Set(products.map(p => p.category));
  return Array.from(categories).sort();
}

/**
 * Remove staged product
 */
export async function removeStagedProduct(stagingId: string): Promise<void> {
  const key = `${STAGING_KEY_PREFIX}:${stagingId}`;
  await kv.del(key);
}

/**
 * Clear all staged products for a provider
 */
export async function clearStagedProducts(providerId?: string): Promise<number> {
  const products = providerId 
    ? await getStagedProductsByProvider(providerId)
    : await getAllStagedProducts();

  for (const product of products) {
    await removeStagedProduct(product.stagingId);
  }

  return products.length;
}

// ============================
// IMPORT TO LIVE CATALOG
// ============================

/**
 * Import selected products to live catalog
 */
export async function importProductsToLive(
  stagingIds: string[]
): Promise<{ success: boolean; imported: string[]; failed: string[]; errors: string[] }> {
  const imported: string[] = [];
  const failed: string[] = [];
  const errors: string[] = [];

  for (const stagingId of stagingIds) {
    try {
      const stagedProduct = await getStagedProduct(stagingId);
      if (!stagedProduct) {
        failed.push(stagingId);
        errors.push(`Staged product not found: ${stagingId}`);
        continue;
      }

      // Check if already imported
      if (stagedProduct.importedToLive) {
        console.log(`[Import] Product ${stagingId} already imported, skipping`);
        continue;
      }

      // Transform to live product format
      const liveProduct = transformToLiveProduct(stagedProduct);

      // Save to live catalog
      await kv.set(`${LIVE_PRODUCT_PREFIX}${liveProduct.id}`, liveProduct);

      // Update staged product status
      stagedProduct.importedToLive = true;
      stagedProduct.importedAt = new Date().toISOString();
      await saveStagedProduct(stagedProduct);

      imported.push(stagingId);
      console.log(`[Import] Successfully imported product: ${stagedProduct.name}`);
    } catch (error) {
      failed.push(stagingId);
      errors.push(`Failed to import ${stagingId}: ${error}`);
      console.error(`[Import Error] Failed to import product:`, error);
    }
  }

  // Log the import
  if (imported.length > 0 || failed.length > 0) {
    await logImport({
      id: `import_${Date.now()}`,
      providerId: 'multiple',
      action: 'product_added',
      productCount: imported.length,
      productIds: imported,
      status: failed.length > 0 ? 'partial' : 'success',
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    success: failed.length === 0,
    imported,
    failed,
    errors,
  };
}

/**
 * Transform staged product to live product format
 */
function transformToLiveProduct(staged: StagedProduct): any {
  return {
    id: staged.sku, // Use SKU as product ID
    vendorId: 'dropshipper_' + staged.providerId,
    vendorName: staged.providerName,
    name: staged.name,
    description: staged.description,
    category: staged.category,
    price: staged.price,
    compareAtPrice: staged.compareAtPrice,
    costPrice: staged.costPrice,
    images: staged.images,
    primaryImage: staged.primaryImage,
    sku: staged.sku,
    tags: staged.tags,
    variants: staged.variants,
    specifications: staged.specifications,
    inventoryQuantity: staged.stock,
    trackInventory: true,
    weight: staged.weight,
    dimensions: staged.dimensions,
    brand: staged.brand,
    manufacturer: staged.manufacturer,
    isActive: true,
    isFeatured: false,
    slug: generateSlug(staged.name),
    viewCount: 0,
    orderCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Dropshipper metadata
    _dropshipper: {
      source: 'dropshipper',
      providerId: staged.providerId,
      providerName: staged.providerName,
      providerProductId: staged.providerProductId,
      stagingId: staged.stagingId,
      importedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate URL slug from product name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Update live product from staged product (for re-sync)
 */
export async function updateLiveProductFromStaged(stagingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const stagedProduct = await getStagedProduct(stagingId);
    if (!stagedProduct) {
      return { success: false, error: 'Staged product not found' };
    }

    if (!stagedProduct.importedToLive) {
      return { success: false, error: 'Product not imported to live catalog' };
    }

    const liveProduct = transformToLiveProduct(stagedProduct);
    await kv.set(`${LIVE_PRODUCT_PREFIX}${liveProduct.id}`, liveProduct);

    stagedProduct.lastUpdated = new Date().toISOString();
    await saveStagedProduct(stagedProduct);

    await logImport({
      id: `import_${Date.now()}`,
      providerId: stagedProduct.providerId,
      action: 'product_updated',
      productIds: [stagingId],
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Remove product from live catalog
 */
export async function removeProductFromLive(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await kv.del(`${LIVE_PRODUCT_PREFIX}${productId}`);

    await logImport({
      id: `import_${Date.now()}`,
      providerId: 'unknown',
      action: 'product_removed',
      productIds: [productId],
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================
// IMPORT LOGS
// ============================

/**
 * Log import action
 */
async function logImport(log: ImportLog): Promise<void> {
  const key = `${IMPORT_LOG_PREFIX}:${log.id}`;
  await kv.set(key, JSON.stringify(log));
}

/**
 * Get import logs
 */
export async function getImportLogs(limit?: number): Promise<ImportLog[]> {
  const logs = await kv.getByPrefix(IMPORT_LOG_PREFIX);
  const parsed = logs.map(l => JSON.parse(l) as ImportLog);
  
  // Sort by timestamp (newest first)
  parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return limit ? parsed.slice(0, limit) : parsed;
}

/**
 * Get stats for staging area
 */
export async function getStagingStats(): Promise<{
  total: number;
  byProvider: Record<string, number>;
  imported: number;
  notImported: number;
  categories: number;
}> {
  const products = await getAllStagedProducts();
  
  const byProvider: Record<string, number> = {};
  let imported = 0;
  let notImported = 0;

  for (const product of products) {
    byProvider[product.providerName] = (byProvider[product.providerName] || 0) + 1;
    if (product.importedToLive) {
      imported++;
    } else {
      notImported++;
    }
  }

  const categories = await getStagedCategories();

  return {
    total: products.length,
    byProvider,
    imported,
    notImported,
    categories: categories.length,
  };
}
