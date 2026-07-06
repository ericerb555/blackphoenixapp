import { supabase } from './supabase';

/**
 * Company Scope and Context Management
 * Last updated: 2026-01-21
 */

// Company Scope Interface - used for RLS and query filtering
export interface CompanyScope {
  companyId: string | null;
  userId: string;
}

// Company Context Interface - used for session management
export interface CompanyContext {
  company_id: string;
  company_name: string;
  company_slug?: string;
  role: string;
  is_primary?: boolean;
}

/**
 * Apply company scope filter to a Supabase query
 */
export function applyCompanyScope<T>(
  query: any,
  scope: CompanyScope,
  companyIdColumn: string = 'company_id'
) {
  if (scope.companyId) {
    return query.eq(companyIdColumn, scope.companyId);
  }
  return query;
}

/**
 * Get current company scope from context
 */
export function getCurrentScope(companyId: string | null, userId: string): CompanyScope {
  return {
    companyId,
    userId,
  };
}

/**
 * Validate if user has access to a company
 */
export async function validateCompanyAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (err) {
    console.error('Error validating company access:', err);
    return false;
  }
}

/**
 * Get user's companies
 */
export async function getUserCompanies(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_companies')
      .select('*, companies(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error getting user companies:', err);
    return [];
  }
}// Named exports
{ applyCompanyScope as  };

// Also export everything as a namespace
export const companyScopeUtils =