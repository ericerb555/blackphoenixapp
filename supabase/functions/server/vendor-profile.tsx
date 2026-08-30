// Vendor Profile API Routes
// Public vendor profile data for storefronts
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

export const vendorProfileRouter = new Hono();

const admin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

/**
 * Which vendor is the signed-in user?
 *
 * Every other route in this file takes a `vendorId` in the path, and until now
 * the only caller was the public storefront, which is handed the id as a prop.
 * A vendor signing into their own portal had no way to discover their own id,
 * which is why the vendor portal was reading from localStorage instead of the
 * server — there was nothing it could ask for.
 *
 * Three ways a user is matched to a vendor record, in order of trust:
 *   1. an explicit `vendorId` stamped on the account, which is what an invite
 *      should set once vendors are onboarded through the portal;
 *   2. an email match against a stored vendor record;
 *   3. nothing — and that is reported honestly rather than guessed at.
 *
 * The third case matters. The vendor records currently in storage are materials
 * suppliers (Home Depot, Lowe's, Grainger) carrying addresses like
 * api@homedepot.com; none of them is a person with a login. Returning a null
 * vendor lets the portal say "your account is not linked to a vendor yet"
 * instead of rendering zeros that look like real trading figures.
 */
async function vendorActor(c: any): Promise<{ user: any; vendorId: string | null; vendor: any; reason: string }> {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { user: null, vendorId: null, vendor: null, reason: 'Not signed in.' };

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { user: null, vendorId: null, vendor: null, reason: 'Not signed in.' };

  const email = String(user.email || '').toLowerCase();
  const stamped = String(user.app_metadata?.vendorId || user.app_metadata?.vendor_id || '').trim();

  if (stamped) {
    const vendor = (await kv.get(`vendor:${stamped}`)) || (await kv.get(`vendor_${stamped}`));
    if (vendor) return { user, vendorId: stamped, vendor, reason: '' };
    // The account claims a vendor that no longer exists. Say so — silently
    // falling through to an email match would hide a broken link.
    return { user, vendorId: null, vendor: null, reason: `This account is linked to vendor "${stamped}", which no longer exists.` };
  }

  const candidates = [
    ...(((await kv.getByPrefix('vendor:')) as any[]) || []),
    ...(((await kv.getByPrefix('vendor_portal_')) as any[]) || []),
  ].filter(Boolean);

  const match = candidates.find((v: any) =>
    [v?.email, v?.contactEmail, v?.ownerEmail].some((e) => String(e || '').toLowerCase() === email && email),
  );

  if (match) return { user, vendorId: String(match.id || match.vendorKey || ''), vendor: match, reason: '' };
  return { user, vendorId: null, vendor: null, reason: 'This account is not linked to a vendor record yet.' };
}

/**
 * The signed-in vendor's own profile and id.
 *
 * Deliberately returns 200 with `vendor: null` when there is no link, rather
 * than 404. "You are signed in but not attached to a vendor" is a state the
 * portal should render, not an error it should swallow.
 */
vendorProfileRouter.get('/vendor/me', async (c) => {
  try {
    const actor = await vendorActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view your vendor profile.' }, 401);
    return c.json({
      success: true,
      vendorId: actor.vendorId,
      vendor: actor.vendor,
      linked: Boolean(actor.vendorId && actor.vendor),
      reason: actor.reason,
      email: String(actor.user.email || '').toLowerCase(),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Could not resolve your vendor profile.' }, 500);
  }
});

// Get public vendor profile
vendorProfileRouter.get('/vendor-profile/:vendorId', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    
    // Get vendor data from KV store
    const vendorData = await kv.get(`vendor_${vendorId}`);
    
    if (!vendorData) {
      // Try to get from vendor portal data
      const allVendors = await kv.getByPrefix('vendor_portal_');
      const vendor = allVendors.find((v: any) => v.vendorKey === vendorId);
      
      if (vendor) {
        // Create public profile from portal data
        const publicProfile = {
          vendorKey: vendor.vendorKey,
          companyName: vendor.companyName,
          email: vendor.email,
          phone: vendor.phone,
          website: vendor.website,
          address: vendor.address,
          description: vendor.description,
          logo: vendor.logo,
          coverImage: vendor.coverImage,
          rating: vendor.rating || 4.5,
          totalReviews: vendor.totalReviews || 0,
          verified: true,
          yearsInBusiness: vendor.yearsInBusiness || 5
        };
        
        return c.json({
          success: true,
          vendor: publicProfile
        });
      }
      
      return c.json({
        error: 'Vendor not found',
        success: false
      }, 404);
    }
    
    return c.json({
      success: true,
      vendor: vendorData
    });
    
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    return c.json({
      error: 'Failed to fetch vendor profile',
      details: error.message,
      success: false
    }, 500);
  }
});

// Get all vendors for directory
vendorProfileRouter.get('/vendor-directory', async (c) => {
  try {
    // Get all vendor portal entries
    const allVendors = await kv.getByPrefix('vendor_portal_');
    
    // Get product counts for each vendor
    const allProducts = await kv.getByPrefix('product_');
    
    const vendorsWithStats = allVendors.map((vendor: any) => {
      const productCount = allProducts.filter((p: any) => 
        p.vendorId === vendor.vendorKey && p.isActive
      ).length;
      
      return {
        vendorKey: vendor.vendorKey,
        companyName: vendor.companyName,
        email: vendor.email,
        description: vendor.description,
        logo: vendor.logo,
        rating: vendor.rating || 4.5,
        totalReviews: vendor.totalReviews || 0,
        verified: true,
        yearsInBusiness: vendor.yearsInBusiness || 5,
        productCount,
        address: vendor.address
      };
    });
    
    return c.json({
      success: true,
      vendors: vendorsWithStats,
      count: vendorsWithStats.length
    });
    
  } catch (error) {
    console.error('Error fetching vendor directory:', error);
    return c.json({
      error: 'Failed to fetch vendor directory',
      details: error.message,
      success: false
    }, 500);
  }
});

// Update vendor profile (authenticated)
vendorProfileRouter.put('/vendor-profile/:vendorId', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    const updates = await c.req.json();
    
    // Get existing vendor data
    let vendorData = await kv.get(`vendor_${vendorId}`);
    
    if (!vendorData) {
      // Initialize with basic data
      vendorData = {
        vendorKey: vendorId,
        companyName: updates.companyName || 'Vendor',
        createdAt: new Date().toISOString()
      };
    }
    
    // Update allowed fields
    const allowedFields = [
      'companyName',
      'email',
      'phone',
      'website',
      'address',
      'description',
      'logo',
      'coverImage',
      'yearsInBusiness'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        vendorData[field] = updates[field];
      }
    });
    
    vendorData.updatedAt = new Date().toISOString();
    
    // Save to KV
    await kv.set(`vendor_${vendorId}`, vendorData);
    
    return c.json({
      success: true,
      vendor: vendorData
    });
    
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    return c.json({
      error: 'Failed to update vendor profile',
      details: error.message,
      success: false
    }, 500);
  }
});

// Get vendor statistics
vendorProfileRouter.get('/vendor-profile/:vendorId/stats', async (c) => {
  try {
    const vendorId = c.req.param('vendorId');
    
    // Get all products for this vendor
    const allProducts = await kv.getByPrefix('product_');
    const vendorProducts = allProducts.filter((p: any) => p.vendorId === vendorId && p.isActive);
    
    // Get all orders containing vendor products
    const allOrders = await kv.getByPrefix('order_');
    const vendorOrders = allOrders.filter((order: any) => 
      order.items?.some((item: any) => item.vendorId === vendorId)
    );
    
    // Calculate stats
    const stats = {
      totalProducts: vendorProducts.length,
      activeProducts: vendorProducts.filter((p: any) => p.isActive).length,
      totalOrders: vendorOrders.length,
      totalRevenue: vendorOrders.reduce((sum: number, order: any) => {
        const vendorItems = order.items.filter((item: any) => item.vendorId === vendorId);
        return sum + vendorItems.reduce((itemSum: number, item: any) => 
          itemSum + (item.price * item.quantity), 0
        );
      }, 0),
      averageOrderValue: vendorOrders.length > 0 
        ? vendorOrders.reduce((sum: number, order: any) => {
            const vendorItems = order.items.filter((item: any) => item.vendorId === vendorId);
            return sum + vendorItems.reduce((itemSum: number, item: any) => 
              itemSum + (item.price * item.quantity), 0
            );
          }, 0) / vendorOrders.length
        : 0,
      featuredProducts: vendorProducts.filter((p: any) => p.isFeatured).length,
      lowStockProducts: vendorProducts.filter((p: any) => 
        p.trackInventory && p.inventoryQuantity < (p.lowStockThreshold || 10)
      ).length
    };
    
    return c.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    return c.json({
      error: 'Failed to fetch vendor stats',
      details: error.message,
      success: false
    }, 500);
  }
});
