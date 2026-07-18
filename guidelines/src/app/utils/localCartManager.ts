// Local Cart Manager - Fallback when server is unavailable
// Provides full cart functionality using localStorage

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  vendorName?: string;
}

interface Cart {
  id: string;
  customerId: string;
  items: CartItem[];
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

class LocalCartManager {
  private readonly CART_KEY = 'local_cart_data';
  private readonly SESSION_KEY = 'cart_session_id';

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId(): string {
    let sessionId = localStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${this.generateId()}`;
      localStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  getCart(): Cart {
    const sessionId = this.getSessionId();
    const stored = localStorage.getItem(this.CART_KEY);
    
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored cart:', e);
      }
    }

    // Create new cart
    const newCart: Cart = {
      id: `cart_${this.generateId()}`,
      customerId: sessionId,
      items: [],
      subtotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveCart(newCart);
    return newCart;
  }

  private saveCart(cart: Cart): void {
    cart.updatedAt = new Date().toISOString();
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
    
    // Dispatch event for components to react
    window.dispatchEvent(new Event('cart-updated'));
  }

  addItem(product: any, quantity: number): Cart {
    const cart = this.getCart();
    
    const existingItemIndex = cart.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        id: `item_${this.generateId()}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        imageUrl: product.images?.[0],
        vendorName: product.vendorName,
      });
    }

    this.saveCart(cart);
    return cart;
  }

  updateQuantity(itemId: string, quantity: number): Cart {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    }

    this.saveCart(cart);
    return cart;
  }

  removeItem(itemId: string): Cart {
    const cart = this.getCart();
    cart.items = cart.items.filter(item => item.id !== itemId);
    this.saveCart(cart);
    return cart;
  }

  clearCart(): Cart {
    const sessionId = this.getSessionId();
    const emptyCart: Cart = {
      id: `cart_${this.generateId()}`,
      customerId: sessionId,
      items: [],
      subtotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveCart(emptyCart);
    return emptyCart;
  }

  getItemCount(): number {
    const cart = this.getCart();
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// Export singleton instance
export const localCartManager = new LocalCartManager();
