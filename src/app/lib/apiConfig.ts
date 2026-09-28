import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Centralized API configuration.
 *
 * WHAT THIS IS THE BASE OF, EXACTLY
 *
 * The functions root, and nothing more. Every caller appends the function slug
 * itself — `${API_BASE_URL}/make-server-3eae23a6/quotes` — so anything extra
 * here is inserted between the root and the slug, where it becomes a function
 * name that does not exist.
 *
 * WHY THIS IS WORTH A COMMENT THIS LONG
 *
 * It read `/functions/v1/server` from 6 July until 28 September, under a
 * comment asserting the edge function was named "server". It is not: `server`
 * is the DIRECTORY the source lives in, and the deployed slug is
 * `make-server-3eae23a6` — see `supabase/config.toml`, which maps one to the
 * other precisely because they differ.
 *
 * So every call resolved to `/functions/v1/server/make-server-3eae23a6/...`
 * and hit nothing. Work requests, quotes, invoices, contracts, contract
 * signing, payment completion and media upload — the whole of what a customer
 * does — failed for nearly three months.
 *
 * It survived that long because each caller catches the failure and logs a
 * warning, so the portal renders perfectly and simply shows zero. A customer
 * with three invoices sees none and is told nothing. Nothing about the screen
 * suggests a fault, which is why this was found by loading the portal rather
 * than by reading the code.
 */
export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1`;

export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`
  }
};

export function getAuthHeaders(accessToken?: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || publicAnonKey}`
  };
}
