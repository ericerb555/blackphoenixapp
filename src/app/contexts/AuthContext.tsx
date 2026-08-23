import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import type { CompanyScope, CompanyContext } from '../lib/companyScope';

interface UserRole {
  role_id: string;
  role_name: string;
  display_name: string;
  level: number;
  permissions: Record<string, boolean>;
}

interface CompanyMembership {
  company_id: string;
  company_name: string;
  is_primary: boolean;
  role: string;
  can_switch: boolean;
}

interface CompanySessionContext {
  activeCompany: CompanyContext | null;
  availableCompanies: CompanyMembership[];
  canSwitchCompany: boolean;
  isCompanyOwner: boolean;
  isCompanyAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  needsOnboarding: boolean;
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    profile?: { fullName?: string; phone?: string; accountType?: string }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  companyContext: CompanySessionContext;
  switchCompany: (companyId: string) => Promise<{ success: boolean; error?: string }>;
  getActiveCompanyId: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_COMPANY_CONTEXT: CompanySessionContext = {
  activeCompany: null,
  availableCompanies: [],
  canSwitchCompany: false,
  isCompanyOwner: false,
  isCompanyAdmin: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [companyContext, setCompanyContext] = useState<CompanySessionContext>(DEFAULT_COMPANY_CONTEXT);

  const loadUserCompanies = async (userId: string): Promise<CompanyMembership[]> => {
    try {
      const { data: memberships, error } = await supabase
        .from('company_members')
        .select(`
          company_id,
          role,
          can_switch_company,
          companies:company_id (
            id,
            name,
            is_primary
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error || !memberships) {
        return [];
      }

      return memberships.map((m: Record<string, unknown>) => {
        const company = m.companies as Record<string, unknown> | null;
        return {
          company_id: m.company_id as string,
          company_name: company?.name as string || 'Unknown',
          is_primary: company?.is_primary as boolean || false,
          role: m.role as string || 'member',
          can_switch: m.can_switch_company as boolean || false,
        };
      });
    } catch (error) {
      console.error('Error loading user companies:', error);
      return [];
    }
  };

  const loadCompanyContext = async (userId: string, ownershipData: boolean) => {
    const memberships = await loadUserCompanies(userId);

    let activeCompanyId: string | null = null;
    let activeCompanyData: CompanyContext | null = null;
    let isCompanyOwner = false;
    let isCompanyAdmin = false;

    if (memberships.length > 0) {
      const primaryMembership = memberships.find(m => m.is_primary) || memberships[0];
      activeCompanyId = primaryMembership.company_id;

      activeCompanyData = {
        company_id: primaryMembership.company_id,
        company_name: primaryMembership.company_name,
        is_primary: primaryMembership.is_primary,
        role: primaryMembership.role,
      };

      isCompanyOwner = ownershipData || primaryMembership.role === 'owner';
      isCompanyAdmin = isCompanyOwner || primaryMembership.role === 'admin';
    }

    const canSwitch = ownershipData || memberships.some(m => m.can_switch) || memberships.length > 1;

    setCompanyContext({
      activeCompany: activeCompanyData,
      availableCompanies: memberships,
      canSwitchCompany: canSwitch,
      isCompanyOwner,
      isCompanyAdmin,
    });
  };

  const loadUserRole = async (userId: string) => {
    try {
      const [roleResult, ownerResult, profileResult] = await Promise.all([
        supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .order('level', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('company_members')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'owner')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select('onboarding_completed, first_login_at')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      const ownershipData = !!ownerResult.data;
      setUserRole(roleResult.data || null);
      setIsOwner(ownershipData);
      
      // Check if user needs onboarding
      const onboardingCompleted = profileResult.data?.onboarding_completed ?? false;
      setNeedsOnboarding(!onboardingCompleted);
      
      // Track first login if not set
      if (profileResult.data && !profileResult.data.first_login_at) {
        await supabase
          .from('user_profiles')
          .update({ first_login_at: new Date().toISOString() })
          .eq('user_id', userId);
      }
      
      await loadCompanyContext(userId, ownershipData);
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
      setIsOwner(false);
      setCompanyContext(DEFAULT_COMPANY_CONTEXT);
    }
  };

  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Get initial session with timeout to prevent lock issues
    const getSessionWithTimeout = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 3000)
        );

        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadUserRole(session.user.id).finally(() => {
            clearTimeout(emergencyTimeout);
            setLoading(false);
          });
        } else {
          clearTimeout(emergencyTimeout);
          setLoading(false);
        }
      } catch (error: any) {
        // Suppress lock-related errors - they're non-critical
        if (error?.message?.includes('Lock broken') || 
            error?.message?.includes('AbortError') || 
            error?.name === 'AbortError') {
          console.log('[AuthContext] Suppressed lock error during session check');
        } else if (error?.message === 'Session timeout') {
          console.log('[AuthContext] Session timeout - continuing without session');
        } else {
          console.error('Error getting session:', error);
        }
        clearTimeout(emergencyTimeout);
        setLoading(false);
      }
    };

    getSessionWithTimeout();

    // Set up auth state listener (only once)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // A password-setup invitation signs the user in. Record that first real
      // portal login server-side and complete the approved intake checklist.
      if (event === 'SIGNED_IN' && session?.access_token) {
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/auth/complete-onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        }).catch((error) => console.error('[Auth] Could not mark portal activation:', error));
      }

      // Always honor the real Supabase session. Demo role previews must never
      // suppress authentication, onboarding, invitation, or owner routing.
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []); // Run once on mount

  const isMasterAdmin = userRole?.role_name === 'master_admin' || isOwner;
  const isAdmin = userRole?.role_name === 'admin' || isMasterAdmin;

  const hasPermission = (permission: string): boolean => {
    if (isOwner) return true;
    if (!userRole) return false;
    if (userRole.permissions?.all) return true;
    return userRole.permissions?.[permission] === true;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    profile?: { fullName?: string; phone?: string; accountType?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        return { error };
      }

      // Immediately add the new user to the CRM and persist their profile
      // server-side. Best-effort: never block signup if this fails.
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/auth/register-crm`,
          {
            method: 'POST',
            headers: await authedHeadersOrAnon(publicAnonKey),
            body: JSON.stringify({
              email,
              fullName: profile?.fullName,
              phone: profile?.phone,
              accountType: profile?.accountType,
              userId: data?.user?.id,
            }),
          }
        );
        console.log('✅ [Auth] New signup synced to CRM:', email);
      } catch (crmError) {
        console.error('⚠️ [Auth] Failed to sync signup to CRM (non-blocking):', crmError);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Note: We keep user-specific referrals in localStorage so they persist
    // Each user ID has their own isolated referral data

    // Clear user profile and session data
    localStorage.removeItem('currentUserProfile');

    setCompanyContext(DEFAULT_COMPANY_CONTEXT);

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setIsOwner(false);
  };

  const logSecurityEvent = async (
    eventType: string,
    metadata: any = {},
    success: boolean = true
  ) => {
    try {
      // Note: security_audit_log table doesn't exist - logging to console instead
      console.log('🔒 Security Event:', {
        user_id: user?.id || null,
        event_type: eventType,
        company_id: companyContext.activeCompany?.company_id || null,
        metadata,
        success,
        timestamp: new Date().toISOString()
      });
      
      // Skip database insert - table doesn't exist
      // await supabase.from('security_audit_log').insert({...})
    } catch (error) {
      console.warn('Security event logging skipped:', error);
    }
  };

  const validateCompanyAccessSecure = async (targetCompanyId: string): Promise<{
    allowed: boolean;
    error_code?: string;
    error_message?: string;
  }> => {
    try {
      const { data, error } = await supabase.rpc('validate_company_access_secure', {
        p_target_company_id: targetCompanyId,
      });

      if (error) {
        return { allowed: false, error_code: 'RPC_ERROR', error_message: error.message };
      }

      if (data && data.length > 0) {
        return {
          allowed: data[0].allowed,
          error_code: data[0].error_code,
          error_message: data[0].error_message,
        };
      }

      return { allowed: false, error_code: 'NO_DATA', error_message: 'Validation failed' };
    } catch (error) {
      return {
        allowed: false,
        error_code: 'EXCEPTION',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const switchCompany = async (companyId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      await logSecurityEvent('company_switch_denied', { target_company_id: companyId, reason: 'not_authenticated' }, false);
      return { success: false, error: 'Not authenticated' };
    }

    if (!companyContext.canSwitchCompany && !isOwner) {
      await logSecurityEvent('company_switch_denied', {
        target_company_id: companyId,
        reason: 'switching_not_permitted',
      }, false);
      return { success: false, error: 'Company switching not permitted' };
    }

    const validation = await validateCompanyAccessSecure(companyId);
    if (!validation.allowed) {
      await logSecurityEvent('company_switch_denied', {
        target_company_id: companyId,
        error_code: validation.error_code,
        error: validation.error_message,
      }, false);
      return { success: false, error: validation.error_message || 'Access denied' };
    }

    const targetCompany = companyContext.availableCompanies.find(c => c.company_id === companyId);

    if (!targetCompany) {
      await logSecurityEvent('company_switch_denied', {
        target_company_id: companyId,
        reason: 'company_not_found',
      }, false);
      return { success: false, error: 'Company not found' };
    }

    const companyData: CompanyContext = {
      company_id: targetCompany.company_id,
      company_name: targetCompany.company_name,
      is_primary: targetCompany.is_primary,
      role: targetCompany.role,
    };

    const previousCompanyId = companyContext.activeCompany?.company_id;

    const isCompanyOwner = isOwner || (targetCompany.role === 'owner');
    const isCompanyAdmin = isCompanyOwner || (targetCompany.role === 'admin');

    setCompanyContext(prev => ({
      ...prev,
      activeCompany: companyData,
      isCompanyOwner,
      isCompanyAdmin,
    }));

    await logSecurityEvent('company_switch', {
      from_company_id: previousCompanyId,
      to_company_id: companyId,
      company_name: companyData.company_name,
    }, true);

    try {
      await supabase.rpc('log_company_context_switch', {
        p_user_id: user.id,
        p_from_company_id: previousCompanyId || null,
        p_to_company_id: companyId,
      });
    } catch (error) {
      console.error('Failed to log company context switch:', error);
    }

    return { success: true };
  };

  const getActiveCompanyId = (): string => {
    return companyContext.activeCompany?.company_id || '';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      isMasterAdmin,
      isAdmin,
      isOwner,
      needsOnboarding,
      hasPermission,
      signIn,
      signUp,
      signOut,
      companyContext,
      switchCompany,
      getActiveCompanyId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}