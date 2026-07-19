/**
 * Dropshipper Service Module
 * Handles inventory sync, order forwarding, and tracking integration
 */

import * as kv from './kv_store.tsx';
import * as config from './dropshipper-config.tsx';

// Storage keys
const INVENTORY_KEY_PREFIX = 'dropshipper_inventory';
const ORDER_KEY_PREFIX = 'dropshipper_order';
const TRACKING_KEY_PREFIX = 'dropshipper_tracking';
const ERROR_LOG_PREFIX = 'dropshipper_errors';

// ============================
// TYPES
// ============================

export interface DropshipperProduct {
  providerId: string;
  providerProductId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  lastSynced: string;
}

export interface DropshipperOrder {
  orderId: string;
  providerId: string;
  providerOrderId?: string;
  status: 'pending' | 'forwarded' | 'confirmed' | 'shipped' | 'delivered' | 'failed';
  items: {
    sku: string;
    quantity: number;
    price: number;
  }[];
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  forwardedAt?: string;
  confirmedAt?: string;
  shippedAt?: string;
  error?: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  events: {
    timestamp: string;
    status: string;
    location?: string;
    description: string;
  }[];
}

// ============================
// INVENTORY SYNC
// ============================

/**
 * Sync inventory from all enabled providers
 */
export async function syncInventory(): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const enabled = await config.isEnabled();
  if (!enabled) {
    return { success: false, synced: 0, errors: ['Dropshipper module is disabled'] };
  }

  const providers = await config.getEnabledProviders();
  if (providers.length === 0) {
    return { success: false, synced: 0, errors: ['No enabled providers'] };
  }

  let totalSynced = 0;
  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.syncInventory) continue;

    try {
      const products = await fetchInventoryFromProvider(provider);
      
      for (const product of products) {
        await saveInventoryItem(product);
        totalSynced++;
      }

      console.log(`[Dropshipper] Synced ${products.length} products from ${provider.name}`);
    } catch (error) {
      const errorMsg = `Failed to sync from ${provider.name}: ${error}`;
      errors.push(errorMsg);
      await logError('INVENTORY_SYNC', errorMsg, provider.id);
      console.error(`[Dropshipper Error] ${errorMsg}`);
    }
  }

  await config.updateLastSync();

  return { success: errors.length === 0, synced: totalSynced, errors };
}

/**
 * Fetch inventory from a specific provider's API
 */
async function fetchInventoryFromProvider(provider: config.DropshipperProvider): Promise<DropshipperProduct[]> {
  // This is a generic implementation - adapt based on actual provider APIs
  const response = await fetch(`${provider.apiUrl}/products`, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Transform provider data to our format
  return data.products.map((item: any) => ({
    providerId: provider.id,
    providerProductId: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description || '',
    price: applyMarkup(item.price, provider.settings.markupPercentage),
    stock: item.stock || 0,
    images: item.images || [],
    lastSynced: new Date().toISOString(),
  }));
}

/**
 * Apply markup percentage to price
 */
function applyMarkup(price: number, markupPercentage?: number): number {
  if (!markupPercentage) return price;
  return price * (1 + markupPercentage / 100);
}

/**
 * Save inventory item to storage
 */
async function saveInventoryItem(product: DropshipperProduct): Promise<void> {
  const key = `${INVENTORY_KEY_PREFIX}:${product.sku}`;
  await kv.set(key, JSON.stringify(product));
}

/**
 * Get inventory item by SKU
 */
export async function getInventoryItem(sku: string): Promise<DropshipperProduct | null> {
  const key = `${INVENTORY_KEY_PREFIX}:${sku}`;
  const data = await kv.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Get all inventory items
 */
export async function getAllInventory(): Promise<DropshipperProduct[]> {
  const items = await kv.getByPrefix(INVENTORY_KEY_PREFIX);
  return items.map(item => JSON.parse(item));
}

/**
 * Check stock availability for a SKU
 */
export async function checkStock(sku: string, quantity: number): Promise<boolean> {
  const item = await getInventoryItem(sku);
  if (!item) return false;
  return item.stock >= quantity;
}

// ============================
// ORDER FORWARDING
// ============================

/**
 * Forward order to dropshipper
 */
export async function forwardOrder(order: {
  orderId: string;
  items: { sku: string; quantity: number; price: number }[];
  shippingAddress: any;
}): Promise<{ success: boolean; error?: string }> {
  const enabled = await config.isEnabled();
  if (!enabled) {
    return { success: false, error: 'Dropshipper module is disabled' };
  }

  try {
    // Group items by provider
    const itemsByProvider = await groupItemsByProvider(order.items);
    
    // Forward to each provider
    for (const [providerId, items] of Object.entries(itemsByProvider)) {
      const provider = await config.getProvider(providerId);
      if (!provider || !provider.autoForwardOrders) continue;

      try {
        const providerOrderId = await sendOrderToProvider(provider, {
          items,
          shippingAddress: order.shippingAddress,
        });

        const dropshipperOrder: DropshipperOrder = {
          orderId: order.orderId,
          providerId,
          providerOrderId,
          status: 'forwarded',
          items,
          shippingAddress: order.shippingAddress,
          forwardedAt: new Date().toISOString(),
        };

        await saveOrder(dropshipperOrder);
        console.log(`[Dropshipper] Order ${order.orderId} forwarded to ${provider.name}`);
      } catch (error) {
        const errorMsg = `Failed to forward order to ${provider.name}: ${error}`;
        await logError('ORDER_FORWARD', errorMsg, providerId, order.orderId);
        console.error(`[Dropshipper Error] ${errorMsg}`);
      }
    }

    return { success: true };
  } catch (error) {
    const errorMsg = `Order forwarding failed: ${error}`;
    await logError('ORDER_FORWARD', errorMsg, undefined, order.orderId);
    return { success: false, error: errorMsg };
  }
}

/**
 * Group order items by provider
 */
async function groupItemsByProvider(items: { sku: string; quantity: number; price: number }[]): Promise<Record<string, any[]>> {
  const grouped: Record<string, any[]> = {};

  for (const item of items) {
    const inventoryItem = await getInventoryItem(item.sku);
    if (!inventoryItem) continue;

    if (!grouped[inventoryItem.providerId]) {
      grouped[inventoryItem.providerId] = [];
    }
    grouped[inventoryItem.providerId].push(item);
  }

  return grouped;
}

/**
 * Send order to provider's API
 */
async function sendOrderToProvider(
  provider: config.DropshipperProvider,
  orderData: { items: any[]; shippingAddress: any }
): Promise<string> {
  const response = await fetch(`${provider.apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: orderData.items,
      shipping_address: orderData.shippingAddress,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.order_id;
}

/**
 * Save order to storage
 */
async function saveOrder(order: DropshipperOrder): Promise<void> {
  const key = `${ORDER_KEY_PREFIX}:${order.orderId}`;
  await kv.set(key, JSON.stringify(order));
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<DropshipperOrder | null> {
  const key = `${ORDER_KEY_PREFIX}:${orderId}`;
  const data = await kv.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<DropshipperOrder[]> {
  const orders = await kv.getByPrefix(ORDER_KEY_PREFIX);
  return orders.map(order => JSON.parse(order));
}

// ============================
// TRACKING
// ============================

/**
 * Fetch tracking info for an order
 */
export async function getTracking(orderId: string): Promise<TrackingInfo | null> {
  const order = await getOrder(orderId);
  if (!order || !order.providerOrderId) return null;

  const provider = await config.getProvider(order.providerId);
  if (!provider) return null;

  try {
    const tracking = await fetchTrackingFromProvider(provider, order.providerOrderId);
    
    // Update order with tracking info
    order.trackingNumber = tracking.trackingNumber;
    order.trackingUrl = `https://track.example.com/${tracking.trackingNumber}`;
    order.status = mapTrackingStatus(tracking.status);
    await saveOrder(order);

    return tracking;
  } catch (error) {
    await logError('TRACKING_FETCH', `Failed to fetch tracking for order ${orderId}: ${error}`, order.providerId, orderId);
    return null;
  }
}

/**
 * Fetch tracking from provider's API
 */
async function fetchTrackingFromProvider(provider: config.DropshipperProvider, providerOrderId: string): Promise<TrackingInfo> {
  const response = await fetch(`${provider.apiUrl}/orders/${providerOrderId}/tracking`, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    trackingNumber: data.tracking_number,
    carrier: data.carrier,
    status: data.status,
    estimatedDelivery: data.estimated_delivery,
    events: data.events || [],
  };
}

/**
 * Map provider tracking status to our status
 */
function mapTrackingStatus(providerStatus: string): DropshipperOrder['status'] {
  const statusMap: Record<string, DropshipperOrder['status']> = {
    'pending': 'pending',
    'processing': 'confirmed',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'failed': 'failed',
  };
  return statusMap[providerStatus.toLowerCase()] || 'pending';
}

/**
 * Sync tracking for all pending orders
 */
export async function syncAllTracking(): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const orders = await getAllOrders();
  const pendingOrders = orders.filter(o => ['forwarded', 'confirmed', 'shipped'].includes(o.status));

  let updated = 0;
  const errors: string[] = [];

  for (const order of pendingOrders) {
    try {
      await getTracking(order.orderId);
      updated++;
    } catch (error) {
      const errorMsg = `Failed to sync tracking for order ${order.orderId}: ${error}`;
      errors.push(errorMsg);
      console.error(`[Dropshipper Error] ${errorMsg}`);
    }
  }

  return { success: errors.length === 0, updated, errors };
}

// ============================
// ERROR HANDLING
// ============================

/**
 * Log error to storage
 */
async function logError(type: string, message: string, providerId?: string, orderId?: string): Promise<void> {
  const errorKey = `${ERROR_LOG_PREFIX}:${Date.now()}`;
  const errorData = {
    type,
    message,
    providerId,
    orderId,
    timestamp: new Date().toISOString(),
  };
  await kv.set(errorKey, JSON.stringify(errorData));
}

/**
 * Get all errors
 */
export async function getErrors(limit?: number): Promise<any[]> {
  const errors = await kv.getByPrefix(ERROR_LOG_PREFIX);
  const parsed = errors.map(e => JSON.parse(e)).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return limit ? parsed.slice(0, limit) : parsed;
}

/**
 * Clear old errors (older than 30 days)
 */
export async function clearOldErrors(): Promise<void> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const errors = await kv.getByPrefix(ERROR_LOG_PREFIX);
  
  for (const error of errors) {
    const parsed = JSON.parse(error);
    if (new Date(parsed.timestamp).getTime() < thirtyDaysAgo) {
      // Note: We'd need to extract the key from the error to delete it
      // For now, we'll just log that we would delete it
      console.log(`[Dropshipper] Would clear old error: ${parsed.timestamp}`);
    }
  }
}

// ============================
// WEBHOOK HANDLERS
// ============================

/**
 * Handle webhook from dropshipper provider
 * (Called when provider updates order status)
 */
export async function handleWebhook(providerId: string, webhookData: any): Promise<{ success: boolean; error?: string }> {
  try {
    const provider = await config.getProvider(providerId);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    // Extract order info from webhook
    const providerOrderId = webhookData.order_id;
    const status = webhookData.status;
    const trackingNumber = webhookData.tracking_number;

    // Find our order
    const orders = await getAllOrders();
    const order = orders.find(o => o.providerOrderId === providerOrderId);
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Update order status
    order.status = mapTrackingStatus(status);
    order.trackingNumber = trackingNumber;
    
    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date().toISOString();
    }

    await saveOrder(order);

    console.log(`[Dropshipper] Webhook received: Order ${order.orderId} updated to ${order.status}`);

    return { success: true };
  } catch (error) {
    const errorMsg = `Webhook handling failed: ${error}`;
    await logError('WEBHOOK', errorMsg, providerId);
    return { success: false, error: errorMsg };
  }
}
