
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

/*
 * `validateCompanyAccess`, `getUserCompanies` and the `companyScopeUtils`
 * namespace were removed on 2026-11-19.
 *
 * Both functions queried `user_companies`, a table that has never existed, and
 * neither was ever called — `AuthContext` imports only the TYPES from this
 * file, and nothing imported the namespace at all. So they were two phantom
 * queries that could not run and would have failed closed if they had
 * (`false`, and `[]`).
 *
 * Worth being precise about why that is safe to delete rather than complete:
 * the thing that *does* decide company access is
 * `CompanyContext.validateCompanyAccess`, which calls the
 * `validate_company_access_secure` RPC. That RPC does not exist either, so
 * company switching is permanently denied — see `D-2` in
 * `docs/audit-2026-11/DATABASE_RLS_AUDIT.md`. Building these two functions out
 * would have given the illusion of a second, working path to the same
 * decision while the real one stayed dead.
 *
 * The type exports above are genuinely used and stay.
 */