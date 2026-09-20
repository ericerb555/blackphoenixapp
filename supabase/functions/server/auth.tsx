/**
 * Authentication Router
 * Handles user signup, login, and role management
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { linkInvoicesByEmail } from "./invoice-linking.tsx";
import { notifyStaffInBackground } from "./staff-notifications.tsx";

const authRouter = new Hono();

/**
 * User profile + permissions persistence.
 *
 * NOTE: This project only has the KV table `kv_store_3eae23a6` — there are no
 * custom Postgres tables like `user_profiles` / `user_permissions` (querying
 * them causes PGRST205 "Could not find the table"). All profile and role data
 * is stored in the KV store, keyed by user id.
 */
const PROFILE_PREFIX = "auth_profile:";
const PERMS_PREFIX = "user_permissions:";

/**
 * The KV store is backed by Postgres, which under load can throw a transient
 * "canceling statement due to statement timeout". These retries make single-key
 * reads/writes resilient to those blips instead of hard-failing user flows.
 */
function isTransientDbError(e: any): boolean {
  return /timeout|canceling statement|statement timeout|deadlock|connection/i.test(String(e?.message || e));
}

async function kvGetRetry(key: string, attempts = 4): Promise<any> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try { return await kv.get(key); }
    catch (e: any) { lastErr = e; if (!isTransientDbError(e)) throw e; await new Promise((r) => setTimeout(r, 200 * (i + 1))); }
  }
  throw lastErr;
}

async function kvSetRetry(key: string, value: any, attempts = 4): Promise<void> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try { await kv.set(key, value); return; }
    catch (e: any) { lastErr = e; if (!isTransientDbError(e)) throw e; await new Promise((r) => setTimeout(r, 200 * (i + 1))); }
  }
  throw lastErr;
}

async function getProfile(userId: string): Promise<any | null> {
  if (!userId) return null;
  return (await kvGetRetry(`${PROFILE_PREFIX}${userId}`)) || null;
}

async function setProfile(userId: string, patch: Record<string, any>): Promise<any> {
  const current = (await getProfile(userId)) || {};
  const next = { ...current, ...patch, user_id: userId };
  await kvSetRetry(`${PROFILE_PREFIX}${userId}`, next);
  return next;
}

async function getPermissions(userId: string): Promise<any | null> {
  if (!userId) return null;
  return (await kvGetRetry(`${PERMS_PREFIX}${userId}`)) || null;
}

async function setPermissions(userId: string, patch: Record<string, any>): Promise<any> {
  const current = (await getPermissions(userId)) || {};
  const next = { ...current, ...patch, user_id: userId };
  await kvSetRetry(`${PERMS_PREFIX}${userId}`, next);
  return next;
}

/**
 * Create (or ensure) a CRM customer record + persistent profile for a user.
 * Idempotent: deduplicates by email so repeated calls never create duplicates.
 * Returns the customer record.
 */
/**
 * Finish a piece of work after the reply has gone out.
 *
 * Supabase's edge runtime can tear an isolate down once a handler returns, so a
 * bare fire-and-forget promise is not guaranteed to complete. `waitUntil` keeps
 * the isolate alive until it settles — the same contract as a service worker.
 * Where it is unavailable the promise is still started, which is no worse than
 * what the code did before.
 *
 * Use this only for work whose failure does not change the answer already sent.
 */
function afterResponse(work: Promise<unknown>, label: string): void {
  const settled = work.catch((err) =>
    console.log(`[after-response:${label}] ${err?.message || err}`));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (typeof runtime?.waitUntil === 'function') runtime.waitUntil(settled);
}

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
    // Even for an existing customer, attach any invoices that were issued to
    // this email before an account/CRM record existed.
    await linkInvoicesByEmail(normalizedEmail, String(match.id || params.userId || "")).catch(
      (err) => console.log(`[CRM] invoice auto-link (existing) failed for ${normalizedEmail}: ${err}`),
    );
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
  // Attach any invoices issued to this email before they signed up.
  await linkInvoicesByEmail(normalizedEmail, String(id)).catch(
    (err) => console.log(`[CRM] invoice auto-link (new) failed for ${normalizedEmail}: ${err}`),
  );
  return { created: true, customer };
}

/**
 * POST /auth/register-crm
 * Called right after a successful signup to add the user to the CRM and
 * persist their profile. Safe to call multiple times (deduped by email).
 */
authRouter.post("/make-server-3eae23a6/auth/register-crm", async (c) => {
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
authRouter.post("/make-server-3eae23a6/admin/backfill-crm", async (c) => {
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
authRouter.post("/make-server-3eae23a6/auth/signup", async (c) => {
  try {
    const { email, password, full_name } = await c.req.json();

    /**
     * The role is NOT taken from the request. It never was safe to.
     *
     * THE HOLE THIS CLOSES
     *
     * `/auth/` is on the public prefix list, so this route answers anyone on the
     * internet with no session at all. It used to read `role` out of the body,
     * defaulting to "client", and hand it to `setPermissions`, which writes
     * `role_name` and — for "master_admin" — `permissions: { all: true }`.
     *
     * `/admin/users` and `/auth/me` in this same file read exactly those fields
     * back as their admin check. So an anonymous POST asking for
     * `role: "master_admin"` produced an account that could sign in and list
     * every user in the system. That was confirmed against production, not
     * reasoned about: the probe account came back with
     * `role: master_admin, permissions: { all: true }` and a 200 from
     * `/admin/users` carrying real people's records.
     *
     * Self-registration grants the lowest role there is, always. Anything above
     * a client is granted by an invitation or an approval — paths that require
     * an administrator to already be signed in.
     */
    const role = "client";

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    // A password floor, since this route creates a real, confirmed account.
    if (String(password).length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
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

    // Create user profile (KV store)
    try {
      await setProfile(userId, {
        email,
        full_name: full_name || email.split("@")[0],
        onboarding_completed: false,
        first_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (profileError) {
      console.error("Profile creation error:", profileError);
    }

    // Assign default role (client by default) (KV store)
    try {
      await setPermissions(userId, {
        // All four values are constants now, because `role` is. The ternaries
        // that used to be here read the caller's requested role and are exactly
        // what turned a public signup into an administrator.
        role_name: role,
        display_name: "Client",
        level: 4,
        permissions: {},
      });
    } catch (roleError) {
      console.error("Role assignment error:", roleError);
    }

    console.log(`✅ User created successfully: ${email} (${userId})`);

    /**
     * 🗂️ CRM record — after the reply, not before it.
     *
     * `ensureCrmCustomer` reads EVERY customer with a prefix scan to dedupe,
     * then `linkInvoicesByEmail` scans every invoice. Two unbounded scans that
     * grow with the business, and this route awaited both before answering.
     * Measured on 2026-09-20: `POST /auth/signup` took **9.6 seconds**, almost
     * all of it here — `createUser` itself finishes in about half a second.
     *
     * None of it decides whether the account exists. By this line the account
     * is created, confirmed, and has its profile and role. Somebody waiting on
     * a spinner is waiting for bookkeeping.
     *
     * That wait is not cosmetic: a customer abandoned the signup page mid-spin
     * earlier the same day, then could not work out whether the account had
     * been made — which is the whole incident this work started from.
     *
     * `afterResponse` rather than a bare promise so the isolate is kept alive
     * until the CRM write actually lands.
     */
    afterResponse(
      ensureCrmCustomer({
        email,
        fullName: full_name,
        userId,
        accountType: role === "client" ? "customer" : role,
      }),
      `crm:${email}`,
    );

    // 📧 Alert the team about the new sign-up. This used to POST to
    // /notifications/customer-signup, which lives in a router that was never
    // mounted — so the request 404'd and nobody was ever emailed. Now it goes
    // straight through the staff notification engine, which never throws.
    notifyStaffInBackground('signup', {
      subject: `New sign-up: ${full_name || email}`,
      heading: '👤 New portal sign-up',
      rows: [
        ['Name', full_name || email.split("@")[0]],
        ['Email', email],
        ['Portal / role', role],
        ['User ID', userId],
        ['Signed up', new Date().toLocaleString('en-US')],
      ],
      ctaLabel: 'View in User Management',
      ctaPath: '/user-management',
    });

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
authRouter.post("/make-server-3eae23a6/auth/verify", async (c) => {
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

    // Get user role and permissions (KV store)
    const roleData = await getPermissions(user.id);

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

/**
 * `/auth/me` DOES NOT LIVE HERE — see index.tsx:11020.
 *
 * A `GET /auth/me` used to sit at this spot and, because
 * `app.route("/", authRouter)` runs at index.tsx:674 while index.tsx declares
 * its own at 11020, this was the one Hono matched. It decided which portal
 * every signed-in person landed in, and it got it wrong for everybody who was
 * invited.
 *
 * WHAT IT DID
 *
 * It resolved a role as `role?.role_name || "client"`, reading only the KV
 * record `user_permissions:<userId>`. It never looked at `app_metadata.role`,
 * which is the trustworthy bag and the only place an invitation records what
 * somebody was invited as — `ensureAuthUser` sets it and writes no
 * `user_permissions` record at all. Six such records exist across the whole
 * project and every one says "client", because the only thing that ever writes
 * one is `/auth/signup`.
 *
 * So every invited vendor, subcontractor, landlord, employee, investor,
 * advertiser, tenant and property manager came back as a client. `Login.tsx`
 * assigns that answer straight onto `profile.accountType`, overwriting the
 * correct role it had already read from `app_metadata` a few lines earlier, and
 * its `portalRoutes` map has no "client" key — so the lookup missed and
 * everybody fell through to the customer portal. They could sign in. They just
 * never reached the portal they were invited to.
 *
 * Confirmed against production on 2026-09-20 with a probe account carrying
 * `app_metadata.role = "vendor"` and no permissions record: `/auth/me` answered
 * `"role":"client"`.
 *
 * The handler in index.tsx reads `app_metadata.role` first, then permissions and
 * company memberships, then the portal type on an approved application, and
 * also returns the onboarding status the login page wants. It is the right one.
 *
 * Third instance of this shadowing bug found in a day — the others hid the
 * password reset and every application form. A route added to a router in this
 * directory is registered before most of index.tsx and silently wins.
 */

// Update user profile
authRouter.patch("/make-server-3eae23a6/auth/profile", async (c) => {
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

    // Update user profile (KV store)
    try {
      await setProfile(user.id, updates);
    } catch (updateError) {
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
authRouter.post("/make-server-3eae23a6/auth/complete-onboarding", async (c) => {
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

    // Mark onboarding as complete (KV store)
    try {
      await setProfile(user.id, { onboarding_completed: true });
    } catch (updateError) {
      console.error("Onboarding completion error:", updateError);
      return c.json({ error: "Failed to complete onboarding" }, 500);
    }

    // Complete the matching approved-application activation trail, if this
    // account originated from portal intake. Existing users without an
    // application are unaffected.
    //
    // This is best-effort: it runs a `getByPrefix('portal_access:')` scan that
    // grows with the number of portal accounts and can hit a Postgres statement
    // timeout. The core profile write above has ALREADY succeeded, so a failure
    // here must NOT fail onboarding — we log it and still return success.
    try {
      const portalAccessRecords = await kv.getByPrefix('portal_access:');
      const matchingAccess = portalAccessRecords.find((access: any) => access?.userId === user.id);
      if (matchingAccess?.applicationId) {
        const now = new Date().toISOString();
        const intakeKey = `portal_onboarding:${matchingAccess.applicationId}`;
        const intake = await kv.get(intakeKey);
        await kv.set(`portal_access:${matchingAccess.applicationId}`, { ...matchingAccess, status: 'active_pending_requirements', activatedAt: now, updatedAt: now });
        let requirementsComplete = false;
        if (intake) {
          const checklist = (intake.checklist || []).map((item: any) => item.id === 'first_login' ? { ...item, completed: true, completedAt: now } : item);
          requirementsComplete = (intake.requiredTasks || []).every((task: any) => !task.required || task.status === 'complete');
          await kv.set(intakeKey, { ...intake, status: requirementsComplete ? 'active' : 'active_pending_requirements', activatedAt: now, checklist, updatedAt: now });
          if (requirementsComplete) await kv.set(`portal_access:${matchingAccess.applicationId}`, { ...matchingAccess, status: 'active', activatedAt: now, updatedAt: now });
        }
        await kv.set(`application:${matchingAccess.applicationId}`, { ...(await kv.get(`application:${matchingAccess.applicationId}`)), onboardingStatus: requirementsComplete ? 'active' : 'active_pending_requirements', updatedAt: now });
      }
    } catch (activationError) {
      console.error("Onboarding activation-trail update failed (non-fatal, profile already saved):", activationError);
    }

    return c.json({ success: true, message: "Onboarding completed" });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return c.json({ error: "Failed to complete onboarding" }, 500);
  }
});

// Admin: Get all users
authRouter.get("/make-server-3eae23a6/admin/users", async (c) => {
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

    // Check if user has admin permissions (KV store)
    const roleData = await getPermissions(user.id);

    const isAdmin = roleData?.role_name === "master_admin" ||
                   roleData?.role_name === "admin" ||
                   roleData?.permissions?.all === true;

    if (!isAdmin) {
      return c.json({ error: "Admin privileges required" }, 403);
    }

    // Get all user profiles from KV, newest first.
    const profiles = ((await kv.getByPrefix(PROFILE_PREFIX)) || []).sort(
      (a: any, b: any) =>
        new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    );

    // Get roles + auth status for each user
    const usersWithRoles = await Promise.all(
      profiles.map(async (profile: any) => {
        const roleRec = await getPermissions(profile.user_id);

        // Get auth user for status
        let authUser: any = null;
        try {
          const res = await supabase.auth.admin.getUserById(profile.user_id);
          authUser = res.data?.user || null;
        } catch (e) {
          console.error(`Failed to load auth user ${profile.user_id}:`, e);
        }

        return {
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          role: roleRec?.role_name || "client",
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
authRouter.patch("/make-server-3eae23a6/admin/users/:userId/role", async (c) => {
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

    // Check if user has admin permissions (KV store)
    const roleData = await getPermissions(user.id);

    const isAdmin = roleData?.role_name === "master_admin" ||
                   roleData?.role_name === "admin" ||
                   roleData?.permissions?.all === true;

    if (!isAdmin) {
      return c.json({ error: "Admin privileges required" }, 403);
    }

    const userId = c.req.param("userId");
    const { role } = await c.req.json();

    // Update user role (KV store)
    try {
      await setPermissions(userId, {
        role_name: role,
        display_name: role.charAt(0).toUpperCase() + role.slice(1),
      });
    } catch (updateError) {
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
authRouter.patch("/make-server-3eae23a6/admin/users/:userId/status", async (c) => {
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

    // Check if user has admin permissions (KV store)
    const roleData = await getPermissions(user.id);

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
authRouter.delete("/make-server-3eae23a6/admin/users/:userId", async (c) => {
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

    // Check if user has admin permissions (KV store)
    const roleData = await getPermissions(user.id);

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

/**
 * PASSWORD RESET LIVES IN index.tsx, NOT HERE.
 *
 * Two dead routes used to sit at this spot — `/auth/forgot-password` and
 * `/auth/reset-password` — and because `app.route("/", authRouter)` is
 * registered long before index.tsx declares its own handlers, these were the
 * ones Hono actually matched. They shadowed a complete, working implementation
 * with two that could not work:
 *
 *   forgot-password called `resetPasswordForEmail`, which sends over Supabase
 *   Auth's own SMTP. That SMTP answers `535 "Invalid username"`, so no mail was
 *   ever sent — and the error branch returned `success: true` regardless, so the
 *   screen said "check your inbox" every single time.
 *
 *   reset-password called `supabase.auth.updateUser()` on an anonymous client
 *   with no session, and never looked at the token it was given. It could not
 *   have changed anybody's password under any circumstances.
 *
 * On 2026-09-20 a customer locked out of a brand-new account hit both of these
 * and had no way back in. See tasks/todo.md.
 *
 * The real pair in index.tsx mints its own single-use token, stores it in the KV
 * store with a one-hour expiry, mails it with Resend — the key the rest of this
 * application sends with — and resets via `admin.updateUserById`. Its link shape
 * is `/reset-password?token=…`, which is exactly what ResetPassword.tsx reads.
 * Deleting these two is what lets that run.
 */

export default authRouter;