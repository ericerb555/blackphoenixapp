// Vendor Profile API Routes
// Public vendor profile data for storefronts
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const vendorProfileRouter = new Hono();

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
