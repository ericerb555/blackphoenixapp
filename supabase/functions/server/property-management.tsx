import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ==========================================
// CORS CONFIGURATION
// ==========================================

// Enable CORS for all property management routes
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: false,
}));

// Handle OPTIONS for all routes
app.options("*", (c) => {
  console.log("✅ Property Management OPTIONS preflight handled");
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
    },
  });
});

console.log("🏘️ Property Management Router loaded with CORS enabled");

// ==========================================
// PROPERTY MANAGEMENT CRM API
// Handles: Condo Associations, Landlords, Property Managers
// ==========================================

// Health check for property management module
app.get('/health', (c) => {
  console.log('✅ Property Management health check');
  return c.json({ 
    success: true, 
    status: 'healthy',
    module: 'property-management',
    timestamp: new Date().toISOString()
  });
});

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to send email via Resend
const sendEmail = async (to: string, subject: string, html: string) => {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const COMPANY_NAME = Deno.env.get('COMPANY_NAME') || 'Your Company';
  
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${COMPANY_NAME} <${Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'onboarding@resend.dev'}>`,
        reply_to: Deno.env.get('REPLY_TO_EMAIL') || 'blackphoenixbuilds@proton.me',
        to,
        subject,
        html
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent successfully:', data);
      return { success: true, data };
    } else {
      console.error('❌ Email send failed:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: String(error) };
  }
};

// ==========================================
// CONDO ASSOCIATIONS
// ==========================================

// Get all condo associations
app.get('/condos', async (c) => {
  try {
    const condos = await kv.getByPrefix('condo:');
    return c.json({ success: true, data: condos });
  } catch (error) {
    console.error('Error fetching condos:', error);
    return c.json({ success: false, error: 'Failed to fetch condo associations' }, 500);
  }
});

// Get single condo association
app.get('/condos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const condo = await kv.get(`condo:${id}`);
    if (!condo) {
      return c.json({ success: false, error: 'Condo association not found' }, 404);
    }
    return c.json({ success: true, data: condo });
  } catch (error) {
    console.error('Error fetching condo:', error);
    return c.json({ success: false, error: 'Failed to fetch condo association' }, 500);
  }
});

// Create condo association
app.post('/condos', async (c) => {
  try {
    const body = await c.req.json();
    const id = generateId('CONDO');
    const condo = {
      id,
      ...body,
      type: 'condo_association',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await kv.set(`condo:${id}`, condo);
    return c.json({ success: true, data: condo }, 201);
  } catch (error) {
    console.error('Error creating condo:', error);
    return c.json({ success: false, error: 'Failed to create condo association' }, 500);
  }
});

// Update condo association
app.put('/condos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`condo:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'Condo association not found' }, 404);
    }
    const updated = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString()
    };
    await kv.set(`condo:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating condo:', error);
    return c.json({ success: false, error: 'Failed to update condo association' }, 500);
  }
});

// Delete condo association
app.delete('/condos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`condo:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting condo:', error);
    return c.json({ success: false, error: 'Failed to delete condo association' }, 500);
  }
});

// ==========================================
// CONDO WORK REQUESTS
// ==========================================

// Get work requests for a condo
app.get('/condos/:condoId/work-requests', async (c) => {
  try {
    const condoId = c.req.param('condoId');
    const status = c.req.query('status');
    
    const allRequests = await kv.getByPrefix(`condo_work_request:${condoId}:`);
    
    let filtered = allRequests;
    if (status) {
      filtered = allRequests.filter((req: any) => req.status === status);
    }
    
    return c.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching work requests:', error);
    return c.json({ success: false, error: 'Failed to fetch work requests' }, 500);
  }
});

// Create work request
app.post('/condos/:condoId/work-requests', async (c) => {
  try {
    const condoId = c.req.param('condoId');
    const body = await c.req.json();
    const id = generateId('WR');
    
    const workRequest = {
      id,
      condoId,
      ...body,
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`condo_work_request:${condoId}:${id}`, workRequest);
    return c.json({ success: true, data: workRequest }, 201);
  } catch (error) {
    console.error('Error creating work request:', error);
    return c.json({ success: false, error: 'Failed to create work request' }, 500);
  }
});

// Update work request (including approval)
app.put('/condos/:condoId/work-requests/:requestId', async (c) => {
  try {
    const condoId = c.req.param('condoId');
    const requestId = c.req.param('requestId');
    const body = await c.req.json();
    
    const existing = await kv.get(`condo_work_request:${condoId}:${requestId}`);
    if (!existing) {
      return c.json({ success: false, error: 'Work request not found' }, 404);
    }
    
    const updated = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString()
    };
    
    // If approving, add approval timestamp
    if (body.status === 'approved' && existing.status === 'pending_approval') {
      updated.approved_at = new Date().toISOString();
      updated.approved_by = body.approved_by || 'property_manager';
    }
    
    await kv.set(`condo_work_request:${condoId}:${requestId}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating work request:', error);
    return c.json({ success: false, error: 'Failed to update work request' }, 500);
  }
});

// ==========================================
// CONDO UNITS
// ==========================================

// Get units for a condo
app.get('/condos/:condoId/units', async (c) => {
  try {
    const condoId = c.req.param('condoId');
    const units = await kv.getByPrefix(`condo_unit:${condoId}:`);
    return c.json({ success: true, data: units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return c.json({ success: false, error: 'Failed to fetch units' }, 500);
  }
});

// Create unit
app.post('/condos/:condoId/units', async (c) => {
  try {
    const condoId = c.req.param('condoId');
    const body = await c.req.json();
    const id = generateId('UNIT');
    
    const unit = {
      id,
      condoId,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`condo_unit:${condoId}:${id}`, unit);
    return c.json({ success: true, data: unit }, 201);
  } catch (error) {
    console.error('Error creating unit:', error);
    return c.json({ success: false, error: 'Failed to create unit' }, 500);
  }
});

// ==========================================
// LANDLORDS
// ==========================================

// Get all landlords
app.get('/landlords', async (c) => {
  try {
    const landlords = await kv.getByPrefix('landlord:');
    return c.json({ success: true, data: landlords });
  } catch (error) {
    console.error('Error fetching landlords:', error);
    return c.json({ success: false, error: 'Failed to fetch landlords' }, 500);
  }
});

// Get single landlord
app.get('/landlords/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const landlord = await kv.get(`landlord:${id}`);
    if (!landlord) {
      return c.json({ success: false, error: 'Landlord not found' }, 404);
    }
    return c.json({ success: true, data: landlord });
  } catch (error) {
    console.error('Error fetching landlord:', error);
    return c.json({ success: false, error: 'Failed to fetch landlord' }, 500);
  }
});

// Create landlord
app.post('/landlords', async (c) => {
  try {
    const body = await c.req.json();
    const id = generateId('LANDLORD');
    const landlord = {
      id,
      ...body,
      type: 'landlord',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await kv.set(`landlord:${id}`, landlord);
    return c.json({ success: true, data: landlord }, 201);
  } catch (error) {
    console.error('Error creating landlord:', error);
    return c.json({ success: false, error: 'Failed to create landlord' }, 500);
  }
});

// Update landlord
app.put('/landlords/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`landlord:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'Landlord not found' }, 404);
    }
    const updated = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString()
    };
    await kv.set(`landlord:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating landlord:', error);
    return c.json({ success: false, error: 'Failed to update landlord' }, 500);
  }
});

// ==========================================
// LANDLORD WORK REQUESTS
// ==========================================

// Get work requests for a landlord
app.get('/landlords/:landlordId/work-requests', async (c) => {
  try {
    const landlordId = c.req.param('landlordId');
    const status = c.req.query('status');
    
    const allRequests = await kv.getByPrefix(`landlord_work_request:${landlordId}:`);
    
    let filtered = allRequests;
    if (status) {
      filtered = allRequests.filter((req: any) => req.status === status);
    }
    
    return c.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching work requests:', error);
    return c.json({ success: false, error: 'Failed to fetch work requests' }, 500);
  }
});

// Create landlord work request
app.post('/landlords/:landlordId/work-requests', async (c) => {
  try {
    const landlordId = c.req.param('landlordId');
    const body = await c.req.json();
    const id = generateId('WR');
    
    const workRequest = {
      id,
      landlordId,
      ...body,
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`landlord_work_request:${landlordId}:${id}`, workRequest);
    return c.json({ success: true, data: workRequest }, 201);
  } catch (error) {
    console.error('Error creating work request:', error);
    return c.json({ success: false, error: 'Failed to create work request' }, 500);
  }
});

// Update landlord work request
app.put('/landlords/:landlordId/work-requests/:requestId', async (c) => {
  try {
    const landlordId = c.req.param('landlordId');
    const requestId = c.req.param('requestId');
    const body = await c.req.json();
    
    const existing = await kv.get(`landlord_work_request:${landlordId}:${requestId}`);
    if (!existing) {
      return c.json({ success: false, error: 'Work request not found' }, 404);
    }
    
    const updated = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString()
    };
    
    if (body.status === 'approved' && existing.status === 'pending_approval') {
      updated.approved_at = new Date().toISOString();
      updated.approved_by = body.approved_by || 'landlord';
    }
    
    await kv.set(`landlord_work_request:${landlordId}:${requestId}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating work request:', error);
    return c.json({ success: false, error: 'Failed to update work request' }, 500);
  }
});

// ==========================================
// LANDLORD PROPERTIES
// ==========================================

// Get properties for a landlord
app.get('/landlords/:landlordId/properties', async (c) => {
  try {
    const landlordId = c.req.param('landlordId');
    const properties = await kv.getByPrefix(`landlord_property:${landlordId}:`);
    return c.json({ success: true, data: properties });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return c.json({ success: false, error: 'Failed to fetch properties' }, 500);
  }
});

// Create property
app.post('/landlords/:landlordId/properties', async (c) => {
  try {
    const landlordId = c.req.param('landlordId');
    const body = await c.req.json();
    const id = generateId('PROP');
    
    const property = {
      id,
      landlordId,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`landlord_property:${landlordId}:${id}`, property);
    return c.json({ success: true, data: property }, 201);
  } catch (error) {
    console.error('Error creating property:', error);
    return c.json({ success: false, error: 'Failed to create property' }, 500);
  }
});

// ==========================================
// PROPERTY MANAGERS
// ==========================================

// Get all property managers
app.get('/property-managers', async (c) => {
  try {
    const managers = await kv.getByPrefix('property_manager:');
    return c.json({ success: true, data: managers });
  } catch (error) {
    console.error('Error fetching property managers:', error);
    return c.json({ success: false, error: 'Failed to fetch property managers' }, 500);
  }
});

// Get single property manager
app.get('/property-managers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const manager = await kv.get(`property_manager:${id}`);
    if (!manager) {
      return c.json({ success: false, error: 'Property manager not found' }, 404);
    }
    return c.json({ success: true, data: manager });
  } catch (error) {
    console.error('Error fetching property manager:', error);
    return c.json({ success: false, error: 'Failed to fetch property manager' }, 500);
  }
});

// Create property manager
app.post('/property-managers', async (c) => {
  try {
    const body = await c.req.json();
    const id = generateId('PM');
    const manager = {
      id,
      ...body,
      type: 'property_manager',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await kv.set(`property_manager:${id}`, manager);
    return c.json({ success: true, data: manager }, 201);
  } catch (error) {
    console.error('Error creating property manager:', error);
    return c.json({ success: false, error: 'Failed to create property manager' }, 500);
  }
});

// Update property manager
app.put('/property-managers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const existing = await kv.get(`property_manager:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'Property manager not found' }, 404);
    }
    const updated = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString()
    };
    await kv.set(`property_manager:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating property manager:', error);
    return c.json({ success: false, error: 'Failed to update property manager' }, 500);
  }
});

// ==========================================
// PROPERTY MANAGER WORK REQUESTS
// ==========================================

// Get work requests for a property manager
app.get('/property-managers/:managerId/work-requests', async (c) => {
  try {
    const managerId = c.req.param('managerId');
    const status = c.req.query('status');
    
    const allRequests = await kv.getByPrefix(`pm_work_request:${managerId}:`);
    
    let filtered = allRequests;
    if (status) {
      filtered = allRequests.filter((req: any) => req.status === status);
    }
    
    return c.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching work requests:', error);
    return c.json({ success: false, error: 'Failed to fetch work requests' }, 500);
  }
});

// Create property manager work request
app.post('/property-managers/:managerId/work-requests', async (c) => {
  try {
    const managerId = c.req.param('managerId');
    const body = await c.req.json();
    const id = generateId('WR');
    
    const workRequest = {
      id,
      managerId,
      ...body,
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`pm_work_request:${managerId}:${id}`, workRequest);
    return c.json({ success: true, data: workRequest }, 201);
  } catch (error) {
    console.error('Error creating work request:', error);
    return c.json({ success: false, error: 'Failed to create work request' }, 500);
  }
});

// Update property manager work request
app.put('/property-managers/:managerId/work-requests/:requestId', async (c) => {
  try {
    const managerId = c.req.param('managerId');
    const requestId = c.req.param('requestId');
    const body = await c.req.json();
    
    const existing = await kv.get(`pm_work_request:${managerId}:${requestId}`);
    if (!existing) {
      return c.json({ success: false, error: 'Work request not found' }, 404);
    }
    
    const updated = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString()
    };
    
    if (body.status === 'approved' && existing.status === 'pending_approval') {
      updated.approved_at = new Date().toISOString();
      updated.approved_by = body.approved_by || 'property_manager';
    }
    
    await kv.set(`pm_work_request:${managerId}:${requestId}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating work request:', error);
    return c.json({ success: false, error: 'Failed to update work request' }, 500);
  }
});

// ==========================================
// MASTER DASHBOARD - ALL APPROVED WORK REQUESTS
// ==========================================

// Get all approved work requests across all property types
app.get('/work-requests/approved', async (c) => {
  try {
    // Get all approved requests from all types
    const condoRequests = await kv.getByPrefix('condo_work_request:');
    const landlordRequests = await kv.getByPrefix('landlord_work_request:');
    const pmRequests = await kv.getByPrefix('pm_work_request:');
    
    // Filter for approved status
    const allApproved = [
      ...condoRequests.filter((r: any) => r.status === 'approved').map((r: any) => ({ ...r, propertyType: 'condo' })),
      ...landlordRequests.filter((r: any) => r.status === 'approved').map((r: any) => ({ ...r, propertyType: 'landlord' })),
      ...pmRequests.filter((r: any) => r.status === 'approved').map((r: any) => ({ ...r, propertyType: 'property_manager' }))
    ];
    
    // Sort by created_at descending
    allApproved.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({ success: true, data: allApproved });
  } catch (error) {
    console.error('Error fetching approved work requests:', error);
    return c.json({ success: false, error: 'Failed to fetch approved work requests' }, 500);
  }
});

// Get all pending approval work requests
app.get('/work-requests/pending', async (c) => {
  try {
    const condoRequests = await kv.getByPrefix('condo_work_request:');
    const landlordRequests = await kv.getByPrefix('landlord_work_request:');
    const pmRequests = await kv.getByPrefix('pm_work_request:');
    
    const allPending = [
      ...condoRequests.filter((r: any) => r.status === 'pending_approval').map((r: any) => ({ ...r, propertyType: 'condo' })),
      ...landlordRequests.filter((r: any) => r.status === 'pending_approval').map((r: any) => ({ ...r, propertyType: 'landlord' })),
      ...pmRequests.filter((r: any) => r.status === 'pending_approval').map((r: any) => ({ ...r, propertyType: 'property_manager' }))
    ];
    
    allPending.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return c.json({ success: true, data: allPending });
  } catch (error) {
    console.error('Error fetching pending work requests:', error);
    return c.json({ success: false, error: 'Failed to fetch pending work requests' }, 500);
  }
});

// Get dashboard stats
app.get('/stats', async (c) => {
  try {
    // Get all work requests across all types
    const condoRequests = await kv.getByPrefix('condo_work_request:');
    const landlordRequests = await kv.getByPrefix('landlord_work_request:');
    const pmRequests = await kv.getByPrefix('pm_work_request:');
    
    const allRequests = [...condoRequests, ...landlordRequests, ...pmRequests];
    
    const stats = {
      totalProperties: (await kv.getByPrefix('condo:')).length + 
                       (await kv.getByPrefix('landlord:')).length,
      totalWorkRequests: allRequests.length,
      pendingApprovals: allRequests.filter((r: any) => r.status === 'pending_approval').length,
      approvedRequests: allRequests.filter((r: any) => r.status === 'approved').length,
      completedRequests: allRequests.filter((r: any) => r.status === 'completed').length
    };
    
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

// Get pending approval counts (for notification badges)
app.get('/pending-counts', async (c) => {
  console.log('📊 [Property Management] Pending counts endpoint called');
  try {
    // Get all work requests by type
    console.log('📊 Fetching condo requests...');
    const condoRequests = await kv.getByPrefix('condo_work_request:');
    console.log(`📊 Found ${condoRequests.length} condo requests`);
    
    console.log('📊 Fetching landlord requests...');
    const landlordRequests = await kv.getByPrefix('landlord_work_request:');
    console.log(`📊 Found ${landlordRequests.length} landlord requests`);
    
    console.log('📊 Fetching property manager requests...');
    const pmRequests = await kv.getByPrefix('pm_work_request:');
    console.log(`📊 Found ${pmRequests.length} PM requests`);
    
    // Count pending approvals for each type
    const condoPending = condoRequests.filter((r: any) => r.status === 'pending_approval').length;
    const landlordPending = landlordRequests.filter((r: any) => r.status === 'pending_approval').length;
    const pmPending = pmRequests.filter((r: any) => r.status === 'pending_approval').length;
    
    console.log(`📊 Pending counts - Condo: ${condoPending}, Landlord: ${landlordPending}, PM: ${pmPending}`);
    
    const counts = {
      total: condoPending + landlordPending + pmPending,
      condo: condoPending,
      landlord: landlordPending,
      propertyManager: pmPending
    };
    
    console.log('✅ [Property Management] Pending counts response:', counts);
    return c.json({ success: true, data: counts });
  } catch (error) {
    console.error('❌ [Property Management] Error fetching pending counts:', error);
    return c.json({ success: false, error: 'Failed to fetch pending approval counts', details: String(error) }, 500);
  }
});

// ==========================================
// OFFER/EMAIL SYSTEM
// ==========================================

// Send offer email for approved work request
app.post('/offers/send', async (c) => {
  try {
    const body = await c.req.json();
    const { workRequestId, propertyType, recipientEmail, recipientName, offerDetails } = body;
    
    if (!workRequestId || !propertyType || !recipientEmail || !offerDetails) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: workRequestId, propertyType, recipientEmail, offerDetails' 
      }, 400);
    }

    // Get the work request
    let workRequest: any = null;
    let keyPrefix = '';
    
    if (propertyType === 'condo') {
      const requests = await kv.getByPrefix('condo_work_request:');
      workRequest = requests.find((r: any) => r.id === workRequestId);
      keyPrefix = `condo_work_request:${workRequest?.condoId}:${workRequestId}`;
    } else if (propertyType === 'landlord') {
      const requests = await kv.getByPrefix('landlord_work_request:');
      workRequest = requests.find((r: any) => r.id === workRequestId);
      keyPrefix = `landlord_work_request:${workRequest?.landlordId}:${workRequestId}`;
    } else if (propertyType === 'property_manager') {
      const requests = await kv.getByPrefix('pm_work_request:');
      workRequest = requests.find((r: any) => r.id === workRequestId);
      keyPrefix = `pm_work_request:${workRequest?.managerId}:${workRequestId}`;
    }

    if (!workRequest) {
      return c.json({ success: false, error: 'Work request not found' }, 404);
    }

    // Create offer record
    const offerId = generateId('OFFER');
    const offer = {
      id: offerId,
      workRequestId,
      propertyType,
      ...offerDetails,
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Save offer
    await kv.set(`offer:${offerId}`, offer);

    // Generate email HTML
    const COMPANY_NAME = Deno.env.get('COMPANY_NAME') || 'Your Company';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Order Offer - ${workRequest.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Work Order Offer</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">from ${COMPANY_NAME}</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hello ${recipientName || 'there'},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            We're pleased to provide you with an offer for the following work request:
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #FF6B35; margin-top: 0; font-size: 20px;">${workRequest.title}</h2>
            <p style="margin: 10px 0;"><strong>Description:</strong> ${workRequest.description || 'N/A'}</p>
            <p style="margin: 10px 0;"><strong>Location:</strong> ${workRequest.location || 'N/A'}</p>
            <p style="margin: 10px 0;"><strong>Priority:</strong> <span style="padding: 4px 12px; background: ${workRequest.priority === 'urgent' ? '#ff4444' : workRequest.priority === 'high' ? '#ff8800' : '#4CAF50'}; color: white; border-radius: 4px; font-size: 12px; text-transform: uppercase;">${workRequest.priority || 'normal'}</span></p>
          </div>
          
          <div style="background: #fff8f0; border-left: 4px solid #FF6B35; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #FF6B35; margin-top: 0; font-size: 18px;">Offer Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;"><strong>Estimated Cost:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; text-align: right; font-size: 18px; color: #FF6B35;"><strong>$${offerDetails.estimatedCost?.toLocaleString() || '0'}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;"><strong>Estimated Duration:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">${offerDetails.estimatedDuration || 'TBD'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;"><strong>Start Date:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">${offerDetails.startDate || 'To be scheduled'}</td>
              </tr>
              ${offerDetails.materials ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;"><strong>Materials:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0; text-align: right;">${offerDetails.materials}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${offerDetails.notes ? `
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0;"><strong>Additional Notes:</strong></p>
            <p style="margin: 10px 0 0 0;">${offerDetails.notes}</p>
          </div>
          ` : ''}
          
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
            <p style="margin: 0; color: #0369a1;"><strong>📋 Next Steps:</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #0369a1;">
              <li>Review the offer details above</li>
              <li>Contact us if you have any questions</li>
              <li>We'll begin work upon your approval</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Questions about this offer?</p>
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Contact us anytime - we're here to help!</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #FF6B35;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This offer was sent by ${COMPANY_NAME}<br>
              Offer ID: ${offerId} | Work Request ID: ${workRequestId}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResult = await sendEmail(
      recipientEmail,
      `Work Order Offer: ${workRequest.title}`,
      emailHtml
    );

    if (!emailResult.success) {
      return c.json({ 
        success: false, 
        error: 'Failed to send email', 
        details: emailResult.error 
      }, 500);
    }

    // Update work request with offer sent status
    const updatedRequest = {
      ...workRequest,
      offer_sent: true,
      offer_id: offerId,
      offer_sent_at: new Date().toISOString(),
      status: 'offer_sent',
      updated_at: new Date().toISOString()
    };
    
    await kv.set(keyPrefix, updatedRequest);

    return c.json({ 
      success: true, 
      data: { 
        offer, 
        emailSent: true,
        emailId: emailResult.data?.id 
      } 
    }, 201);
  } catch (error) {
    console.error('Error sending offer:', error);
    return c.json({ success: false, error: 'Failed to send offer', details: String(error) }, 500);
  }
});

// Get offers for a work request
app.get('/offers/work-request/:workRequestId', async (c) => {
  try {
    const workRequestId = c.req.param('workRequestId');
    const allOffers = await kv.getByPrefix('offer:');
    const offers = allOffers.filter((o: any) => o.workRequestId === workRequestId);
    
    // Sort by sent_at descending
    offers.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    
    return c.json({ success: true, data: offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return c.json({ success: false, error: 'Failed to fetch offers' }, 500);
  }
});

// Get all offers
app.get('/offers', async (c) => {
  try {
    const offers = await kv.getByPrefix('offer:');
    offers.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    return c.json({ success: true, data: offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return c.json({ success: false, error: 'Failed to fetch offers' }, 500);
  }
});

export default app;