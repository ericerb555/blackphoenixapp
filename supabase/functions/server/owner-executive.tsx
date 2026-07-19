/**
 * Owner Executive Dashboard Backend Routes
 * Provides API endpoints for platform owners to manage all companies
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Middleware to verify owner access
 */
export async function requireOwnerAccess(c: Context, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized: No authorization header' }, 401);
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }

    // Check if user is an owner of at least one company
    const { data: memberships, error: memberError } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true);

    if (memberError || !memberships || memberships.length === 0) {
      console.error('Not an owner:', memberError);
      return c.json({ error: 'Forbidden: Owner access required' }, 403);
    }

    // Store user info and owned company IDs in context
    c.set('userId', user.id);
    c.set('ownedCompanyIds', memberships.map(m => m.company_id));
    
    await next();
  } catch (error) {
    console.error('Owner access check error:', error);
    return c.json({ error: 'Internal server error during authorization' }, 500);
  }
}

/**
 * Log owner dashboard actions for audit trail
 */
async function logOwnerAction(
  userId: string,
  action: string,
  targetCompanyId?: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('owner_access_logs').insert({
      owner_user_id: userId,
      action,
      target_company_id: targetCompanyId || null,
      details: details || {},
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log owner action:', error);
  }
}

/**
 * Get all companies with metrics for owner dashboard
 * GET /make-server-57095a78/owner/companies
 */
export async function getAllCompanies(c: Context) {
  try {
    const userId = c.get('userId');
    const ownedCompanyIds = c.get('ownedCompanyIds') as string[];

    // Log the action
    await logOwnerAction(userId, 'view_dashboard');

    // Get all companies owned by this user
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, slug, status, plan, is_primary, created_at, updated_at')
      .in('id', ownedCompanyIds)
      .order('created_at', { ascending: false });

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return c.json({ error: 'Failed to fetch companies' }, 500);
    }

    // Get metrics for each company
    const companiesWithMetrics = await Promise.all(
      (companies || []).map(async (company) => {
        // Get latest metrics
        const { data: metrics } = await supabase
          .from('company_metrics')
          .select('*')
          .eq('company_id', company.id)
          .order('metric_date', { ascending: false })
          .limit(1)
          .single();

        // Get user counts by type
        const { count: totalUsers } = await supabase
          .from('company_members')
          .select('id', { count: 'exact' })
          .eq('company_id', company.id)
          .eq('is_active', true);

        // Get active users (logged in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: activeUsers } = await supabase
          .from('company_members')
          .select('id', { count: 'exact' })
          .eq('company_id', company.id)
          .eq('is_active', true)
          .gte('last_login', sevenDaysAgo.toISOString());

        // Get user counts by type (this would need a user_type field in company_members)
        // For now, using mock data structure similar to frontend
        const userCounts = metrics?.user_count || {
          total: totalUsers || 0,
          active: activeUsers || 0,
          customers: Math.floor((totalUsers || 0) * 0.6),
          employees: Math.floor((totalUsers || 0) * 0.2),
          subcontractors: Math.floor((totalUsers || 0) * 0.1),
          vendors: Math.floor((totalUsers || 0) * 0.05),
          advertisers: Math.floor((totalUsers || 0) * 0.05)
        };

        // Get last activity (most recent company_context_logs entry)
        const { data: lastActivity } = await supabase
          .from('company_context_logs')
          .select('created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get enabled features for this company
        const { data: features } = await supabase
          .from('company_features')
          .select('feature_name')
          .eq('company_id', company.id)
          .eq('is_enabled', true);

        const featureNames = features?.map(f => f.feature_name) || [];

        // Get AI usage stats (this would need an ai_usage_logs table)
        const aiUsage = metrics?.ai_usage || { calls: 0, cost: 0 };

        // Get branding info
        const { data: branding } = await supabase
          .from('company_branding')
          .select('logo_url, customization_percentage, custom_domain')
          .eq('company_id', company.id)
          .single();

        return {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo: branding?.logo_url,
          status: company.status || 'active',
          plan: company.plan || 'professional',
          mrr: metrics?.mrr || 0,
          totalRevenue: metrics?.total_revenue || 0,
          users: userCounts,
          growth: metrics?.growth_rate || 0,
          healthScore: metrics?.health_score || 85,
          setupProgress: branding?.customization_percentage || 50,
          createdAt: company.created_at,
          lastActive: lastActivity?.created_at || company.updated_at,
          features: featureNames,
          aiUsage,
          alerts: metrics?.alerts_count || 0
        };
      })
    );

    // Calculate platform-wide metrics
    const platformMetrics = {
      totalCompanies: companiesWithMetrics.length,
      activeCompanies: companiesWithMetrics.filter(c => c.status === 'active').length,
      totalMRR: companiesWithMetrics.reduce((sum, c) => sum + c.mrr, 0),
      totalRevenue: companiesWithMetrics.reduce((sum, c) => sum + c.totalRevenue, 0),
      totalUsers: companiesWithMetrics.reduce((sum, c) => sum + c.users.total, 0),
      activeUsers: companiesWithMetrics.reduce((sum, c) => sum + c.users.active, 0),
      totalAICalls: companiesWithMetrics.reduce((sum, c) => sum + c.aiUsage.calls, 0),
      totalAICost: companiesWithMetrics.reduce((sum, c) => sum + c.aiUsage.cost, 0),
      avgHealthScore: Math.round(
        companiesWithMetrics.reduce((sum, c) => sum + c.healthScore, 0) / 
        (companiesWithMetrics.length || 1)
      ),
      totalAlerts: companiesWithMetrics.reduce((sum, c) => sum + c.alerts, 0)
    };

    return c.json({
      companies: companiesWithMetrics,
      platformMetrics
    });
  } catch (error) {
    console.error('Error in getAllCompanies:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get detailed metrics for a specific company
 * GET /make-server-57095a78/owner/company/:companyId/metrics
 */
export async function getCompanyMetrics(c: Context) {
  try {
    const userId = c.get('userId');
    const ownedCompanyIds = c.get('ownedCompanyIds') as string[];
    const companyId = c.req.param('companyId');

    // Verify owner has access to this company
    if (!ownedCompanyIds.includes(companyId)) {
      return c.json({ error: 'Forbidden: You do not own this company' }, 403);
    }

    await logOwnerAction(userId, 'view_company_metrics', companyId);

    // Get historical metrics (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: metrics, error } = await supabase
      .from('company_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('metric_date', sixMonthsAgo.toISOString())
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching metrics:', error);
      return c.json({ error: 'Failed to fetch metrics' }, 500);
    }

    return c.json({ metrics: metrics || [] });
  } catch (error) {
    console.error('Error in getCompanyMetrics:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Update branding for a specific company
 * PUT /make-server-57095a78/owner/company/:companyId/branding
 */
export async function updateCompanyBranding(c: Context) {
  try {
    const userId = c.get('userId');
    const ownedCompanyIds = c.get('ownedCompanyIds') as string[];
    const companyId = c.req.param('companyId');

    // Verify owner has access to this company
    if (!ownedCompanyIds.includes(companyId)) {
      return c.json({ error: 'Forbidden: You do not own this company' }, 403);
    }

    const brandingData = await c.req.json();

    await logOwnerAction(userId, 'update_company_branding', companyId, { 
      fields: Object.keys(brandingData) 
    });

    // Calculate customization percentage based on completed fields
    const totalFields = 10; // logo, colors (4), fonts (2), domain, templates (2)
    let completedFields = 0;
    if (brandingData.logo_url) completedFields++;
    if (brandingData.primary_color) completedFields++;
    if (brandingData.secondary_color) completedFields++;
    if (brandingData.accent_color) completedFields++;
    if (brandingData.background_color) completedFields++;
    if (brandingData.font_primary) completedFields++;
    if (brandingData.font_secondary) completedFields++;
    if (brandingData.custom_domain) completedFields++;
    if (brandingData.email_templates) completedFields++;
    if (brandingData.pdf_template_id) completedFields++;

    const customizationPercentage = Math.round((completedFields / totalFields) * 100);

    // Upsert branding data
    const { data, error } = await supabase
      .from('company_branding')
      .upsert({
        company_id: companyId,
        ...brandingData,
        customization_percentage: customizationPercentage,
        setup_complete: customizationPercentage >= 80,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating branding:', error);
      return c.json({ error: 'Failed to update branding' }, 500);
    }

    return c.json({ branding: data });
  } catch (error) {
    console.error('Error in updateCompanyBranding:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get revenue analytics across all companies
 * GET /make-server-57095a78/owner/reports/revenue
 */
export async function getRevenueReport(c: Context) {
  try {
    const userId = c.get('userId');
    const ownedCompanyIds = c.get('ownedCompanyIds') as string[];
    const timeRange = c.req.query('range') || '30d';

    await logOwnerAction(userId, 'view_revenue_report', undefined, { timeRange });

    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'ytd':
        startDate = new Date(startDate.getFullYear(), 0, 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get metrics for owned companies
    const { data: metrics, error } = await supabase
      .from('company_metrics')
      .select('company_id, metric_date, mrr, total_revenue, growth_rate')
      .in('company_id', ownedCompanyIds)
      .gte('metric_date', startDate.toISOString())
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching revenue metrics:', error);
      return c.json({ error: 'Failed to fetch revenue data' }, 500);
    }

    // Aggregate by date
    const aggregated = (metrics || []).reduce((acc, metric) => {
      const date = metric.metric_date.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          mrr: 0,
          totalRevenue: 0,
          avgGrowth: 0,
          companyCount: 0
        };
      }
      acc[date].mrr += metric.mrr || 0;
      acc[date].totalRevenue += metric.total_revenue || 0;
      acc[date].avgGrowth += metric.growth_rate || 0;
      acc[date].companyCount++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    const revenueData = Object.values(aggregated).map((item: any) => ({
      ...item,
      avgGrowth: item.avgGrowth / (item.companyCount || 1)
    }));

    return c.json({ revenueData });
  } catch (error) {
    console.error('Error in getRevenueReport:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get user growth analytics
 * GET /make-server-57095a78/owner/reports/users
 */
export async function getUsersReport(c: Context) {
  try {
    const userId = c.get('userId');
    const ownedCompanyIds = c.get('ownedCompanyIds') as string[];
    const timeRange = c.req.query('range') || '30d';

    await logOwnerAction(userId, 'view_users_report', undefined, { timeRange });

    // Get metrics
    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const { data: metrics, error } = await supabase
      .from('company_metrics')
      .select('metric_date, user_count')
      .in('company_id', ownedCompanyIds)
      .gte('metric_date', startDate.toISOString())
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching user metrics:', error);
      return c.json({ error: 'Failed to fetch user data' }, 500);
    }

    // Aggregate user counts by date and type
    const aggregated = (metrics || []).reduce((acc, metric) => {
      const date = metric.metric_date.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          active: 0,
          customers: 0,
          employees: 0,
          subcontractors: 0,
          vendors: 0,
          advertisers: 0
        };
      }
      const counts = metric.user_count || {};
      acc[date].total += counts.total || 0;
      acc[date].active += counts.active || 0;
      acc[date].customers += counts.customers || 0;
      acc[date].employees += counts.employees || 0;
      acc[date].subcontractors += counts.subcontractors || 0;
      acc[date].vendors += counts.vendors || 0;
      acc[date].advertisers += counts.advertisers || 0;
      return acc;
    }, {} as Record<string, any>);

    const userData = Object.values(aggregated);

    return c.json({ userData });
  } catch (error) {
    console.error('Error in getUsersReport:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get AI usage analytics
 * GET /make-server-57095a78/owner/reports/ai-usage
 */
export async function getAIUsageReport(c: Context) {
  try {
    const userId = c.get('userId');
    const ownedCompanyIds = c.get('ownedCompanyIds') as string[];
    const timeRange = c.req.query('range') || '30d';

    await logOwnerAction(userId, 'view_ai_usage_report', undefined, { timeRange });

    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const { data: metrics, error } = await supabase
      .from('company_metrics')
      .select('company_id, metric_date, ai_usage')
      .in('company_id', ownedCompanyIds)
      .gte('metric_date', startDate.toISOString())
      .order('metric_date', { ascending: true });

    if (error) {
      console.error('Error fetching AI metrics:', error);
      return c.json({ error: 'Failed to fetch AI usage data' }, 500);
    }

    // Aggregate by date
    const aggregated = (metrics || []).reduce((acc, metric) => {
      const date = metric.metric_date.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, calls: 0, cost: 0 };
      }
      const usage = metric.ai_usage || {};
      acc[date].calls += usage.calls || 0;
      acc[date].cost += usage.cost || 0;
      return acc;
    }, {} as Record<string, any>);

    const aiUsageData = Object.values(aggregated);

    return c.json({ aiUsageData });
  } catch (error) {
    console.error('Error in getAIUsageReport:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Get access logs for audit trail
 * GET /make-server-57095a78/owner/access-logs
 */
export async function getAccessLogs(c: Context) {
  try {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { data: logs, error, count } = await supabase
      .from('owner_access_logs')
      .select('*', { count: 'exact' })
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching access logs:', error);
      return c.json({ error: 'Failed to fetch access logs' }, 500);
    }

    return c.json({ 
      logs: logs || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in getAccessLogs:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
