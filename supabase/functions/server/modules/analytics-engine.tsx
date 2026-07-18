// Analytics Engine - Customer Behavior & Sales Forecasting
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const analytics = new Hono();

// ============================================
// CUSTOMER BEHAVIOR ANALYTICS
// ============================================

analytics.get('/make-server-57095a78/api/analytics/customer-behavior', async (c) => {
  try {
    const { timeframe = '30d', customerId } = c.req.query();
    
    const events = await kv.getByPrefix('event:');
    const timeframeMs = parseTimeframe(timeframe);
    const cutoffTime = Date.now() - timeframeMs;
    
    const recentEvents = events
      .map((e: any) => e.value)
      .filter((e: any) => e && e.timestamp > cutoffTime);

    if (customerId) {
      const customerEvents = recentEvents.filter((e: any) => 
        e.customerId === customerId || e.customerEmail === customerId
      );
      
      return c.json({
        success: true,
        data: await analyzeCustomerBehavior(customerEvents, customerId)
      });
    }

    // Aggregate behavior metrics
    const behavior = {
      totalSessions: new Set(recentEvents.map((e: any) => e.sessionId)).size,
      totalPageViews: recentEvents.filter((e: any) => e.type === 'product_view').length,
      totalAddToCarts: recentEvents.filter((e: any) => e.type === 'add_to_cart').length,
      totalPurchases: recentEvents.filter((e: any) => e.type === 'order_created').length,
      
      // Conversion funnel
      conversionFunnel: {
        views: recentEvents.filter((e: any) => e.type === 'product_view').length,
        addToCarts: recentEvents.filter((e: any) => e.type === 'add_to_cart').length,
        checkouts: recentEvents.filter((e: any) => e.type === 'checkout_started').length,
        purchases: recentEvents.filter((e: any) => e.type === 'order_created').length
      },

      // Top products
      topProducts: getTopItems(
        recentEvents.filter((e: any) => e.type === 'product_view'),
        'productId'
      ),

      // Top categories
      topCategories: getTopItems(
        recentEvents.filter((e: any) => e.type === 'product_view'),
        'category'
      ),

      // Average session duration (estimated)
      averageSessionDuration: calculateAverageSessionDuration(recentEvents),

      // Bounce rate (single page sessions)
      bounceRate: calculateBounceRate(recentEvents),

      // Time distribution
      timeDistribution: getTimeDistribution(recentEvents),

      // Device breakdown (if tracked)
      deviceBreakdown: getDeviceBreakdown(recentEvents)
    };

    return c.json({ success: true, data: behavior, timeframe });
  } catch (error: any) {
    console.error('Error analyzing customer behavior:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Individual customer journey analysis
async function analyzeCustomerBehavior(events: any[], customerId: string) {
  const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
  
  return {
    customerId,
    totalEvents: events.length,
    firstSeen: sortedEvents[0]?.timestamp,
    lastSeen: sortedEvents[sortedEvents.length - 1]?.timestamp,
    
    productViews: events.filter(e => e.type === 'product_view').length,
    addToCarts: events.filter(e => e.type === 'add_to_cart').length,
    purchases: events.filter(e => e.type === 'order_created').length,
    
    totalSpent: events
      .filter(e => e.type === 'order_created')
      .reduce((sum, e) => sum + (e.total || 0), 0),
    
    averageOrderValue: events.filter(e => e.type === 'order_created').length > 0
      ? events
          .filter(e => e.type === 'order_created')
          .reduce((sum, e) => sum + (e.total || 0), 0) / 
        events.filter(e => e.type === 'order_created').length
      : 0,
    
    favoriteCategories: getTopItems(
      events.filter(e => e.type === 'product_view'),
      'category'
    ).slice(0, 5),
    
    purchaseFrequency: calculatePurchaseFrequency(events),
    
    customerSegment: determineCustomerSegment(events)
  };
}

// ============================================
// SALES FORECASTING WITH AI/ML
// ============================================

analytics.get('/make-server-57095a78/api/analytics/sales-forecast', async (c) => {
  try {
    const { periods = '30', granularity = 'day' } = c.req.query();
    
    // Get historical order data
    const orders = await kv.getByPrefix('order:');
    const completedOrders = orders
      .map((o: any) => o.value)
      .filter((o: any) => 
        o && 
        o.status === 'completed' && 
        o.createdAt
      );

    // Group orders by time period
    const historicalData = groupOrdersByTime(completedOrders, granularity);
    
    // Apply time series forecasting (using simple moving average and trend analysis)
    const forecast = generateForecast(historicalData, parseInt(periods), granularity);

    return c.json({
      success: true,
      data: {
        historical: historicalData,
        forecast,
        confidence: calculateConfidence(historicalData),
        insights: generateInsights(historicalData, forecast)
      }
    });
  } catch (error: any) {
    console.error('Error generating sales forecast:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

function generateForecast(historical: any[], periods: number, granularity: string) {
  const forecast = [];
  const windowSize = Math.min(7, historical.length); // Moving average window
  
  // Calculate trend
  const trend = calculateTrend(historical);
  
  // Get seasonal patterns
  const seasonality = calculateSeasonality(historical, granularity);
  
  let lastValue = historical.length > 0 
    ? historical[historical.length - 1].total 
    : 0;
  
  for (let i = 1; i <= periods; i++) {
    // Moving average with trend and seasonality
    const recentValues = historical.slice(-windowSize).map(h => h.total);
    const average = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    
    // Apply trend
    const trendAdjustment = trend * i;
    
    // Apply seasonality
    const seasonalIndex = (historical.length + i - 1) % seasonality.length;
    const seasonalFactor = seasonality[seasonalIndex] || 1;
    
    const predicted = (average + trendAdjustment) * seasonalFactor;
    
    forecast.push({
      period: i,
      date: getFutureDate(granularity, i),
      predicted: Math.max(0, predicted),
      upperBound: predicted * 1.2,
      lowerBound: predicted * 0.8
    });
    
    lastValue = predicted;
  }
  
  return forecast;
}

function calculateTrend(data: any[]): number {
  if (data.length < 2) return 0;
  
  // Simple linear regression
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  data.forEach((point, i) => {
    sumX += i;
    sumY += point.total;
    sumXY += i * point.total;
    sumX2 += i * i;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope || 0;
}

function calculateSeasonality(data: any[], granularity: string): number[] {
  const period = granularity === 'day' ? 7 : granularity === 'week' ? 4 : 12;
  const seasonality: number[] = new Array(period).fill(1);
  
  if (data.length < period * 2) return seasonality;
  
  // Calculate average for each period position
  const periodSums: number[] = new Array(period).fill(0);
  const periodCounts: number[] = new Array(period).fill(0);
  
  data.forEach((point, i) => {
    const periodIndex = i % period;
    periodSums[periodIndex] += point.total;
    periodCounts[periodIndex]++;
  });
  
  const overallAverage = data.reduce((sum, p) => sum + p.total, 0) / data.length;
  
  for (let i = 0; i < period; i++) {
    if (periodCounts[i] > 0) {
      const periodAverage = periodSums[i] / periodCounts[i];
      seasonality[i] = periodAverage / overallAverage;
    }
  }
  
  return seasonality;
}

function calculateConfidence(historical: any[]): number {
  if (historical.length < 10) return 0.5; // Low confidence with limited data
  
  // Calculate coefficient of variation
  const values = historical.map(h => h.total);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;
  
  // Lower CV = higher confidence
  return Math.max(0, Math.min(1, 1 - (cv / 2)));
}

function generateInsights(historical: any[], forecast: any[]) {
  const insights = [];
  
  // Growth trend
  const recentAvg = historical.slice(-7).reduce((sum, h) => sum + h.total, 0) / 7;
  const forecastAvg = forecast.slice(0, 7).reduce((sum, f) => sum + f.predicted, 0) / 7;
  const growthRate = ((forecastAvg - recentAvg) / recentAvg) * 100;
  
  if (growthRate > 10) {
    insights.push({
      type: 'positive',
      message: `Strong growth expected: ${growthRate.toFixed(1)}% increase predicted`,
      impact: 'high'
    });
  } else if (growthRate < -10) {
    insights.push({
      type: 'warning',
      message: `Sales decline forecasted: ${Math.abs(growthRate).toFixed(1)}% decrease predicted`,
      impact: 'high'
    });
  }
  
  // Volatility
  const volatility = calculateVolatility(historical);
  if (volatility > 0.3) {
    insights.push({
      type: 'info',
      message: 'High sales volatility detected - consider seasonal factors',
      impact: 'medium'
    });
  }
  
  // Peak performance
  const maxHistorical = Math.max(...historical.map(h => h.total));
  const maxForecast = Math.max(...forecast.map(f => f.predicted));
  if (maxForecast > maxHistorical) {
    insights.push({
      type: 'positive',
      message: 'New sales records expected in forecast period',
      impact: 'high'
    });
  }
  
  return insights;
}

// ============================================
// REAL-TIME DASHBOARD METRICS
// ============================================

analytics.get('/make-server-57095a78/api/analytics/dashboard', async (c) => {
  try {
    const { timeframe = '7d' } = c.req.query();
    const timeframeMs = parseTimeframe(timeframe);
    const cutoffTime = Date.now() - timeframeMs;
    
    // Get all relevant data
    const [orders, events, products, inventory] = await Promise.all([
      kv.getByPrefix('order:'),
      kv.getByPrefix('event:'),
      kv.getByPrefix('product:'),
      kv.getByPrefix('inventory:')
    ]);

    const recentOrders = orders
      .map((o: any) => o.value)
      .filter((o: any) => o && o.createdAt > cutoffTime);

    const recentEvents = events
      .map((e: any) => e.value)
      .filter((e: any) => e && e.timestamp > cutoffTime);

    // Calculate KPIs
    const dashboard = {
      overview: {
        totalRevenue: recentOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalOrders: recentOrders.length,
        averageOrderValue: recentOrders.length > 0
          ? recentOrders.reduce((sum, o) => sum + (o.total || 0), 0) / recentOrders.length
          : 0,
        conversionRate: calculateConversionRate(recentEvents)
      },

      sales: {
        byDay: groupOrdersByDay(recentOrders),
        byCategory: groupOrdersByCategory(recentOrders, products.map((p: any) => p.value)),
        topProducts: getTopSellingProducts(recentOrders),
        byRegion: groupOrdersByRegion(recentOrders)
      },

      customers: {
        newCustomers: countNewCustomers(recentOrders),
        returningCustomers: countReturningCustomers(recentOrders),
        customerLifetimeValue: calculateCLV(orders.map((o: any) => o.value)),
        segments: segmentCustomers(orders.map((o: any) => o.value))
      },

      inventory: {
        lowStockAlerts: inventory
          .map((i: any) => i.value)
          .filter((i: any) => i && i.lowStock),
        outOfStockCount: inventory
          .map((i: any) => i.value)
          .filter((i: any) => i && i.quantity === 0).length,
        inventoryValue: calculateInventoryValue(inventory.map((i: any) => i.value), products.map((p: any) => p.value))
      },

      traffic: {
        totalVisits: recentEvents.length,
        uniqueVisitors: new Set(recentEvents.map(e => e.sessionId || e.customerId)).size,
        pageViews: recentEvents.filter(e => e.type === 'product_view').length,
        bounceRate: calculateBounceRate(recentEvents)
      },

      performance: {
        responseTime: 150, // Simulated
        uptime: 99.9,
        errorRate: 0.1
      }
    };

    return c.json({ success: true, data: dashboard, timeframe });
  } catch (error: any) {
    console.error('Error generating dashboard:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// PERSONALIZED MARKETING AUTOMATION
// ============================================

analytics.post('/make-server-57095a78/api/marketing/personalize', async (c) => {
  try {
    const { customerId, context } = await c.req.json();
    
    // Get customer behavior history
    const events = await kv.getByPrefix('event:');
    const customerEvents = events
      .map((e: any) => e.value)
      .filter((e: any) => 
        e && (e.customerId === customerId || e.customerEmail === customerId)
      );

    const behavior = await analyzeCustomerBehavior(customerEvents, customerId);
    
    // Generate personalized recommendations
    const recommendations = await generateRecommendations(behavior, context);
    
    // Generate personalized messaging
    const messaging = generatePersonalizedMessaging(behavior, recommendations);
    
    // Determine optimal send time
    const optimalSendTime = calculateOptimalSendTime(customerEvents);
    
    return c.json({
      success: true,
      data: {
        customerId,
        segment: behavior.customerSegment,
        recommendations,
        messaging,
        optimalSendTime,
        triggers: identifyMarketingTriggers(behavior)
      }
    });
  } catch (error: any) {
    console.error('Error personalizing marketing:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

async function generateRecommendations(behavior: any, context: any) {
  const recommendations = [];
  
  // Collaborative filtering based recommendations
  if (behavior.favoriteCategories && behavior.favoriteCategories.length > 0) {
    const topCategory = behavior.favoriteCategories[0];
    recommendations.push({
      type: 'category_based',
      category: topCategory.item,
      reason: 'Based on your browsing history',
      priority: 'high'
    });
  }
  
  // Cart abandonment
  if (behavior.addToCarts > behavior.purchases) {
    recommendations.push({
      type: 'cart_recovery',
      reason: 'Complete your purchase',
      incentive: '10% discount on abandoned cart items',
      priority: 'urgent'
    });
  }
  
  // Repeat purchase prediction
  if (behavior.purchaseFrequency && behavior.purchaseFrequency < 30) {
    recommendations.push({
      type: 'replenishment',
      reason: 'Time to restock?',
      priority: 'medium'
    });
  }
  
  // Cross-sell
  if (behavior.purchases > 0) {
    recommendations.push({
      type: 'cross_sell',
      reason: 'Customers who bought similar items also purchased',
      priority: 'medium'
    });
  }
  
  return recommendations;
}

function generatePersonalizedMessaging(behavior: any, recommendations: any[]) {
  const messages = [];
  
  if (behavior.customerSegment === 'vip') {
    messages.push({
      channel: 'email',
      subject: 'Exclusive VIP Offer Just for You',
      template: 'vip_exclusive',
      tone: 'premium'
    });
  } else if (behavior.customerSegment === 'at_risk') {
    messages.push({
      channel: 'email',
      subject: 'We Miss You! Here\'s 20% Off',
      template: 'win_back',
      tone: 'friendly'
    });
  } else if (behavior.customerSegment === 'new') {
    messages.push({
      channel: 'email',
      subject: 'Welcome! Enjoy Your First Order Discount',
      template: 'welcome_series',
      tone: 'welcoming'
    });
  }
  
  return messages;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseTimeframe(timeframe: string): number {
  const value = parseInt(timeframe);
  const unit = timeframe.replace(/\d/g, '');
  
  const multipliers: { [key: string]: number } = {
    'd': 86400000,
    'w': 604800000,
    'm': 2592000000,
    'y': 31536000000
  };
  
  return value * (multipliers[unit] || 86400000);
}

function getTopItems(events: any[], field: string, limit = 10) {
  const counts: { [key: string]: number } = {};
  
  events.forEach((e: any) => {
    const value = e[field];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  
  return Object.entries(counts)
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function calculateAverageSessionDuration(events: any[]): number {
  const sessions: { [key: string]: number[] } = {};
  
  events.forEach((e: any) => {
    const sessionId = e.sessionId;
    if (sessionId) {
      if (!sessions[sessionId]) {
        sessions[sessionId] = [];
      }
      sessions[sessionId].push(e.timestamp);
    }
  });
  
  const durations = Object.values(sessions).map(timestamps => {
    return Math.max(...timestamps) - Math.min(...timestamps);
  });
  
  if (durations.length === 0) return 0;
  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}

function calculateBounceRate(events: any[]): number {
  const sessions: { [key: string]: number } = {};
  
  events.forEach((e: any) => {
    const sessionId = e.sessionId;
    if (sessionId) {
      sessions[sessionId] = (sessions[sessionId] || 0) + 1;
    }
  });
  
  const totalSessions = Object.keys(sessions).length;
  if (totalSessions === 0) return 0;
  
  const bouncedSessions = Object.values(sessions).filter(count => count === 1).length;
  return (bouncedSessions / totalSessions) * 100;
}

function getTimeDistribution(events: any[]) {
  const hours = new Array(24).fill(0);
  
  events.forEach((e: any) => {
    const hour = new Date(e.timestamp).getHours();
    hours[hour]++;
  });
  
  return hours.map((count, hour) => ({ hour, count }));
}

function getDeviceBreakdown(events: any[]) {
  const devices: { [key: string]: number } = {
    mobile: 0,
    tablet: 0,
    desktop: 0
  };
  
  events.forEach((e: any) => {
    const device = e.device || 'desktop';
    devices[device] = (devices[device] || 0) + 1;
  });
  
  return devices;
}

function groupOrdersByTime(orders: any[], granularity: string) {
  const grouped: { [key: string]: any } = {};
  
  orders.forEach((order: any) => {
    const date = new Date(order.createdAt);
    let key: string;
    
    if (granularity === 'hour') {
      key = date.toISOString().slice(0, 13);
    } else if (granularity === 'day') {
      key = date.toISOString().slice(0, 10);
    } else if (granularity === 'week') {
      const weekNum = getWeekNumber(date);
      key = `${date.getFullYear()}-W${weekNum}`;
    } else {
      key = date.toISOString().slice(0, 7);
    }
    
    if (!grouped[key]) {
      grouped[key] = { date: key, total: 0, count: 0, orders: [] };
    }
    
    grouped[key].total += order.total || 0;
    grouped[key].count++;
    grouped[key].orders.push(order);
  });
  
  return Object.values(grouped).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

function getFutureDate(granularity: string, periods: number): string {
  const date = new Date();
  
  if (granularity === 'day') {
    date.setDate(date.getDate() + periods);
  } else if (granularity === 'week') {
    date.setDate(date.getDate() + (periods * 7));
  } else if (granularity === 'month') {
    date.setMonth(date.getMonth() + periods);
  }
  
  return date.toISOString().slice(0, 10);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function calculateConversionRate(events: any[]): number {
  const views = events.filter(e => e.type === 'product_view').length;
  const purchases = events.filter(e => e.type === 'order_created').length;
  
  if (views === 0) return 0;
  return (purchases / views) * 100;
}

function groupOrdersByDay(orders: any[]) {
  return groupOrdersByTime(orders, 'day');
}

function groupOrdersByCategory(orders: any[], products: any[]) {
  const categoryTotals: { [key: string]: number } = {};
  
  orders.forEach((order: any) => {
    order.items?.forEach((item: any) => {
      const product = products.find(p => p && p.id === item.productId);
      if (product) {
        const category = product.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + (item.price * item.quantity);
      }
    });
  });
  
  return Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function getTopSellingProducts(orders: any[], limit = 10) {
  const productCounts: { [key: string]: { count: number; revenue: number } } = {};
  
  orders.forEach((order: any) => {
    order.items?.forEach((item: any) => {
      if (!productCounts[item.productId]) {
        productCounts[item.productId] = { count: 0, revenue: 0 };
      }
      productCounts[item.productId].count += item.quantity;
      productCounts[item.productId].revenue += item.price * item.quantity;
    });
  });
  
  return Object.entries(productCounts)
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

function groupOrdersByRegion(orders: any[]) {
  const regions: { [key: string]: number } = {};
  
  orders.forEach((order: any) => {
    const region = order.shippingAddress?.country || 'Unknown';
    regions[region] = (regions[region] || 0) + (order.total || 0);
  });
  
  return Object.entries(regions)
    .map(([region, total]) => ({ region, total }))
    .sort((a, b) => b.total - a.total);
}

function countNewCustomers(orders: any[]): number {
  const customers = new Set(orders.map(o => o.customerEmail));
  return customers.size;
}

function countReturningCustomers(orders: any[]): number {
  const customerOrderCounts: { [key: string]: number } = {};
  
  orders.forEach((order: any) => {
    const email = order.customerEmail;
    customerOrderCounts[email] = (customerOrderCounts[email] || 0) + 1;
  });
  
  return Object.values(customerOrderCounts).filter(count => count > 1).length;
}

function calculateCLV(orders: any[]): number {
  const customerTotals: { [key: string]: number } = {};
  
  orders.forEach((order: any) => {
    if (order && order.customerEmail) {
      customerTotals[order.customerEmail] = 
        (customerTotals[order.customerEmail] || 0) + (order.total || 0);
    }
  });
  
  const totals = Object.values(customerTotals);
  if (totals.length === 0) return 0;
  
  return totals.reduce((sum, total) => sum + total, 0) / totals.length;
}

function segmentCustomers(orders: any[]) {
  const customerData: { [key: string]: { total: number; count: number; lastOrder: number } } = {};
  
  orders.forEach((order: any) => {
    if (!order || !order.customerEmail) return;
    
    const email = order.customerEmail;
    if (!customerData[email]) {
      customerData[email] = { total: 0, count: 0, lastOrder: 0 };
    }
    
    customerData[email].total += order.total || 0;
    customerData[email].count++;
    customerData[email].lastOrder = Math.max(customerData[email].lastOrder, order.createdAt || 0);
  });
  
  const segments = {
    vip: 0,
    loyal: 0,
    regular: 0,
    at_risk: 0,
    new: 0
  };
  
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  Object.values(customerData).forEach((data: any) => {
    const daysSinceLastOrder = (now - data.lastOrder) / (24 * 60 * 60 * 1000);
    
    if (data.total > 1000) {
      segments.vip++;
    } else if (data.count >= 5) {
      segments.loyal++;
    } else if (daysSinceLastOrder > 90) {
      segments.at_risk++;
    } else if (data.count === 1) {
      segments.new++;
    } else {
      segments.regular++;
    }
  });
  
  return segments;
}

function calculateInventoryValue(inventory: any[], products: any[]): number {
  return inventory.reduce((sum, inv) => {
    if (!inv) return sum;
    const product = products.find(p => p && p.id === inv.productId);
    if (product) {
      return sum + (inv.quantity * product.price);
    }
    return sum;
  }, 0);
}

function calculatePurchaseFrequency(events: any[]): number {
  const purchases = events
    .filter(e => e.type === 'order_created')
    .sort((a, b) => a.timestamp - b.timestamp);
  
  if (purchases.length < 2) return 0;
  
  const intervals = [];
  for (let i = 1; i < purchases.length; i++) {
    intervals.push(purchases[i].timestamp - purchases[i - 1].timestamp);
  }
  
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  return avgInterval / (24 * 60 * 60 * 1000); // Convert to days
}

function determineCustomerSegment(events: any[]): string {
  const purchases = events.filter(e => e.type === 'order_created');
  const totalSpent = purchases.reduce((sum, e) => sum + (e.total || 0), 0);
  
  if (totalSpent > 1000) return 'vip';
  if (purchases.length >= 5) return 'loyal';
  if (purchases.length === 1) return 'new';
  
  const lastPurchase = purchases.length > 0 
    ? Math.max(...purchases.map(p => p.timestamp))
    : 0;
  const daysSinceLastPurchase = (Date.now() - lastPurchase) / (24 * 60 * 60 * 1000);
  
  if (daysSinceLastPurchase > 90) return 'at_risk';
  
  return 'regular';
}

function calculateVolatility(data: any[]): number {
  const values = data.map(d => d.total);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function calculateOptimalSendTime(events: any[]): string {
  const hourCounts = new Array(24).fill(0);
  
  events.forEach((e: any) => {
    const hour = new Date(e.timestamp).getHours();
    hourCounts[hour]++;
  });
  
  const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
  return `${maxHour}:00`;
}

function identifyMarketingTriggers(behavior: any) {
  const triggers = [];
  
  if (behavior.addToCarts > behavior.purchases) {
    triggers.push({
      type: 'cart_abandonment',
      urgency: 'high',
      timing: 'immediate'
    });
  }
  
  if (behavior.purchases === 0 && behavior.productViews > 10) {
    triggers.push({
      type: 'browse_abandonment',
      urgency: 'medium',
      timing: '24_hours'
    });
  }
  
  const daysSinceLastPurchase = behavior.lastSeen 
    ? (Date.now() - behavior.lastSeen) / (24 * 60 * 60 * 1000)
    : 999;
  
  if (daysSinceLastPurchase > 60 && behavior.purchases > 0) {
    triggers.push({
      type: 'win_back',
      urgency: 'medium',
      timing: 'optimal_hour'
    });
  }
  
  return triggers;
}

export default analytics;
