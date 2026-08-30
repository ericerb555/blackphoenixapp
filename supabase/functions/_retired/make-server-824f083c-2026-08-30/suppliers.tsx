/**
 * Suppliers API Routes
 * 
 * Handles supplier profile management
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// List all suppliers
app.get('/list', async (c) => {
  try {
    const supplierIds = await kv.get('supplier-profiles:list') || [];
    
    const suppliers = [];
    for (const supplierId of supplierIds) {
      const supplier = await kv.get(`supplier-profile:${supplierId}`);
      if (supplier) {
        suppliers.push(supplier);
      }
    }
    
    console.log(`📋 Returning ${suppliers.length} suppliers`);
    return c.json({ suppliers, count: suppliers.length });
  } catch (error: any) {
    console.error('Error listing suppliers:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single supplier
app.get('/:supplierId', async (c) => {
  try {
    const supplierId = c.req.param('supplierId');
    const supplier = await kv.get(`supplier-profile:${supplierId}`);
    
    if (!supplier) {
      return c.json({ error: 'Supplier not found' }, 404);
    }
    
    return c.json({ supplier });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
