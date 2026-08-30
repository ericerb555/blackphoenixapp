/**
 * Subcontractor Companies API Routes
 * 
 * Manages subcontractor company records for SubcontractorEnterpriseHub
 * Integrates with portal applications system
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// List all subcontractor companies
app.get('/list', async (c) => {
  try {
    const companyIds = await kv.get('subcontractor-companies:list') || [];
    const companies = [];

    for (const id of companyIds) {
      const company = await kv.get(`subcontractor-company:${id}`);
      if (company) {
        companies.push(company);
      }
    }

    console.log(`Returning ${companies.length} subcontractor companies`);

    return c.json({ 
      companies,
      count: companies.length 
    });
  } catch (error: any) {
    console.error('Error listing subcontractor companies:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single subcontractor company by ID
app.get('/:companyId', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const company = await kv.get(`subcontractor-company:${companyId}`);

    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }

    return c.json({ company });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create new subcontractor company (manual add)
app.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const companyId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const company = {
      id: companyId,
      name: body.name,
      businessName: body.businessName || body.name,
      contactName: body.contactName || '',
      email: body.email,
      phone: body.phone || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      zip: body.zip || '',
      
      status: 'active',
      
      licenseNumber: body.licenseNumber || '',
      insuranceProvider: body.insuranceProvider || '',
      bondingAmount: body.bondingAmount || '',
      
      primaryTrade: body.primaryTrade || '',
      secondaryTrades: body.secondaryTrades || [],
      yearsExperience: body.yearsExperience || '',
      serviceArea: body.serviceArea || [],
      
      portalSetup: {
        mobilePortalCreated: false,
        timeTrackingEnabled: false,
        schedulingEnabled: false,
        codingSystemEnabled: true,
        invoicingEnabled: false,
        paymentsEnabled: false,
        projectsEnabled: false,
        messagingEnabled: false,
        fullSetupComplete: false,
        qrCodeGenerated: false
      },
      
      access: {
        portalId: body.portalId || null,
        codingPrefix: body.codingPrefix || '',
        folderPath: `/subcontractors/${body.codingPrefix || companyId}`
      },
      
      stats: {
        activeProjects: 0,
        totalRevenue: 0,
        hoursTracked: 0,
        invoicesSent: 0,
        completionRate: 0,
        rating: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: false
      }
    };
    
    // Store company
    await kv.set(`subcontractor-company:${companyId}`, company);
    
    // Add to list
    const existingCompanies = await kv.get('subcontractor-companies:list') || [];
    await kv.set('subcontractor-companies:list', [...existingCompanies, companyId]);
    
    console.log(`✅ Created subcontractor company: ${companyId}`);
    
    return c.json({ 
      success: true,
      company,
      companyId 
    });
  } catch (error: any) {
    console.error('Error creating company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update subcontractor company
app.put('/:companyId', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const updates = await c.req.json();
    
    const company = await kv.get(`subcontractor-company:${companyId}`);
    
    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }
    
    // Merge updates
    const updatedCompany = {
      ...company,
      ...updates,
      id: companyId, // Prevent ID change
      metadata: {
        ...company.metadata,
        lastUpdated: new Date().toISOString()
      }
    };
    
    await kv.set(`subcontractor-company:${companyId}`, updatedCompany);
    
    return c.json({ 
      success: true,
      company: updatedCompany 
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete subcontractor company
app.delete('/:companyId', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    
    // Remove from list
    const existingCompanies = await kv.get('subcontractor-companies:list') || [];
    const updatedList = existingCompanies.filter((id: string) => id !== companyId);
    await kv.set('subcontractor-companies:list', updatedList);
    
    // Delete company
    await kv.del(`subcontractor-company:${companyId}`);
    
    console.log(`🗑️ Deleted subcontractor company: ${companyId}`);
    
    return c.json({ 
      success: true,
      message: 'Company deleted' 
    });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update portal setup status
app.post('/:companyId/portal-setup', async (c) => {
  try {
    const companyId = c.req.param('companyId');
    const { portalSetup } = await c.req.json();
    
    const company = await kv.get(`subcontractor-company:${companyId}`);
    
    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }
    
    company.portalSetup = {
      ...company.portalSetup,
      ...portalSetup
    };
    
    await kv.set(`subcontractor-company:${companyId}`, company);
    
    return c.json({ 
      success: true,
      portalSetup: company.portalSetup 
    });
  } catch (error: any) {
    console.error('Error updating portal setup:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
