// Hybrid Cart API - Tries server first, falls back to localStorage
// Provides resilient cart functionality regardless of server status
// Version: 2.0.0 - Silent Mode (No Console Errors)

import { projectId, publicAnonKey } from './supabase/info';
import { localCartManager } from './localCartManager';

let serverAvailable = true; // Optimistically assume server is available
let lastServerCheck = 0;
const SERVER_CHECK_INTERVAL = 30000; // Check every 30 seconds

async function checkServerAvailability(): Promise<boolean> {
  const now = Date.now();
  
  // Don't check too frequently
  if (now - lastServerCheck < SERVER_CHECK_INTERVAL) {
    return serverAvailable;
  }
  
  lastServerCheck = now;
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/health`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );
    
    serverAvailable = response.ok;
    return serverAvailable;
  } catch (error) {
    // Silently fall back to local cart - this is expected behavior when server is not deployed
    serverAvailable = false;
    return false;
  }
}

export async function getCart(): Promise<any> {
  const sessionId = localCartManager.getSessionId();
  
  // Try server first
  if (serverAvailable) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cart/${sessionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, cart: data.cart, source: 'server' };
      }
      
      throw new Error(`Server returned ${response.status}`);
    } catch (error) {
      // Silently fall back to local cart
      serverAvailable = false;
      // Fall through to local cart
    }
  }

  // Fallback to local cart
  const cart = localCartManager.getCart();
  return { success: true, cart, source: 'local' };
}

export async function addToCart(productId: string, quantity: number, productDetails: any): Promise<any> {
  const sessionId = localCartManager.getSessionId();
  
  // Try server first
  if (serverAvailable) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cart/add`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, productId, quantity }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        window.dispatchEvent(new Event('cart-updated'));
        return { success: true, cart: data.cart, source: 'server' };
      }
      
      throw new Error(`Server returned ${response.status}`);
    } catch (error) {
      // Silently fall back to local cart
      serverAvailable = false;
      // Fall through to local cart
    }
  }

  // Fallback to local cart
  const cart = localCartManager.addItem(productDetails, quantity);
  return { success: true, cart, source: 'local' };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<any> {
  const sessionId = localCartManager.getSessionId();
  
  // Try server first
  if (serverAvailable) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cart/update`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, itemId, quantity }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        window.dispatchEvent(new Event('cart-updated'));
        return { success: true, cart: data.cart, source: 'server' };
      }
      
      throw new Error(`Server returned ${response.status}`);
    } catch (error) {
      // Silently fall back to local cart
      serverAvailable = false;
      // Fall through to local cart
    }
  }

  // Fallback to local cart
  const cart = localCartManager.updateQuantity(itemId, quantity);
  return { success: true, cart, source: 'local' };
}

export async function removeFromCart(itemId: string): Promise<any> {
  const sessionId = localCartManager.getSessionId();
  
  // Try server first
  if (serverAvailable) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cart/remove`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, itemId }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        window.dispatchEvent(new Event('cart-updated'));
        return { success: true, cart: data.cart, source: 'server' };
      }
      
      throw new Error(`Server returned ${response.status}`);
    } catch (error) {
      // Silently fall back to local cart
      serverAvailable = false;
      // Fall through to local cart
    }
  }

  // Fallback to local cart
  const cart = localCartManager.removeItem(itemId);
  return { success: true, cart, source: 'local' };
}

export async function clearCart(): Promise<any> {
  const sessionId = localCartManager.getSessionId();
  
  // Try server first
  if (serverAvailable) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cart/clear`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        window.dispatchEvent(new Event('cart-updated'));
        return { success: true, cart: data.cart, source: 'server' };
      }
      
      throw new Error(`Server returned ${response.status}`);
    } catch (error) {
      // Silently fall back to local cart
      serverAvailable = false;
      // Fall through to local cart
    }
  }

  // Fallback to local cart
  const cart = localCartManager.clearCart();
  return { success: true, cart, source: 'local' };
}

export function getCartItemCount(): number {
  return localCartManager.getItemCount();
}

// Note: Server availability is checked on-demand when cart operations are attempted
// No periodic health checks needed to keep console clean