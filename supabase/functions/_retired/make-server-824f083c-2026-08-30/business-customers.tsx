/**
 * Business Customers API Routes
 * 
 * Handles business customer profile management
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// List all business customers
app.get('/list', async (c) => {
  try {
    const businessIds = await kv.get('business-customer-profiles:list') || [];
    
    const businesses = [];
    for (const businessId of businessIds) {
      const business = await kv.get(`business-customer-profile:${businessId}`);
      if (business) {
        businesses.push(business);
      }
    }
    
    console.log(`📋 Returning ${businesses.length} business customers`);
    return c.json({ businesses, count: businesses.length });
  } catch (error: any) {
    console.error('Error listing business customers:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single business customer
app.get('/:businessId', async (c) => {
  try {
    const businessId = c.req.param('businessId');
    const business = await kv.get(`business-customer-profile:${businessId}`);
    
    if (!business) {
      return c.json({ error: 'Business customer not found' }, 404);
    }
    
    return c.json({ business });
  } catch (error: any) {
    console.error('Error fetching business customer:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
