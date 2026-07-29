// eCommerce Products API Routes
// Phase 1: Foundation & Backend Infrastructure
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

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

// Create Product
productsRouter.post('/products', async (c) => {
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
    // KV prefixes. Read both so imported products immediately become sellable.
    let products = [...((await kv.getByPrefix('product_')) || []), ...((await kv.getByPrefix('live_product_')) || [])] as Product[];
    products = [...new Map(products.filter(Boolean).map((product: any) => [product.id, product])).values()] as Product[];
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

    return c.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return c.json({ error: 'Failed to update product', details: error.message }, 500);
  }
});

// Delete Product
productsRouter.delete('/products/:id', async (c) => {
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

    return c.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return c.json({ error: 'Failed to delete product', details: error.message }, 500);
  }
});

// Bulk Update Inventory
productsRouter.post('/products/bulk-inventory', async (c) => {
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

    return c.json({ success: true, results });
  } catch (error) {
    console.error('Error bulk updating inventory:', error);
    return c.json({ error: 'Failed to bulk update inventory', details: error.message }, 500);
  }
});
