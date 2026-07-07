/**
 * System Cleanup Utility
 * Clears unused data, resets demo content, and optimizes storage
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

/**
 * Get cleanup statistics
 * GET /stats
 */
app.get('/stats', async (c) => {
  try {
    console.log('📊 Calculating cleanup statistics...');
    
    const stats = {
      materials: 0,
      vendors: 0,
      consultations: 0,
      jobs: 0,
      customers: 0,
      invoices: 0,
      photos: 0,
      productSources: 0,
      aiSessions: 0,
      cohorts: 0,
      subscriptions: 0,
      total: 0
    };
    
    // Count all data by prefix
    const prefixes = [
      'material:',
      'vendor:',
      'consultation:',
      'job:',
      'customer:',
      'invoice:',
      'photo:',
      'product-source:',
      'ai-session:',
      'cohort:',
      'subscription:'
    ];
    
    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      const key = prefix.replace(':', '').replace('-', '') + 's';
      if (stats.hasOwnProperty(key)) {
        stats[key as keyof typeof stats] = items.length;
        stats.total += items.length;
      }
    }
    
    return c.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Error calculating stats:', error);
    return c.json({ success: false, error: 'Failed to calculate stats' }, 500);
  }
});

/**
 * Clear all demo/test data
 * POST /clear-demo-data
 */
app.post('/clear-demo-data', async (c) => {
  try {
    console.log('🧹 Clearing demo data...');
    
    let cleared = 0;
    
    // Clear demo materials (those marked as demo or test)
    const materials = await kv.getByPrefix('material:');
    for (const material of materials) {
      if (material.name?.toLowerCase().includes('demo') || 
          material.name?.toLowerCase().includes('test') ||
          material.id?.includes('demo') ||
          material.id?.includes('fallback')) {
        await kv.del(`material:${material.id}`);
        cleared++;
      }
    }
    
    // Clear old AI sessions (older than 7 days)
    const aiSessions = await kv.getByPrefix('ai-session:');
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (const session of aiSessions) {
      const createdAt = new Date(session.createdAt).getTime();
      if (createdAt < sevenDaysAgo) {
        await kv.del(`ai-session:${session.id}`);
        cleared++;
      }
    }
    
    console.log(`✅ Cleared ${cleared} demo/test items`);
    
    return c.json({
      success: true,
      message: `Cleared ${cleared} demo/test items`,
      cleared
    });
  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    return c.json({ success: false, error: 'Cleanup failed' }, 500);
  }
});

/**
 * Clear specific data type
 * DELETE /:dataType
 */
app.delete('/:dataType', async (c) => {
  try {
    const dataType = c.req.param('dataType');
    console.log(`🗑️ Clearing all ${dataType} data...`);
    
    const prefix = `${dataType}:`;
    const items = await kv.getByPrefix(prefix);
    
    let deleted = 0;
    for (const item of items) {
      await kv.del(`${prefix}${item.id}`);
      deleted++;
    }
    
    console.log(`✅ Deleted ${deleted} ${dataType} items`);
    
    return c.json({
      success: true,
      message: `Deleted ${deleted} ${dataType} items`,
      deleted
    });
  } catch (error) {
    console.error('❌ Error clearing data type:', error);
    return c.json({ success: false, error: 'Delete failed' }, 500);
  }
});

/**
 * Clear old/expired data
 * POST /clear-expired
 */
app.post('/clear-expired', async (c) => {
  try {
    console.log('⏰ Clearing expired data...');
    
    let cleared = 0;
    
    // Clear expired consultations (older than 90 days and completed)
    const consultations = await kv.getByPrefix('consultation:');
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    for (const consultation of consultations) {
      const date = new Date(consultation.date).getTime();
      if (date < ninetyDaysAgo && consultation.status === 'completed') {
        await kv.del(`consultation:${consultation.id}`);
        cleared++;
      }
    }
    
    // Clear expired subscriptions
    const subscriptions = await kv.getByPrefix('subscription:');
    const now = Date.now();
    
    for (const subscription of subscriptions) {
      const endDate = new Date(subscription.endDate).getTime();
      if (endDate < now && subscription.status === 'expired') {
        await kv.del(`subscription:${subscription.id}`);
        cleared++;
      }
    }
    
    console.log(`✅ Cleared ${cleared} expired items`);
    
    return c.json({
      success: true,
      message: `Cleared ${cleared} expired items`,
      cleared
    });
  } catch (error) {
    console.error('❌ Error clearing expired data:', error);
    return c.json({ success: false, error: 'Cleanup failed' }, 500);
  }
});

/**
 * Initialize product data sources (if not exist)
 * POST /init-product-sources
 */
app.post('/init-product-sources', async (c) => {
  try {
    console.log('🔧 Initializing product data sources...');
    
    const existingSources = await kv.getByPrefix('product-source:');
    
    if (existingSources.length > 0) {
      return c.json({
        success: true,
        message: 'Product sources already initialized',
        count: existingSources.length
      });
    }
    
    // Create default sources
    const defaultSources = [
      {
        id: 'direct-homedepot',
        type: 'direct-api',
        name: 'Home Depot Official API',
        enabled: false,
        priority: 1,
        provider: 'homedepot',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.homedepot.com/v1',
          rateLimit: 100,
          timeout: 5000
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'direct-lowes',
        type: 'direct-api',
        name: "Lowe's Official API",
        enabled: false,
        priority: 1,
        provider: 'lowes',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.lowes.com/v1',
          rateLimit: 100,
          timeout: 5000
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'direct-grainger',
        type: 'direct-api',
        name: 'Grainger Official API',
        enabled: false,
        priority: 1,
        provider: 'grainger',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.grainger.com/v1',
          rateLimit: 50,
          timeout: 5000
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'thirdparty-rainforest',
        type: 'third-party',
        name: 'Rainforest API (Multi-Store)',
        enabled: false,
        priority: 2,
        provider: 'rainforest',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.rainforestapi.com/request',
          rateLimit: 200,
          timeout: 10000
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'thirdparty-oxylabs',
        type: 'third-party',
        name: 'Oxylabs E-Commerce API',
        enabled: false,
        priority: 2,
        provider: 'oxylabs',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://realtime.oxylabs.io/v1/queries',
          rateLimit: 150,
          timeout: 15000
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'thirdparty-brightdata',
        type: 'third-party',
        name: 'Bright Data Web Scraping',
        enabled: false,
        priority: 2,
        provider: 'brightdata',
        hasCredentials: false,
        credentialsValid: false,
        config: {
          baseUrl: 'https://api.brightdata.com/datasets/v3',
          rateLimit: 100,
          timeout: 20000
        },
        createdAt: new Date().toISOString()
      },
      {
        id: 'vendor-catalogs',
        type: 'vendor-catalog',
        name: 'Custom Vendor Catalogs',
        enabled: true,
        priority: 3,
        hasCredentials: true,
        credentialsValid: true,
        config: {},
        createdAt: new Date().toISOString()
      },
      {
        id: 'manual-reference',
        type: 'manual-reference',
        name: 'Manual Reference Pricing',
        enabled: true,
        priority: 4,
        hasCredentials: true,
        credentialsValid: true,
        config: {},
        createdAt: new Date().toISOString()
      }
    ];
    
    for (const source of defaultSources) {
      await kv.set(`product-source:${source.id}`, source);
    }
    
    console.log(`✅ Initialized ${defaultSources.length} product sources`);
    
    return c.json({
      success: true,
      message: `Initialized ${defaultSources.length} product sources`,
      count: defaultSources.length
    });
  } catch (error) {
    console.error('❌ Error initializing product sources:', error);
    return c.json({ success: false, error: 'Initialization failed' }, 500);
  }
});

/**
 * Full system reset (DANGER!)
 * POST /reset-all
 */
app.post('/reset-all', async (c) => {
  try {
    const confirmToken = c.req.header('X-Confirm-Reset');
    
    if (confirmToken !== 'CONFIRM_RESET_ALL_DATA') {
      return c.json({
        success: false,
        error: 'Reset requires confirmation token in X-Confirm-Reset header'
      }, 403);
    }
    
    console.log('⚠️ FULL SYSTEM RESET INITIATED...');
    
    // Get all keys
    const prefixes = [
      'material:',
      'vendor:',
      'consultation:',
      'job:',
      'customer:',
      'invoice:',
      'photo:',
      'product-source:',
      'ai-session:',
      'cohort:',
      'subscription:',
      'ai-diagnostic:',
      'workflow:',
      'service:',
      'company:',
      'user:',
      'payment:',
      'domain:'
    ];
    
    let totalDeleted = 0;
    
    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      for (const item of items) {
        await kv.del(`${prefix}${item.id}`);
        totalDeleted++;
      }
    }
    
    // Re-initialize product sources
    await initProductSources();
    
    console.log(`🔥 FULL RESET COMPLETE - Deleted ${totalDeleted} items`);
    
    return c.json({
      success: true,
      message: `System reset complete - deleted ${totalDeleted} items`,
      deleted: totalDeleted
    });
  } catch (error) {
    console.error('❌ Error during system reset:', error);
    return c.json({ success: false, error: 'Reset failed' }, 500);
  }
});

/**
 * Helper: Initialize product sources
 */
async function initProductSources() {
  const defaultSources = [
    {
      id: 'direct-homedepot',
      type: 'direct-api',
      name: 'Home Depot Official API',
      enabled: false,
      priority: 1,
      provider: 'homedepot',
      hasCredentials: false,
      credentialsValid: false,
      config: { baseUrl: 'https://api.homedepot.com/v1', rateLimit: 100, timeout: 5000 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'vendor-catalogs',
      type: 'vendor-catalog',
      name: 'Custom Vendor Catalogs',
      enabled: true,
      priority: 3,
      hasCredentials: true,
      credentialsValid: true,
      config: {},
      createdAt: new Date().toISOString()
    },
    {
      id: 'manual-reference',
      type: 'manual-reference',
      name: 'Manual Reference Pricing',
      enabled: true,
      priority: 4,
      hasCredentials: true,
      credentialsValid: true,
      config: {},
      createdAt: new Date().toISOString()
    }
  ];
  
  for (const source of defaultSources) {
    await kv.set(`product-source:${source.id}`, source);
  }
}

export default app;
