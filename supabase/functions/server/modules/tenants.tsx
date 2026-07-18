// Tenant Management API Routes
// Multi-tenant system with role-based access control

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const tenantsRouter = new Hono();

const TENANT_PREFIX = 'tenant_';
const USER_PREFIX = 'user_';
const TERRITORY_PREFIX = 'territory_';

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

// Get all tenants (Platform Owner only)
tenantsRouter.get('/tenants', async (c) => {
  try {
    const tenants = await kv.getByPrefix(TENANT_PREFIX);
    
    return c.json({
      success: true,
      tenants: tenants.map(item => item.value),
      count: tenants.length
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch tenants',
      tenants: []
    }, 500);
  }
});

// Get single tenant by ID
tenantsRouter.get('/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tenant = await kv.get(`${TENANT_PREFIX}${id}`);
    
    if (!tenant) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      tenant
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch tenant' 
    }, 500);
  }
});

// Create new tenant
tenantsRouter.post('/tenants', async (c) => {
  try {
    const tenantData = await c.req.json();
    
    const tenantId = tenantData.id || `tenant-${Date.now()}`;
    
    const tenant = {
      ...tenantData,
      id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: tenantData.status || 'trial',
    };
    
    await kv.set(`${TENANT_PREFIX}${tenantId}`, tenant);
    
    console.log(`Created tenant: ${tenant.name} (${tenantId})`);
    
    return c.json({
      success: true,
      tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create tenant' 
    }, 500);
  }
});

// Update tenant
tenantsRouter.put('/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existing = await kv.get(`${TENANT_PREFIX}${id}`);
    if (!existing) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404);
    }
    
    const tenant = {
      ...existing,
      ...updates,
      id,
      updated_at: new Date().toISOString(),
      created_at: existing.created_at,
    };
    
    await kv.set(`${TENANT_PREFIX}${id}`, tenant);
    
    console.log(`Updated tenant: ${id}`);
    
    return c.json({
      success: true,
      tenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update tenant' 
    }, 500);
  }
});

// Suspend tenant
tenantsRouter.post('/tenants/:id/suspend', async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();
    
    const tenant = await kv.get(`${TENANT_PREFIX}${id}`);
    if (!tenant) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404);
    }
    
    const updated = {
      ...tenant,
      status: 'suspended',
      suspension_reason: reason,
      suspended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`${TENANT_PREFIX}${id}`, updated);
    
    console.log(`Suspended tenant: ${id} - Reason: ${reason}`);
    
    return c.json({
      success: true,
      tenant: updated,
      message: 'Tenant suspended successfully'
    });
  } catch (error) {
    console.error('Error suspending tenant:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to suspend tenant' 
    }, 500);
  }
});

// Reactivate tenant
tenantsRouter.post('/tenants/:id/reactivate', async (c) => {
  try {
    const id = c.req.param('id');
    
    const tenant = await kv.get(`${TENANT_PREFIX}${id}`);
    if (!tenant) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404);
    }
    
    const updated = {
      ...tenant,
      status: 'active',
      suspension_reason: null,
      suspended_at: null,
      reactivated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`${TENANT_PREFIX}${id}`, updated);
    
    console.log(`Reactivated tenant: ${id}`);
    
    return c.json({
      success: true,
      tenant: updated,
      message: 'Tenant reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating tenant:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to reactivate tenant' 
    }, 500);
  }
});

// Delete tenant
tenantsRouter.delete('/tenants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const tenant = await kv.get(`${TENANT_PREFIX}${id}`);
    if (!tenant) {
      return c.json({
        success: false,
        error: 'Tenant not found'
      }, 404);
    }
    
    await kv.del(`${TENANT_PREFIX}${id}`);
    
    console.log(`Deleted tenant: ${id}`);
    
    return c.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to delete tenant' 
    }, 500);
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Get all users (Platform Owner only)
tenantsRouter.get('/users', async (c) => {
  try {
    const users = await kv.getByPrefix(USER_PREFIX);
    
    return c.json({
      success: true,
      users: users.map(item => item.value),
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch users',
      users: []
    }, 500);
  }
});

// Get user by ID
tenantsRouter.get('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = await kv.get(`${USER_PREFIX}${id}`);
    
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch user' 
    }, 500);
  }
});

// Create new user
tenantsRouter.post('/users', async (c) => {
  try {
    const userData = await c.req.json();
    
    const userId = userData.id || `user-${Date.now()}`;
    
    const user = {
      ...userData,
      id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: userData.status || 'active',
    };
    
    await kv.set(`${USER_PREFIX}${userId}`, user);
    
    console.log(`Created user: ${user.email} (${userId})`);
    
    return c.json({
      success: true,
      user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create user' 
    }, 500);
  }
});

// Update user role
tenantsRouter.put('/users/:id/role', async (c) => {
  try {
    const id = c.req.param('id');
    const { role, tenant_id, territory_ids } = await c.req.json();
    
    const user = await kv.get(`${USER_PREFIX}${id}`);
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404);
    }
    
    const updated = {
      ...user,
      role,
      tenant_id: tenant_id || user.tenant_id,
      territory_ids: territory_ids || user.territory_ids,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(`${USER_PREFIX}${id}`, updated);
    
    console.log(`Updated user role: ${id} -> ${role}`);
    
    return c.json({
      success: true,
      user: updated,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update user role' 
    }, 500);
  }
});

// ============================================================================
// TERRITORY MANAGEMENT
// ============================================================================

// Get all territories
tenantsRouter.get('/territories', async (c) => {
  try {
    const territories = await kv.getByPrefix(TERRITORY_PREFIX);
    
    return c.json({
      success: true,
      territories: territories.map(item => item.value),
      count: territories.length
    });
  } catch (error) {
    console.error('Error fetching territories:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch territories',
      territories: []
    }, 500);
  }
});

// Get territory by ID
tenantsRouter.get('/territories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const territory = await kv.get(`${TERRITORY_PREFIX}${id}`);
    
    if (!territory) {
      return c.json({
        success: false,
        error: 'Territory not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      territory
    });
  } catch (error) {
    console.error('Error fetching territory:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch territory' 
    }, 500);
  }
});

// Create territory license
tenantsRouter.post('/territories', async (c) => {
  try {
    const territoryData = await c.req.json();
    
    const territoryId = territoryData.id || `TERR-${String(Date.now()).slice(-6)}`;
    
    const territory = {
      ...territoryData,
      id: territoryId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: territoryData.status || 'trial',
      members_count: 0,
      capacity: 45, // Default capacity
    };
    
    await kv.set(`${TERRITORY_PREFIX}${territoryId}`, territory);
    
    console.log(`Created territory: ${territory.name} (${territoryId})`);
    
    return c.json({
      success: true,
      territory,
      message: 'Territory created successfully'
    });
  } catch (error) {
    console.error('Error creating territory:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create territory' 
    }, 500);
  }
});

// ============================================================================
// PLATFORM STATISTICS
// ============================================================================

// Get platform-wide statistics
tenantsRouter.get('/platform/stats', async (c) => {
  try {
    const [tenants, users, territories] = await Promise.all([
      kv.getByPrefix(TENANT_PREFIX),
      kv.getByPrefix(USER_PREFIX),
      kv.getByPrefix(TERRITORY_PREFIX),
    ]);
    
    const stats = {
      total_tenants: tenants.length,
      total_users: users.length,
      total_territories: territories.length,
      active_tenants: tenants.filter(t => t.value.status === 'active').length,
      trial_tenants: tenants.filter(t => t.value.status === 'trial').length,
      suspended_tenants: tenants.filter(t => t.value.status === 'suspended').length,
      tenants_by_type: {
        vendor: tenants.filter(t => t.value.type === 'vendor').length,
        advertiser: tenants.filter(t => t.value.type === 'advertiser').length,
        subcontractor: tenants.filter(t => t.value.type === 'subcontractor').length,
      },
    };
    
    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch platform statistics' 
    }, 500);
  }
});

// ============================================================================
// TERRITORY APPLICATIONS
// ============================================================================

// Submit territory application
tenantsRouter.post('/territory-applications', async (c) => {
  try {
    const applicationData = await c.req.json();
    
    const applicationId = `APP-${Date.now()}`;
    
    const application = {
      id: applicationId,
      ...applicationData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      notes: null,
    };
    
    await kv.set(`territory_application_${applicationId}`, application);
    
    console.log(`[Territory Application] New application: ${application.firstName} ${application.lastName} - ${application.desiredCity}, ${application.desiredState}`);
    
    return c.json({
      success: true,
      application,
      message: 'Territory application submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting territory application:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to submit territory application' 
    }, 500);
  }
});

// Get all territory applications (Platform Owner only)
tenantsRouter.get('/territory-applications', async (c) => {
  try {
    const applications = await kv.getByPrefix('territory_application_');
    
    return c.json({
      success: true,
      applications: applications.map(item => item.value),
      count: applications.length
    });
  } catch (error) {
    console.error('Error fetching territory applications:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch territory applications',
      applications: []
    }, 500);
  }
});

// Approve territory application
tenantsRouter.post('/territory-applications/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const { reviewNotes, territoryId } = await c.req.json();
    
    const application = await kv.get(`territory_application_${id}`);
    if (!application) {
      return c.json({
        success: false,
        error: 'Application not found'
      }, 404);
    }
    
    const updated = {
      ...application,
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Platform Owner',
      notes: reviewNotes,
      assignedTerritoryId: territoryId,
    };
    
    await kv.set(`territory_application_${id}`, updated);
    
    console.log(`[Territory Application] Approved: ${id}`);
    
    return c.json({
      success: true,
      application: updated,
      message: 'Application approved successfully'
    });
  } catch (error) {
    console.error('Error approving territory application:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to approve application' 
    }, 500);
  }
});

// Reject territory application
tenantsRouter.post('/territory-applications/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();
    
    const application = await kv.get(`territory_application_${id}`);
    if (!application) {
      return c.json({
        success: false,
        error: 'Application not found'
      }, 404);
    }
    
    const updated = {
      ...application,
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Platform Owner',
      notes: reason,
    };
    
    await kv.set(`territory_application_${id}`, updated);
    
    console.log(`[Territory Application] Rejected: ${id}`);
    
    return c.json({
      success: true,
      application: updated,
      message: 'Application rejected'
    });
  } catch (error) {
    console.error('Error rejecting territory application:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to reject application' 
    }, 500);
  }
});

// ============================================================================
// INITIALIZE SYSTEM
// ============================================================================

// Initialize system with demo data
tenantsRouter.post('/platform/initialize', async (c) => {
  try {
    // Create demo territories
    const demoTerritories = [
      {
        id: 'TERR-001',
        name: 'New York Metro',
        admin_user_id: 'user-admin-001',
        location: 'New York, NY 10001',
        zipCode: '10001',
        city: 'New York',
        state: 'NY',
        radius: 40,
        status: 'active',
        license_fee: 499,
      },
      {
        id: 'TERR-002',
        name: 'Los Angeles West',
        admin_user_id: 'user-admin-002',
        location: 'Los Angeles, CA 90001',
        zipCode: '90001',
        city: 'Los Angeles',
        state: 'CA',
        radius: 40,
        status: 'active',
        license_fee: 499,
      },
    ];
    
    for (const territory of demoTerritories) {
      await kv.set(`${TERRITORY_PREFIX}${territory.id}`, {
        ...territory,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    console.log('[Platform] Initialized with demo territories');
    
    return c.json({
      success: true,
      message: 'Platform initialized successfully',
      territories: demoTerritories.length
    });
  } catch (error) {
    console.error('Error initializing platform:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to initialize platform' 
    }, 500);
  }
});