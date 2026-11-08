/**
 * Property management — condo associations, landlords and property managers.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * 418 lines and 29 route registrations lifted out of `index.tsx` as part of
 * the split described in `tasks/phoenix-ai-audit.md`. It could not move until
 * `intakeActor`, `intakeIsAdmin` and `stripBase64` became importable, which is
 * what `identity.ts` and `payloadLimits.ts` are for.
 *
 * Nothing outside this block referred to anything inside it, so the move is a
 * lift rather than a rewrite: `scripts/indexSplit.mjs --prefix
 * property-management` reports no escaping symbols. The handler bodies are
 * unchanged.
 *
 * A NOTE ON THE FOUR GENERATED ROUTES
 *
 * The `for (const resource of ['landlords', 'property-managers'])` loop below
 * registers eight routes from four templates. They are worth knowing about
 * because they do not appear in a search for their own paths — grepping this
 * server for `property-management/landlords` will not find where it is
 * served.
 *
 * KNOWN, AND DELIBERATELY NOT CHANGED HERE
 *
 * Those eight generated routes have no authorisation of their own, so they sit
 * on the auth wall's default of "signed in". Unlike the leads routes, that is
 * not obviously wrong: the comment says they exist for the landlord and
 * property-manager portals, whose users are signed in and are NOT staff, so a
 * `requireStaff` here would break the portals it was written for. What they
 * actually need is per-account scoping — a landlord seeing their own records
 * rather than everybody's — and that is a behaviour change with a data model
 * behind it, not a guard. Recorded rather than quietly done.
 */
import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { intakeActor, intakeIsAdmin } from "./identity.ts";
import { stripBase64 } from "./payloadLimits.ts";

export const propertyManagementRouter = new Hono();

// ============================================
// PROPERTY MANAGEMENT (Condos, Landlords, Property Managers)
// ============================================

// Get all condo associations
// Inline diagnostic endpoint used by the Property Management self-test page.
propertyManagementRouter.get('/make-server-3eae23a6/property-management-test', (c) => c.json({
  success: true,
  message: 'Property management test endpoint is reachable.',
  server: 'make-server-3eae23a6',
  timestamp: new Date().toISOString(),
}));

/**
 * Who is asking about a condo association?
 *
 * These routes had no authentication of any kind. `GET
 * /property-management/condos` returned every association to anyone who asked,
 * and the create, update and delete routes accepted writes from anyone at all —
 * `CondoService` sent the public anon key rather than a signed-in user's token,
 * so nothing about the caller was ever established.
 *
 * This is the interim guard: signed in to read, platform authority to write. It
 * fails closed on purpose. The real rule is per-association consent — an
 * association owns its records and grants administration to whoever it chooses,
 * revocably — and when that lands, this helper is where it plugs in, so every
 * route asks the question in one place instead of ten.
 *
 * Until then a condo manager who is not a platform admin cannot write here.
 * That is deliberate: refusing someone who should be allowed is a support
 * ticket, and allowing someone who should not be is a breach.
 */
async function condoActor(c: any): Promise<{ user: any; isAdmin: boolean }> {
  const user = await intakeActor(c);
  if (!user) return { user: null, isAdmin: false };
  return { user, isAdmin: await intakeIsAdmin(user) };
}

propertyManagementRouter.get('/make-server-3eae23a6/property-management/condos', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view association records.' }, 401);
    const condos = await kv.get('condos') || [];
    return c.json({ success: true, data: condos });
  } catch (error: any) {
    console.error('Error fetching condos:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get single condo
propertyManagementRouter.get('/make-server-3eae23a6/property-management/condos/:id', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view association records.' }, 401);
    const id = c.req.param('id');
    const condos = await kv.get('condos') || [];
    const condo = condos.find((c: any) => c.id === id);

    if (!condo) {
      return c.json({ success: false, error: 'Condo not found' }, 404);
    }

    return c.json({ success: true, data: condo });
  } catch (error: any) {
    console.error('Error fetching condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create condo
propertyManagementRouter.post('/make-server-3eae23a6/property-management/condos', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.isAdmin) return c.json({ success: false, error: 'You do not have permission to change association records.' }, 403);
    const body = await c.req.json();
    const condos = await kv.get('condos') || [];

    const newCondo = {
      ...body,
      id: body.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    condos.push(newCondo);
    await kv.set('condos', condos);

    return c.json({ success: true, data: newCondo });
  } catch (error: any) {
    console.error('Error creating condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update condo
propertyManagementRouter.put('/make-server-3eae23a6/property-management/condos/:id', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.isAdmin) return c.json({ success: false, error: 'You do not have permission to change association records.' }, 403);
    const id = c.req.param('id');
    const body = await c.req.json();
    const condos = await kv.get('condos') || [];

    const index = condos.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return c.json({ success: false, error: 'Condo not found' }, 404);
    }

    condos[index] = {
      ...condos[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    await kv.set('condos', condos);
    return c.json({ success: true, data: condos[index] });
  } catch (error: any) {
    console.error('Error updating condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete condo
propertyManagementRouter.delete('/make-server-3eae23a6/property-management/condos/:id', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.isAdmin) return c.json({ success: false, error: 'You do not have permission to change association records.' }, 403);
    const id = c.req.param('id');
    const condos = await kv.get('condos') || [];

    const filtered = condos.filter((c: any) => c.id !== id);
    await kv.set('condos', filtered);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting condo:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get work requests for condo
propertyManagementRouter.get('/make-server-3eae23a6/property-management/condos/:id/work-requests', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view association records.' }, 401);
    const condoId = c.req.param('id');
    const status = c.req.query('status');

    const allWorkRequests = await kv.get('work_requests') || [];
    let filtered = allWorkRequests.filter((wr: any) => wr.condoId === condoId);

    if (status) {
      filtered = filtered.filter((wr: any) => wr.status === status);
    }

    return c.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Error fetching work requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create work request for condo
propertyManagementRouter.post('/make-server-3eae23a6/property-management/condos/:id/work-requests', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.isAdmin) return c.json({ success: false, error: 'You do not have permission to change association records.' }, 403);
    const condoId = c.req.param('id');
    const body = await c.req.json();
    const allWorkRequests = await kv.get('work_requests') || [];

    const newRequest = {
      ...body,
      id: crypto.randomUUID(),
      condoId,
      type: 'condo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    allWorkRequests.push(newRequest);
    await kv.set('work_requests', allWorkRequests);

    return c.json({ success: true, data: newRequest });
  } catch (error: any) {
    console.error('Error creating work request:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update work request for condo
propertyManagementRouter.put('/make-server-3eae23a6/property-management/condos/:id/work-requests/:requestId', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.isAdmin) return c.json({ success: false, error: 'You do not have permission to change association records.' }, 403);
    const requestId = c.req.param('requestId');
    const body = await c.req.json();
    const allWorkRequests = await kv.get('work_requests') || [];

    const index = allWorkRequests.findIndex((wr: any) => wr.id === requestId);
    if (index === -1) {
      return c.json({ success: false, error: 'Work request not found' }, 404);
    }

    allWorkRequests[index] = {
      ...allWorkRequests[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    await kv.set('work_requests', allWorkRequests);
    return c.json({ success: true, data: allWorkRequests[index] });
  } catch (error: any) {
    console.error('Error updating work request:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get units for condo
propertyManagementRouter.get('/make-server-3eae23a6/property-management/condos/:id/units', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view association records.' }, 401);
    const condoId = c.req.param('id');
    const allUnits = await kv.get('condo_units') || [];
    const filtered = allUnits.filter((u: any) => u.condoId === condoId);

    return c.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Create unit for condo
propertyManagementRouter.post('/make-server-3eae23a6/property-management/condos/:id/units', async (c) => {
  try {
    const actor = await condoActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.isAdmin) return c.json({ success: false, error: 'You do not have permission to change association records.' }, 403);
    const condoId = c.req.param('id');
    const body = await c.req.json();
    const allUnits = await kv.get('condo_units') || [];

    const newUnit = {
      ...body,
      id: crypto.randomUUID(),
      condoId,
      created_at: new Date().toISOString()
    };

    allUnits.push(newUnit);
    await kv.set('condo_units', allUnits);

    return c.json({ success: true, data: newUnit });
  } catch (error: any) {
    console.error('Error creating unit:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Property Manager - Get managed associations
propertyManagementRouter.get('/make-server-3eae23a6/property-management/property-managers/:id/associations', async (c) => {
  try {
    const managerId = c.req.param('id');

    // Get all condos where this manager is assigned
    const condos = await kv.get('condos') || [];
    const landlords = await kv.get('landlords') || [];

    const managedCondos = condos.filter((c: any) => c.propertyManagerId === managerId);
    const managedLandlords = landlords.filter((l: any) => l.propertyManagerId === managerId);

    return c.json({
      success: true,
      data: {
        condos: managedCondos,
        landlords: managedLandlords,
        total: managedCondos.length + managedLandlords.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching managed associations:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Property Manager - Get all work requests across managed associations
propertyManagementRouter.get('/make-server-3eae23a6/property-management/property-managers/:id/work-requests', async (c) => {
  try {
    const managerId = c.req.param('id');
    const status = c.req.query('status');

    // Get all condos managed by this PM
    const condos = await kv.get('condos') || [];
    const managedCondoIds = condos
      .filter((c: any) => c.propertyManagerId === managerId)
      .map((c: any) => c.id);

    // Get all work requests for managed properties
    const allWorkRequests = await kv.get('work_requests') || [];
    let filtered = allWorkRequests.filter((wr: any) =>
      managedCondoIds.includes(wr.condoId) || wr.propertyManagerId === managerId
    );

    if (status) {
      filtered = filtered.filter((wr: any) => wr.status === status);
    }

    return c.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Error fetching work requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get pending work requests counts
propertyManagementRouter.get('/make-server-3eae23a6/property-management/pending-counts', async (c) => {
  try {
    const allWorkRequests = await kv.get('work_requests') || [];
    const pending = allWorkRequests.filter((wr: any) => wr.status === 'pending_approval');

    const counts = {
      total: pending.length,
      condo: pending.filter((wr: any) => wr.type === 'condo').length,
      landlord: pending.filter((wr: any) => wr.type === 'landlord').length,
      propertyManager: pending.filter((wr: any) => wr.type === 'property_manager').length
    };

    return c.json({ success: true, data: counts });
  } catch (error: any) {
    console.error('Error fetching pending counts:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Property account collections — used by landlord and property-manager portals.
// These retain one source of truth and allow the existing service client paths to resolve.
for (const resource of ['landlords', 'property-managers']) {
  propertyManagementRouter.get(`/make-server-3eae23a6/property-management/${resource}`, async (c) => {
    try { return c.json({ success: true, data: (await kv.get(resource)) || [] }); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
  propertyManagementRouter.get(`/make-server-3eae23a6/property-management/${resource}/:id`, async (c) => {
    try { const item = ((await kv.get(resource)) || []).find((row: any) => row.id === c.req.param('id')); return item ? c.json({ success: true, data: item }) : c.json({ success: false, error: 'Record not found' }, 404); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
  propertyManagementRouter.post(`/make-server-3eae23a6/property-management/${resource}`, async (c) => {
    try { const rows = (await kv.get(resource)) || []; const body = await c.req.json(); const item = { ...stripBase64(body), id: body.id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; await kv.set(resource, [...rows, item]); return c.json({ success: true, data: item }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
  propertyManagementRouter.put(`/make-server-3eae23a6/property-management/${resource}/:id`, async (c) => {
    try { const rows = (await kv.get(resource)) || []; const index = rows.findIndex((row: any) => row.id === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Record not found' }, 404); rows[index] = { ...rows[index], ...stripBase64(await c.req.json()), id: rows[index].id, updated_at: new Date().toISOString() }; await kv.set(resource, rows); return c.json({ success: true, data: rows[index] }); } catch (error: any) { return c.json({ error: error.message }, 500); }
  });
}

// Landlord properties and requests share the property-operations work queue.
propertyManagementRouter.get('/make-server-3eae23a6/property-management/landlords/:id/properties', async (c) => {
  try { const landlordId = c.req.param('id'); return c.json({ success: true, data: ((await kv.get('properties')) || []).filter((item: any) => item.landlordId === landlordId) }); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
propertyManagementRouter.post('/make-server-3eae23a6/property-management/landlords/:id/properties', async (c) => {
  try { const rows = (await kv.get('properties')) || []; const body = await c.req.json(); const item = { ...stripBase64(body), id: body.id || crypto.randomUUID(), landlordId: c.req.param('id'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; await kv.set('properties', [...rows, item]); return c.json({ success: true, data: item }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
propertyManagementRouter.get('/make-server-3eae23a6/property-management/landlords/:id/work-requests', async (c) => {
  try { const status = c.req.query('status'); const rows = ((await kv.get('work_requests')) || []).filter((item: any) => item.landlordId === c.req.param('id')); return c.json({ success: true, data: status ? rows.filter((item: any) => item.status === status) : rows }); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
propertyManagementRouter.post('/make-server-3eae23a6/property-management/landlords/:id/work-requests', async (c) => {
  try { const rows = (await kv.get('work_requests')) || []; const body = await c.req.json(); const item = { ...stripBase64(body), id: body.id || crypto.randomUUID(), landlordId: c.req.param('id'), type: 'landlord', status: body.status || 'pending_approval', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; await kv.set('work_requests', [...rows, item]); return c.json({ success: true, data: item }, 201); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
propertyManagementRouter.put('/make-server-3eae23a6/property-management/landlords/:id/work-requests/:requestId', async (c) => {
  try { const rows = (await kv.get('work_requests')) || []; const index = rows.findIndex((item: any) => item.id === c.req.param('requestId') && item.landlordId === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Work request not found' }, 404); rows[index] = { ...rows[index], ...stripBase64(await c.req.json()), id: rows[index].id, landlordId: rows[index].landlordId, updated_at: new Date().toISOString() }; await kv.set('work_requests', rows); return c.json({ success: true, data: rows[index] }); } catch (error: any) { return c.json({ error: error.message }, 500); }
});
function propertyAdminAlert(title: string, description: string, data: any) { return { id: `property_${crypto.randomUUID()}`, type: 'info', category: 'Property Management', title, description, status: 'unread', source: 'property-management-hub', data, timestamp: new Date().toISOString() }; }
async function requirePropertyAdmin(c: any) { const user = await intakeActor(c); return await intakeIsAdmin(user) ? user : null; }
propertyManagementRouter.get('/make-server-3eae23a6/property-management/stats', async (c) => {
  try { if (!await requirePropertyAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const [condos, landlords, managers, requests, properties] = await Promise.all([kv.get('condos'), kv.get('landlords'), kv.get('property-managers'), kv.get('work_requests'), kv.getByPrefix('property_manager_portfolio:')]); const all = requests || []; const portfolios = (properties || []).flatMap((item: any) => Array.isArray(item) ? item : []); return c.json({ success: true, data: { totalCondos: (condos || []).length, totalLandlords: (landlords || []).length, totalPropertyManagers: (managers || []).length, totalProperties: portfolios.length, pendingApproval: all.filter((item: any) => item.status === 'pending_approval').length, approved: all.filter((item: any) => item.status === 'approved').length, inProgress: all.filter((item: any) => ['assigned', 'in-progress'].includes(item.status)).length, completed: all.filter((item: any) => item.status === 'completed').length, totalWorkRequests: all.length } }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); }
});

propertyManagementRouter.get('/make-server-3eae23a6/property-management/work-requests/pending', async (c) => { try { if (!await requirePropertyAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const allWorkRequests = await kv.get('work_requests') || []; return c.json({ success: true, data: allWorkRequests.filter((wr: any) => wr.status === 'pending_approval') }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
propertyManagementRouter.get('/make-server-3eae23a6/property-management/work-requests/approved', async (c) => { try { if (!await requirePropertyAdmin(c)) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const allWorkRequests = await kv.get('work_requests') || []; return c.json({ success: true, data: allWorkRequests.filter((wr: any) => ['approved', 'offered', 'assigned', 'in-progress'].includes(wr.status)) }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
propertyManagementRouter.post('/make-server-3eae23a6/property-management/work-requests/:id/offer', async (c) => { try { const user = await requirePropertyAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const rows = (await kv.get('work_requests') as any[]) || []; const index = rows.findIndex((item: any) => item.id === c.req.param('id')); if (index < 0) return c.json({ success: false, error: 'Work request not found.' }, 404); const now = new Date().toISOString(); const request = rows[index] = { ...rows[index], status: 'offered', offerMessage: String(body.message || '').trim().slice(0, 2000), offeredAt: now, offeredBy: user.email, updated_at: now }; await kv.set('work_requests', rows); const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift(propertyAdminAlert(`Offer prepared: ${request.title || request.id}`, `Property offer created by ${user.email}.`, { workRequestId: request.id })); await kv.set('admin_alerts', alerts.slice(0, 200)); return c.json({ success: true, data: request, delivery: { queued: true, emailSent: false }, message: 'Offer recorded and queued for delivery. Configure an email provider to send email automatically.' }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
propertyManagementRouter.post('/make-server-3eae23a6/property-management/offers/send', async (c) => { try { const user = await requirePropertyAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const workRequestId = String(body.workRequestId || ''); const recipientEmail = String(body.recipientEmail || '').trim().toLowerCase(); if (!workRequestId || !/^\S+@\S+\.\S+$/.test(recipientEmail)) return c.json({ success: false, error: 'A work request and valid recipient email are required.' }, 400); const rows = (await kv.get('work_requests') as any[]) || []; const index = rows.findIndex((item: any) => item.id === workRequestId); if (index < 0) return c.json({ success: false, error: 'Work request not found.' }, 404); const now = new Date().toISOString(); const offer = { id: crypto.randomUUID(), workRequestId, propertyType: String(body.propertyType || ''), recipientEmail, recipientName: String(body.recipientName || '').trim().slice(0, 120), details: stripBase64(body.offerDetails || {}), status: 'queued', createdAt: now, createdBy: user.email }; const offers = (await kv.get('property_offers') as any[]) || []; offers.unshift(offer); await kv.set('property_offers', offers.slice(0, 1000)); const request = rows[index] = { ...rows[index], status: 'offered', offerId: offer.id, offerRecipientEmail: recipientEmail, offeredAt: now, offeredBy: user.email, updated_at: now }; await kv.set('work_requests', rows); const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift(propertyAdminAlert(`Offer queued: ${request.title || request.id}`, `Offer queued for ${recipientEmail}.`, { workRequestId, offerId: offer.id })); await kv.set('admin_alerts', alerts.slice(0, 200)); return c.json({ success: true, data: request, offer, delivery: { queued: true, emailSent: false }, message: 'Offer saved and queued. Configure email delivery to send it externally.' }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
/**
 * Work requests are spread over more than one key, so an update has to find the
 * record before it can write it back.
 *
 *   all_work_requests        real customer submissions — where live jobs land
 *   work_requests            what most property-management routes read/write
 *   work_requests_anonymous  completed jobs kept for the public gallery
 *
 * This route used to read and write `work_requests` unconditionally. That key
 * holds nothing, so every assignment attempt returned "Work request not found"
 * and no job has ever actually been assigned to anybody. Finding the record
 * first, and writing back to whichever list it came from, fixes that without
 * migrating the other routes.
 */
const WORK_REQUEST_KEYS = ['all_work_requests', 'work_requests', 'work_requests_anonymous'];
async function findWorkRequest(id: string): Promise<{ key: string; rows: any[]; index: number } | null> {
  for (const key of WORK_REQUEST_KEYS) {
    const rows = (await kv.get(key) as any[]) || [];
    if (!Array.isArray(rows)) continue;
    const index = rows.findIndex((item: any) => String(item?.id) === String(id));
    if (index >= 0) return { key, rows, index };
  }
  return null;
}

propertyManagementRouter.post('/make-server-3eae23a6/property-management/work-requests/:id/assign', async (c) => { try { const user = await requirePropertyAdmin(c); if (!user) return c.json({ success: false, error: 'Administrator access is required.' }, 403); const body = await c.req.json(); const crewName = String(body.crewName || '').trim().slice(0, 160); if (!crewName) return c.json({ success: false, error: 'Choose a crew or technician before assigning this request.' }, 400); const found = await findWorkRequest(c.req.param('id')); if (!found) return c.json({ success: false, error: 'Work request not found.' }, 404); const { key, rows, index } = found; const now = new Date().toISOString();
  // The crew name is kept because that is what the assign screen collects and
  // what existing records carry. An email is recorded alongside it when one is
  // given, because matching a timesheet to a job on a free-text name is fragile
  // and an address is not.
  const assignedToEmail = String(body.crewEmail || body.assignedToEmail || '').trim().toLowerCase().slice(0, 200);
  const assignedEmployeeId = String(body.employeeId || '').trim().slice(0, 100);
  const request = rows[index] = { ...rows[index], status: 'assigned', assignedTo: crewName, ...(assignedToEmail ? { assignedToEmail } : {}), ...(assignedEmployeeId ? { assignedEmployeeId } : {}), assignedAt: now, assignedBy: user.email, updated_at: now }; await kv.set(key, rows); const alerts = (await kv.get('admin_alerts') as any[]) || []; alerts.unshift(propertyAdminAlert(`Crew assigned: ${request.title || request.id}`, `${crewName} assigned by ${user.email}.`, { workRequestId: request.id, crewName })); await kv.set('admin_alerts', alerts.slice(0, 200)); return c.json({ success: true, data: request }); } catch (error: any) { return c.json({ success: false, error: error.message }, 500); } });
