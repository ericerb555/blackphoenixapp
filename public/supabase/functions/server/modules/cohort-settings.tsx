// Cohort Settings API Routes
// Manages editable configuration for territory and cohort systems
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const cohortSettingsRouter = new Hono();

const SETTINGS_KEY = 'cohort_system_settings';

const DEFAULT_SETTINGS = {
  capacityLimits: {
    total: 45,
    subcontractorsPerTrade: 4,
    vendors: 5,
    advertisers: 5,
    radius: 40,
    trialMonths: 6,
    founderSlots: 10,
    founderDiscount: 0.30,
  },
  subscriptionRates: {
    subcontractor: 99,
    vendor: 149,
    advertiser: 199,
  },
  maintenancePlans: {
    basic: 99,
    standard: 199,
    premium: 349,
    enterprise: 599,
  },
  vendorPlans: {
    starter: 149,
    professional: 499,
    enterprise: 999,
  },
  advertiserPlans: {
    basic: 199,
    premium: 499,
    platinum: 999,
  },
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

// Get settings
cohortSettingsRouter.get('/settings', async (c) => {
  try {
    const settings = await kv.get(SETTINGS_KEY);
    
    if (!settings) {
      // Initialize with defaults
      await kv.set(SETTINGS_KEY, DEFAULT_SETTINGS);
      return c.json({
        success: true,
        settings: DEFAULT_SETTINGS,
        isDefault: true
      });
    }
    
    return c.json({
      success: true,
      settings,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching cohort settings:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch settings',
      settings: DEFAULT_SETTINGS
    }, 500);
  }
});

// Update settings
cohortSettingsRouter.put('/settings', async (c) => {
  try {
    const updates = await c.req.json();
    
    const existing = await kv.get(SETTINGS_KEY) || DEFAULT_SETTINGS;
    
    const settings = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    };
    
    await kv.set(SETTINGS_KEY, settings);
    
    console.log('✅ Updated cohort settings:', JSON.stringify(updates, null, 2));
    
    return c.json({
      success: true,
      settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating cohort settings:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update settings' 
    }, 500);
  }
});

// Update specific category
cohortSettingsRouter.put('/settings/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const updates = await c.req.json();
    
    const existing = await kv.get(SETTINGS_KEY) || DEFAULT_SETTINGS;
    
    if (!existing[category]) {
      return c.json({
        success: false,
        error: `Invalid category: ${category}`
      }, 400);
    }
    
    const settings = {
      ...existing,
      [category]: {
        ...existing[category],
        ...updates
      },
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(SETTINGS_KEY, settings);
    
    console.log(`✅ Updated ${category}:`, JSON.stringify(updates, null, 2));
    
    return c.json({
      success: true,
      settings,
      message: `${category} updated successfully`
    });
  } catch (error) {
    console.error(`❌ Error updating ${c.req.param('category')}:`, error);
    return c.json({ 
      success: false, 
      error: 'Failed to update category' 
    }, 500);
  }
});

// Reset to defaults
cohortSettingsRouter.post('/settings/reset', async (c) => {
  try {
    await kv.set(SETTINGS_KEY, DEFAULT_SETTINGS);
    
    console.log('✅ Reset cohort settings to defaults');
    
    return c.json({
      success: true,
      settings: DEFAULT_SETTINGS,
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('❌ Error resetting settings:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to reset settings' 
    }, 500);
  }
});
