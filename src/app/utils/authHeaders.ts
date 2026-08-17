/**
 * Request headers that say who is asking.
 *
 * Most of this app calls the server with the publishable anon key, which
 * identifies the project and nobody in particular. That was survivable while the
 * server checked nothing, but the money routes now need to tell an administrator
 * from a stranger, and they cannot do that if every caller presents the same
 * public key.
 *
 * So screens that touch money send the signed-in user's access token instead.
 * The pattern already existed in `UnifiedPaymentCenter` and `InvoicesNew`; this
 * is the same thing in one place, so the next change to it is one file rather
 * than nine.
 *
 * It throws rather than quietly falling back to the anon key. A silent fallback
 * would turn "you are not signed in" into a 401 from the server further down,
 * which reads like a bug in the page rather than a session that has expired.
 */
import { supabase } from '../lib/supabase';

/** Headers for a call that must be attributed to the signed-in user. */
export async function authedHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Your session has expired. Sign in again to continue.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra };
}

/**
 * The same thing for a screen that should still render when signed out.
 *
 * Returns the user's token when there is one and the anon key otherwise, so a
 * public page keeps working while a signed-in visitor is still identified to the
 * server. Use this only where anonymous access is genuinely intended — on a
 * money route it would defeat the point.
 */
export async function authedHeadersOrAnon(
  anonKey: string,
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra };
  } catch {
    // No session — fall through to the anon key.
  }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}`, ...extra };
}
