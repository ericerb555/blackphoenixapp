/**
 * Tax Configuration API
 * 
 * Manage tax rates and configurations.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Helper to get user from auth token
async function getUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * GET /
 * List all tax configurations
 */
app.get('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const companyId = user.user_metadata.company_id || user.id;

    const { data: configs, error } = await supabase
      .from('tax_configs_824f083c')
      .select('*')
      .eq('company_id', companyId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    return c.json({
      tax_configs: configs || [],
      count: configs?.length || 0,
    });

  } catch (error: any) {
    console.error('Error fetching tax configs:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /default
 * Get default tax configuration
 */
app.get('/default', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const companyId = user.user_metadata.company_id || user.id;

    const { data: config, error } = await supabase
      .from('tax_configs_824f083c')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return c.json(config || null);

  } catch (error: any) {
    console.error('Error fetching default tax config:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /:id
 * Get single tax configuration
 */
app.get('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    const { data: config, error } = await supabase
      .from('tax_configs_824f083c')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;

    if (!config) {
      return c.json({ error: 'Tax configuration not found' }, 404);
    }

    return c.json(config);

  } catch (error: any) {
    console.error('Error fetching tax config:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /
 * Create new tax configuration
 */
app.post('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const companyId = user.user_metadata.company_id || user.id;

    // If this should be the default, unset any existing default
    if (body.is_default) {
      await supabase
        .from('tax_configs_824f083c')
        .update({ is_default: false })
        .eq('company_id', companyId)
        .eq('is_default', true);
    }

    const { data: config, error } = await supabase
      .from('tax_configs_824f083c')
      .insert({
        company_id: companyId,
        name: body.name,
        rate: body.rate,
        is_default: body.is_default || false,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(config, 201);

  } catch (error: any) {
    console.error('Error creating tax config:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /:id
 * Update tax configuration
 */
app.put('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const body = await c.req.json();
    const companyId = user.user_metadata.company_id || user.id;

    // If this should be the default, unset any existing default
    if (body.is_default) {
      await supabase
        .from('tax_configs_824f083c')
        .update({ is_default: false })
        .eq('company_id', companyId)
        .eq('is_default', true)
        .neq('id', id);
    }

    const { data: config, error } = await supabase
      .from('tax_configs_824f083c')
      .update({
        name: body.name,
        rate: body.rate,
        is_default: body.is_default,
        description: body.description,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;

    return c.json(config);

  } catch (error: any) {
    console.error('Error updating tax config:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /:id
 * Delete tax configuration
 */
app.delete('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    // Check if this is the default config
    const { data: config } = await supabase
      .from('tax_configs_824f083c')
      .select('is_default')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (config?.is_default) {
      return c.json({ 
        error: 'Cannot delete default tax configuration. Set another config as default first.' 
      }, 400);
    }

    const { error } = await supabase
      .from('tax_configs_824f083c')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    return c.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting tax config:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /:id/set-default
 * Set a tax configuration as default
 */
app.post('/:id/set-default', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    // Unset any existing default
    await supabase
      .from('tax_configs_824f083c')
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('is_default', true);

    // Set new default
    const { data: config, error } = await supabase
      .from('tax_configs_824f083c')
      .update({ is_default: true })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      config,
      message: 'Default tax configuration updated',
    });

  } catch (error: any) {
    console.error('Error setting default tax config:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
