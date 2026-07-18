// eCommerce Type Definitions
// Phase 1: Foundation & Backend Infrastructure

export interface Product {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  
  // Pricing
  price: number;
  compareAtPrice?: number; // Original price for showing discounts
  cost?: number; // Vendor's cost (private)
  
  // Inventory
  sku?: string;
  barcode?: string;
  inventoryQuantity: number;
  lowStockThreshold?: number;
  trackInventory: boolean;
  
  // Media
  images: string[]; // Array of image URLs
  primaryImage: string;
  
  // Attributes
  attributes?: Record<string, string>; // e.g., { color: 'red', size: 'large' }
  tags?: string[];
  
  // SEO & Marketing
  slug?: string; // URL-friendly identifier
  metaTitle?: string;
  metaDescription?: string;
  
  // Status
  isActive: boolean;
  isFeatured: boolean;
  
  // Vendor subscription tier features
  allowCustomDomain?: boolean;
  premiumPlacement?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Stats
  viewCount: number;
  orderCount: number;
  rating?: number;
  reviewCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g., "Small / Red"
  sku: string;
  price: number;
  inventoryQuantity: number;
  attributes: Record<string, string>; // e.g., { size: 'small', color: 'red' }
  image?: string;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  variantId?: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  price: number; // Price at time of adding to cart
  maxQuantity?: number; // Maximum available quantity
  attributes?: Record<string, string>;
  addedAt?: string;
}

export interface Cart {
  id: string;
  customerId: string;
  items: CartItem[];
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  vendorId: string;
  productName: string;
  productImage: string;
  sku?: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  attributes?: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string; // Human-readable order number
  customerId: string;
  customerName: string;
  customerEmail: string;
  
  // Items grouped by vendor
  items: OrderItem[];
  vendorOrders: VendorOrder[]; // Split orders by vendor
  
  // Pricing
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  
  // Shipping Address
  shippingAddress: Address;
  billingAddress?: Address;
  
  // Payment
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  
  // Fulfillment
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  
  // Notes
  customerNotes?: string;
  internalNotes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface VendorOrder {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName: string;
  items: OrderItem[];
  subtotal: number;
  status: 'pending' | 'accepted' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  vendorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id?: string;
  fullName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  variantId?: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number; // Positive for additions, negative for subtractions
  reason?: string;
  orderId?: string;
  createdBy: string;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string; // For subcategories
  image?: string;
  isActive: boolean;
  sortOrder: number;
}

// API Response Types
export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

// Filter/Query Types
export interface ProductFilters {
  vendorId?: string;
  category?: string;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
  tags?: string[];
  inStock?: boolean;
}

export interface OrderFilters {
  customerId?: string;
  vendorId?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string; // Search by order number, customer name, email
}
