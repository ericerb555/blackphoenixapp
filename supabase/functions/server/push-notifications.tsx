// Push Notifications Backend Handler
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const notifications = new Hono();

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

// Save push subscription
notifications.post('/make-server-3eae23a6/api/notifications/subscribe', async (c) => {
  try {
    const { subscription, userAgent, userId } = await c.req.json();
    
    const subscriptionId = `push_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscriptionData = {
      id: subscriptionId,
      subscription,
      userAgent,
      userId: userId || 'anonymous',
      createdAt: Date.now(),
      active: true,
    };

    await kv.set(`push_subscription:${subscriptionId}`, subscriptionData);

    console.log('✅ Push subscription saved:', subscriptionId);

    return c.json({
      success: true,
      subscriptionId,
    });
  } catch (error: any) {
    console.error('Error saving subscription:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Unsubscribe
notifications.post('/make-server-3eae23a6/api/notifications/unsubscribe', async (c) => {
  try {
    const { subscriptionId } = await c.req.json();
    
    const subscription = await kv.get(`push_subscription:${subscriptionId}`);
    
    if (subscription) {
      subscription.active = false;
      await kv.set(`push_subscription:${subscriptionId}`, subscription);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error unsubscribing:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// SEND NOTIFICATIONS
// ============================================

// Send notification to specific user
notifications.post('/make-server-3eae23a6/api/notifications/send', async (c) => {
  try {
    const {
      userId,
      title,
      body,
      icon,
      url,
      actions,
      tag,
      requireInteraction,
    } = await c.req.json();

    // Get all active subscriptions for this user
    const allSubscriptions = await kv.getByPrefix('push_subscription:');
    const userSubscriptions = allSubscriptions
      .map((s: any) => s.value)
      .filter((s: any) => s && s.active && s.userId === userId);

    if (userSubscriptions.length === 0) {
      return c.json({
        success: false,
        error: 'No active subscriptions found for user',
      });
    }

    const payload = {
      title,
      body,
      icon: icon || '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      url: url || '/',
      actions: actions || [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' },
      ],
      tag: tag || 'notification',
      requireInteraction: requireInteraction || false,
    };

    // In a real implementation, you would use Web Push protocol here
    // This is a simplified example
    const results = await Promise.all(
      userSubscriptions.map(async (sub: any) => {
        try {
          // Here you would actually send the push notification
          // using a library like web-push
          console.log('Sending notification to:', sub.id);
          
          // Save notification to history
          const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await kv.set(`notification:${notificationId}`, {
            id: notificationId,
            userId,
            ...payload,
            sentAt: Date.now(),
            subscriptionId: sub.id,
          });

          return { subscriptionId: sub.id, success: true };
        } catch (error: any) {
          return { subscriptionId: sub.id, success: false, error: error.message };
        }
      })
    );

    return c.json({
      success: true,
      sent: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
      results,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Broadcast notification to all users
notifications.post('/make-server-3eae23a6/api/notifications/broadcast', async (c) => {
  try {
    const {
      title,
      body,
      icon,
      url,
      segment, // 'all', 'vip', 'active', etc.
    } = await c.req.json();

    // Get all active subscriptions
    const allSubscriptions = await kv.getByPrefix('push_subscription:');
    let targetSubscriptions = allSubscriptions
      .map((s: any) => s.value)
      .filter((s: any) => s && s.active);

    // Filter by segment if specified
    if (segment && segment !== 'all') {
      // Implement segment filtering logic
      // For example, get user segments from customer data
    }

    const payload = {
      title,
      body,
      icon: icon || '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      url: url || '/',
      tag: 'broadcast',
    };

    const results = await Promise.all(
      targetSubscriptions.map(async (sub: any) => {
        try {
          console.log('Broadcasting to:', sub.id);
          
          const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await kv.set(`notification:${notificationId}`, {
            id: notificationId,
            userId: sub.userId,
            ...payload,
            sentAt: Date.now(),
            subscriptionId: sub.id,
            broadcast: true,
          });

          return { subscriptionId: sub.id, success: true };
        } catch (error: any) {
          return { subscriptionId: sub.id, success: false, error: error.message };
        }
      })
    );

    return c.json({
      success: true,
      sent: results.filter((r: any) => r.success).length,
      failed: results.filter((r: any) => !r.success).length,
      totalSubscriptions: targetSubscriptions.length,
    });
  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// AUTOMATED NOTIFICATIONS
// ============================================

// Order update notification
notifications.post('/make-server-3eae23a6/api/notifications/order-update', async (c) => {
  try {
    const { orderId, status, userId } = await c.req.json();

    const statusMessages: { [key: string]: string } = {
      processing: '🔄 Your order is being processed',
      shipped: '📦 Your order has been shipped!',
      delivered: '✅ Your order has been delivered',
      cancelled: '❌ Your order has been cancelled',
    };

    const title = 'Order Update';
    const body = statusMessages[status] || `Order ${orderId} status updated`;

    await fetch(`${c.req.url.split('/api/')[0]}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        url: `/orders/${orderId}`,
        tag: `order-${orderId}`,
      }),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error sending order notification:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Promotion notification
notifications.post('/make-server-3eae23a6/api/notifications/promotion', async (c) => {
  try {
    const {
      title,
      message,
      discount,
      productId,
      segment = 'all',
    } = await c.req.json();

    await fetch(`${c.req.url.split('/api/')[0]}/api/notifications/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || '🎉 Special Offer!',
        body: message || `Get ${discount}% off on selected items`,
        url: productId ? `/products/${productId}` : '/shop',
        segment,
        icon: '/pwa-icon-192.png',
      }),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error sending promotion:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Cart abandonment reminder
notifications.post('/make-server-3eae23a6/api/notifications/cart-reminder', async (c) => {
  try {
    const { userId, cartItems } = await c.req.json();

    await fetch(`${c.req.url.split('/api/')[0]}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: '🛒 Don\'t forget your cart!',
        body: `You have ${cartItems} item${cartItems > 1 ? 's' : ''} waiting for you`,
        url: '/cart',
        tag: 'cart-reminder',
        requireInteraction: true,
        actions: [
          { action: 'checkout', title: 'Checkout Now' },
          { action: 'later', title: 'Maybe Later' },
        ],
      }),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error sending cart reminder:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Low stock alert (for vendors/admins)
notifications.post('/make-server-3eae23a6/api/notifications/low-stock', async (c) => {
  try {
    const { productId, productName, quantity, vendorId } = await c.req.json();

    // Send to vendor/admin
    await fetch(`${c.req.url.split('/api/')[0]}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: vendorId,
        title: '⚠️ Low Stock Alert',
        body: `${productName} - Only ${quantity} units left`,
        url: `/inventory/${productId}`,
        tag: `low-stock-${productId}`,
        requireInteraction: true,
      }),
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error sending low stock alert:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// NOTIFICATION HISTORY
// ============================================

notifications.get('/make-server-3eae23a6/api/notifications/history/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = parseInt(c.req.query('limit') || '50');

    const allNotifications = await kv.getByPrefix('notification:');
    const userNotifications = allNotifications
      .map((n: any) => n.value)
      .filter((n: any) => n && n.userId === userId)
      .sort((a: any, b: any) => b.sentAt - a.sentAt)
      .slice(0, limit);

    return c.json({
      success: true,
      notifications: userNotifications,
      total: userNotifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching notification history:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default notifications;
