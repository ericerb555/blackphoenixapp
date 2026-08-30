/**
 * Vendors API Routes
 * 
 * Handles vendor profile management
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// List all vendors
app.get('/list', async (c) => {
  try {
    const vendorIds = await kv.get('vendor-profiles:list') || [];
    
    const vendors = [];
    for (const vendorId of vendorIds) {
      const vendor = await kv.get(`vendor-profile:${vendorId}`);
      if (vendor) {
        vendors.push(vendor);
      }
    }
    
    console.log(`📋 Returning ${vendors.length} vendors`);
    return c.json({ vendors, count: vendors.length });
  } catch (error: any) {
    console.error('Error listing vendors:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single vendor
app.get('/:vendorId', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    const vendor = await kv.get(`vendor-profile:${vendorId}`);
    
    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404);
    }
    
    return c.json({ vendor });
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update vendor
app.put('/:vendorId', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    const updates = await c.req.json();
    
    const vendor = await kv.get(`vendor-profile:${vendorId}`);
    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404);
    }
    
    const updatedVendor = { ...vendor, ...updates };
    await kv.set(`vendor-profile:${vendorId}`, updatedVendor);
    
    return c.json({ vendor: updatedVendor });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete vendor
app.delete('/:vendorId', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    
    await kv.del(`vendor-profile:${vendorId}`);
    
    const vendorIds = await kv.get('vendor-profiles:list') || [];
    const updatedIds = vendorIds.filter((id: string) => id !== vendorId);
    await kv.set('vendor-profiles:list', updatedIds);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
