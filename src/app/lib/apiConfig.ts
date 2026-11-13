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
/**
 * Where the API lives. THE ONE LINE TO CHANGE.
 *
 * Until 2026-10-16 there was no such line. 504 call sites across 361 files
 * each rebuilt `https://${projectId}.supabase.co/functions/v1` for themselves,
 * six of them with the project ref typed out as a literal string — so moving
 * the API anywhere meant a 361-file edit, and the six literals would have
 * survived it silently and gone on calling the old host.
 *
 * That matters now because of the firewall. A WAF in front of this platform
 * only works if the browser stops talking to `*.supabase.co` and starts
 * talking to `api.theblackphoenixcompany.com` instead — see
 * docs/security/waf.md. With the origin in one place that migration is this
 * line; without it, it was the reason not to bother.
 *
 * To move the API: change SUPABASE_ORIGIN and nothing else.
 */
/**
 * THE API IS REACHED THROUGH THE FIREWALL, NOT AT THE ORIGIN.
 *
 * This is the line the whole centralisation exercise existed for — 504 call
 * sites import API_BASE_URL so that moving the API is one edit instead of a
 * 361-file sweep with six hand-typed literals surviving it.
 *
 * `api.theblackphoenixcompany.com` is a Cloudflare Worker
 * (cloudflare/origin-proxy.js) that forwards to the Supabase origin and
 * stamps the origin-lock header on the way. So traffic now passes through
 * Cloudflare's WAF, rate limiting and bot rules, none of which could see a
 * single request while the browser addressed <ref>.supabase.co directly.
 *
 * The origin stays reachable and always will — the project ref is compiled
 * into this bundle for anyone to read. What stops it mattering is the lock
 * on the server refusing requests that did not come through here, which is
 * the last step of docs/security/cloudflare-cutover.md and is currently
 * reporting rather than enforcing.
 *
 * TO ROLL BACK: put `https://${projectId}.supabase.co` back. Everything
 * keeps working, with no firewall in front of it.
 */
/**
 * BACK BEHIND THE FIREWALL, 2026-11-13 — and this time it answers.
 *
 * The note this replaces was a rollback: on 11 November the bundle was
 * pointed at `api.theblackphoenixcompany.com` on the strength of the plan
 * rather than the hostname. The cutover had not run — the nameservers were
 * still Vercel’s and `api.` was a stale A record answering 404 — so every
 * one of the call sites that import this hit a Vercel
 * DEPLOYMENT_NOT_FOUND. The board, the quotes, the invoices, all of it.
 *
 * That note set one condition for putting it back: the health check must
 * answer 200 through the hostname, and not before. It does now. Measured
 * before this edit, 2026-11-13:
 *
 *   nameservers        rosalie.ns / nick.ns.cloudflare.com
 *   api.               104.21.69.244, 172.67.216.16 — Cloudflare, proxied
 *   .../health         200, Server: cloudflare, CF-Ray present
 *   CORS preflight     204, with the allow-headers the app actually sends
 *   .../quotes         401 — the auth gate, not a routing failure
 *   .../exchange/assistant  200 — a real model-backed route, end to end
 *
 * So browser traffic now passes through Cloudflare’s WAF, rate limiting and
 * bot rules, none of which could see a single request while the app
 * addressed <ref>.supabase.co directly.
 *
 * WHAT THIS STILL DOES NOT DO. The origin stays reachable — the project ref
 * is compiled into this bundle for anyone to read — so a request sent
 * straight to `<ref>.supabase.co` bypasses the firewall entirely. Closing
 * that is the ORIGIN LOCK in index.tsx, which refuses anything arriving
 * without the header Cloudflare stamps on. It is configured and evaluating
 * and NOT yet enforcing, and it must not be enforced until somebody has
 * confirmed the header is actually arriving — see docs/security/waf.md.
 *
 * TO ROLL BACK: put `https://${projectId}.supabase.co` back. Everything
 * keeps working, with no firewall in front of it.
 */
export const SUPABASE_ORIGIN = 'https://api.theblackphoenixcompany.com';

/**
 * The functions root. Every caller appends the function slug itself —
 * `${API_BASE_URL}/make-server-3eae23a6/quotes` — so nothing may be added
 * here; see the long note above for what happens when something is.
 */
export const API_BASE_URL = `${SUPABASE_ORIGIN}/functions/v1`;

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
