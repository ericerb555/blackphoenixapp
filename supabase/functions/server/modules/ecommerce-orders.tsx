// eCommerce Orders API Routes
// Phase 1: Foundation & Backend Infrastructure
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

// Type definitions
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  subtotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: Address;
  billingAddress?: Address;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

interface VendorOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  items: OrderItem[];
  subtotal: number;
  status: string;
  customerEmail: string;
  customerName?: string;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

interface Cart {
  id: string;
  sessionId: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  inventoryQuantity: number;
  trackInventory: boolean;
  orderCount: number;
}

export const ordersRouter = new Hono();

// Test endpoint to verify router is mounted
ordersRouter.get('/orders/test', async (c) => {
  return c.json({ 
    success: true, 
    message: 'Orders router is working!',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint with sample data
ordersRouter.get('/orders/sample-data', async (c) => {
  const sampleOrders = [
    {
      id: 'order_sample_1',
      orderNumber: 'ORD-2603-0001',
      customerEmail: 'test@example.com',
      customerName: 'John Doe',
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          productName: 'Premium Widget',
          productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
          quantity: 2,
          price: 29.99,
          subtotal: 59.98,
          vendorId: 'vendor_1',
          vendorName: 'Vendor Co'
        }
      ],
      subtotal: 59.98,
      tax: 4.95,
      shipping: 9.99,
      total: 74.92,
      status: 'shipped' as const,
      paymentMethod: 'Credit Card',
      paymentStatus: 'paid' as const,
      shippingAddress: {
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'USA'
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  return c.json({
    success: true,
    orders: sampleOrders,
    count: sampleOrders.length,
    message: 'Sample data for testing'
  });
});

// Helper function to generate order ID and number
const generateOrderId = () => `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}-${random}`;
};

const generateVendorOrderId = () => `vorder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create Order from Cart
ordersRouter.post('/orders', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      customerId, 
      customerName, 
      customerEmail,
      shippingAddress,
      billingAddress,
      paymentMethod,
      customerNotes 
    } = body;

    // Validation
    if (!customerId || !customerName || !customerEmail || !shippingAddress) {
      return c.json({ 
        error: 'Missing required fields: customerId, customerName, customerEmail, shippingAddress' 
      }, 400);
    }

    // Get cart
    const cartKey = `cart_${customerId}`;
    const cart: Cart = await kv.get(cartKey);

    if (!cart || cart.items.length === 0) {
      return c.json({ error: 'Cart is empty' }, 400);
    }

    // Verify inventory and pricing
    for (const item of cart.items) {
      const product: Product = await kv.get(`product_${item.productId}`);
      
      if (!product || !product.isActive) {
        return c.json({ 
          error: `Product ${item.productName} is no longer available` 
        }, 400);
      }

      if (product.trackInventory && product.inventoryQuantity < item.quantity) {
        return c.json({ 
          error: `Insufficient inventory for ${item.productName}`,
          available: product.inventoryQuantity 
        }, 400);
      }
    }

    // Group items by vendor
    const vendorItemsMap = new Map<string, OrderItem[]>();
    
    for (const cartItem of cart.items) {
      const orderItem: OrderItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        vendorId: cartItem.vendorId,
        productName: cartItem.productName,
        productImage: cartItem.productImage,
        quantity: cartItem.quantity,
        pricePerUnit: cartItem.price,
        subtotal: cartItem.price * cartItem.quantity,
        attributes: cartItem.attributes,
      };

      if (!vendorItemsMap.has(cartItem.vendorId)) {
        vendorItemsMap.set(cartItem.vendorId, []);
      }
      vendorItemsMap.get(cartItem.vendorId)!.push(orderItem);
    }

    // Create vendor orders
    const vendorOrders: VendorOrder[] = [];
    const allOrderItems: OrderItem[] = [];

    for (const [vendorId, items] of vendorItemsMap.entries()) {
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      
      // Get vendor info
      const vendorData = await kv.get(`vendor_${vendorId}`);
      const vendorName = vendorData?.company_name || vendorData?.name || 'Unknown Vendor';

      const vendorOrder: VendorOrder = {
        id: generateVendorOrderId(),
        orderId: '', // Will be set after main order is created
        vendorId,
        vendorName,
        items,
        subtotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vendorOrders.push(vendorOrder);
      allOrderItems.push(...items);
    }

    // Calculate totals
    const subtotal = allOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.0825; // 8.25% tax (adjust as needed)
    const shipping = vendorOrders.length * 9.99; // $9.99 per vendor
    const discount = 0;
    const total = subtotal + tax + shipping - discount;

    // Create main order
    const order: Order = {
      id: generateOrderId(),
      orderNumber: generateOrderNumber(),
      customerId,
      customerName,
      customerEmail,
      items: allOrderItems,
      vendorOrders: [],
      subtotal,
      tax,
      shipping,
      discount,
      total,
      shippingAddress: shippingAddress as Address,
      billingAddress: billingAddress as Address,
      paymentMethod: paymentMethod || 'credit_card',
      paymentStatus: 'pending',
      status: 'pending',
      customerNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Set orderId on vendor orders
    vendorOrders.forEach(vo => {
      vo.orderId = order.id;
    });
    order.vendorOrders = vendorOrders;

    // Save order
    await kv.set(`order_${order.id}`, order);

    // Save vendor orders
    for (const vendorOrder of vendorOrders) {
      await kv.set(`vendor_order_${vendorOrder.id}`, vendorOrder);
      
      // Add to vendor's order list
      const vendorOrdersKey = `vendor_orders_${vendorOrder.vendorId}`;
      const vendorOrdersList = (await kv.get(vendorOrdersKey)) || [];
      vendorOrdersList.push(vendorOrder.id);
      await kv.set(vendorOrdersKey, vendorOrdersList);
    }

    // Add to customer's order list
    const customerOrdersKey = `customer_orders_${customerId}`;
    const customerOrders = (await kv.get(customerOrdersKey)) || [];
    customerOrders.push(order.id);
    await kv.set(customerOrdersKey, customerOrders);

    // Decrement inventory
    for (const item of allOrderItems) {
      const product: Product = await kv.get(`product_${item.productId}`);
      if (product && product.trackInventory) {
        product.inventoryQuantity -= item.quantity;
        product.orderCount = (product.orderCount || 0) + 1;
        product.updatedAt = new Date().toISOString();
        await kv.set(`product_${item.productId}`, product);
      }
    }

    // Clear cart
    cart.items = [];
    cart.subtotal = 0;
    cart.updatedAt = new Date().toISOString();
    await kv.set(cartKey, cart);

    return c.json({ success: true, order }, 201);
  } catch (error) {
    console.error('Error creating order:', error);
    return c.json({ error: 'Failed to create order', details: error.message }, 500);
  }
});

// Create Order from Checkout (simplified for guest checkout)
ordersRouter.post('/orders/create', async (c) => {
  try {
    const body = await c.req.json();
    const {
      sessionId,
      customer,
      shippingAddress,
      billingAddress,
      payment,
      items,
      pricing
    } = body;

    // Validation
    if (!customer || !shippingAddress || !items || items.length === 0) {
      return c.json({
        error: 'Missing required fields',
        success: false
      }, 400);
    }

    // Get cart to verify
    const cart = await kv.get(`cart_${sessionId}`);
    if (!cart || cart.items.length === 0) {
      return c.json({
        error: 'Cart is empty',
        success: false
      }, 400);
    }

    // Convert cart items to order items
    const orderItems: OrderItem[] = items.map((item: any) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: item.productId,
      vendorId: item.vendorId,
      productName: item.productName,
      productImage: item.productImage,
      sku: item.sku,
      quantity: item.quantity,
      pricePerUnit: item.price,
      subtotal: item.price * item.quantity
    }));

    // Group by vendor
    const vendorItemsMap = new Map<string, OrderItem[]>();
    for (const item of orderItems) {
      if (!vendorItemsMap.has(item.vendorId)) {
        vendorItemsMap.set(item.vendorId, []);
      }
      vendorItemsMap.get(item.vendorId)!.push(item);
    }

    // Create vendor orders
    const vendorOrders: VendorOrder[] = [];
    for (const [vendorId, vendorItems] of vendorItemsMap.entries()) {
      const subtotal = vendorItems.reduce((sum, item) => sum + item.subtotal, 0);

      // Try to get vendor name
      const vendorData = await kv.getByPrefix(`vendor_portal_`);
      const vendor = vendorData.find((v: any) => v.vendorKey === vendorId);
      const vendorName = vendor?.companyName || items.find((i: any) => i.vendorId === vendorId)?.vendorName || 'Vendor';

      const vendorOrder: VendorOrder = {
        id: generateVendorOrderId(),
        orderId: '', // Will be set after main order is created
        vendorId,
        vendorName,
        items: vendorItems,
        subtotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vendorOrders.push(vendorOrder);
    }

    // Create main order
    const orderId = generateOrderId();
    const orderNumber = generateOrderNumber();

    const order: Order = {
      id: orderId,
      orderNumber,
      customerId: sessionId, // Use session as customer ID for guest checkout
      customerName: customer.fullName || `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      items: orderItems,
      vendorOrders: [],
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      shipping: pricing.shipping,
      discount: 0,
      total: pricing.total,
      shippingAddress: {
        street: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || 'USA'
      } as Address,
      billingAddress: billingAddress ? {
        street: billingAddress.address,
        city: billingAddress.city,
        state: billingAddress.state,
        zipCode: billingAddress.zipCode,
        country: billingAddress.country || 'USA'
      } as Address : undefined,
      paymentMethod: payment.method || 'card',
      paymentStatus: 'paid',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Set orderId on vendor orders
    vendorOrders.forEach(vo => {
      vo.orderId = orderId;
    });
    order.vendorOrders = vendorOrders;

    // Save order
    await kv.set(`order_${orderId}`, order);

    // Save vendor orders
    for (const vendorOrder of vendorOrders) {
      await kv.set(`vendor_order_${vendorOrder.id}`, vendorOrder);

      // Add to vendor's order list
      const vendorOrdersKey = `vendor_orders_${vendorOrder.vendorId}`;
      const vendorOrdersList = (await kv.get(vendorOrdersKey)) || [];
      vendorOrdersList.push(vendorOrder.id);
      await kv.set(vendorOrdersKey, vendorOrdersList);
    }

    // Decrement inventory
    for (const item of orderItems) {
      const product: Product = await kv.get(`product_${item.productId}`);
      if (product && product.trackInventory) {
        product.inventoryQuantity -= item.quantity;
        product.orderCount = (product.orderCount || 0) + 1;
        product.updatedAt = new Date().toISOString();
        await kv.set(`product_${item.productId}`, product);
      }
    }

    // Clear cart
    await kv.del(`cart_${sessionId}`);

    console.log(`Order created successfully: ${orderNumber}`);

    return c.json({
      success: true,
      order: {
        orderId,
        orderNumber,
        total: order.total,
        status: order.status
      }
    }, 201);
  } catch (error) {
    console.error('Error creating order from checkout:', error);
    return c.json({
      error: 'Failed to create order',
      details: error.message,
      success: false
    }, 500);
  }
});

// List Orders for Customer (must come BEFORE /orders/:id to avoid route collision)
ordersRouter.get('/orders/customer/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    
    // Check if this is an email address
    const isEmail = customerId.includes('@');
    
    if (isEmail) {
      // Search by email across all orders
      const allOrders = await kv.getByPrefix('order_');
      const customerOrders = allOrders.filter((order: any) => 
        order.customerEmail?.toLowerCase() === customerId.toLowerCase()
      );
      
      // Sort by date (newest first)
      customerOrders.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return c.json({
        success: true,
        orders: customerOrders,
        count: customerOrders.length
      });
    }
    
    // Original logic for customerId
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    const customerOrdersKey = `customer_orders_${customerId}`;
    const orderIds = (await kv.get(customerOrdersKey)) || [];

    // Fetch all orders
    const ordersPromises = orderIds.map((id: string) => kv.get(`order_${id}`));
    let orders = (await Promise.all(ordersPromises)).filter(Boolean) as Order[];

    // Filter by status
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const total = orders.length;
    const startIndex = (page - 1) * limit;
    const paginatedOrders = orders.slice(startIndex, startIndex + limit);

    return c.json({ 
      success: true, 
      orders: paginatedOrders,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error listing customer orders:', error);
    return c.json({ error: 'Failed to list customer orders', details: error.message }, 500);
  }
});

// Get Order by ID (must come AFTER specific routes like /orders/customer/:customerId)
ordersRouter.get('/orders/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const order = await kv.get(`order_${id}`);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return c.json({ error: 'Failed to fetch order', details: error.message }, 500);
  }
});

// List Orders for Vendor
ordersRouter.get('/orders/vendor/:vendorId', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    const vendorOrdersKey = `vendor_orders_${vendorId}`;
    const vendorOrderIds = (await kv.get(vendorOrdersKey)) || [];

    // Fetch all vendor orders
    const vendorOrdersPromises = vendorOrderIds.map((id: string) => kv.get(`vendor_order_${id}`));
    let vendorOrders = (await Promise.all(vendorOrdersPromises)).filter(Boolean) as VendorOrder[];

    // Filter by status
    if (status) {
      vendorOrders = vendorOrders.filter(vo => vo.status === status);
    }

    // Sort by date (newest first)
    vendorOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const total = vendorOrders.length;
    const startIndex = (page - 1) * limit;
    const paginatedOrders = vendorOrders.slice(startIndex, startIndex + limit);

    return c.json({ 
      success: true, 
      orders: paginatedOrders,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error listing vendor orders:', error);
    return c.json({ error: 'Failed to list vendor orders', details: error.message }, 500);
  }
});

// Update Order Status
ordersRouter.put('/orders/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, trackingNumber } = await c.req.json();

    const order: Order = await kv.get(`order_${id}`);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    if (status === 'shipped') {
      order.shippedAt = new Date().toISOString();
    }

    if (status === 'delivered') {
      order.deliveredAt = new Date().toISOString();
    }

    await kv.set(`order_${id}`, order);

    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return c.json({ error: 'Failed to update order status', details: error.message }, 500);
  }
});

// Update Vendor Order Status
ordersRouter.put('/vendor-orders/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const { status, trackingNumber, vendorNotes } = await c.req.json();

    const vendorOrder: VendorOrder = await kv.get(`vendor_order_${id}`);
    if (!vendorOrder) {
      return c.json({ error: 'Vendor order not found' }, 404);
    }

    vendorOrder.status = status;
    vendorOrder.updatedAt = new Date().toISOString();

    if (trackingNumber) {
      vendorOrder.trackingNumber = trackingNumber;
    }

    if (vendorNotes) {
      vendorOrder.vendorNotes = vendorNotes;
    }

    await kv.set(`vendor_order_${id}`, vendorOrder);

    // Update main order status if all vendor orders are complete
    const mainOrder: Order = await kv.get(`order_${vendorOrder.orderId}`);
    if (mainOrder) {
      const allVendorOrders = await Promise.all(
        mainOrder.vendorOrders.map(vo => kv.get(`vendor_order_${vo.id}`))
      );

      const allShipped = allVendorOrders.every((vo: VendorOrder) => 
        vo.status === 'shipped' || vo.status === 'delivered'
      );

      const allDelivered = allVendorOrders.every((vo: VendorOrder) => 
        vo.status === 'delivered'
      );

      if (allDelivered && mainOrder.status !== 'delivered') {
        mainOrder.status = 'delivered';
        mainOrder.deliveredAt = new Date().toISOString();
        mainOrder.updatedAt = new Date().toISOString();
        await kv.set(`order_${mainOrder.id}`, mainOrder);
      } else if (allShipped && mainOrder.status === 'pending') {
        mainOrder.status = 'shipped';
        mainOrder.shippedAt = new Date().toISOString();
        mainOrder.updatedAt = new Date().toISOString();
        await kv.set(`order_${mainOrder.id}`, mainOrder);
      }
    }

    return c.json({ success: true, vendorOrder });
  } catch (error) {
    console.error('Error updating vendor order status:', error);
    return c.json({ error: 'Failed to update vendor order status', details: error.message }, 500);
  }
});

// Admin: Get all orders
ordersRouter.get('/admin/orders/all', async (c) => {
  try {
    // Get all orders from KV store
    const allOrders = await kv.getByPrefix('order_');
    
    // Sort by date (newest first)
    allOrders.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({
      success: true,
      orders: allOrders,
      total: allOrders.length
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return c.json({
      error: 'Failed to fetch orders',
      details: error.message,
      success: false
    }, 500);
  }
});

// Cancel Order
ordersRouter.post('/orders/:id/cancel', async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();

    const order: Order = await kv.get(`order_${id}`);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      return c.json({ error: 'Cannot cancel shipped or delivered orders' }, 400);
    }

    order.status = 'cancelled';
    order.internalNotes = reason || 'Cancelled by customer';
    order.updatedAt = new Date().toISOString();

    // Restore inventory
    for (const item of order.items) {
      const product: Product = await kv.get(`product_${item.productId}`);
      if (product && product.trackInventory) {
        product.inventoryQuantity += item.quantity;
        product.updatedAt = new Date().toISOString();
        await kv.set(`product_${item.productId}`, product);
      }
    }

    // Cancel all vendor orders
    for (const vendorOrder of order.vendorOrders) {
      const vo: VendorOrder = await kv.get(`vendor_order_${vendorOrder.id}`);
      if (vo) {
        vo.status = 'cancelled';
        vo.updatedAt = new Date().toISOString();
        await kv.set(`vendor_order_${vo.id}`, vo);
      }
    }

    await kv.set(`order_${id}`, order);

    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return c.json({ error: 'Failed to cancel order', details: error.message }, 500);
  }
});