/**
 * Google Search Console — the first real numbers this app has had.
 *
 * Everything the SEO engine reports today comes from one place: a language
 * model asked to estimate. Keyword "volume" is a guess, "difficulty" is a
 * guess, and the AI-visibility figures for every assistant except ChatGPT are
 * the same model estimating itself. That is defensible for sorting ideas and
 * indefensible as a measure of whether any of it worked.
 *
 * Search Console is the opposite: it is what Google actually recorded.
 * Impressions, clicks, average position and the exact queries people typed to
 * arrive. Free, and specific to a verified property.
 *
 * THE MOST USEFUL THING HERE IS NOT THE DASHBOARD
 *
 * It is the query list. The searches already bringing people to the site are a
 * better keyword list than any generator produces, because they are things this
 * site can already half-rank for — a page sitting at position 12 for a real
 * query is a week's work from page one, where a keyword invented by a model may
 * have no traffic at all. Discovery becomes a way to extend a real list rather
 * than to invent one.
 *
 * WHAT IT NEEDS
 *
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  — a Google Cloud OAuth client
 *   The property verified in Search Console under the connecting account
 *   This redirect URI whitelisted on the OAuth client:
 *     {SUPABASE_URL}/functions/v1/social-oauth/google
 *
 * The redirect goes through `social-oauth` for the same reason the Facebook one
 * does: this function runs with verify_jwt on, and Google returns the user by
 * redirecting their browser, which carries no Supabase token.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const PREFIX = "/make-server-3eae23a6";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/social-oauth/google`;
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export const searchConsoleRouter = new Hono();

function service() {
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const tokenKey = (userId: string) => `search_console:${userId}`;
const stateKey = (state: string) => `search_console_state:${state}`;

/** Null when there is no valid session. Never a shared fallback identity. */
async function userId(c: any): Promise<string | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await service().auth.getUser(token);
  return error ? null : (data?.user?.id || null);
}

interface Stored {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: string;
  account?: string;
}

/**
 * A live access token, refreshing it when it has expired.
 *
 * Google's access tokens last an hour; the refresh token is the durable one and
 * only arrives on the first consent, which is why the authorisation asks for
 * offline access explicitly. Losing it means the connection silently stops
 * working in an hour and nobody knows why.
 */
async function accessTokenFor(uid: string): Promise<string | null> {
  const stored = (await kv.get(tokenKey(uid))) as Stored | null;
  if (!stored?.refreshToken) return null;
  if (stored.accessToken && stored.expiresAt > Date.now() + 60_000) return stored.accessToken;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: stored.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.log(`[search-console] refresh failed: ${JSON.stringify(data).slice(0, 200)}`);
    return null;
  }
  await kv.set(tokenKey(uid), {
    ...stored,
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  });
  return data.access_token;
}

// ── Is it connected, and is it even configured ───────────────────────────────
searchConsoleRouter.get(`${PREFIX}/search-console/status`, async (c) => {
  const uid = await userId(c);
  if (!uid) return c.json({ error: "Sign in required." }, 401);
  const stored = (await kv.get(tokenKey(uid))) as Stored | null;
  return c.json({
    configured: !!(CLIENT_ID && CLIENT_SECRET),
    connected: !!stored?.refreshToken,
    connectedAt: stored?.connectedAt || null,
    account: stored?.account || null,
  });
});

// ── Start the handshake ──────────────────────────────────────────────────────
searchConsoleRouter.post(`${PREFIX}/search-console/connect`, async (c) => {
  const uid = await userId(c);
  if (!uid) return c.json({ error: "Sign in required." }, 401);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return c.json({
      error: "Google is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as Supabase secrets.",
    }, 400);
  }

  // Random, stored, single-use — the state is both the CSRF defence and how the
  // callback knows whose connection this is, since the browser coming back from
  // Google carries no session of ours.
  const state = crypto.randomUUID();
  await kv.set(stateKey(state), { userId: uid, createdAt: new Date().toISOString() });

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code&scope=${encodeURIComponent(SCOPE)}` +
    `&state=${state}` +
    // Both are required to be given a refresh token: offline asks for one, and
    // consent forces the prompt again for an account that has already approved,
    // which is otherwise the classic way to end up without one.
    "&access_type=offline&prompt=consent";

  return c.json({ authUrl });
});

// ── Google returns here, forwarded by the public doorway ─────────────────────
searchConsoleRouter.get(`${PREFIX}/search-console/callback`, async (c) => {
  const html = (msg: string, ok: boolean) =>
    c.html(`<!doctype html><html><head><meta charset="utf-8"><title>${ok ? "Connected" : "Failed"}</title></head>
<body style="font-family:system-ui;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center;max-width:26rem;padding:1.5rem">
<h1 style="color:${ok ? "#16a34a" : "#ea580c"};font-size:1.1rem">${ok ? "Search Console connected" : "Could not connect"}</h1>
<p style="color:#9ca3af;font-size:.9rem">${msg}</p>
<p style="color:#6b7280;font-size:.8rem">You can close this window.</p>
<script>try{window.opener&&window.opener.postMessage({source:'search-console',ok:${ok}},'*')}catch(e){}</script>
</div></body></html>`);

  const error = c.req.query("error");
  if (error) return html(`Google reported: ${error}`, false);

  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) return html("The response from Google was incomplete.", false);

  const record = (await kv.get(stateKey(state))) as any;
  if (!record?.userId) return html("This authorisation link has expired. Please try again.", false);
  await kv.del(stateKey(state));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.log(`[search-console] token exchange failed: ${JSON.stringify(data).slice(0, 200)}`);
    return html("Google would not issue a token. Check the redirect URI on the OAuth client.", false);
  }
  if (!data.refresh_token) {
    // Without this the connection dies in an hour, so say so now rather than
    // letting it look connected and quietly stop.
    return html("Google did not return a refresh token. Remove this app from your Google account's third-party access and try again.", false);
  }

  await kv.set(tokenKey(record.userId), {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    connectedAt: new Date().toISOString(),
  } satisfies Stored);

  return html("You can close this window and return to the app.", true);
});

// ── The verified properties on the account ───────────────────────────────────
searchConsoleRouter.get(`${PREFIX}/search-console/sites`, async (c) => {
  const uid = await userId(c);
  if (!uid) return c.json({ error: "Sign in required." }, 401);
  const token = await accessTokenFor(uid);
  if (!token) return c.json({ error: "Not connected." }, 400);

  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return c.json({ error: data?.error?.message || "Could not list sites." }, 502);

  return c.json({
    sites: (data.siteEntry || []).map((s: any) => ({
      url: s.siteUrl,
      permission: s.permissionLevel,
    })),
  });
});

// ── What people actually searched ────────────────────────────────────────────
searchConsoleRouter.get(`${PREFIX}/search-console/performance`, async (c) => {
  const uid = await userId(c);
  if (!uid) return c.json({ error: "Sign in required." }, 401);
  const token = await accessTokenFor(uid);
  if (!token) return c.json({ error: "Not connected." }, 400);

  const site = String(c.req.query("site") || "").trim();
  if (!site) return c.json({ error: "A site is required." }, 400);

  const days = Math.min(Math.max(Number(c.req.query("days")) || 28, 1), 180);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const query = async (dimensions: string[], rowLimit: number) => {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: iso(start), endDate: iso(end), dimensions, rowLimit }),
      },
    );
    const data = await res.json().catch(() => ({}));
    return res.ok ? (data.rows || []) : [];
  };

  const [totals, queries, pages] = await Promise.all([
    query([], 1),
    query(["query"], 50),
    query(["page"], 25),
  ]);

  const shape = (rows: any[], key: string) =>
    rows.map((r: any) => ({
      [key]: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(1)),
      position: Number((r.position || 0).toFixed(1)),
    }));

  const t = totals[0] || {};
  return c.json({
    range: { start: iso(start), end: iso(end), days },
    totals: {
      clicks: t.clicks || 0,
      impressions: t.impressions || 0,
      ctr: Number(((t.ctr || 0) * 100).toFixed(1)),
      position: Number((t.position || 0).toFixed(1)),
    },
    queries: shape(queries, "query"),
    pages: shape(pages, "page"),
  });
});

searchConsoleRouter.delete(`${PREFIX}/search-console/disconnect`, async (c) => {
  const uid = await userId(c);
  if (!uid) return c.json({ error: "Sign in required." }, 401);
  await kv.del(tokenKey(uid));
  return c.json({ success: true });
});

export default searchConsoleRouter;
