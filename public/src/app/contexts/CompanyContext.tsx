import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Company {
  id: string;
  name: string;
  slug: string;
  is_primary: boolean;
  role: string;
  // Add additional fields that come from database
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  industry?: string;
  description?: string;
  dba?: string;
  // Additional fields from BusinessProfilesHub
  founded_date?: string;
  employee_count?: number;
  annual_revenue?: number;
  tax_id?: string;
  business_license?: string;
  documents?: any[];
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
}

interface SecurityValidationResult {
  allowed: boolean;
  user_role: string | null;
  error_code: string | null;
  error_message: string | null;
}

interface CompanyContextType {
  activeCompany: Company | null;
  userCompanies: Company[];
  isLoading: boolean;
  setActiveCompany: (company: Company) => Promise<void>;
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>;
  refreshCompanies: () => Promise<void>;
  clearCompanyContext: () => void;
  validateCompanyAccess: (companyId: string) => Promise<SecurityValidationResult>;
  hasPermission: (permission: string) => Promise<boolean>;
  logSecurityEvent: (eventType: string, details?: Record<string, unknown>) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function useCompany() {
  const context = useContext(CompanyContext);
  // Return the context even if undefined - let components handle the undefined case
  // This prevents crashes during initialization
  return context;
}

// Helper to ensure context is available (for components that require it)
export function useCompanyRequired() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyRequired must be used within a CompanyContextProvider');
  }
  return context;
}

export function useCompanyId(): string | null {
  const context = useContext(CompanyContext);
  return context?.activeCompany?.id || null;
}

interface CompanyContextProviderProps {
  children: ReactNode;
}

export function CompanyContextProvider({ children }: CompanyContextProviderProps) {
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [userCompanies, setUserCompaniesRaw] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  // FIXED: Trust the database - allow empty arrays if that's what's actually saved
  const setUserCompanies = (companies: Company[]) => {
    console.log('[CompanyContext] setUserCompanies called with:', companies.length, 'companies');

    // Save to state immediately - trust the data we're given
    setUserCompaniesRaw(companies);

    // SINGLE CACHE: Only use companies_cache
    try {
      localStorage.setItem('companies_cache', JSON.stringify(companies));
    } catch (e) {
      console.warn('[CompanyContext] Failed to cache companies to localStorage:', e);
    }
  };

  const logSecurityEvent = async (
    eventType: string,
    companyId: string | null = null,
    details: any = {}
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Note: security_audit_log table doesn't exist in this setup
      // Logging to console instead
      console.log('🔒 Security Event:', {
        user_id: user?.id || null,
        event_type: eventType,
        company_id: activeCompany?.id || null,
        details,
        timestamp: new Date().toISOString()
      });
      
      // Skip database insert - table doesn't exist
      // await supabase.from('security_audit_log').insert({...})
    } catch (error) {
      // Silent fail - don't break the app
      console.warn('Security event logging skipped:', error);
    }
  };

  const logContextChange = async (
    companyId: string,
    action: 'login' | 'switch' | 'logout' | 'session_restore',
    previousCompanyId?: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Note: Tables don't exist in this setup - logging to console instead
      console.log('📝 Context Change:', {
        user_id: user.id,
        company_id: companyId,
        previous_company_id: previousCompanyId || null,
        action,
        timestamp: new Date().toISOString()
      });

      // Skip database inserts - tables don't exist
      // await supabase.from('company_context_logs').insert({...})
      // await supabase.from('security_audit_log').insert({...})
    } catch (error) {
      console.warn('Context change logging skipped:', error);
    }
  };

  const validateCompanyAccess = async (companyId: string): Promise<SecurityValidationResult> => {
    try {
      const { data, error } = await supabase.rpc('validate_company_access_secure', {
        p_target_company_id: companyId,
      });

      if (error) {
        return {
          allowed: false,
          user_role: null,
          error_code: 'RPC_ERROR',
          error_message: error.message,
        };
      }

      if (data && data.length > 0) {
        return data[0] as SecurityValidationResult;
      }

      return {
        allowed: false,
        user_role: null,
        error_code: 'NO_DATA',
        error_message: 'No validation result returned',
      };
    } catch (error) {
      return {
        allowed: false,
        user_role: null,
        error_code: 'EXCEPTION',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const hasPermission = async (permission: string): Promise<boolean> => {
    if (!activeCompany) return false;

    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_company_id: activeCompany.id,
        p_permission_key: permission,
      });

      if (error) {
        console.error('Permission check failed:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  const saveActiveSession = async (company: Company) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Note: active_company_sessions table doesn't exist - using localStorage instead
      const sessionData = {
        user_id: user.id,
        company_id: company.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      
      localStorage.setItem(`active_session_${user.id}`, JSON.stringify(sessionData));
      console.log('💾 Active session saved to localStorage');
      
      // Skip database insert - table doesn't exist
      // await supabase.from('active_company_sessions').upsert({...})
    } catch (error) {
      console.warn('Session save skipped:', error);
    }
  };

  const fetchUserCompanies = useCallback(async (): Promise<Company[]> => {
    console.log('[CompanyContext] fetchUserCompanies called');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CompanyContext] No user, checking localStorage for offline data');
        // OFFLINE MODE: Load from SINGLE cache
        const storedCompanies = localStorage.getItem('companies_cache');
        if (storedCompanies && storedCompanies !== 'undefined' && storedCompanies !== 'null') {
          try {
            const parsed = JSON.parse(storedCompanies);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              console.log('[CompanyContext] ✅ Loaded companies from cache (offline mode):', parsed.length);
              return parsed;
            }
          } catch (e) {
            console.error('[CompanyContext] Failed to parse cache:', e);
          }
        }
        return [];
      }

      // PRIORITY 1: Check cache first (most recent data)
      const cached = localStorage.getItem('companies_cache');
      if (cached && cached !== 'undefined' && cached !== 'null') {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[CompanyContext] ✅ Loaded ${parsed.length} companies from cache (PRIORITY SOURCE)`);
            return parsed;
          }
        } catch (e) {
          console.error('[CompanyContext] Failed to parse cache:', e);
        }
      }

      // Get access token for API call - wrapped in try/catch to handle AbortError
      let accessToken: string | undefined;
      try {
        // Use getSession with a timeout to prevent lock issues
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        );
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        accessToken = session?.access_token;
      } catch (sessionError: any) {
        if (sessionError?.name === 'AbortError' || sessionError?.message?.includes('Lock broken') || sessionError?.message?.includes('lock was released')) {
          console.log('[CompanyContext] Session lock conflict (normal - another request is handling auth)');
          return [];
        }
        if (sessionError?.message === 'Session timeout') {
          console.log('[CompanyContext] Session request timed out, skipping companies fetch');
          return [];
        }
        throw sessionError;
      }

      if (!accessToken) {
        // Check SINGLE cache
        console.log('[CompanyContext] No access token, checking cache');
        const stored = localStorage.getItem('companies_cache');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              console.log(`[CompanyContext] ✅ Loaded ${parsed.length} companies from cache`);
              return parsed;
            }
          } catch (e) {
            console.error('[CompanyContext] Failed to parse cache:', e);
            localStorage.removeItem('companies_cache');
          }
        }

        console.log('[CompanyContext] No access token available yet - returning empty array');
        return [];
      }

      // Try to fetch companies from DATABASE via API
      const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/companies`;
      console.log('[CompanyContext] Attempting database fetch:', apiUrl);

      let response;
      try {
        response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (fetchError: any) {
        // Network error (server offline, no internet, etc.)
        console.log('[CompanyContext] Network error - falling back to cache:', fetchError.message);

        // FALLBACK: Load from SINGLE cache
        const storedCompanies = localStorage.getItem('companies_cache');
        if (storedCompanies && storedCompanies !== 'undefined') {
          try {
            const parsed = JSON.parse(storedCompanies);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              console.log('[CompanyContext] ✅ Loaded companies from cache (network error):', parsed.length);
              return parsed;
            }
          } catch (e) {
            console.error('[CompanyContext] Failed to parse cache:', e);
          }
        }

        // No cache found - return empty array
        console.log('[CompanyContext] No cache found after network error - returning empty array');
        return [];
      }

      if (!response.ok) {
        console.log('[CompanyContext] Server returned error (status:', response.status, '), falling back to cache');

        // FALLBACK: Load from SINGLE cache
        const storedCompanies = localStorage.getItem('companies_cache');
        if (storedCompanies && storedCompanies !== 'undefined' && storedCompanies !== 'null') {
          try {
            const parsed = JSON.parse(storedCompanies);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              console.log('[CompanyContext] ✅ Loaded companies from cache (server offline):', parsed.length);
              return parsed;
            }
          } catch (e) {
            console.error('[CompanyContext] Failed to parse cache:', e);
            localStorage.removeItem('companies_cache');
          }
        }

        // No valid data found - return empty array
        console.log('[CompanyContext] Server offline and no valid cache - returning empty array');
        return [];
      }

      const { companies: companiesData } = await response.json();

      console.log('[CompanyContext] Loaded companies from database:', companiesData?.length || 0);

      // Map database data to Company interface
      const companies: Company[] = (companiesData || []).map((company: any) => ({
        ...company, // Keep EVERYTHING from the database
        role: company.role || 'owner',
        is_primary: company.is_primary || false,
      }));

      // Save to SINGLE cache for offline use
      if (companies.length > 0) {
        localStorage.setItem('companies_cache', JSON.stringify(companies));
        console.log('[CompanyContext] ✅ Database companies cached');
      }

      return companies;
    } catch (error: any) {
      // Handle AbortError gracefully - this happens during rapid auth changes
      if (error?.name === 'AbortError') {
        console.log('[CompanyContext] Request aborted (normal during auth state changes)');
        return [];
      }
      // Network errors are expected during initial load or when offline
      // FALLBACK: Load from SINGLE cache
      console.log('[CompanyContext] Network error, using cache fallback:', error?.message || error);
      const storedCompanies = localStorage.getItem('companies_cache');
      if (storedCompanies) {
        try {
          const parsed = JSON.parse(storedCompanies);
          console.log('[CompanyContext] Loaded companies from cache (after error):', parsed.length);
          return parsed;
        } catch (e) {
          console.error('[CompanyContext] Failed to parse cache:', e);
        }
      }

      // No cache available - return empty array
      console.log('[CompanyContext] Network error with no cache - returning empty array');
      return [];
    }
  }, []);

  const createDefaultCompany = async (userId: string): Promise<Company | null> => {
    try {
      console.log('[CompanyContext] Creating default company for user');
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
          name: 'My Company',
          slug: `company-${Date.now()}`,
          is_primary: true,
          owner_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('[CompanyContext] Error creating company:', error);
        return null;
      }

      console.log('[CompanyContext] Default company created:', newCompany);

      await supabase.from('company_members').insert({
        company_id: newCompany.id,
        user_id: userId,
        role: 'owner',
        is_active: true,
      });

      return {
        id: newCompany.id,
        name: newCompany.name,
        slug: newCompany.slug,
        is_primary: true,
        role: 'owner',
      };
    } catch (error) {
      console.error('[CompanyContext] Error in createDefaultCompany:', error);
      return null;
    }
  };

  const restoreSession = useCallback(async () => {
    console.log('[CompanyContext] restoreSession called');
    setIsLoading(true);
    setIsRestoring(true);

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('[CompanyContext] ⏱️ Loading timeout reached (3s), completing with current state');

      // EMERGENCY FALLBACK: If timeout happens, check cache one last time
      const stored = localStorage.getItem('companies_cache');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            console.log(`[CompanyContext] ⏱️ TIMEOUT RECOVERY: Using ${parsed.length} companies from cache`);
            setUserCompanies(parsed);
            setActiveCompanyState(parsed[0]);
          }
        } catch (e) {
          console.error('[CompanyContext] Failed to parse cache:', e);
        }
      }

      setIsLoading(false);
      setIsRestoring(false);
    }, 3000); // 3 second timeout - give more time for database queries

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[CompanyContext] User:', { hasUser: !!user, email: user?.email });
      if (!user) {
        console.log('[CompanyContext] No user, setting loading=false');
        clearTimeout(timeout);
        setIsLoading(false);
        setIsRestoring(false);
        return;
      }

      let companies = await fetchUserCompanies();
      console.log('[CompanyContext] Companies fetched:', companies.length);

      // FIXED: Don't automatically create companies - let the user create them
      if (companies.length === 0) {
        console.log('[CompanyContext] No companies found - user needs to create one');
        setUserCompanies([]);
        setActiveCompanyState(null);
        clearTimeout(timeout);
        setIsLoading(false);
        setIsRestoring(false);
        return;
      }

      setUserCompanies(companies);

      // Try to restore saved session from localStorage
      try {
        const sessionKey = `active_session_${user.id}`;
        const storedSession = localStorage.getItem(sessionKey);
        
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          const savedCompany = companies.find(c => c.id === sessionData.company_id);
          if (savedCompany) {
            console.log('[CompanyContext] Restoring saved company:', savedCompany.name);
            setActiveCompanyState(savedCompany);
            // Don't await logging - fire and forget for better performance
            logContextChange(savedCompany.id, 'session_restore').catch(console.error);
            clearTimeout(timeout);
            setIsLoading(false);
            setIsRestoring(false);
            return;
          }
        }
      } catch (sessionError) {
        console.warn('[CompanyContext] Session restore failed, using default:', sessionError);
      }

      const primaryCompany = companies.find(c => c.is_primary);
      const defaultCompany = primaryCompany || companies[0];

      if (defaultCompany) {
        console.log('[CompanyContext] Setting default company:', defaultCompany.name);
        setActiveCompanyState(defaultCompany);
        // Don't await - fire and forget for better performance
        saveActiveSession(defaultCompany).catch(console.error);
        logContextChange(defaultCompany.id, 'session_restore').catch(console.error);
      }
    } catch (error) {
      console.error('[CompanyContext] ❌ Error restoring session:', error);
    } finally {
      console.log('[CompanyContext] ✅ Restore complete, setting loading=false');
      clearTimeout(timeout);
      setIsLoading(false);
      setIsRestoring(false);
    }
  }, [fetchUserCompanies]);

  const setActiveCompany = async (company: Company) => {
    const previousCompanyId = activeCompany?.id;
    setActiveCompanyState(company);

    await saveActiveSession(company);
    await logContextChange(
      company.id,
      previousCompanyId ? 'switch' : 'login',
      previousCompanyId
    );
  };

  const switchCompany = async (companyId: string): Promise<{ success: boolean; error?: string }> => {
    const company = userCompanies.find(c => c.id === companyId);
    if (!company) {
      await logSecurityEvent('company_switch_denied', {
        target_company_id: companyId,
        error: 'Company not found in user companies',
      });
      return { success: false, error: 'Company not found' };
    }

    // Skip validation for owners - they have full access
    if (company.role === 'owner') {
      await setActiveCompany(company);
      await logSecurityEvent('company_switch_success', {
        target_company_id: companyId,
      });
      return { success: true };
    }

    const validation = await validateCompanyAccess(companyId);

    if (!validation.allowed) {
      await logSecurityEvent('company_switch_denied', {
        target_company_id: companyId,
        error_code: validation.error_code,
        error: validation.error_message,
      });
      return {
        success: false,
        error: validation.error_message || 'Access denied',
      };
    }

    await setActiveCompany(company);
    return { success: true };
  };

  const refreshCompanies = async () => {
    console.log('[CompanyContext] refreshCompanies called - reloading from source');

    // Fetch fresh data from database
    const companies = await fetchUserCompanies();
    setUserCompanies(companies);

    if (activeCompany && !companies.find(c => c.id === activeCompany.id)) {
      const primaryCompany = companies.find(c => c.is_primary);
      const defaultCompany = primaryCompany || companies[0];
      if (defaultCompany) {
        await setActiveCompany(defaultCompany);
      } else {
        setActiveCompanyState(null);
      }
    }
  };

  const clearCompanyContext = () => {
    if (activeCompany) {
      logContextChange(activeCompany.id, 'logout');
    }
    setActiveCompanyState(null);
    setUserCompanies([]);
  };

  useEffect(() => {
    console.log('[CompanyContext] useEffect triggered, calling restoreSession');
    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[CompanyContext] Auth state changed:', event);
      if (event === 'SIGNED_IN') {
        // Prevent duplicate calls if already restoring
        if (isRestoring) {
          console.log('[CompanyContext] Already restoring, skipping duplicate restore');
          return;
        }
        restoreSession();
      } else if (event === 'SIGNED_OUT') {
        clearCompanyContext();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove dependencies to prevent infinite loop - only run once on mount

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        userCompanies,
        isLoading,
        setActiveCompany,
        switchCompany,
        refreshCompanies,
        clearCompanyContext,
        validateCompanyAccess,
        hasPermission,
        logSecurityEvent,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}