/**
 * Dropshipper Product Ad Integration Module
 * Connects imported dropshipper products to ad creation workflow
 */

import * as kv from './kv_store.tsx';
import * as dropshipperCatalog from './dropshipper-catalog.tsx';

// Storage keys
const AD_TEMPLATE_PREFIX = 'ad_template';
const PRODUCT_AD_PREFIX = 'product_ad';
const AD_DRAFT_PREFIX = 'ad_draft';

// ============================
// TYPES
// ============================

export interface ProductAdTemplate {
  id: string;
  name: string;
  type: 'social' | 'banner' | 'email' | 'landing_page' | 'carousel';
  layout: string;
  size: { width: number; height: number };
  placeholders: {
    headline?: string;
    subheadline?: string;
    description?: string;
    price?: boolean;
    image?: 'primary' | 'gallery' | 'custom';
    cta?: string;
    badge?: string;
  };
  style: {
    theme: 'light' | 'dark' | 'vibrant';
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
  };
}

export interface ProductAd {
  id: string;
  templateId: string;
  productId: string; // Staging ID or SKU
  productData: {
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    primaryImage: string;
    category: string;
    tags: string[];
    sku: string;
    brand?: string;
    variants?: any[];
  };
  content: {
    headline: string;
    subheadline?: string;
    description: string;
    cta: string;
    badge?: string;
    selectedImages: string[];
  };
  customization: {
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
    layout?: string;
  };
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  platform?: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  scheduledFor?: string;
  createdBy?: string;
}

export interface AdGenerationOptions {
  tone?: 'professional' | 'casual' | 'exciting' | 'luxury' | 'discount';
  focusOn?: 'features' | 'benefits' | 'price' | 'quality' | 'uniqueness';
  includeVariants?: boolean;
  ctaStyle?: 'buy_now' | 'learn_more' | 'limited_time' | 'shop_now';
  platform?: 'facebook' | 'instagram' | 'google' | 'email' | 'web';
}

// ============================
// PRODUCT FETCHING
// ============================

/**
 * Get imported products (from staging area)
 * Returns all staged products to allow ad creation from any staged product
 */
export async function getImportedProducts(filters?: {
  category?: string;
  provider?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<any[]> {
  const products = await dropshipperCatalog.getAllStagedProducts({
    ...filters
  });
  
  return products;
}

/**
 * Get product by staging ID or SKU
 */
export async function getProductForAd(productIdOrSku: string): Promise<any | null> {
  // Try staging ID first
  let product = await dropshipperCatalog.getStagedProduct(productIdOrSku);
  
  // If not found, search by SKU
  if (!product) {
    const products = await dropshipperCatalog.getAllStagedProducts({
      search: productIdOrSku
    });
    product = products.find(p => p.sku === productIdOrSku);
  }
  
  return product || null;
}

/**
 * Get multiple products for batch ad creation
 */
export async function getProductsForAds(productIds: string[]): Promise<any[]> {
  const products = await Promise.all(
    productIds.map(id => getProductForAd(id))
  );
  
  return products.filter(p => p !== null);
}

// ============================
// AD TEMPLATES
// ============================

/**
 * Get default ad templates
 */
export async function getAdTemplates(): Promise<ProductAdTemplate[]> {
  const templates = await kv.getByPrefix(AD_TEMPLATE_PREFIX);
  
  if (templates.length === 0) {
    // Return default templates if none exist
    return getDefaultTemplates();
  }
  
  return templates.map(t => JSON.parse(t));
}

/**
 * Default templates
 */
function getDefaultTemplates(): ProductAdTemplate[] {
  return [
    {
      id: 'social_product_showcase',
      name: 'Social Product Showcase',
      type: 'social',
      layout: 'image_top',
      size: { width: 1080, height: 1080 },
      placeholders: {
        headline: 'Discover {productName}',
        description: 'Auto-generated from product',
        price: true,
        image: 'primary',
        cta: 'Shop Now',
        badge: 'New Arrival'
      },
      style: {
        theme: 'vibrant',
        primaryColor: '#ea580c',
        accentColor: '#dc2626'
      }
    },
    {
      id: 'banner_sale',
      name: 'Banner Sale Ad',
      type: 'banner',
      layout: 'horizontal_split',
      size: { width: 728, height: 90 },
      placeholders: {
        headline: 'Limited Time: {productName}',
        price: true,
        image: 'primary',
        cta: 'Buy Now',
        badge: 'Sale'
      },
      style: {
        theme: 'dark',
        primaryColor: '#ea580c'
      }
    },
    {
      id: 'carousel_variants',
      name: 'Product Carousel',
      type: 'carousel',
      layout: 'multi_image',
      size: { width: 1080, height: 1080 },
      placeholders: {
        headline: '{productName}',
        subheadline: 'Available in multiple options',
        description: 'Auto-generated from product',
        price: true,
        image: 'gallery',
        cta: 'View All Options'
      },
      style: {
        theme: 'light',
        primaryColor: '#ea580c'
      }
    },
    {
      id: 'email_product',
      name: 'Email Product Feature',
      type: 'email',
      layout: 'centered',
      size: { width: 600, height: 800 },
      placeholders: {
        headline: 'Introducing {productName}',
        subheadline: 'Just added to our store',
        description: 'Auto-generated from product',
        price: true,
        image: 'primary',
        cta: 'Shop Now'
      },
      style: {
        theme: 'light',
        primaryColor: '#ea580c'
      }
    },
    {
      id: 'landing_hero',
      name: 'Landing Page Hero',
      type: 'landing_page',
      layout: 'full_width',
      size: { width: 1920, height: 1080 },
      placeholders: {
        headline: '{productName}',
        subheadline: 'Premium quality, unbeatable price',
        description: 'Auto-generated from product',
        price: true,
        image: 'primary',
        cta: 'Get Yours Today',
        badge: 'Featured'
      },
      style: {
        theme: 'dark',
        primaryColor: '#ea580c',
        accentColor: '#dc2626'
      }
    }
  ];
}

/**
 * Save custom template
 */
export async function saveAdTemplate(template: ProductAdTemplate): Promise<void> {
  const key = `${AD_TEMPLATE_PREFIX}:${template.id}`;
  await kv.set(key, JSON.stringify(template));
}

// ============================
// AD GENERATION
// ============================

/**
 * Generate ad content from product data
 */
export function generateAdContent(
  product: any,
  template: ProductAdTemplate,
  options: AdGenerationOptions = {}
): Partial<ProductAd['content']> {
  const tone = options.tone || 'professional';
  const focusOn = options.focusOn || 'benefits';
  
  // Generate headline
  let headline = template.placeholders.headline || '{productName}';
  headline = headline.replace('{productName}', product.name);
  
  // Generate description based on tone and focus
  let description = generateDescription(product, tone, focusOn);
  
  // Generate CTA
  const cta = generateCTA(options.ctaStyle || 'shop_now', product);
  
  // Generate subheadline
  let subheadline = generateSubheadline(product, options);
  
  // Select images
  const selectedImages = selectImages(product, template, options);
  
  // Generate badge
  const badge = generateBadge(product, options);
  
  return {
    headline,
    subheadline,
    description,
    cta,
    badge,
    selectedImages
  };
}

/**
 * Generate description based on product and options
 */
function generateDescription(product: any, tone: string, focusOn: string): string {
  const descriptions = {
    professional_features: `${product.name} features ${product.description || 'premium quality and exceptional performance'}. Available now with fast shipping.`,
    professional_benefits: `Transform your space with ${product.name}. Designed for lasting quality and exceptional value.`,
    casual_features: `Check out ${product.name}! ${product.description || 'Perfect for your needs'}.`,
    casual_benefits: `You're gonna love ${product.name}! ${product.brand ? `From ${product.brand}` : 'Top quality'} and ready to ship.`,
    exciting_price: `🔥 Amazing deal on ${product.name}! ${product.compareAtPrice ? `Was $${product.compareAtPrice.toFixed(2)}` : 'Limited time only'} - Don't miss out!`,
    exciting_quality: `✨ Introducing ${product.name} - Premium quality at an unbeatable price! Order now!`,
    luxury_quality: `Experience the pinnacle of excellence with ${product.name}. ${product.brand ? `${product.brand} delivers` : 'Exceptional craftsmanship'} unmatched sophistication.`,
    discount_price: `💰 SALE: ${product.name} ${product.compareAtPrice ? `- Save $${(product.compareAtPrice - product.price).toFixed(2)}!` : 'at a special price!'}`
  };
  
  const key = `${tone}_${focusOn}`;
  return descriptions[key] || descriptions['professional_benefits'];
}

/**
 * Generate subheadline
 */
function generateSubheadline(product: any, options: AdGenerationOptions): string {
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    const savings = ((product.compareAtPrice - product.price) / product.compareAtPrice * 100).toFixed(0);
    return `Save ${savings}% - Limited Time Only`;
  }
  
  if (product.variants && product.variants.length > 0) {
    return `Available in ${product.variants.length} options`;
  }
  
  if (product.stock < 20) {
    return `Only ${product.stock} left in stock!`;
  }
  
  return product.category || 'Premium Quality Product';
}

/**
 * Generate CTA text
 */
function generateCTA(style: string, product: any): string {
  const ctas = {
    buy_now: 'Buy Now',
    learn_more: 'Learn More',
    limited_time: 'Get Limited Offer',
    shop_now: 'Shop Now',
    add_to_cart: 'Add to Cart',
    view_details: 'View Details',
    order_today: 'Order Today'
  };
  
  return ctas[style] || 'Shop Now';
}

/**
 * Select images for ad
 */
function selectImages(product: any, template: ProductAdTemplate, options: AdGenerationOptions): string[] {
  const imageType = template.placeholders.image || 'primary';
  
  if (imageType === 'primary') {
    return [product.primaryImage];
  }
  
  if (imageType === 'gallery') {
    return product.images.slice(0, 5); // Up to 5 images for carousel
  }
  
  return [product.primaryImage];
}

/**
 * Generate badge text
 */
function generateBadge(product: any, options: AdGenerationOptions): string | undefined {
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    const savings = ((product.compareAtPrice - product.price) / product.compareAtPrice * 100).toFixed(0);
    return `${savings}% OFF`;
  }
  
  if (product.tags.includes('new')) {
    return 'New Arrival';
  }
  
  if (product.tags.includes('bestseller')) {
    return 'Best Seller';
  }
  
  if (product.stock < 10) {
    return 'Low Stock';
  }
  
  return undefined;
}

// ============================
// AD MANAGEMENT
// ============================

/**
 * Create product ad
 */
export async function createProductAd(
  productId: string,
  templateId: string,
  options: AdGenerationOptions = {},
  customContent?: Partial<ProductAd['content']>
): Promise<{ success: boolean; ad?: ProductAd; error?: string }> {
  try {
    // Get product
    const product = await getProductForAd(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    
    // Get template
    const templates = await getAdTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }
    
    // Generate content
    const generatedContent = generateAdContent(product, template, options);
    const finalContent = { ...generatedContent, ...customContent };
    
    // Create ad
    const ad: ProductAd = {
      id: `ad_${Date.now()}`,
      templateId,
      productId: product.stagingId || product.sku,
      productData: {
        name: product.name,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        images: product.images,
        primaryImage: product.primaryImage,
        category: product.category,
        tags: product.tags,
        sku: product.sku,
        brand: product.brand,
        variants: product.variants
      },
      content: finalContent as ProductAd['content'],
      customization: {},
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save ad
    await saveProductAd(ad);
    
    return { success: true, ad };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Batch create ads for multiple products
 */
export async function createBulkProductAds(
  productIds: string[],
  templateId: string,
  options: AdGenerationOptions = {}
): Promise<{ success: boolean; created: ProductAd[]; failed: string[] }> {
  const created: ProductAd[] = [];
  const failed: string[] = [];
  
  for (const productId of productIds) {
    const result = await createProductAd(productId, templateId, options);
    
    if (result.success && result.ad) {
      created.push(result.ad);
    } else {
      failed.push(productId);
    }
  }
  
  return { success: failed.length === 0, created, failed };
}

/**
 * Save product ad
 */
export async function saveProductAd(ad: ProductAd): Promise<void> {
  const key = `${PRODUCT_AD_PREFIX}:${ad.id}`;
  await kv.set(key, JSON.stringify(ad));
}

/**
 * Get all product ads
 */
export async function getProductAds(filters?: {
  status?: ProductAd['status'];
  productId?: string;
  templateId?: string;
}): Promise<ProductAd[]> {
  const ads = await kv.getByPrefix(PRODUCT_AD_PREFIX);
  let parsed = ads.map(a => JSON.parse(a) as ProductAd);
  
  // Apply filters
  if (filters?.status) {
    parsed = parsed.filter(a => a.status === filters.status);
  }
  
  if (filters?.productId) {
    parsed = parsed.filter(a => a.productId === filters.productId);
  }
  
  if (filters?.templateId) {
    parsed = parsed.filter(a => a.templateId === filters.templateId);
  }
  
  // Sort by creation date (newest first)
  parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return parsed;
}

/**
 * Get single product ad
 */
export async function getProductAd(adId: string): Promise<ProductAd | null> {
  const key = `${PRODUCT_AD_PREFIX}:${adId}`;
  const data = await kv.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Update product ad
 */
export async function updateProductAd(
  adId: string,
  updates: Partial<ProductAd>
): Promise<{ success: boolean; error?: string }> {
  try {
    const ad = await getProductAd(adId);
    if (!ad) {
      return { success: false, error: 'Ad not found' };
    }
    
    const updated = {
      ...ad,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await saveProductAd(updated);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Delete product ad
 */
export async function deleteProductAd(adId: string): Promise<void> {
  const key = `${PRODUCT_AD_PREFIX}:${adId}`;
  await kv.del(key);
}

/**
 * Refresh product data in ad (sync with latest from catalog)
 */
export async function refreshProductInAd(adId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ad = await getProductAd(adId);
    if (!ad) {
      return { success: false, error: 'Ad not found' };
    }
    
    const product = await getProductForAd(ad.productId);
    if (!product) {
      return { success: false, error: 'Product not found in catalog' };
    }
    
    // Update product data
    await updateProductAd(adId, {
      productData: {
        name: product.name,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        images: product.images,
        primaryImage: product.primaryImage,
        category: product.category,
        tags: product.tags,
        sku: product.sku,
        brand: product.brand,
        variants: product.variants
      }
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get ad statistics
 */
export async function getAdStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byTemplate: Record<string, number>;
  recentlyCreated: number;
}> {
  const ads = await getProductAds();
  
  const byStatus: Record<string, number> = {};
  const byTemplate: Record<string, number> = {};
  
  for (const ad of ads) {
    byStatus[ad.status] = (byStatus[ad.status] || 0) + 1;
    byTemplate[ad.templateId] = (byTemplate[ad.templateId] || 0) + 1;
  }
  
  // Count recently created (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentlyCreated = ads.filter(a => new Date(a.createdAt) > weekAgo).length;
  
  return {
    total: ads.length,
    byStatus,
    byTemplate,
    recentlyCreated
  };
}
