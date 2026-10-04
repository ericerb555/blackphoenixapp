/**
 * The company's own contact details, from one place.
 *
 * Eric: *"we need to be able to change this number and it automatically
 * updates app wide when i save it."* This hook is the "app wide" half.
 *
 * WHY A HOOK AND NOT A CONSTANT
 *
 * These values were typed into components. The tenant portal showed
 * "Black Phoenix Emergency Line: (603) 555-0199" — a placeholder, presented to
 * tenants as the number to ring in an emergency — because there was nowhere
 * else for it to come from. A constant would move the problem rather than fix
 * it: the point is that changing the value in one place changes every screen,
 * which means reading it at runtime.
 *
 * WHAT IT NEVER DOES
 *
 * It never invents a fallback. A missing emergency number comes back null and
 * the screen says so. A plausible-looking default is exactly how a placeholder
 * came to sit in front of tenants for who knows how long, and a second one
 * would be the same mistake with a different number.
 *
 * `/public/branding` is deliberately the source: it needs no session, which
 * matters because somebody reading an emergency number may well not be signed
 * in, and it is already the endpoint the app uses for company identity.
 */
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export interface CompanyInfo {
  name: string | null;
  phone: string | null;
  /** The out-of-hours line. Null means not set — never a stand-in. */
  emergencyPhone: string | null;
  supportEmail: string | null;
  email: string | null;
  website: string | null;
  loading: boolean;
}

const EMPTY: CompanyInfo = {
  name: null, phone: null, emergencyPhone: null,
  supportEmail: null, email: null, website: null, loading: true,
};

/**
 * One fetch, shared.
 *
 * Several portals render more than one component that wants these details, and
 * without this every one of them would ask the server separately on mount.
 */
let cached: CompanyInfo | null = null;
let inFlight: Promise<CompanyInfo> | null = null;

async function load(): Promise<CompanyInfo> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/branding`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const body = await res.json().catch(() => ({}));
      const info: CompanyInfo = {
        name: body?.company_name ?? body?.businessName ?? null,
        phone: body?.phone ?? null,
        emergencyPhone: body?.emergency_phone ?? null,
        supportEmail: body?.support_email ?? null,
        email: body?.email ?? null,
        website: body?.website ?? null,
        loading: false,
      };
      cached = info;
      return info;
    } catch {
      // Unreachable is not the same as unset, but neither gives us a number to
      // show, and showing one we cannot stand behind is the thing to avoid.
      return { ...EMPTY, loading: false };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Drop the shared copy, so the next read comes from the server. */
export function refreshCompanyInfo(): void {
  cached = null;
}

export function useCompanyInfo(): CompanyInfo {
  const [info, setInfo] = useState<CompanyInfo>(cached ?? EMPTY);

  useEffect(() => {
    let live = true;
    void load().then((value) => { if (live) setInfo(value); });
    return () => { live = false; };
  }, []);

  return info;
}
