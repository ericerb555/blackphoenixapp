import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const usersRouter = new Hono();

// Create Supabase client for auth operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ============================================================================
// USER MANAGEMENT - CRUD OPERATIONS
// ============================================================================

// Get all users (with optional filtering)
usersRouter.get("/", async (c) => {
  try {
    const role = c.req.query("role");
    const status = c.req.query("status"); // active, inactive, suspended
    const companyId = c.req.query("companyId");
    const searchQuery = c.req.query("search");
    
    const users = await kv.getByPrefix("user:");
    
    let filtered = users;
    
    // Apply filters
    if (role) {
      filtered = filtered.filter((user: any) => user.role === role);
    }
    if (status) {
      filtered = filtered.filter((user: any) => user.status === status);
    }
    if (companyId) {
      filtered = filtered.filter((user: any) => 
        user.companyIds?.includes(companyId) || user.primaryCompanyId === companyId
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user: any) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      );
    }
    
    // Sort by most recent first
    filtered.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Remove sensitive data before sending
    const sanitized = filtered.map((user: any) => {
      const { passwordHash, ...safe } = user;
      return safe;
    });
    
    return c.json(sanitized);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get single user by ID
usersRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = await kv.get(`user:${id}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Remove sensitive data
    const { passwordHash, ...sanitized } = user;
    
    return c.json(sanitized);
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// Create new user (with Supabase Auth)
usersRouter.post("/", async (c) => {
  try {
    const data = await c.req.json();
    
    // Validate required fields
    if (!data.email || !data.password || !data.name || !data.role) {
      return c.json({ 
        error: "Missing required fields: email, password, name, role" 
      }, 400);
    }
    
    // Validate role
    const validRoles = [
      'super-admin', 'admin', 'manager', 'employee', 
      'customer', 'vendor', 'subcontractor', 'architect',
      'engineer', 'inspector'
    ];
    
    if (!validRoles.includes(data.role)) {
      return c.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 400);
    }
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm since email server not configured
      user_metadata: {
        name: data.name,
        role: data.role,
      },
    });
    
    if (authError) {
      console.error("Supabase auth error:", authError);
      return c.json({ error: `Failed to create auth user: ${authError.message}` }, 400);
    }
    
    const userId = authData.user?.id;
    if (!userId) {
      return c.json({ error: "Failed to get user ID from auth" }, 500);
    }
    
    // Create user profile in KV store
    const user = {
      id: userId,
      email: data.email,
      name: data.name,
      role: data.role,
      status: 'active',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      country: data.country || 'USA',
      primaryCompanyId: data.primaryCompanyId || null,
      companyIds: data.companyIds || [],
      avatar: data.avatar || null,
      bio: data.bio || '',
      certifications: data.certifications || [],
      specialties: data.specialties || [],
      hourlyRate: data.hourlyRate || 0,
      availability: data.availability || 'available',
      notificationPreferences: {
        email: true,
        sms: false,
        push: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
      emailVerified: true,
      phoneVerified: false,
    };
    
    await kv.set(`user:${userId}`, user);
    console.log(`Created user: ${userId} (${data.email}) with role ${data.role}`);
    
    // Remove password from response
    const { passwordHash, ...sanitized } = user;
    
    return c.json(sanitized, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Update user profile
usersRouter.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await c.req.json();
    
    const existing = await kv.get(`user:${id}`);
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Don't allow updating certain protected fields
    delete data.id;
    delete data.email; // Email changes should go through separate verification
    delete data.createdAt;
    delete data.passwordHash;
    
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${id}`, updated);
    console.log(`Updated user: ${id}`);
    
    // Remove sensitive data
    const { passwordHash, ...sanitized } = updated;
    
    return c.json(sanitized);
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

// Delete user (soft delete - set status to inactive)
usersRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const hardDelete = c.req.query("hard") === "true";
    
    const existing = await kv.get(`user:${id}`);
    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }
    
    if (hardDelete) {
      // Hard delete - remove from KV and Supabase Auth
      await kv.del(`user:${id}`);
      
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) {
        console.error("Error deleting from Supabase Auth:", authError);
      }
      
      console.log(`Hard deleted user: ${id}`);
      return c.json({ success: true, message: "User permanently deleted" });
    } else {
      // Soft delete - set status to inactive
      const updated = {
        ...existing,
        status: 'inactive',
        deactivatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await kv.set(`user:${id}`, updated);
      console.log(`Soft deleted user: ${id}`);
      
      return c.json({ success: true, message: "User deactivated" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// ============================================================================
// ROLE & PERMISSION MANAGEMENT
// ============================================================================

// Update user role
usersRouter.put("/:id/role", async (c) => {
  try {
    const id = c.req.param("id");
    const { role, changedBy } = await c.req.json();
    
    if (!role) {
      return c.json({ error: "role is required" }, 400);
    }
    
    const validRoles = [
      'super-admin', 'admin', 'manager', 'employee', 
      'customer', 'vendor', 'subcontractor', 'architect',
      'engineer', 'inspector'
    ];
    
    if (!validRoles.includes(role)) {
      return c.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 400);
    }
    
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const oldRole = user.role;
    
    const updated = {
      ...user,
      role,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${id}`, updated);
    
    // Log role change
    const logId = `USER-ROLE-LOG-${Date.now()}`;
    await kv.set(`user-role-log:${logId}`, {
      id: logId,
      userId: id,
      oldRole,
      newRole: role,
      changedBy: changedBy || 'system',
      timestamp: new Date().toISOString(),
    });
    
    console.log(`Changed role for user ${id}: ${oldRole} → ${role}`);
    
    const { passwordHash, ...sanitized } = updated;
    return c.json(sanitized);
  } catch (error) {
    console.error("Error updating user role:", error);
    return c.json({ error: "Failed to update role" }, 500);
  }
});

// Set user as owner (special endpoint - requires authentication)
usersRouter.post("/set-owner", async (c) => {
  try {
    // Get the authenticated user from the Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: "Unauthorized - No token provided" }, 401);
    }

    const token = authHeader.substring(7);
    
    // Verify the user with Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authUser) {
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    // Update user metadata to set role as owner
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: {
          ...authUser.user_metadata,
          role: 'owner',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Owner'
        }
      }
    );

    if (updateError) {
      console.error("Error setting owner role:", updateError);
      return c.json({ error: `Failed to set owner role: ${updateError.message}` }, 500);
    }

    console.log(`Set user ${authUser.email} (${authUser.id}) as owner`);
    
    return c.json({ 
      success: true, 
      message: "Owner role set successfully",
      user: {
        id: authUser.id,
        email: authUser.email,
        role: 'owner'
      }
    });
  } catch (error) {
    console.error("Error in set-owner endpoint:", error);
    return c.json({ error: "Failed to set owner role" }, 500);
  }
});

// Get user permissions based on role
usersRouter.get("/:id/permissions", async (c) => {
  try {
    const id = c.req.param("id");
    
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Define permissions by role
    const rolePermissions: Record<string, string[]> = {
      'super-admin': ['*'], // All permissions
      'admin': [
        'users.read', 'users.create', 'users.update', 'users.delete',
        'companies.read', 'companies.create', 'companies.update', 'companies.delete',
        'projects.read', 'projects.create', 'projects.update', 'projects.delete',
        'quotes.read', 'quotes.create', 'quotes.update', 'quotes.delete',
        'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete',
        'workorders.read', 'workorders.create', 'workorders.update', 'workorders.delete',
        'payments.read', 'payments.process',
        'reports.read', 'reports.generate',
        'advertising.read', 'advertising.approve',
      ],
      'manager': [
        'users.read',
        'companies.read',
        'projects.read', 'projects.create', 'projects.update',
        'quotes.read', 'quotes.create', 'quotes.update',
        'invoices.read', 'invoices.create',
        'workorders.read', 'workorders.create', 'workorders.update',
        'reports.read',
      ],
      'employee': [
        'projects.read',
        'quotes.read',
        'workorders.read', 'workorders.update',
        'timesheets.read', 'timesheets.create',
      ],
      'customer': [
        'projects.read',
        'quotes.read',
        'invoices.read',
        'workorders.read',
        'payments.read',
      ],
      'vendor': [
        'projects.read',
        'quotes.read', 'quotes.create',
        'invoices.read', 'invoices.create',
        'workorders.read',
      ],
      'subcontractor': [
        'projects.read',
        'bids.read', 'bids.create',
        'workorders.read', 'workorders.update',
        'timesheets.read', 'timesheets.create',
      ],
      'architect': [
        'projects.read', 'projects.create',
        'designs.read', 'designs.create', 'designs.update',
        'quotes.read',
      ],
      'engineer': [
        'projects.read',
        'designs.read', 'designs.create', 'designs.update',
        'inspections.read', 'inspections.create',
      ],
      'inspector': [
        'projects.read',
        'inspections.read', 'inspections.create', 'inspections.update',
        'reports.read', 'reports.create',
      ],
    };
    
    const permissions = rolePermissions[user.role] || [];
    
    return c.json({
      userId: id,
      role: user.role,
      permissions,
      hasAllPermissions: permissions.includes('*'),
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return c.json({ error: "Failed to fetch permissions" }, 500);
  }
});

// ============================================================================
// COMPANY ASSOCIATIONS
// ============================================================================

// Add user to company
usersRouter.post("/:id/companies/:companyId", async (c) => {
  try {
    const userId = c.req.param("id");
    const companyId = c.req.param("companyId");
    const { isPrimary } = await c.req.json();
    
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Check if company exists
    const company = await kv.get(`company:${companyId}`);
    if (!company) {
      return c.json({ error: "Company not found" }, 404);
    }
    
    // Add company to user's list
    const companyIds = user.companyIds || [];
    if (!companyIds.includes(companyId)) {
      companyIds.push(companyId);
    }
    
    const updated = {
      ...user,
      companyIds,
      primaryCompanyId: isPrimary ? companyId : user.primaryCompanyId,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, updated);
    console.log(`Added user ${userId} to company ${companyId}`);
    
    const { passwordHash, ...sanitized } = updated;
    return c.json(sanitized);
  } catch (error) {
    console.error("Error adding user to company:", error);
    return c.json({ error: "Failed to add user to company" }, 500);
  }
});

// Remove user from company
usersRouter.delete("/:id/companies/:companyId", async (c) => {
  try {
    const userId = c.req.param("id");
    const companyId = c.req.param("companyId");
    
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const companyIds = user.companyIds || [];
    const filtered = companyIds.filter((id: string) => id !== companyId);
    
    const updated = {
      ...user,
      companyIds: filtered,
      primaryCompanyId: user.primaryCompanyId === companyId ? null : user.primaryCompanyId,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, updated);
    console.log(`Removed user ${userId} from company ${companyId}`);
    
    const { passwordHash, ...sanitized } = updated;
    return c.json(sanitized);
  } catch (error) {
    console.error("Error removing user from company:", error);
    return c.json({ error: "Failed to remove user from company" }, 500);
  }
});

// ============================================================================
// USER STATUS MANAGEMENT
// ============================================================================

// Suspend user
usersRouter.post("/:id/suspend", async (c) => {
  try {
    const id = c.req.param("id");
    const { reason, suspendedBy } = await c.req.json();
    
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const updated = {
      ...user,
      status: 'suspended',
      suspensionReason: reason || '',
      suspendedBy: suspendedBy || 'system',
      suspendedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${id}`, updated);
    console.log(`Suspended user ${id}: ${reason}`);
    
    const { passwordHash, ...sanitized } = updated;
    return c.json(sanitized);
  } catch (error) {
    console.error("Error suspending user:", error);
    return c.json({ error: "Failed to suspend user" }, 500);
  }
});

// Reactivate user
usersRouter.post("/:id/reactivate", async (c) => {
  try {
    const id = c.req.param("id");
    const { reactivatedBy } = await c.req.json();
    
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const updated = {
      ...user,
      status: 'active',
      suspensionReason: null,
      reactivatedBy: reactivatedBy || 'system',
      reactivatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${id}`, updated);
    console.log(`Reactivated user ${id}`);
    
    const { passwordHash, ...sanitized } = updated;
    return c.json(sanitized);
  } catch (error) {
    console.error("Error reactivating user:", error);
    return c.json({ error: "Failed to reactivate user" }, 500);
  }
});

// Update last login
usersRouter.post("/:id/login", async (c) => {
  try {
    const id = c.req.param("id");
    
    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const updated = {
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${id}`, updated);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating last login:", error);
    return c.json({ error: "Failed to update last login" }, 500);
  }
});

// ============================================================================
// USER STATISTICS
// ============================================================================

// Get user statistics
usersRouter.get("/stats/overview", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    
    const total = users.length;
    const active = users.filter((u: any) => u.status === 'active').length;
    const inactive = users.filter((u: any) => u.status === 'inactive').length;
    const suspended = users.filter((u: any) => u.status === 'suspended').length;
    
    // By role
    const byRole: Record<string, number> = {};
    users.forEach((u: any) => {
      byRole[u.role] = (byRole[u.role] || 0) + 1;
    });
    
    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = users.filter((u: any) => 
      new Date(u.createdAt) > thirtyDaysAgo
    ).length;
    
    // Active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = users.filter((u: any) => 
      u.lastLoginAt && new Date(u.lastLoginAt) > sevenDaysAgo
    ).length;
    
    return c.json({
      overview: {
        total,
        active,
        inactive,
        suspended,
      },
      byRole,
      activity: {
        recentSignups,
        activeLastWeek: activeUsers,
        engagementRate: total > 0 ? ((activeUsers / total) * 100).toFixed(1) + '%' : '0%',
      },
      topRoles: Object.entries(byRole)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([role, count]) => ({ role, count })),
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return c.json({ error: "Failed to fetch user statistics" }, 500);
  }
});

export default usersRouter;
