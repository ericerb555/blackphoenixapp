/**
 * Partners API Routes
 * 
 * Handles partner profile management
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// List all partners
app.get('/list', async (c) => {
  try {
    const partnerIds = await kv.get('partner-profiles:list') || [];
    
    const partners = [];
    for (const partnerId of partnerIds) {
      const partner = await kv.get(`partner-profile:${partnerId}`);
      if (partner) {
        partners.push(partner);
      }
    }
    
    console.log(`📋 Returning ${partners.length} partners`);
    return c.json({ partners, count: partners.length });
  } catch (error: any) {
    console.error('Error listing partners:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single partner
app.get('/:partnerId', async (c) => {
  try {
    const partnerId = c.req.param('partnerId');
    const partner = await kv.get(`partner-profile:${partnerId}`);
    
    if (!partner) {
      return c.json({ error: 'Partner not found' }, 404);
    }
    
    return c.json({ partner });
  } catch (error: any) {
    console.error('Error fetching partner:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
