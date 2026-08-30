/**
 * Portal Configuration API Routes
 * 
 * Manage portal type configurations:
 * - List all portal types
 * - Save/update portal type
 * - Delete portal type
 * - Get portal type by ID
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Default portal types (will be used if no custom ones exist)
const DEFAULT_PORTAL_TYPES = [
  {
    id: 'vendor',
    label: 'Vendor / Handyman',
    description: 'Independent contractors providing services',
    icon: 'Briefcase',
    color: 'from-blue-600 to-blue-700',
    radiusLimit: 50,
    steps: ['Basic Info', 'Service Areas', 'Skills & Experience', 'Documents', 'Payment Method'],
    requiredDocs: ['Insurance Certificate', 'Work Portfolio'],
    applicationFee: 49.99,
    enabled: true
  },
  {
    id: 'subcontractor',
    label: 'Licensed Subcontractor',
    description: 'Licensed professionals with certifications',
    icon: 'Shield',
    color: 'from-purple-600 to-purple-700',
    radiusLimit: 50,
    steps: ['Basic Info', 'Service Areas', 'Licenses & Certs', 'Insurance & Bonding', 'Payment Method'],
    requiredDocs: ['License', 'Insurance', 'Bonding Certificate'],
    applicationFee: 99.99,
    enabled: true
  },
  {
    id: 'customer',
    label: 'Customer',
    description: 'Hire vendors and contractors for projects',
    icon: 'User',
    color: 'from-green-600 to-green-700',
    steps: ['Basic Info', 'Address', 'Preferences', 'Payment Method'],
    requiredDocs: [],
    applicationFee: 0,
    enabled: true
  },
  {
    id: 'business',
    label: 'Business Customer',
    description: 'Business accounts for commercial projects',
    icon: 'Building',
    color: 'from-orange-600 to-orange-700',
    radiusLimit: 75,
    steps: ['Business Info', 'Office Location', 'Services Needed', 'Billing', 'Payment Method'],
    requiredDocs: ['Business License'],
    applicationFee: 199.99,
    enabled: true
  },
  {
    id: 'supplier',
    label: 'Supplier',
    description: 'Supply materials and products',
    icon: 'Package',
    color: 'from-teal-600 to-teal-700',
    steps: ['Company Info', 'Products', 'Pricing', 'Delivery', 'Payment Method'],
    requiredDocs: ['Business License', 'Product Catalog'],
    applicationFee: 149.99,
    enabled: true
  },
  {
    id: 'partner',
    label: 'Partner',
    description: 'Strategic business partnerships',
    icon: 'Handshake',
    color: 'from-indigo-600 to-indigo-700',
    steps: ['Contact Info', 'Partnership Type', 'Proposal', 'Terms', 'Payment Method'],
    requiredDocs: ['Business Plan'],
    applicationFee: 299.99,
    enabled: true
  }
];

// Initialize default portal types
async function initializeDefaultPortalTypes() {
  try {
    const existing = await kv.get('portal-types:initialized');
    
    if (!existing) {
      // Save default portal types
      for (const portalType of DEFAULT_PORTAL_TYPES) {
        await kv.set(`portal-type:${portalType.id}`, portalType);
      }
      
      // Save list of portal type IDs
      const portalTypeIds = DEFAULT_PORTAL_TYPES.map(p => p.id);
      await kv.set('portal-types:list', portalTypeIds);
      await kv.set('portal-types:initialized', true);
      
      console.log('✅ Initialized default portal types');
    }
  } catch (error) {
    console.error('Error initializing default portal types:', error);
  }
}

// Initialize on module load
initializeDefaultPortalTypes();

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok',
    message: 'Portal config API is running',
    timestamp: new Date().toISOString()
  });
});

// Force initialize/reset portal types (for debugging)
app.post('/initialize', async (c) => {
  try {
    console.log('Forcing portal types initialization...');
    
    // Save default portal types
    for (const portalType of DEFAULT_PORTAL_TYPES) {
      await kv.set(`portal-type:${portalType.id}`, portalType);
      console.log(`✅ Saved portal type: ${portalType.id}`);
    }
    
    // Save list of portal type IDs
    const portalTypeIds = DEFAULT_PORTAL_TYPES.map(p => p.id);
    await kv.set('portal-types:list', portalTypeIds);
    await kv.set('portal-types:initialized', true);
    
    console.log('✅ Portal types initialized successfully');
    
    return c.json({ 
      success: true,
      message: 'Portal types initialized',
      count: DEFAULT_PORTAL_TYPES.length,
      portalTypes: DEFAULT_PORTAL_TYPES.map(p => ({ id: p.id, label: p.label }))
    });
  } catch (error: any) {
    console.error('Error initializing portal types:', error);
    return c.json({ error: error.message }, 500);
  }
});

// List all portal types
app.get('/list', async (c) => {
  try {
    let portalTypeIds = await kv.get('portal-types:list');
    
    // If no portal types exist, initialize them
    if (!portalTypeIds || portalTypeIds.length === 0) {
      console.log('No portal types found, initializing defaults...');
      await initializeDefaultPortalTypes();
      portalTypeIds = DEFAULT_PORTAL_TYPES.map(p => p.id);
    }
    
    const portalTypes = [];

    for (const id of portalTypeIds) {
      const portalType = await kv.get(`portal-type:${id}`);
      if (portalType) {
        portalTypes.push(portalType);
      }
    }

    console.log(`Returning ${portalTypes.length} portal types`);

    return c.json({ 
      portalTypes,
      count: portalTypes.length 
    });
  } catch (error: any) {
    console.error('Error listing portal types:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get enabled portal types only (for public application form)
app.get('/enabled', async (c) => {
  try {
    let portalTypeIds = await kv.get('portal-types:list');
    
    // If no portal types exist, initialize them
    if (!portalTypeIds || portalTypeIds.length === 0) {
      console.log('No portal types found, initializing defaults...');
      await initializeDefaultPortalTypes();
      portalTypeIds = DEFAULT_PORTAL_TYPES.map(p => p.id);
    }
    
    const portalTypes = [];

    for (const id of portalTypeIds) {
      const portalType = await kv.get(`portal-type:${id}`);
      if (portalType && portalType.enabled !== false) {
        portalTypes.push(portalType);
      }
    }

    console.log(`Returning ${portalTypes.length} enabled portal types`);

    return c.json({ 
      portalTypes,
      count: portalTypes.length 
    });
  } catch (error: any) {
    console.error('Error listing enabled portal types:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get portal type by ID
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const portalType = await kv.get(`portal-type:${id}`);

    if (!portalType) {
      return c.json({ error: 'Portal type not found' }, 404);
    }

    return c.json({ portalType });
  } catch (error: any) {
    console.error('Error fetching portal type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Save/update portal type
app.post('/save', async (c) => {
  try {
    const portalType = await c.req.json();
    
    // Validate required fields
    if (!portalType.id || !portalType.label) {
      return c.json({ error: 'Missing required fields (id, label)' }, 400);
    }

    // Get current list of portal type IDs
    let portalTypeIds = await kv.get('portal-types:list') || [];
    
    // Add to list if new
    if (!portalTypeIds.includes(portalType.id)) {
      portalTypeIds.push(portalType.id);
      await kv.set('portal-types:list', portalTypeIds);
    }

    // Save portal type
    await kv.set(`portal-type:${portalType.id}`, portalType);

    console.log(`✅ Saved portal type: ${portalType.id}`);

    return c.json({ 
      success: true,
      portalType 
    });
  } catch (error: any) {
    console.error('Error saving portal type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete portal type
app.delete('/delete/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Get current list
    let portalTypeIds = await kv.get('portal-types:list') || [];
    
    // Remove from list
    portalTypeIds = portalTypeIds.filter((typeId: string) => typeId !== id);
    await kv.set('portal-types:list', portalTypeIds);

    // Delete portal type
    await kv.del(`portal-type:${id}`);

    console.log(`🗑️ Deleted portal type: ${id}`);

    return c.json({ 
      success: true,
      message: 'Portal type deleted' 
    });
  } catch (error: any) {
    console.error('Error deleting portal type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Bulk update portal types
app.post('/bulk-update', async (c) => {
  try {
    const { portalTypes } = await c.req.json();

    if (!Array.isArray(portalTypes)) {
      return c.json({ error: 'portalTypes must be an array' }, 400);
    }

    const portalTypeIds = [];

    for (const portalType of portalTypes) {
      if (portalType.id && portalType.label) {
        await kv.set(`portal-type:${portalType.id}`, portalType);
        portalTypeIds.push(portalType.id);
      }
    }

    await kv.set('portal-types:list', portalTypeIds);

    console.log(`✅ Bulk updated ${portalTypeIds.length} portal types`);

    return c.json({ 
      success: true,
      count: portalTypeIds.length 
    });
  } catch (error: any) {
    console.error('Error bulk updating portal types:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Reset to defaults
app.post('/reset-defaults', async (c) => {
  try {
    // Clear existing
    const existingIds = await kv.get('portal-types:list') || [];
    for (const id of existingIds) {
      await kv.del(`portal-type:${id}`);
    }

    // Save defaults
    for (const portalType of DEFAULT_PORTAL_TYPES) {
      await kv.set(`portal-type:${portalType.id}`, portalType);
    }

    const portalTypeIds = DEFAULT_PORTAL_TYPES.map(p => p.id);
    await kv.set('portal-types:list', portalTypeIds);

    console.log('🔄 Reset to default portal types');

    return c.json({ 
      success: true,
      message: 'Reset to default portal types',
      count: DEFAULT_PORTAL_TYPES.length
    });
  } catch (error: any) {
    console.error('Error resetting portal types:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
