// Company Configuration API Routes
// Manages company settings including headquarters location for territory management
import { Hono } from 'npm:hono@4.13.19';
import * as kv from './kv_store.tsx';
import { requireStaff } from './requireStaff.ts';

export const companyConfigRouter = new Hono();

const COMPANY_CONFIG_KEY = 'company_configuration';

/**
 * WRITING THE COMPANY'S OWN CONFIGURATION IS STAFF-ONLY. Added 2026-11-17.
 *
 * This module had no authorisation of any kind. `/company/config` is on no
 * public, admin or middleware list, so every route here was tier "user" —
 * reachable by any account with a session at all, which on this platform means
 * every customer, tenant, vendor and subcontractor.
 *
 * `PUT /company/config` spreads the request body over the stored record, so a
 * signed-in stranger could rewrite the company name, the headquarters address
 * and the territory radius settings. Territory assignment is computed from
 * that headquarters, so this is not only cosmetic: moving the address moves
 * which jobs land in which territory.
 *
 * READS ARE LEFT ALONE, DELIBERATELY. The configuration is the company's name
 * and office address — on the website's footer either way — and portal screens
 * for non-staff accounts read it. Gating the GET would empty them for the
 * people the platform is for, to protect information already public.
 *
 * THE PATH CHECK IS LOAD-BEARING, NOT TIDINESS. This router is mounted at
 * `app.route("/make-server-3eae23a6", …)`, so `use('*')` here runs on EVERY
 * request the API receives, not only the ones this file handles. Without the
 * `includes('/company/config')` bail-out, this would make every non-GET route
 * on the whole server staff-only — which is exactly what happened for one
 * deploy when somebody wrote `use("*", requireStaff)`, and is why
 * `requireStaff.ts` carries a comment telling you not to.
 *
 * Method-aware rather than `requireStaffOn`, which gates a path for every
 * method at once. The precedent is `/products/*` in index.tsx: admin for
 * anything but GET.
 */
companyConfigRouter.use('*', async (c: any, next: any) => {
  if (c.req.method === 'GET' || c.req.method === 'OPTIONS') return await next();
  const p = new URL(c.req.url).pathname;
  if (!p.includes('/company/config')) return await next();
  return await requireStaff(c, next);
});

// Get company configuration
companyConfigRouter.get('/company/config', async (c) => {
  try {
    const config = await kv.get(COMPANY_CONFIG_KEY);
    
    if (!config) {
      // Return default configuration
      const defaultConfig = {
        name: Deno.env.get('COMPANY_NAME') || 'Your Company',
        headquarters: {
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA',
        },
        territorySettings: {
          defaultRadius: 40, // miles
          maxRadius: 100,
          minRadius: 10,
        },
        contactInfo: {
          phone: '',
          email: '',
          website: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return c.json({
        success: true,
        config: defaultConfig,
        isDefault: true
      });
    }
    
    return c.json({
      success: true,
      config,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching company config:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch company configuration' 
    }, 500);
  }
});

// Update company configuration
companyConfigRouter.put('/company/config', async (c) => {
  try {
    const updates = await c.req.json();
    
    const existing = await kv.get(COMPANY_CONFIG_KEY);
    
    const config = {
      ...(existing || {}),
      ...updates,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    
    await kv.set(COMPANY_CONFIG_KEY, config);
    
    console.log(`✅ Updated company configuration - HQ: ${config.headquarters?.city}, ${config.headquarters?.state} ${config.headquarters?.zipCode}`);
    
    return c.json({
      success: true,
      config,
      message: 'Company configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating company config:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update company configuration' 
    }, 500);
  }
});

// Initialize company configuration with company name from env
companyConfigRouter.post('/company/config/initialize', async (c) => {
  try {
    const existing = await kv.get(COMPANY_CONFIG_KEY);
    
    if (existing) {
      return c.json({
        success: true,
        config: existing,
        message: 'Company configuration already exists'
      });
    }
    
    const config = {
      name: Deno.env.get('COMPANY_NAME') || 'Your Company',
      headquarters: {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
      territorySettings: {
        defaultRadius: 40,
        maxRadius: 100,
        minRadius: 10,
      },
      contactInfo: {
        phone: '',
        email: '',
        website: '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(COMPANY_CONFIG_KEY, config);
    
    console.log(`✅ Initialized company configuration for: ${config.name}`);
    
    return c.json({
      success: true,
      config,
      message: 'Company configuration initialized'
    });
  } catch (error) {
    console.error('❌ Error initializing company config:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to initialize company configuration' 
    }, 500);
  }
});
