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

  /**
   * `loadUserCompanies` and `loadCompanyContext` used to sit here.
   *
   * Both were built on `company_members`, joined to `companies`. That table
   * does not exist in this project — verified against the database on
   * 2026-09-20 — so the query returned an error, the helper swallowed it and
   * answered with an empty list, and the context ended up exactly at
   * DEFAULT_COMPANY_CONTEXT every single time. One more round trip on every
   * sign-in whose only possible outcome was the value the state already held.
   *
   * Removed rather than left dormant: code that queries a table which is not
   * there is an invitation for somebody to "re-enable" it and wonder why
   * nothing loads. `companyContext` keeps its default, and `switchCompany`
   * still reads it and still refuses when there is nothing to switch to —
   * which is what it did before, only without the wait.
   *
   * The screens that genuinely show a company switcher do not use this at all;
   * they use `useCompany()`, which is a different context with its own source.
   */

  /**
   * Ask the server who this person is.
   *
   * This is now the ONLY source of authority on the client, and it always
   * should have been.
   *
   * It used to run alongside queries against `user_permissions`,
   * `company_members` and `user_profiles` — none of which exist in this
   * project. Those queries came back with nothing, so everybody resolved as
   * no-one, and every administrator-only control was hidden from everybody
   * including the platform owner. They have since been removed; this is what
   * answered the question even then.
   *
   * The server has always known better: it checks an owner allowlist and the
   * token's metadata before it goes near a table, and it is what actually
   * refuses or permits every write. Asking it is therefore the real answer
   * rather than a second opinion derived from a different set of facts.
   *
   * It only ever grants. A failure leaves the flags where they were, so a
   * server that cannot be reached cannot lock somebody out of a screen they
   * could otherwise use.
   */
  const askServerForAuthority = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s?.access_token) return;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/me/permissions`,
        { headers: { Authorization: `Bearer ${s.access_token}` } },
      );
      const json = await res.json().catch(() => null);
      if (!json?.signedIn) return;
      if (json.isPlatformOwner || json.isAdmin) setIsOwner(true);
      if (json.role) {
        setUserRole(prev => prev || ({ role_name: json.role } as UserRole));
      }
    } catch {
      // Leaves whatever the table queries produced. Withholding a control is
      // recoverable; wrongly granting one is not.
    }
  };

  /**
   * Who this person is, asked of the one thing that knows.
   *
   * WHAT USED TO BE HERE
   *
   * Three parallel queries against `user_permissions`, `company_members` and
   * `user_profiles`, plus a fourth inside `loadCompanyContext`. **None of those
   * tables exists in this project** — checked against the database on
   * 2026-09-20, where only `companies` of the four is present. So every sign-in
   * made four round trips that could only ever come back empty, and then a
   * fifth to `askServerForAuthority` for the answer that was actually used.
   *
   * The comment that used to sit here said as much and moved the server call
   * into a `finally` so it would run regardless. That fixed the correctness and
   * left the waste, and sign-in is the one moment where waiting is least
   * forgivable — it is what somebody sits through before they can do anything
   * at all.
   *
   * WHAT DEPENDED ON THEM: NOTHING
   *
   * Checked each before removing it. `isOwner` and `userRole` are set by
   * `askServerForAuthority`, which reads the server's own allowlist and token
   * metadata — the same check that actually refuses or permits every write, so
   * it is the right source rather than a second opinion derived from different
   * facts. `needsOnboarding` has no consumer anywhere outside this file. The
   * company context has none either: the screens that show a company switcher
   * use `useCompany()`, a different context entirely.
   *
   * `setNeedsOnboarding(false)` rather than leaving it: with the table missing
   * the old code read `onboarding_completed` as false and so set this to TRUE
   * for every user, forever. Nothing consumes it today, but a flag that is
   * wrong for everybody is not a thing to leave lying around for somebody to
   * start trusting.
   */
  const loadUserRole = async (_userId: string) => {
    setNeedsOnboarding(false);
    await askServerForAuthority();
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
      /**
       * Registration goes through our own server, not `supabase.auth.signUp`.
       *
       * WHY IT HAD TO MOVE
       *
       * `supabase.auth.signUp` asks Supabase Auth to send a confirmation email
       * over ITS OWN SMTP, which is a different thing from the `RESEND_API_KEY`
       * this application sends all its other mail with. That SMTP is not
       * configured, so signup returned
       * `500 unexpected_failure — "Error sending confirmation email"` and **no
       * account was created**. Public registration was completely broken, and
       * four of the eight real accounts on the project sit unconfirmed for the
       * same reason.
       *
       * `/auth/signup` creates the account server-side with the service role and
       * `email_confirm: true` — exactly what the invitation flow already does,
       * which is why invited users could always get in while self-registration
       * could not. No Auth SMTP is involved anywhere in the path.
       *
       * A trade-off worth naming: nothing proves the person owns the address
       * they typed. The account is a plain client with no privileges, and the
       * server refuses to grant anything more, so the exposure is somebody
       * registering under an address that is not theirs. Configuring custom SMTP
       * in the Auth settings would restore real verification; until then this is
       * a working signup rather than a broken one.
       */
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/auth/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email, password, full_name: profile?.fullName }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        return { error: new Error(payload?.error || 'Sign up failed. Please try again.') };
      }

      // Signed in straight away — the account is already confirmed, so there is
      // nothing to wait for and no email to chase.
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error };
      }

      /**
       * Sync the phone number and account type into the CRM — without waiting.
       *
       * The comment here used to say "never block signup if this fails", and
       * then the call was awaited, which blocked signup every time. It is the
       * second CRM pass of the flow: `/auth/signup` already writes the record,
       * and this one exists to add the details that route never received.
       *
       * Both passes scan every customer and every invoice, so awaiting this put
       * another unbounded scan between the person and their portal. Started and
       * left to finish on its own: nothing below depends on it, and a failure
       * cannot make the account any less real than it already is.
       */
      void (async () => {
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
      })();

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