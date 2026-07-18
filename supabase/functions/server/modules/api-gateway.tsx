// API Gateway - Headless eCommerce Architecture
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { createClient } from 'npm:@supabase/supabase-js@2';

export const apiGatewayRouter = new Hono();

// Health check for API Gateway
apiGatewayRouter.get('/make-server-57095a78/api/health', (c) => {
  console.log('✅ API Gateway health check');
  return c.json({
    status: 'ok',
    message: 'API Gateway is running',
    timestamp: Date.now(),
    routes: [
      'GET /api/products',
      'GET /api/products/:id',
      'GET /api/inventory/:productId',
      'POST /api/orders/create',
      'GET /api/orders/:orderId/track',
      'POST /api/fraud/check',
      'GET /api/currency/rates',
      'GET /api/i18n/translations'
    ]
  });
});

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ============================================
// AUTHENTICATION & API KEY VALIDATION
// ============================================

const validateApiKey = async (apiKey: string): Promise<boolean> => {
  const validKey = await kv.get(`api_key:${apiKey}`);
  return !!validKey;
};

// Middleware for API key validation
const requireApiKey = async (c: any, next: any) => {
  const apiKey = c.req.header('X-API-Key') || c.req.query('api_key');
  
  if (!apiKey) {
    return c.json({ error: 'API key required' }, 401);
  }
  
  const isValid = await validateApiKey(apiKey);
  if (!isValid) {
    return c.json({ error: 'Invalid API key' }, 401);
  }
  
  await next();
};

// ============================================
// PRODUCTS API - Headless eCommerce
// ============================================

// Get all products with filtering, pagination, and sorting
apiGatewayRouter.get('/make-server-57095a78/api/products', async (c) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      category, 
      vendor,
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      currency = 'USD',
      language = 'en'
    } = c.req.query();

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get all products from KV store
    const productsData = await kv.getByPrefix('product:');
    let products = productsData.map((p: any) => p.value).filter(Boolean);

    // Apply filters
    if (category) {
      products = products.filter((p: any) => p.category === category);
    }
    if (vendor) {
      products = products.filter((p: any) => p.vendorId === vendor);
    }
    if (minPrice) {
      products = products.filter((p: any) => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      products = products.filter((p: any) => p.price <= parseFloat(maxPrice));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Convert currency if needed
    if (currency !== 'USD') {
      const exchangeRate = await getExchangeRate('USD', currency);
      products = products.map((p: any) => ({
        ...p,
        price: p.price * exchangeRate,
        compareAtPrice: p.compareAtPrice ? p.compareAtPrice * exchangeRate : null,
        currency
      }));
    }

    // Sort products
    products.sort((a: any, b: any) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'price') {
        return (a.price - b.price) * order;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * order;
      }
      return 0;
    });

    const total = products.length;
    const paginatedProducts = products.slice(offset, offset + parseInt(limit));

    return c.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      currency,
      language
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get single product by ID
apiGatewayRouter.get('/make-server-57095a78/api/products/:id', async (c) => {
  try {
    const productId = c.req.param('id');
    const currency = c.req.query('currency') || 'USD';
    
    const product = await kv.get(`product:${productId}`);
    
    if (!product) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    // Convert currency if needed
    if (currency !== 'USD') {
      const exchangeRate = await getExchangeRate('USD', currency);
      product.price = product.price * exchangeRate;
      if (product.compareAtPrice) {
        product.compareAtPrice = product.compareAtPrice * exchangeRate;
      }
      product.currency = currency;
    }

    // Track product view for analytics
    await trackEvent('product_view', {
      productId,
      timestamp: Date.now(),
      currency
    });

    return c.json({ success: true, data: product });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// REAL-TIME INVENTORY MANAGEMENT
// ============================================

apiGatewayRouter.get('/make-server-57095a78/api/inventory/:productId', async (c) => {
  try{
    const productId = c.req.param('productId');
    
    const inventory = await kv.get(`inventory:${productId}`);
    
    if (!inventory) {
      return c.json({
        success: true,
        data: {
          productId,
          quantity: 0,
          available: false,
          lastUpdated: Date.now()
        }
      });
    }

    return c.json({ success: true, data: inventory });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

apiGatewayRouter.post('/make-server-57095a78/api/inventory/update', async (c) => {
  try {
    const { productId, quantity, operation } = await c.req.json();
    
    let currentInventory = await kv.get(`inventory:${productId}`) || {
      productId,
      quantity: 0,
      reserved: 0,
      lowStockThreshold: 10
    };

    switch (operation) {
      case 'add':
        currentInventory.quantity += quantity;
        break;
      case 'remove':
        currentInventory.quantity = Math.max(0, currentInventory.quantity - quantity);
        break;
      case 'set':
        currentInventory.quantity = quantity;
        break;
      case 'reserve':
        currentInventory.reserved += quantity;
        currentInventory.quantity -= quantity;
        break;
      case 'release':
        currentInventory.reserved = Math.max(0, currentInventory.reserved - quantity);
        currentInventory.quantity += quantity;
        break;
    }

    currentInventory.lastUpdated = Date.now();
    currentInventory.available = currentInventory.quantity > 0;
    currentInventory.lowStock = currentInventory.quantity < currentInventory.lowStockThreshold;

    await kv.set(`inventory:${productId}`, currentInventory);

    // Log inventory change for analytics
    await trackEvent('inventory_update', {
      productId,
      operation,
      quantity,
      newQuantity: currentInventory.quantity,
      timestamp: Date.now()
    });

    return c.json({ success: true, data: currentInventory });
  } catch (error: any) {
    console.error('Error updating inventory:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk inventory check (for cart validation)
apiGatewayRouter.post('/make-server-57095a78/api/inventory/check-bulk', async (c) => {
  try {
    const { items } = await c.req.json(); // [{ productId, quantity }]
    
    const results = await Promise.all(
      items.map(async (item: any) => {
        const inventory = await kv.get(`inventory:${item.productId}`) || {
          productId: item.productId,
          quantity: 0,
          available: false
        };
        
        return {
          productId: item.productId,
          requestedQuantity: item.quantity,
          availableQuantity: inventory.quantity,
          available: inventory.quantity >= item.quantity
        };
      })
    );

    const allAvailable = results.every(r => r.available);

    return c.json({
      success: true,
      allAvailable,
      items: results
    });
  } catch (error: any) {
    console.error('Error checking inventory:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// REAL-TIME ORDER TRACKING
// ============================================

apiGatewayRouter.post('/make-server-57095a78/api/orders/create', async (c) => {
  try {
    const orderData = await c.req.json();
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const order = {
      id: orderId,
      ...orderData,
      status: 'pending',
      trackingEvents: [{
        status: 'order_placed',
        timestamp: Date.now(),
        message: 'Order received and being processed'
      }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Run fraud detection
    const fraudScore = await detectFraud(order);
    order.fraudScore = fraudScore;
    
    if (fraudScore > 0.8) {
      order.status = 'flagged';
      order.trackingEvents.push({
        status: 'flagged',
        timestamp: Date.now(),
        message: 'Order flagged for review'
      });
    }

    await kv.set(`order:${orderId}`, order);

    // Reserve inventory
    for (const item of orderData.items) {
      await fetch(`${c.req.url.split('/api/')[0]}/api/inventory/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          operation: 'reserve'
        })
      });
    }

    // Track order creation for analytics
    await trackEvent('order_created', {
      orderId,
      total: orderData.total,
      itemCount: orderData.items.length,
      currency: orderData.currency || 'USD',
      timestamp: Date.now()
    });

    return c.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

apiGatewayRouter.get('/make-server-57095a78/api/orders/:orderId/track', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        trackingEvents: order.trackingEvents,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber
      }
    });
  } catch (error: any) {
    console.error('Error tracking order:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

apiGatewayRouter.post('/make-server-57095a78/api/orders/:orderId/update-status', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const { status, message, trackingNumber } = await c.req.json();
    
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    order.status = status;
    order.updatedAt = Date.now();
    
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    order.trackingEvents.push({
      status,
      timestamp: Date.now(),
      message: message || `Order status updated to ${status}`
    });

    await kv.set(`order:${orderId}`, order);

    return c.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// AI-POWERED FRAUD DETECTION
// ============================================

async function detectFraud(order: any): Promise<number> {
  let score = 0;
  const weights = {
    velocity: 0.3,
    amount: 0.25,
    location: 0.2,
    deviceFingerprint: 0.15,
    behavior: 0.1
  };

  // Check order velocity (multiple orders in short time)
  const recentOrders = await kv.getByPrefix(`order:`);
  const userOrders = recentOrders
    .map((o: any) => o.value)
    .filter((o: any) => 
      o.customerEmail === order.customerEmail &&
      Date.now() - o.createdAt < 3600000 // Last hour
    );
  
  if (userOrders.length > 3) {
    score += weights.velocity;
  } else if (userOrders.length > 1) {
    score += weights.velocity * 0.5;
  }

  // Check unusual amount
  const avgOrderValue = await getAverageOrderValue();
  if (order.total > avgOrderValue * 3) {
    score += weights.amount;
  } else if (order.total > avgOrderValue * 2) {
    score += weights.amount * 0.5;
  }

  // Check shipping/billing address mismatch
  if (order.shippingAddress && order.billingAddress) {
    if (order.shippingAddress.country !== order.billingAddress.country) {
      score += weights.location * 0.7;
    }
  }

  // Check for suspicious patterns
  if (order.customerEmail?.includes('+')) {
    score += weights.behavior * 0.3;
  }

  // Check rapid checkout (less than 30 seconds)
  if (order.checkoutDuration && order.checkoutDuration < 30000) {
    score += weights.behavior * 0.5;
  }

  return Math.min(score, 1);
}

apiGatewayRouter.post('/make-server-57095a78/api/fraud/check', async (c) => {
  try {
    const orderData = await c.req.json();
    const fraudScore = await detectFraud(orderData);
    
    const risk = fraudScore > 0.8 ? 'high' : fraudScore > 0.5 ? 'medium' : 'low';
    
    return c.json({
      success: true,
      fraudScore,
      risk,
      shouldReview: fraudScore > 0.8,
      factors: {
        velocity: fraudScore > 0.3,
        amount: orderData.total > await getAverageOrderValue() * 2,
        location: orderData.shippingAddress?.country !== orderData.billingAddress?.country
      }
    });
  } catch (error: any) {
    console.error('Error checking fraud:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// MULTI-CURRENCY SUPPORT
// ============================================

const exchangeRates: { [key: string]: number } = {
  'USD': 1,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 149.50,
  'CAD': 1.35,
  'AUD': 1.52,
  'CHF': 0.88,
  'CNY': 7.24,
  'INR': 83.12,
  'MXN': 17.05
};

async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  
  // Check cache first
  const cacheKey = `exchange_rate:${from}_${to}`;
  const cached = await kv.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
    return cached.rate;
  }

  // Calculate from base rates
  const rate = exchangeRates[to] / exchangeRates[from];
  
  // Cache for 1 hour
  await kv.set(cacheKey, {
    rate,
    timestamp: Date.now()
  });

  return rate;
}

apiGatewayRouter.get('/make-server-57095a78/api/currency/rates', async (c) => {
  try {
    const base = c.req.query('base') || 'USD';
    const targets = c.req.query('targets')?.split(',') || Object.keys(exchangeRates);
    
    const rates: { [key: string]: number } = {};
    
    for (const target of targets) {
      rates[target] = await getExchangeRate(base, target);
    }

    return c.json({
      success: true,
      base,
      rates,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('Error fetching exchange rates:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

apiGatewayRouter.post('/make-server-57095a78/api/currency/convert', async (c) => {
  try {
    const { amount, from, to } = await c.req.json();
    const rate = await getExchangeRate(from, to);
    const converted = amount * rate;
    
    return c.json({
      success: true,
      from,
      to,
      amount,
      converted,
      rate
    });
  } catch (error: any) {
    console.error('Error converting currency:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// MULTI-LANGUAGE & GEO-TARGETING
// ============================================

const translations: { [key: string]: any } = {
  en: {
    'product.add_to_cart': 'Add to Cart',
    'product.out_of_stock': 'Out of Stock',
    'checkout.title': 'Checkout',
    'order.confirmed': 'Order Confirmed'
  },
  es: {
    'product.add_to_cart': 'Añadir al Carrito',
    'product.out_of_stock': 'Agotado',
    'checkout.title': 'Pagar',
    'order.confirmed': 'Pedido Confirmado'
  },
  fr: {
    'product.add_to_cart': 'Ajouter au Panier',
    'product.out_of_stock': 'Rupture de Stock',
    'checkout.title': 'Paiement',
    'order.confirmed': 'Commande Confirmée'
  },
  de: {
    'product.add_to_cart': 'In den Warenkorb',
    'product.out_of_stock': 'Nicht auf Lager',
    'checkout.title': 'Zur Kasse',
    'order.confirmed': 'Bestellung Bestätigt'
  }
};

apiGatewayRouter.get('/make-server-57095a78/api/i18n/translations', async (c) => {
  try {
    const language = c.req.query('language') || 'en';
    
    return c.json({
      success: true,
      language,
      translations: translations[language] || translations.en
    });
  } catch (error: any) {
    console.error('Error fetching translations:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

apiGatewayRouter.post('/make-server-57095a78/api/geo/detect', async (c) => {
  try {
    const ipAddress = c.req.header('CF-Connecting-IP') || 
                      c.req.header('X-Forwarded-For') || 
                      'unknown';
    
    // Simulate geo detection (in production, use a real IP geolocation service)
    const geoData = {
      ip: ipAddress,
      country: 'US',
      countryCode: 'US',
      region: 'CA',
      city: 'San Francisco',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      language: 'en'
    };

    return c.json({
      success: true,
      data: geoData
    });
  } catch (error: any) {
    console.error('Error detecting geo location:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function trackEvent(eventType: string, data: any) {
  const eventId = `event:${eventType}:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await kv.set(eventId, {
    type: eventType,
    ...data
  });
}

async function getAverageOrderValue(): Promise<number> {
  const orders = await kv.getByPrefix('order:');
  const validOrders = orders
    .map((o: any) => o.value)
    .filter((o: any) => o && o.total && o.status !== 'cancelled');
  
  if (validOrders.length === 0) return 100; // Default
  
  const sum = validOrders.reduce((acc: number, o: any) => acc + o.total, 0);
  return sum / validOrders.length;
}

// Router is exported and mounted in index.tsx