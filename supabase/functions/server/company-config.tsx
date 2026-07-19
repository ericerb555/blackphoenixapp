// Company Configuration API Routes
// Manages company settings including headquarters location for territory management
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const companyConfigRouter = new Hono();

const COMPANY_CONFIG_KEY = 'company_configuration';

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
