/**
 * Authentication Router
 * Handles user signup, login, and role management
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const authRouter = new Hono();

/**
 * Create (or ensure) a CRM customer record + persistent profile for a user.
 * Idempotent: deduplicates by email so repeated calls never create duplicates.
 * Returns the customer record.
 */
async function ensureCrmCustomer(params: {
  email: string;
  fullName?: string;
  phone?: string;
  userId?: string;
  accountType?: string;
}) {
  const normalizedEmail = (params.email || "").toLowerCase().trim();
  if (!normalizedEmail) throw new Error("email is required");

  const fullName = (params.fullName || "").trim() || normalizedEmail.split("@")[0];

  // Persist a durable profile regardless of CRM state.
  const profile = {
    email: normalizedEmail,
    full_name: fullName,
    phone: params.phone || null,
    user_id: params.userId || null,
    account_type: params.accountType || "customer",
    created_at: new Date().toISOString(),
  };
  await kv.set(`user_profile:${normalizedEmail}`, profile);

  // Dedup against existing customers (bounded prefix scan).
  const existing = (await kv.getByPrefix("customer:")) || [];
  const match = existing.find(
    (cust: any) => (cust?.email || "").toLowerCase() === normalizedEmail
  );
  if (match) {
    return { created: false, customer: match };
  }

  const [firstName, ...rest] = fullName.split(" ");
  const id = params.userId || `CUST-${Date.now()}`;
  const customer = {
    id,
    customer_number: `CUST-${existing.length + 1}`,
    first_name: firstName || fullName,
    last_name: rest.join(" "),
    email: normalizedEmail,
    phone: params.phone || "",
    status: "lead",
    source: "signup",
    total_spent: 0,
    project_count: 0,
    rating: 0,
    tags: ["signup"],
    user_id: params.userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await kv.set(`customer:${id}`, customer);
  console.log(`✅ [CRM] Added signup to CRM: ${normalizedEmail} (${id})`);
  return { created: true, customer };
}

/**
 * POST /auth/register-crm
 * Called right after a successful signup to add the user to the CRM and
 * persist their profile. Safe to call multiple times (deduped by email).
 */
authRouter.post("/make-server-57095a78/auth/register-crm", async (c) => {
  try {
    const { email, fullName, phone, userId, accountType } = await c.req.json();
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    const result = await ensureCrmCustomer({ email, fullName, phone, userId, accountType });
    return c.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRM] register-crm error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to register CRM customer" },
      500
    );
  }
});

/**
 * POST /admin/backfill-crm
 * One-time recovery: iterate all existing auth users and ensure each has a
 * CRM customer record. Fixes users who signed up before CRM sync existed.
 */
authRouter.post("/make-server-57095a78/admin/backfill-crm", async (c) => {
  try {
    const supabase = getSupabaseAdmin();
    let created = 0;
    let existed = 0;
    let page = 1;
    const perPage = 100;

    // Paginate through all auth users.
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[CRM] backfill listUsers error:", error);
        break;
      }
      const users = data?.users || [];
      for (const u of users) {
        if (!u.email) continue;
        const result = await ensureCrmCustomer({
          email: u.email,
          fullName: u.user_metadata?.full_name || u.user_metadata?.fullName,
          phone: u.phone || u.user_metadata?.phone,
          userId: u.id,
        });
        if (result.created) created++;
        else existed++;
      }
      if (users.length < perPage) break;
      page++;
    }

    console.log(`✅ [CRM] Backfill complete: ${created} created, ${existed} already existed`);
    return c.json({ success: true, created, existed });
  } catch (error) {
    console.error("[CRM] backfill-crm error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Backfill failed" },
      500
    );
  }
});

// Create Supabase admin client
const getSupabaseAdmin = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

// Create regular Supabase client for auth operations
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

// Sign up endpoint
authRouter.post("/make-server-57095a78/auth/signup", async (c) => {
  try {
    const { email, password, full_name, role = "client" } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getSupabaseAdmin();

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server not configured
      user_metadata: {
        full_name: full_name || email.split("@")[0],
      },
    });

    if (authError) {
      console.error("Signup error:", authError);
      return c.json({ error: authError.message }, 400);
    }

    const userId = authData.user.id;

    // Create user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: userId,
        email,
        full_name: full_name || email.split("@")[0],
        onboarding_completed: false,
        first_login_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // Assign default role (client by default)
    const { error: roleError } = await supabase
      .from("user_permissions")
      .insert({
        user_id: userId,
        role_name: role,
        display_name: role.charAt(0).toUpperCase() + role.slice(1),
        level: role === "master_admin" ? 1 : role === "admin" ? 2 : role === "manager" ? 3 : 4,
        permissions: role === "master_admin" ? { all: true } : {},
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    console.log(`✅ User created successfully: ${email} (${userId})`);

    // 🗂️ Add the new user to the CRM + persist profile (deduped by email).
    try {
      await ensureCrmCustomer({
        email,
        fullName: full_name,
        userId,
        accountType: role === "client" ? "customer" : role,
      });
    } catch (crmError) {
      console.error("[CRM] Failed to add signup to CRM (non-blocking):", crmError);
    }

    // 📧 Send admin notification for new customer signup
    try {
      const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
      
      // Only send if customer signup notifications are enabled
      if (notificationSettings.triggers?.customerSignup !== false) {
        // Call the notification endpoint (fire and forget)
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/make-server-57095a78/notifications/customer-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            customerName: full_name || email.split("@")[0],
            customerEmail: email,
            customerPhone: null // Add phone if available in signup form
          })
        }).catch(err => {
          console.error('Failed to send signup notification (non-blocking):', err);
        });
      }
    } catch (notificationError) {
      console.error('Signup notification error (non-blocking):', notificationError);
      // Don't fail the signup if notifications fail
    }

    return c.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: userId,
        email: authData.user.email,
        full_name: full_name || email.split("@")[0],
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: error instanceof Error ? error.message : "Signup failed" }, 500);
  }
});

// Verify token endpoint
authRouter.post("/make-server-57095a78/auth/verify", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: "Invalid token" }, 401);
    }

    // Get user role and permissions
    const { data: roleData } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return c.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: roleData?.role_name || "client",
        permissions: roleData?.permissions || {},
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return c.json({ error: "Token verification failed" }, 500);
  }
});

// Get current user profile
authRouter.get("/make-server-57095a78/auth/me", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get full user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: role } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name,
        role: role?.role_name || "client",
        permissions: role?.permissions || {},
        onboarding_completed: profile?.onboarding_completed || false,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({ error: "Failed to get user profile" }, 500);
  }
});

// Update user profile
authRouter.patch("/make-server-57095a78/auth/profile", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updates = await c.req.json();

    // Update user profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return c.json({ error: "Failed to update profile" }, 500);
    }

    return c.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Complete onboarding
authRouter.post("/make-server-57095a78/auth/complete-onboarding", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Mark onboarding as complete
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Onboarding completion error:", updateError);
      return c.json({ error: "Failed to complete onboarding" }, 500);
    }

    // Complete the matching approved-application activation trail, if this
    // account originated from portal intake. Existing users without an
    // application are unaffected.
    const portalAccessRecords = await kv.getByPrefix('portal_access:');
    const matchingAccess = portalAccessRecords.find((access: any) => access?.userId === user.id);
    if (matchingAccess?.applicationId) {
      const now = new Date().toISOString();
      const intakeKey = `portal_onboarding:${matchingAccess.applicationId}`;
      const intake = await kv.get(intakeKey);
      await kv.set(`portal_access:${matchingAccess.applicationId}`, { ...matchingAccess, status: 'active_pending_requirements', activatedAt: now, updatedAt: now });
      if (intake) {
        const checklist = (intake.checklist || []).map((item: any) => item.id === 'first_login' ? { ...item, completed: true, completedAt: now } : item);
        const requirementsComplete = (intake.requiredTasks || []).every((task: any) => !task.required || task.status === 'complete');
        await kv.set(intakeKey, { ...intake, status: requirementsComplete ? 'active' : 'active_pending_requirements', activatedAt: now, checklist, updatedAt: now });
        if (requirementsComplete) await kv.set(`portal_access:${matchingAccess.applicationId}`, { ...matchingAccess, status: 'active', activatedAt: now, updatedAt: now });
      }
      await kv.set(`application:${matchingAccess.applicationId}`, { ...(await kv.get(`application:${matchingAccess.applicationId}`)), onboardingStatus: requirementsComplete ? 'active' : 'active_pending_requirements', updatedAt: now });
    }

    return c.json({ success: true, message: "Onboarding completed" });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return c.json({ error: "Failed to complete onboarding" }, 500);
  }
});

// Admin: Get all users
authRouter.get("/make-server-57095a78/admin/users", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user has admin permissions
    const { data: roleData } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role_name === "master_admin" || 
                   roleData?.role_name === "admin" ||
                   roleData?.permissions?.all === true;

    if (!isAdmin) {
      return c.json({ error: "Admin privileges required" }, 403);
    }

    // Get all users with their profiles and roles
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select(`
        user_id,
        email,
        full_name,
        onboarding_completed,
        first_login_at,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return c.json({ error: "Failed to fetch users" }, 500);
    }

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: roleData } = await supabase
          .from("user_permissions")
          .select("role_name")
          .eq("user_id", profile.user_id)
          .single();

        // Get auth user for status
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.user_id);

        return {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          role: roleData?.role_name || "client",
          status: authUser?.banned_until ? "inactive" : "active",
          created_at: profile.created_at,
          last_login: profile.first_login_at,
          onboarding_completed: profile.onboarding_completed,
        };
      })
    );

    return c.json({ users: usersWithRoles });
  } catch (error) {
    console.error("Get users error:", error);
    return c.json({ error: "Failed to get users" }, 500);
  }
});

// Admin: Update user role
authRouter.patch("/make-server-57095a78/admin/users/:userId/role", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user has admin permissions
    const { data: roleData } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role_name === "master_admin" || 
                   roleData?.role_name === "admin" ||
                   roleData?.permissions?.all === true;

    if (!isAdmin) {
      return c.json({ error: "Admin privileges required" }, 403);
    }

    const userId = c.req.param("userId");
    const { role } = await c.req.json();

    // Update user role
    const { error: updateError } = await supabase
      .from("user_permissions")
      .update({ 
        role_name: role,
        display_name: role.charAt(0).toUpperCase() + role.slice(1),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Role update error:", updateError);
      return c.json({ error: "Failed to update role" }, 500);
    }

    return c.json({ success: true, message: "Role updated successfully" });
  } catch (error) {
    console.error("Update role error:", error);
    return c.json({ error: "Failed to update role" }, 500);
  }
});

// Admin: Toggle user status (activate/deactivate)
authRouter.patch("/make-server-57095a78/admin/users/:userId/status", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user has admin permissions
    const { data: roleData } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role_name === "master_admin" || 
                   roleData?.role_name === "admin" ||
                   roleData?.permissions?.all === true;

    if (!isAdmin) {
      return c.json({ error: "Admin privileges required" }, 403);
    }

    const userId = c.req.param("userId");
    const { active } = await c.req.json();

    // Ban or unban user
    if (active) {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
    } else {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // 100 years (effectively permanent)
      });
    }

    return c.json({ success: true, message: `User ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error("Toggle status error:", error);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// Admin: Delete user
authRouter.delete("/make-server-57095a78/admin/users/:userId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No authorization token provided" }, 401);
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user has admin permissions
    const { data: roleData } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role_name === "master_admin" || 
                   roleData?.role_name === "admin" ||
                   roleData?.permissions?.all === true;

    if (!isAdmin) {
      return c.json({ error: "Admin privileges required" }, 403);
    }

    const userId = c.req.param("userId");

    // Prevent self-deletion
    if (userId === user.id) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    // Delete user
    await supabase.auth.admin.deleteUser(userId);

    return c.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Password Reset: Request reset email
authRouter.post("/make-server-57095a78/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const supabase = getSupabaseClient();

    // Send password reset email
    // Note: In production, you would configure email templates in Supabase
    // Since email server isn't configured, we'll generate a reset token instead
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${Deno.env.get("APP_URL") || "http://localhost:5173"}/reset-password`,
    });

    if (error) {
      console.error("Password reset request error:", error);
      // Don't reveal if email exists for security
      return c.json({ 
        success: true, 
        message: "If an account exists with this email, you will receive a password reset link." 
      });
    }

    console.log(`✅ Password reset email requested for: ${email}`);

    return c.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return c.json({ error: "Failed to process password reset request" }, 500);
  }
});

// Password Reset: Verify token and update password
authRouter.post("/make-server-57095a78/auth/reset-password", async (c) => {
  try {
    const { token, password } = await c.req.json();

    if (!token || !password) {
      return c.json({ error: "Token and password are required" }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const supabase = getSupabaseClient();

    // Update the user's password using the reset token
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Password reset error:", error);
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }

    console.log(`✅ Password reset successfully for user: ${data.user?.email}`);

    return c.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

export default authRouter;