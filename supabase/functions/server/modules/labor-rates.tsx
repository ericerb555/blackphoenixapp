/**
 * Labor Rates API
 * Store and retrieve configured labor rates and profit settings
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const laborRatesRouter = new Hono();

// Enable CORS for all routes
laborRatesRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// Handle OPTIONS requests explicitly
laborRatesRouter.options('*', (c) => {
  return c.text('', 204);
});

const LABOR_RATES_KEY = 'labor_rates_config';
const PROFIT_SETTINGS_KEY = 'profit_settings_config';

// GET /labor-rates/get - Retrieve saved labor rates and profit settings
laborRatesRouter.get('/get', async (c) => {
  console.log('[Labor Rates] GET request received');
  
  try {
    const laborRates = await kv.get(LABOR_RATES_KEY);
    const profitSettings = await kv.get(PROFIT_SETTINGS_KEY);
    
    console.log('[Labor Rates] Retrieved rates:', laborRates ? 'found' : 'not found');
    console.log('[Labor Rates] Retrieved profit settings:', profitSettings ? 'found' : 'not found');

    return c.json({
      success: true,
      laborRates: laborRates || null,
      profitSettings: profitSettings || null,
      lastSaved: laborRates?.lastSaved || null
    });
  } catch (error) {
    console.error('[Labor Rates] Error retrieving rates:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to retrieve labor rates' 
    }, 500);
  }
});

// POST /labor-rates/save - Save labor rates and profit settings
laborRatesRouter.post('/save', async (c) => {
  console.log('[Labor Rates] POST save request received');
  
  try {
    const body = await c.req.json();
    const { laborRates, profitSettings, lastSaved } = body;

    if (!laborRates || !profitSettings) {
      return c.json({
        success: false,
        error: 'Missing laborRates or profitSettings'
      }, 400);
    }

    console.log('[Labor Rates] Saving rates:', laborRates.length, 'items');
    console.log('[Labor Rates] Saving profit settings');

    // Save labor rates
    await kv.set(LABOR_RATES_KEY, {
      laborRates,
      lastSaved: lastSaved || new Date().toISOString()
    });

    // Save profit settings
    await kv.set(PROFIT_SETTINGS_KEY, profitSettings);

    console.log('[Labor Rates] Successfully saved');

    return c.json({
      success: true,
      message: 'Labor rates and profit settings saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Labor Rates] Error saving rates:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to save labor rates' 
    }, 500);
  }
});

// GET /labor-rates/test - Test endpoint
laborRatesRouter.get('/test', (c) => {
  console.log('[Labor Rates] Test endpoint hit');
  return c.json({ 
    success: true, 
    message: 'Labor Rates API is running',
    timestamp: new Date().toISOString()
  });
});

export default laborRatesRouter;
