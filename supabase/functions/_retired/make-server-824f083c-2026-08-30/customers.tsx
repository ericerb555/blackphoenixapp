/**
 * Customers API Routes
 * 
 * Handles customer profile management
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// List all customers
app.get('/list', async (c) => {
  try {
    const customerIds = await kv.get('customer-profiles:list') || [];
    
    const customers = [];
    for (const customerId of customerIds) {
      const customer = await kv.get(`customer-profile:${customerId}`);
      if (customer) {
        customers.push(customer);
      }
    }
    
    console.log(`📋 Returning ${customers.length} customers`);
    return c.json({ customers, count: customers.length });
  } catch (error: any) {
    console.error('Error listing customers:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single customer
app.get('/:customerId', async (c) => {
  try {
    const customerId = c.req.param('customerId');
    const customer = await kv.get(`customer-profile:${customerId}`);
    
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    return c.json({ customer });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
