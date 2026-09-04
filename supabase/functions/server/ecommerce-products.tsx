// eCommerce Products API Routes
// Phase 1: Foundation & Backend Infrastructure
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { trustedRole } from './trustedRole.ts';

/**
 * Short-lived, single-flight cache for the full product list.
 *
 * Reading every product means two `getByPrefix` scans (`product_` +
 * `live_product_`) over the shared KV table. As the table has grown those
 * scans started hitting Postgres' statement timeout under concurrent load
 * (storefront + admin all calling /products at once). Since the KV internals
 * and DB indexes are off-limits, we cut the load here: cache the scan result
 * for a few seconds and collapse concurrent callers onto one in-flight scan,
 * so a burst of requests costs one query instead of dozens. Writes bust it.
 */
const PRODUCTS_CACHE_TTL_MS = 15_000;
let productsCache: { at: number; data: any[] } | null = null;
let productsInFlight: Promise<any[]> | null = null;

async function loadAllProducts(): Promise<any[]> {
  if (productsCache && Date.now() - productsCache.at < PRODUCTS_CACHE_TTL_MS) {
    return productsCache.data;
  }
  if (productsInFlight) return productsInFlight;
  productsInFlight = (async () => {
    try {
      const [canonical, live] = await Promise.all([
        kv.getByPrefix('product_').catch(() => []),
        kv.getByPrefix('live_product_').catch(() => []),
      ]);
      const merged = [...(canonical || []), ...(live || [])].filter(Boolean);
      const data = [...new Map(merged.map((p: any) => [p.id, p])).values()];
      productsCache = { at: Date.now(), data };
      return data;
    } finally {
      productsInFlight = null;
    }
  })();
  return productsInFlight;
}

export function invalidateProductsCache() {
  productsCache = null;
}

// Type definitions
interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description: string;
  category: string;
  price: number;
  inventoryQuantity: number;
  trackInventory: boolean;
  images: string[];
  primaryImage: string;
  isActive: boolean;
  isFeatured: boolean;
  slug: string;
  viewCount: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  sku?: string;
  dimensions?: string;
  weight?: string;
}

interface ProductFilters {
  vendorId?: string;
  category?: string;
  search?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export const productsRouter = new Hono();

// Helper function to generate product ID
const generateProductId = () => `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to generate slug from name
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Only an administrator may change the catalogue.
 *
 * WHY THIS IS STATED HERE RATHER THAN LEFT TO THE MIDDLEWARE
 *
 * index.tsx carries `app.use('/products/*')` which admin-gates writes, and
 * these handlers relied on it entirely. That wildcard covers `/products/:id`
 * and it is not obvious that it covers bare `/products` — which is the create
 * route. An admin gate that depends on whether a router treats `*` as matching
 * zero segments is not a gate anybody should have to reason about.
 *
 * A shadowed copy of these routes further down index.tsx did check
 * administrator access explicitly. Those are being deleted as dead code, and
 * the check they carried is written here first so nothing is lost with them.
 *
 * Reads stay open: the storefront has to render the catalogue to a stranger.
 */
const CATALOGUE_ADMIN_ROLES = new Set([
  'owner', 'platform_owner', 'business_owner', 'admin', 'master_admin',
  'super_admin', 'superadmin', 'management', 'staff', 'employee',
]);

async function requireCatalogueAdmin(c: any): Promise<Response | null> {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return c.json({ error: 'Sign in required.' }, 401);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return c.json({ error: 'Sign in required.' }, 401);

  const owners = [
    'ericerb555@proton.me',
    ...(Deno.env.get('PLATFORM_OWNER_EMAILS') || '')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  ];
  const email = String(data.user.email || '').toLowerCase();
  // app_metadata only, via trustedRole — a role the browser can write is not a
  // role, and this one decides who can put things in the shop and price them.
  if (owners.includes(email) || CATALOGUE_ADMIN_ROLES.has(trustedRole(data.user))) return null;

  return c.json({ error: 'Administrator access is required to change products.' }, 403);
}

// Create Product
productsRouter.post('/products', async (c) => {
  const refused = await requireCatalogueAdmin(c);
  if (refused) return refused;
  try {
    const body = await c.req.json();
    const { vendorId, name, description, category, price, inventoryQuantity, images, ...rest } = body;

    // Validation
    if (!vendorId || !name || !price || price < 0) {
      return c.json({ error: 'Missing required fields: vendorId, name, price' }, 400);
    }

    // Get vendor info
    const vendorKey = `vendor_${vendorId}`;
    const vendorData = await kv.get(vendorKey);
    
    if (!vendorData) {
      return c.json({ error: 'Vendor not found' }, 404);
    }

    const vendorName = vendorData.company_name || vendorData.name || 'Unknown Vendor';

    const product: Product = {
      id: generateProductId(),
      vendorId,
      vendorName,
      name,
      description: description || '',
      category: category || 'Uncategorized',
      price: parseFloat(price),
      inventoryQuantity: parseInt(inventoryQuantity) || 0,
      trackInventory: rest.trackInventory !== false,
      images: images || [],
      primaryImage: images?.[0] || '',
      isActive: rest.isActive !== false,
      isFeatured: rest.isFeatured || false,
      slug: rest.slug || generateSlug(name),
      viewCount: 0,
      orderCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...rest,
    };

    // Save product
    await kv.set(`product_${product.id}`, product);
    invalidateProductsCache();

    // Add to vendor's product list
    const vendorProductsKey = `vendor_products_${vendorId}`;
    const vendorProducts = (await kv.get(vendorProductsKey)) || [];
    vendorProducts.push(product.id);
    await kv.set(vendorProductsKey, vendorProducts);

    // Add to category index
    const categoryKey = `category_products_${product.category}`;
    const categoryProducts = (await kv.get(categoryKey)) || [];
    categoryProducts.push(product.id);
    await kv.set(categoryKey, categoryProducts);

    return c.json({ success: true, product }, 201);
  } catch (error) {
    console.error('Error creating product:', error);
    return c.json({ error: 'Failed to create product', details: error.message }, 500);
  }
});

// Summary of products grouped by dropship source, with active/hidden counts.
// Registered BEFORE `/products/:id` so it isn't captured as an id lookup.
productsRouter.get('/products/source-summary', async (c) => {
  try {
    const products = await loadAllProducts();
    const summary: Record<string, { total: number; active: number; hidden: number }> = {};
    for (const p of products) {
      const src = productSource(p);
      const entry = summary[src] || { total: 0, active: 0, hidden: 0 };
      entry.total += 1;
      if (p.isActive === false) entry.hidden += 1; else entry.active += 1;
      summary[src] = entry;
    }
    return c.json({ success: true, sources: summary });
  } catch (error) {
    console.error('Error building product source summary:', error);
    return c.json({ error: 'Failed to build source summary', details: (error as any)?.message }, 500);
  }
});

// Get Product by ID
productsRouter.get('/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const product = await kv.get(`product_${id}`) || await kv.get(`live_product_${id}`);

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Increment view count
    product.viewCount = (product.viewCount || 0) + 1;
    await kv.set(`product_${id}`, product);

    return c.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product', details: error.message }, 500);
  }
});

// List Products with Filters
productsRouter.get('/products', async (c) => {
  try {
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const vendorId = url.searchParams.get('vendorId');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const isActive = url.searchParams.get('isActive');
    const isFeatured = url.searchParams.get('isFeatured');
    const inStock = url.searchParams.get('inStock');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');

    // Canonical vendor products and imported dropship products use different
    // KV prefixes. Read both (cached + de-duped) so imported products are
    // immediately sellable without re-scanning the table on every request.
    let products = (await loadAllProducts()) as Product[];
    if (vendorId) products = products.filter((product: any) => product.vendorId === vendorId);
    if (category) products = products.filter((product: any) => product.category === category);

    // Apply filters
    if (isActive !== null && isActive !== undefined) {
      products = products.filter(p => p.isActive === (isActive === 'true'));
    }

    if (isFeatured === 'true') {
      products = products.filter(p => p.isFeatured);
    }

    if (inStock === 'true') {
      products = products.filter(p => p.inventoryQuantity > 0);
    }

    if (minPrice) {
      products = products.filter(p => p.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      products = products.filter(p => p.price <= parseFloat(maxPrice));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by featured first, then by date
    products.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pagination
    const total = products.length;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);

    const response: ProductsResponse = {
      products: paginatedProducts,
      total,
      page,
      limit,
    };

    return c.json({ success: true, ...response });
  } catch (error) {
    console.error('Error listing products:', error);
    return c.json({ error: 'Failed to list products', details: error.message }, 500);
  }
});

// Update Product
productsRouter.put('/products/:id', async (c) => {
  const refused = await requireCatalogueAdmin(c);
  if (refused) return refused;

  try {
    const id = c.req.param('id');
    const updates = await c.req.json();

    // Resolve which KV prefix this product actually lives under. Imported
    // dropship products use `live_product_`; canonical ones use `product_`.
    // We must write the update back to the SAME key — GET merges both prefixes
    // and the live_product_ copy wins on a key collision, so saving a live
    // product to `product_` would let the stale copy shadow the edit.
    const canonical = await kv.get(`product_${id}`);
    const live = canonical ? null : await kv.get(`live_product_${id}`);
    const product = canonical || live;
    const productKey = canonical ? `product_${id}` : `live_product_${id}`;
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Update fields
    const updatedProduct: Product = {
      ...product,
      ...updates,
      id: product.id, // Prevent ID change
      vendorId: product.vendorId, // Prevent vendor change
      createdAt: product.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    // Profit guardrail — never persist a price that sells at a loss. The price
    // must clear the landed cost (cost + supplier shipping) by at least the
    // minimum margin. This is the authoritative backstop; the admin UI enforces
    // the same rule, but the server is the last line of defense.
    const MIN_PROFIT_MARGIN_PCT = 5;
    const cost = Number((updatedProduct as any).cost_price ?? (updatedProduct as any).cost) || 0;
    const shipping = Number((updatedProduct as any).shippingCost ?? (updatedProduct as any).shipping_cost) || 0;
    const price = Number((updatedProduct as any).price) || 0;
    const landed = cost + shipping;
    if (landed > 0) {
      const floor = Math.round(landed * (1 + MIN_PROFIT_MARGIN_PCT / 100) * 100) / 100;
      if (price < floor) {
        return c.json({
          error: `Price $${price.toFixed(2)} is below the minimum profitable price of $${floor.toFixed(2)} (landed cost $${landed.toFixed(2)} + ${MIN_PROFIT_MARGIN_PCT}% margin). The store cannot sell at a loss.`,
        }, 400);
      }
    }

    // If name changed, update slug
    if (updates.name && updates.name !== product.name && !updates.slug) {
      updatedProduct.slug = generateSlug(updates.name);
    }

    // If category changed, update indexes
    if (updates.category && updates.category !== product.category) {
      // Remove from old category
      const oldCategoryKey = `category_products_${product.category}`;
      const oldCategoryProducts = (await kv.get(oldCategoryKey)) || [];
      const filteredOld = oldCategoryProducts.filter((pid: string) => pid !== id);
      await kv.set(oldCategoryKey, filteredOld);

      // Add to new category
      const newCategoryKey = `category_products_${updates.category}`;
      const newCategoryProducts = (await kv.get(newCategoryKey)) || [];
      newCategoryProducts.push(id);
      await kv.set(newCategoryKey, newCategoryProducts);
    }

    await kv.set(productKey, updatedProduct);
    invalidateProductsCache();

    return c.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ error: 'Failed to update product', details: error.message }, 500);
  }
});

// Delete Product
productsRouter.delete('/products/:id', async (c) => {
  const refused = await requireCatalogueAdmin(c);
  if (refused) return refused;

  try {
    const id = c.req.param('id');
    const product = await kv.get(`product_${id}`) || await kv.get(`live_product_${id}`);

    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Remove from vendor's product list
    const vendorProductsKey = `vendor_products_${product.vendorId}`;
    const vendorProducts = (await kv.get(vendorProductsKey)) || [];
    const filteredVendorProducts = vendorProducts.filter((pid: string) => pid !== id);
    await kv.set(vendorProductsKey, filteredVendorProducts);

    // Remove from category index
    const categoryKey = `category_products_${product.category}`;
    const categoryProducts = (await kv.get(categoryKey)) || [];
    const filteredCategoryProducts = categoryProducts.filter((pid: string) => pid !== id);
    await kv.set(categoryKey, filteredCategoryProducts);

    // Delete product
    await kv.del(`product_${id}`);
    await kv.del(`live_product_${id}`);
    invalidateProductsCache();

    return c.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ error: 'Failed to delete product', details: error.message }, 500);
  }
});

// ── Storefront visibility by dropship source ────────────────────────────────
// A product's originating dropshipper is recorded on `source` (e.g. "zendrop",
// "cjdropshipping"). These two routes let the owner see how many products came
// from each source and flip ALL of them on/off the storefront at once, without
// deleting anything — hiding = isActive:false, showing = isActive:true.

const productSource = (p: any): string =>
  String(p?.source || p?.vendorId || p?.vendorName || 'unknown').toLowerCase();

// Toggle storefront visibility for every product from a given source.
// Body: { source: string, isActive: boolean }
productsRouter.post('/products/source-visibility', async (c) => {
  const refused = await requireCatalogueAdmin(c);
  if (refused) return refused;

  try {
    const { source, isActive } = await c.req.json();
    if (!source || typeof source !== 'string') {
      return c.json({ error: 'A "source" string is required (e.g. "zendrop", "cjdropshipping").' }, 400);
    }
    if (typeof isActive !== 'boolean') {
      return c.json({ error: 'An "isActive" boolean is required.' }, 400);
    }
    const wanted = source.toLowerCase();
    const products = await loadAllProducts();
    const matches = products.filter((p: any) => productSource(p) === wanted);
    if (matches.length === 0) {
      return c.json({ success: true, updated: 0, source: wanted, isActive, message: `No products found for source "${wanted}".` });
    }

    const now = new Date().toISOString();
    let updated = 0;
    for (const product of matches) {
      if (product.isActive === isActive) continue; // already in desired state
      // Write back to the SAME prefix the product lives under. Imported dropship
      // products use `live_product_`; canonical ones use `product_`.
      const canonical = await kv.get(`product_${product.id}`);
      const key = canonical ? `product_${product.id}` : `live_product_${product.id}`;
      const existing = canonical || (await kv.get(`live_product_${product.id}`)) || product;
      await kv.set(key, { ...existing, isActive, updatedAt: now });
      updated += 1;
    }
    invalidateProductsCache();
    return c.json({ success: true, updated, matched: matches.length, source: wanted, isActive });
  } catch (error) {
    console.error('Error toggling source visibility:', error);
    return c.json({ error: 'Failed to toggle source visibility', details: (error as any)?.message }, 500);
  }
});

// Bulk Update Inventory
productsRouter.post('/products/bulk-inventory', async (c) => {
  const refused = await requireCatalogueAdmin(c);
  if (refused) return refused;

  try {
    const { updates } = await c.req.json(); // Array of { productId, quantity }

    if (!Array.isArray(updates)) {
      return c.json({ error: 'Updates must be an array' }, 400);
    }

    const results = [];

    for (const update of updates) {
      const { productId, quantity } = update;
      const product = await kv.get(`product_${productId}`);

      if (product) {
        product.inventoryQuantity = parseInt(quantity);
        product.updatedAt = new Date().toISOString();
        await kv.set(`product_${productId}`, product);
        results.push({ productId, success: true });
      } else {
        results.push({ productId, success: false, error: 'Product not found' });
      }
    }

    invalidateProductsCache();
    return c.json({ success: true, results });
  } catch (error) {
    console.error('Error bulk updating inventory:', error);
    return c.json({ error: 'Failed to bulk update inventory', details: error.message }, 500);
  }
});
