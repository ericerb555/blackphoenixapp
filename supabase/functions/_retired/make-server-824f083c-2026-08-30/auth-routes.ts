/**
 * Authentication Routes
 * 
 * Handles user registration, approval workflow, and role management
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Get Supabase client with service role key for admin operations
const getServiceClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

// Get user from access token
const getUserFromToken = async (authHeader: string | null) => {
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
};

/**
 * Sign up a new user (creates auth account + profile)
 * Uses admin.createUser to bypass email confirmation
 */
app.post('/signup', async (c) => {
  try {
    console.log('[Auth/Signup] === SIGNUP REQUEST RECEIVED ===');
    
    const body = await c.req.json();
    console.log('[Auth/Signup] Request body:', JSON.stringify(body, null, 2));
    
    const { email, password, fullName, phone, role, isFirstUser } = body;
    
    if (!email || !password) {
      console.error('[Auth/Signup] ❌ Missing email or password');
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    console.log('[Auth/Signup] Creating user account for:', email);
    
    // Check if any users exist in the system
    const users = await kv.getByPrefix('user:profile:');
    const actualIsFirstUser = users.length === 0;
    console.log('[Auth/Signup] Existing users count:', users.length);
    console.log('[Auth/Signup] Is first user:', actualIsFirstUser);
    
    // Get service client with admin privileges
    console.log('[Auth/Signup] Getting service client...');
    const supabase = getServiceClient();
    
    // Check if user already exists
    console.log('[Auth/Signup] Checking if user exists...');
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      console.log('[Auth/Signup] ⚠️ User already exists:', existingUser.id);
      return c.json({ 
        error: 'User already exists. Please sign in at /login instead.',
        userId: existingUser.id 
      }, 400);
    }
    
    // Create user with admin.createUser (bypasses email confirmation)
    console.log('[Auth/Signup] Creating new user in Supabase Auth...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since we don't have email server configured
      user_metadata: {
        full_name: fullName,
        role: actualIsFirstUser ? 'owner' : (role || 'customer'),
      },
    });
    
    if (error) {
      console.error('[Auth/Signup] ❌ Supabase createUser error:', error);
      console.error('[Auth/Signup] ❌ Error details:', JSON.stringify(error, null, 2));
      return c.json({ error: error.message }, 400);
    }
    
    if (!data?.user) {
      console.error('[Auth/Signup] ❌ No user data returned from createUser');
      return c.json({ error: 'Failed to create user - no data returned' }, 500);
    }
    
    console.log('[Auth/Signup] ✅ User created in Supabase Auth:', data.user.id);
    console.log('[Auth/Signup] User email confirmed:', data.user.email_confirmed_at);
    
    // Determine approval status based on role
    let approvalStatus = 'approved';
    const userRole = actualIsFirstUser ? 'owner' : (role || 'customer');
    console.log('[Auth/Signup] Assigned role:', userRole);
    console.log('[Auth/Signup] Approval status:', approvalStatus);
    
    if (userRole === 'subcontractor' || userRole === 'advertiser' || userRole === 'employee') {
      approvalStatus = 'pending';
      console.log('[Auth/Signup] Role requires approval, status set to pending');
    }
    
    // Create user profile
    const userProfile = {
      id: data.user.id,
      email: data.user.email!,
      fullName,
      phone: phone || null,
      role: userRole,
      approvalStatus,
      isFirstUser: actualIsFirstUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('[Auth/Signup] Saving user profile to KV store...');
    console.log('[Auth/Signup] Profile data:', JSON.stringify(userProfile, null, 2));
    
    // Save to KV store
    await kv.set(`user:profile:${data.user.id}`, userProfile);
    console.log('[Auth/Signup] ✅ User profile saved to KV store');
    
    // If pending approval, save to pending users list
    if (approvalStatus === 'pending') {
      console.log('[Auth/Signup] Saving to pending users list...');
      await kv.set(`user:pending:${data.user.id}`, {
        ...userProfile,
        registeredDate: new Date().toISOString(),
      });
      console.log('[Auth/Signup] ✅ Saved to pending users list');
    }
    
    console.log('[Auth/Signup] ✅✅✅ SIGNUP COMPLETE ✅✅✅');
    console.log('[Auth/Signup] User ID:', data.user.id);
    console.log('[Auth/Signup] User Email:', data.user.email);
    console.log('[Auth/Signup] User Role:', userRole);
    
    return c.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: userRole,
      },
      profile: userProfile,
      requiresApproval: approvalStatus === 'pending',
    });
  } catch (error: any) {
    console.error('[Auth/Signup] ❌❌❌ SIGNUP EXCEPTION ❌❌❌');
    console.error('[Auth/Signup] Error:', error);
    console.error('[Auth/Signup] Error message:', error.message);
    console.error('[Auth/Signup] Error stack:', error.stack);
    return c.json({ error: error.message || 'Signup failed' }, 500);
  }
});

/**
 * Check if this is the first user (for auto-owner assignment)
 */
app.get('/check-first-user', async (c) => {
  try {
    // Check if any users exist in the system
    const users = await kv.getByPrefix('user:profile:');
    const isFirstUser = users.length === 0;
    
    return c.json({ isFirstUser });
  } catch (error: any) {
    console.error('Error checking first user:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Complete registration after Supabase auth signup
 * Creates user profile with role and metadata
 */
app.post('/complete-registration', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const {
      role,
      fullName,
      phone,
      companyName,
      businessType,
      serviceArea,
      licenseNumber,
      customerTier,
      isFirstUser,
    } = body;
    
    // Determine approval status based on role
    let approvalStatus = 'approved';
    
    if (role === 'subcontractor' || role === 'advertiser' || role === 'employee') {
      approvalStatus = 'pending';
    }
    
    // First user is always approved as owner
    if (isFirstUser) {
      approvalStatus = 'approved';
    }
    
    // Create user profile
    const userProfile = {
      id: user.id,
      email: user.email!,
      fullName,
      phone: phone || null,
      role: isFirstUser ? 'owner' : role,
      companyName: companyName || null,
      businessType: businessType || null,
      serviceArea: serviceArea || null,
      licenseNumber: licenseNumber || null,
      customerTier: customerTier || null,
      approvalStatus,
      isFirstUser: isFirstUser || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to KV store
    await kv.set(`user:profile:${user.id}`, userProfile);
    
    // If pending approval, save to pending users list
    if (approvalStatus === 'pending') {
      await kv.set(`user:pending:${user.id}`, {
        ...userProfile,
        registeredDate: new Date().toISOString(),
      });
    }
    
    // Send notification emails
    if (approvalStatus === 'pending') {
      // TODO: Send email to user about pending approval
      // TODO: Send email to owners about new pending user
      console.log(`User ${fullName} registration pending approval`);
    } else {
      // TODO: Send welcome email
      console.log(`User ${fullName} registered and approved`);
    }
    
    return c.json({
      success: true,
      profile: userProfile,
      requiresApproval: approvalStatus === 'pending',
    });
  } catch (error: any) {
    console.error('Error completing registration:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Get all pending users (owner only)
 */
app.get('/pending-users', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Check if user is owner
    const userProfile = await kv.get(`user:profile:${user.id}`);
    if (!userProfile || userProfile.role !== 'owner') {
      return c.json({ error: 'Forbidden: Owner access required' }, 403);
    }
    
    // Get all pending users
    const pendingUsers = await kv.getByPrefix('user:pending:');
    
    return c.json({ pendingUsers });
  } catch (error: any) {
    console.error('Error fetching pending users:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Approve a pending user (owner only)
 */
app.post('/approve-user', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Check if user is owner
    const userProfile = await kv.get(`user:profile:${user.id}`);
    if (!userProfile || userProfile.role !== 'owner') {
      return c.json({ error: 'Forbidden: Owner access required' }, 403);
    }
    
    const body = await c.req.json();
    const { userId, notes } = body;
    
    // Get pending user
    const pendingUser = await kv.get(`user:pending:${userId}`);
    if (!pendingUser) {
      return c.json({ error: 'Pending user not found' }, 404);
    }
    
    // Update user profile to approved
    const updatedProfile = {
      ...pendingUser,
      approvalStatus: 'approved',
      approvedBy: user.id,
      approvedAt: new Date().toISOString(),
      approvalNotes: notes || null,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:profile:${userId}`, updatedProfile);
    
    // Remove from pending list
    await kv.del(`user:pending:${userId}`);
    
    // TODO: Send approval email to user
    console.log(`User ${pendingUser.fullName} approved by ${userProfile.fullName}`);
    
    return c.json({
      success: true,
      message: 'User approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving user:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Reject a pending user (owner only)
 */
app.post('/reject-user', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Check if user is owner
    const userProfile = await kv.get(`user:profile:${user.id}`);
    if (!userProfile || userProfile.role !== 'owner') {
      return c.json({ error: 'Forbidden: Owner access required' }, 403);
    }
    
    const body = await c.req.json();
    const { userId, reason } = body;
    
    // Get pending user
    const pendingUser = await kv.get(`user:pending:${userId}`);
    if (!pendingUser) {
      return c.json({ error: 'Pending user not found' }, 404);
    }
    
    // Update user profile to rejected
    const rejectedProfile = {
      ...pendingUser,
      approvalStatus: 'rejected',
      rejectedBy: user.id,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:profile:${userId}`, rejectedProfile);
    
    // Remove from pending list
    await kv.del(`user:pending:${userId}`);
    
    // Save to rejected archive
    await kv.set(`user:rejected:${userId}`, rejectedProfile);
    
    // TODO: Send rejection email to user with reason
    console.log(`User ${pendingUser.fullName} rejected by ${userProfile.fullName}: ${reason}`);
    
    return c.json({
      success: true,
      message: 'User rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting user:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Get user profile
 */
app.get('/profile/:userId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = c.req.param('userId');
    
    // Users can only get their own profile unless they're an owner
    const requestorProfile = await kv.get(`user:profile:${user.id}`);
    if (user.id !== userId && (!requestorProfile || requestorProfile.role !== 'owner')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const profile = await kv.get(`user:profile:${userId}`);
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    return c.json({ profile });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Update customer subscription tier
 */
app.post('/update-subscription', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const { tier } = body;
    
    if (tier !== 'free' && tier !== 'subscription') {
      return c.json({ error: 'Invalid tier' }, 400);
    }
    
    // Get user profile
    const profile = await kv.get(`user:profile:${user.id}`);
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    if (profile.role !== 'customer') {
      return c.json({ error: 'Only customers can update subscription tier' }, 400);
    }
    
    // Update subscription tier
    const updatedProfile = {
      ...profile,
      customerTier: tier,
      subscriptionUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:profile:${user.id}`, updatedProfile);
    
    // TODO: Process payment if upgrading to subscription
    // TODO: Send confirmation email
    
    return c.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
