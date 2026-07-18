// eCommerce Cart API Routes
// Phase 1: Foundation & Backend Infrastructure
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

// Type definitions
interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  maxQuantity?: number;
}

interface Cart {
  id: string;
  sessionId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

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
}

export const cartRouter = new Hono();

// Helper function to generate cart ID
const generateCartId = () => `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateCartItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Calculate cart totals
const calculateCartTotals = (items: CartItem[]) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Get or Create Cart for Customer
cartRouter.get('/cart/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    
    const cartKey = `cart_${customerId}`;
    let cart = await kv.get(cartKey);

    if (!cart) {
      // Create new cart
      cart = {
        id: generateCartId(),
        customerId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(cartKey, cart);
    }

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return c.json({ error: 'Failed to fetch cart', details: error.message }, 500);
  }
});

// Add Item to Cart
cartRouter.post('/cart/:customerId/items', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const { productId, variantId, quantity } = await c.req.json();

    if (!productId || !quantity || quantity < 1) {
      return c.json({ error: 'Missing required fields: productId, quantity' }, 400);
    }

    // Get product details
    const product: Product = await kv.get(`product_${productId}`);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    if (!product.isActive) {
      return c.json({ error: 'Product is not available' }, 400);
    }

    // Check inventory
    if (product.trackInventory && product.inventoryQuantity < quantity) {
      return c.json({ 
        error: 'Insufficient inventory', 
        available: product.inventoryQuantity 
      }, 400);
    }

    // Get or create cart
    const cartKey = `cart_${customerId}`;
    let cart: Cart = await kv.get(cartKey);

    if (!cart) {
      cart = {
        id: generateCartId(),
        customerId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && item.variantId === variantId
    );

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check inventory for new quantity
      if (product.trackInventory && product.inventoryQuantity < newQuantity) {
        return c.json({ 
          error: 'Insufficient inventory for requested quantity', 
          available: product.inventoryQuantity 
        }, 400);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      const cartItem: CartItem = {
        id: generateCartItemId(),
        productId,
        variantId,
        vendorId: product.vendorId,
        quantity,
        price: product.price,
        productName: product.name,
        productImage: product.primaryImage,
        attributes: product.attributes,
        addedAt: new Date().toISOString(),
      };
      cart.items.push(cartItem);
    }

    // Recalculate totals
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return c.json({ error: 'Failed to add item to cart', details: error.message }, 500);
  }
});

// Update Cart Item Quantity
cartRouter.put('/cart/:customerId/items/:itemId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const itemId = c.req.param('itemId');
    const { quantity } = await c.req.json();

    if (quantity < 1) {
      return c.json({ error: 'Quantity must be at least 1' }, 400);
    }

    const cartKey = `cart_${customerId}`;
    const cart: Cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return c.json({ error: 'Item not found in cart' }, 404);
    }

    const item = cart.items[itemIndex];

    // Check inventory
    const product: Product = await kv.get(`product_${item.productId}`);
    if (product && product.trackInventory && product.inventoryQuantity < quantity) {
      return c.json({ 
        error: 'Insufficient inventory', 
        available: product.inventoryQuantity 
      }, 400);
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Recalculate totals
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error updating cart item:', error);
    return c.json({ error: 'Failed to update cart item', details: error.message }, 500);
  }
});

// Remove Item from Cart
cartRouter.delete('/cart/:customerId/items/:itemId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const itemId = c.req.param('itemId');

    const cartKey = `cart_${customerId}`;
    const cart: Cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    // Remove item
    cart.items = cart.items.filter(item => item.id !== itemId);

    // Recalculate totals
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error removing cart item:', error);
    return c.json({ error: 'Failed to remove cart item', details: error.message }, 500);
  }
});

// Clear Cart
cartRouter.delete('/cart/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const cartKey = `cart_${customerId}`;

    const cart: Cart = await kv.get(cartKey);
    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    // Clear all items
    cart.items = [];
    cart.subtotal = 0;
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return c.json({ error: 'Failed to clear cart', details: error.message }, 500);
  }
});

// Merge Guest Cart with User Cart (for login scenarios)
cartRouter.post('/cart/merge', async (c) => {
  try {
    const { guestCartId, customerId } = await c.req.json();

    if (!guestCartId || !customerId) {
      return c.json({ error: 'Missing guestCartId or customerId' }, 400);
    }

    // Get guest cart
    const guestCart: Cart = await kv.get(`cart_guest_${guestCartId}`);
    if (!guestCart || guestCart.items.length === 0) {
      return c.json({ success: true, message: 'No items to merge' });
    }

    // Get or create user cart
    const userCartKey = `cart_${customerId}`;
    let userCart: Cart = await kv.get(userCartKey);

    if (!userCart) {
      userCart = {
        id: generateCartId(),
        customerId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingItemIndex = userCart.items.findIndex(
        item => item.productId === guestItem.productId && item.variantId === guestItem.variantId
      );

      if (existingItemIndex > -1) {
        // Combine quantities
        userCart.items[existingItemIndex].quantity += guestItem.quantity;
      } else {
        // Add guest item
        userCart.items.push(guestItem);
      }
    }

    // Recalculate totals
    userCart.subtotal = calculateCartTotals(userCart.items);
    userCart.updatedAt = new Date().toISOString();

    await kv.set(userCartKey, userCart);

    // Delete guest cart
    await kv.del(`cart_guest_${guestCartId}`);

    return c.json({ success: true, cart: userCart });
  } catch (error) {
    console.error('Error merging carts:', error);
    return c.json({ error: 'Failed to merge carts', details: error.message }, 500);
  }
});

// Get Cart Item Count
cartRouter.get('/cart/:customerId/count', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const cartKey = `cart_${customerId}`;
    const cart: Cart = await kv.get(cartKey);

    const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

    return c.json({ success: true, count });
  } catch (error) {
    console.error('Error getting cart count:', error);
    return c.json({ error: 'Failed to get cart count', details: error.message }, 500);
  }
});

// ============================================================================
// SIMPLIFIED CART API - Matches Frontend Expectations
// ============================================================================

// GET /cart/:sessionId - Get cart by session ID
cartRouter.get('/cart/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const cartKey = `cart_${sessionId}`;
    let cart = await kv.get(cartKey);

    if (!cart) {
      // Create new empty cart
      cart = {
        id: generateCartId(),
        customerId: sessionId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(cartKey, cart);
    }

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return c.json({ error: 'Failed to fetch cart', details: error.message }, 500);
  }
});

// POST /cart/add - Add item to cart
cartRouter.post('/cart/add', async (c) => {
  try {
    const { sessionId, productId, quantity } = await c.req.json();

    if (!sessionId || !productId || !quantity || quantity < 1) {
      return c.json({ error: 'Missing required fields: sessionId, productId, quantity' }, 400);
    }

    // Get product details
    const product: Product = await kv.get(`product_${productId}`);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    if (!product.isActive) {
      return c.json({ error: 'Product is not available' }, 400);
    }

    // Check inventory
    if (product.trackInventory && product.inventoryQuantity < quantity) {
      return c.json({ 
        error: 'Insufficient inventory', 
        available: product.inventoryQuantity 
      }, 400);
    }

    // Get or create cart
    const cartKey = `cart_${sessionId}`;
    let cart: Cart = await kv.get(cartKey);

    if (!cart) {
      cart = {
        id: generateCartId(),
        customerId: sessionId,
        items: [],
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);

    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check inventory for new quantity
      if (product.trackInventory && product.inventoryQuantity < newQuantity) {
        return c.json({ 
          error: 'Insufficient inventory for requested quantity', 
          available: product.inventoryQuantity 
        }, 400);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      const cartItem: CartItem = {
        id: generateCartItemId(),
        productId: product.id,
        productName: product.name,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        price: product.price,
        quantity,
        image: product.primaryImage || product.images[0] || '',
        variantId: null,
      };
      cart.items.push(cartItem);
    }

    // Recalculate totals
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    // Save cart
    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return c.json({ error: 'Failed to add to cart', details: error.message }, 500);
  }
});

// PUT /cart/update - Update cart item quantity
cartRouter.put('/cart/update', async (c) => {
  try {
    const { sessionId, itemId, quantity } = await c.req.json();

    if (!sessionId || !itemId || !quantity || quantity < 1) {
      return c.json({ error: 'Missing required fields: sessionId, itemId, quantity' }, 400);
    }

    const cartKey = `cart_${sessionId}`;
    const cart: Cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return c.json({ error: 'Item not found in cart' }, 404);
    }

    // Get product to check inventory
    const product: Product = await kv.get(`product_${cart.items[itemIndex].productId}`);
    if (product && product.trackInventory && product.inventoryQuantity < quantity) {
      return c.json({ 
        error: 'Insufficient inventory', 
        available: product.inventoryQuantity 
      }, 400);
    }

    cart.items[itemIndex].quantity = quantity;
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    return c.json({ error: 'Failed to update cart', details: error.message }, 500);
  }
});

// DELETE /cart/remove - Remove item from cart
cartRouter.delete('/cart/remove', async (c) => {
  try {
    const { sessionId, itemId } = await c.req.json();

    if (!sessionId || !itemId) {
      return c.json({ error: 'Missing required fields: sessionId, itemId' }, 400);
    }

    const cartKey = `cart_${sessionId}`;
    const cart: Cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    cart.items = cart.items.filter(item => item.id !== itemId);
    cart.subtotal = calculateCartTotals(cart.items);
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error removing item:', error);
    return c.json({ error: 'Failed to remove item', details: error.message }, 500);
  }
});

// DELETE /cart/clear - Clear entire cart
cartRouter.delete('/cart/clear', async (c) => {
  try {
    const { sessionId } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: 'Missing required field: sessionId' }, 400);
    }

    const cartKey = `cart_${sessionId}`;
    const cart: Cart = await kv.get(cartKey);

    if (!cart) {
      return c.json({ error: 'Cart not found' }, 404);
    }

    cart.items = [];
    cart.subtotal = 0;
    cart.updatedAt = new Date().toISOString();

    await kv.set(cartKey, cart);

    return c.json({ success: true, cart });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return c.json({ error: 'Failed to clear cart', details: error.message }, 500);
  }
});

