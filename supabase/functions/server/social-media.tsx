/**
 * Social Media Module — real account connection + publishing.
 *
 * Implements the contract the frontend (SocialMediaHub.tsx) already calls:
 *   GET    /social/accounts                 → { accounts: { platform: {...} } }  (tokens stripped)
 *   POST   /social/connect/:platform        → { authUrl } (OAuth) or { connected }
 *   GET    /social/callback/:platform       → OAuth redirect target (returns HTML that postMessages the opener)
 *   DELETE /social/disconnect/:platform     → { success }
 *   GET    /social/fetch/:platform          → { posts: [...] }
 *   POST   /social/import-to-library        → { success }  (best-effort mirror into KV)
 *   POST   /social/ai-repurpose             → { caption } (OpenAI)
 *   POST   /social/publish                  → { success, results: [...] }
 *
 * Facebook is fully real via the Graph API. Instagram publishes/fetches through
 * the Instagram Business account linked to the connected Facebook Page.
 * TikTok returns a clear "requires app setup" response until its app is configured.
 *
 * SECRETS USED: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, OPENAI_API_KEY.
 * The Facebook app MUST whitelist this redirect URI:
 *   {SUPABASE_URL}/functions/v1/make-server-3eae23a6/social/callback/facebook
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { PLATFORMS, isPlatform, refusalFor, fitToPlatform } from "./socialPlatforms.ts";

const PREFIX = "/make-server-3eae23a6";
const GRAPH = "https://graph.facebook.com/v18.0";

const socialRouter = new Hono();

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FB_APP_ID = Deno.env.get("FACEBOOK_APP_ID") || "";
const FB_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY") || "";
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET") || "";
const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID") || "";
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET") || "";
const THREADS_APP_ID = Deno.env.get("THREADS_APP_ID") || "";
const THREADS_APP_SECRET = Deno.env.get("THREADS_APP_SECRET") || "";
const PINTEREST_APP_ID = Deno.env.get("PINTEREST_APP_ID") || "";
const PINTEREST_APP_SECRET = Deno.env.get("PINTEREST_APP_SECRET") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

/**
 * Where Facebook sends the user back.
 *
 * Not this function. It runs with `verify_jwt: true`, and Facebook returns the
 * user by redirecting their browser — no Supabase token — so the platform
 * answered the callback with a 401 and the handler never ran. That is why two
 * OAuth attempts sat abandoned in the store with no account behind them.
 *
 * `social-oauth` is a separate function deployed with `verify_jwt = false`
 * whose only job is to forward that redirect back here with the publishable
 * key attached. The state check and token exchange still happen in this file.
 *
 * THIS EXACT URI MUST BE WHITELISTED in the Facebook app's OAuth settings, and
 * changing it here without changing it there breaks the connection silently —
 * Facebook simply refuses to redirect.
 */
const fbRedirectUri = (platform: string) =>
  `${SUPABASE_URL}/functions/v1/social-oauth/${platform}`;

// ── Types & storage ─────────────────────────────────────────────────────────
interface SocialAccount {
  platform: string;
  connected: boolean;
  name?: string;
  handle?: string;
  avatar?: string;
  followers?: number;
  connectedAt?: string;
  // Server-only fields (never returned to the client):
  pageId?: string;
  pageAccessToken?: string;
  igUserId?: string;
  userAccessToken?: string;
  /** Bluesky: the repo DID, which is the account's real identifier. */
  did?: string;
  /** Mastodon: the server the account lives on — part of the identity there. */
  instance?: string;
  /** LinkedIn: the member URN posts are authored by. */
  authorUrn?: string;
  /** Threads: the Threads user id, which is not the Instagram one. */
  threadsUserId?: string;
  /** Pinterest: the board a pin goes to. There is no default. */
  boardId?: string;
  /** Google Business: `accounts/x/locations/y`, the premises being posted for. */
  locationName?: string;
  /**
   * Google refresh token. Google's access tokens last an hour, which is
   * shorter than the gap between two scheduled posts, so unlike every other
   * platform here the token has to be renewed rather than simply stored.
   */
  refreshToken?: string;
  /** When the stored access token stops working. Google only, for now. */
  expiresAt?: string;
}

const accountsKey = (userId: string) => `social_accounts:${userId}`;
const stateKey = (state: string) => `social_oauth_state:${state}`;

async function getAccounts(userId: string): Promise<Record<string, SocialAccount>> {
  try {
    const raw = await kv.get(accountsKey(userId));
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

async function saveAccounts(userId: string, accounts: Record<string, SocialAccount>): Promise<void> {
  await kv.set(accountsKey(userId), JSON.stringify(accounts));
}

/** Strip server-only secrets before returning accounts to the browser. */
function publicAccounts(accounts: Record<string, SocialAccount>): Record<string, Partial<SocialAccount>> {
  const out: Record<string, Partial<SocialAccount>> = {};
  for (const [platform, a] of Object.entries(accounts)) {
    out[platform] = {
      platform: a.platform,
      connected: a.connected,
      name: a.name,
      handle: a.handle,
      avatar: a.avatar,
      followers: a.followers,
      connectedAt: a.connectedAt,
    };
  }
  return out;
}

/**
 * Who owns the social accounts in this request, or null when nobody does.
 *
 * This used to answer `"default"` whenever a session was missing or invalid,
 * which quietly turned "not signed in" into a real, shared identity. Everything
 * here is keyed by that value — `social_accounts:{userId}` — so the fallback
 * created one common namespace that any caller holding only the publishable key
 * could read, publish from, and disconnect. Connected pages carry the right to
 * post as a business; that is not something to hand out to whoever asks.
 *
 * Returning null instead makes every route say so explicitly. The OAuth
 * callback is the one place with no session by nature — a browser arriving back
 * from Facebook carries no JWT — and it does not use this: it recovers the user
 * from the signed state it issued at the start of the handshake, which is both
 * the CSRF check and the identity.
 */
async function getUserId(c: any): Promise<string | null> {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return null;
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

// ── Accounts ──────────────────────────────────────────────────────────────
socialRouter.get(`${PREFIX}/social/accounts`, async (c) => {
  try {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Sign in required." }, 401);
    const accounts = await getAccounts(userId);
    return c.json({ accounts: publicAccounts(accounts) });
  } catch (error) {
    console.error("[Social] accounts error:", error);
    return c.json({ accounts: {}, error: `Failed to load accounts: ${error}` }, 500);
  }
});

socialRouter.delete(`${PREFIX}/social/disconnect/:platform`, async (c) => {
  try {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Sign in required." }, 401);
    const platform = c.req.param("platform");
    const accounts = await getAccounts(userId);
    delete accounts[platform];
    // Instagram lives on the Facebook Page connection — clear it too.
    if (platform === "facebook") delete accounts["instagram"];
    await saveAccounts(userId, accounts);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Social] disconnect error:", error);
    return c.json({ success: false, error: `Failed to disconnect: ${error}` }, 500);
  }
});

// ── Connect (start OAuth) ─────────────────────────────────────────────────
socialRouter.post(`${PREFIX}/social/connect/:platform`, async (c) => {
  try {
    const platform = c.req.param("platform");
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Sign in required." }, 401);

    if (platform === "facebook" || platform === "instagram") {
      if (!FB_APP_ID || !FB_APP_SECRET) {
        return c.json({
          error: "Facebook is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET secrets.",
        }, 400);
      }
      // Instagram publishing runs through the Facebook Page, so both use the
      // Facebook login with the extra IG + Pages scopes.
      const state = crypto.randomUUID();
      await kv.set(stateKey(state), JSON.stringify({ userId, platform }));
      const scopes = [
        "public_profile",
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
      ].join(",");
      const authUrl =
        `https://www.facebook.com/v18.0/dialog/oauth` +
        `?client_id=${FB_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri("facebook"))}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${state}` +
        `&response_type=code`;
      return c.json({ authUrl });
    }

    if (platform === "tiktok") {
      if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
        return c.json({
          error: "TikTok is not configured. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET secrets.",
        }, 400);
      }
      const state = crypto.randomUUID();
      await kv.set(stateKey(state), JSON.stringify({ userId, platform }));
      /**
       * `video.publish` is the scope that posts. `video.upload` only puts a
       * draft in the creator's inbox for them to finish by hand, which is not
       * what a scheduler is for — and the two are granted separately, so
       * asking for the wrong one produces an integration that looks connected
       * and cannot post.
       */
      const scopes = ["user.info.basic", "video.publish"].join(",");
      const authUrl =
        `https://www.tiktok.com/v2/auth/authorize/` +
        `?client_key=${encodeURIComponent(TIKTOK_CLIENT_KEY)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri("tiktok"))}` +
        `&state=${state}`;
      return c.json({ authUrl });
    }

    /**
     * Bluesky connects without OAuth at all — the account holder generates an
     * app password in their own settings and pastes it in. There is nothing to
     * redirect to, so this returns `connected` rather than an `authUrl`.
     *
     * The password is verified before it is stored, so a typo is caught here
     * rather than at the first attempt to post.
     */
    if (platform === "bluesky") {
      const body = await c.req.json().catch(() => ({}));
      const handle = String(body?.handle || "").trim().replace(/^@/, "");
      const appPassword = String(body?.appPassword || "").trim();
      if (!handle || !appPassword) {
        return c.json({ error: "A Bluesky handle and an app password are both needed." }, 400);
      }

      const authRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: handle, password: appPassword }),
      });
      const auth = await authRes.json().catch(() => ({}));
      if (!authRes.ok || !auth?.accessJwt) {
        return c.json({
          error: auth?.message || "Bluesky did not accept that handle and app password.",
        }, 400);
      }

      const accounts = await getAccounts(userId);
      accounts["bluesky"] = {
        platform: "bluesky",
        connected: true,
        name: auth.handle || handle,
        handle: auth.handle || handle,
        connectedAt: new Date().toISOString(),
        did: auth.did,
        // An app password, not a token: stored in the same server-only field
        // and never returned to the browser by `publicAccounts`.
        userAccessToken: appPassword,
      };
      await saveAccounts(userId, accounts);
      return c.json({ connected: true, handle: auth.handle || handle });
    }

    /**
     * Mastodon has no central OAuth: each server is its own authority, so an
     * app has to be registered against the instance first and the person is
     * then sent to their own server to approve it.
     */
    if (platform === "mastodon") {
      const body = await c.req.json().catch(() => ({}));
      const raw = String(body?.instance || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      if (!raw || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw)) {
        return c.json({ error: "Enter your Mastodon server, for example mastodon.social." }, 400);
      }
      const instance = `https://${raw}`;

      const appRes = await fetch(`${instance}/api/v1/apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: "Black Phoenix",
          redirect_uris: fbRedirectUri("mastodon"),
          scopes: "write:statuses",
          website: "https://www.theblackphoenixcompany.com",
        }),
      });
      const app = await appRes.json().catch(() => ({}));
      if (!appRes.ok || !app?.client_id) {
        return c.json({ error: app?.error || `Could not register with ${raw}.` }, 400);
      }

      const state = crypto.randomUUID();
      // The instance and its client secret travel in the state, because the
      // callback has no other way to know which server it is finishing with.
      await kv.set(stateKey(state), JSON.stringify({
        userId, platform, instance,
        clientId: app.client_id, clientSecret: app.client_secret,
      }));

      const authUrl =
        `${instance}/oauth/authorize` +
        `?client_id=${encodeURIComponent(app.client_id)}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri("mastodon"))}` +
        `&response_type=code&scope=write:statuses&state=${state}`;
      return c.json({ authUrl });
    }

    if (platform === "linkedin") {
      if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
        return c.json({
          error: "LinkedIn is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET secrets.",
        }, 400);
      }
      const state = crypto.randomUUID();
      await kv.set(stateKey(state), JSON.stringify({ userId, platform }));
      /*
        `w_member_social` is self-serve; the company scopes need LinkedIn's
        Community Management approval.

        The company scope is requested ONLY for the company connection.
        Adding it to the personal one would make LinkedIn refuse the whole
        authorisation for any app it has not approved — breaking posting that
        works today to offer posting that does not yet.
      */
      const scopes = platform === "linkedin_company"
        ? ["openid", "profile", "w_organization_social", "rw_organization_admin"].join(" ")
        : ["openid", "profile", "w_member_social"].join(" ");
      const authUrl =
        `https://www.linkedin.com/oauth/v2/authorization` +
        `?response_type=code&client_id=${encodeURIComponent(LINKEDIN_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri(platform))}` +
        `&scope=${encodeURIComponent(scopes)}&state=${state}`;
      return c.json({ authUrl });
    }

    /**
     * Threads runs on Meta's infrastructure but has its own login host and its
     * own scopes — it is not reached through the Facebook app's dialog, and a
     * Threads user id is not an Instagram one.
     */
    if (platform === "threads") {
      if (!THREADS_APP_ID || !THREADS_APP_SECRET) {
        return c.json({
          error: "Threads is not configured. Add THREADS_APP_ID and THREADS_APP_SECRET secrets.",
        }, 400);
      }
      const state = crypto.randomUUID();
      await kv.set(stateKey(state), JSON.stringify({ userId, platform }));
      const scopes = ["threads_basic", "threads_content_publish"].join(",");
      const authUrl =
        `https://threads.net/oauth/authorize` +
        `?client_id=${encodeURIComponent(THREADS_APP_ID)}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri("threads"))}` +
        `&scope=${encodeURIComponent(scopes)}&response_type=code&state=${state}`;
      return c.json({ authUrl });
    }

    if (platform === "pinterest") {
      if (!PINTEREST_APP_ID || !PINTEREST_APP_SECRET) {
        return c.json({
          error: "Pinterest is not configured. Add PINTEREST_APP_ID and PINTEREST_APP_SECRET secrets.",
        }, 400);
      }
      const state = crypto.randomUUID();
      await kv.set(stateKey(state), JSON.stringify({ userId, platform }));
      // `boards:read` is needed as well as the write scopes: a pin has to go
      // to a board, and the board list is how one gets chosen.
      const scopes = ["boards:read", "pins:read", "pins:write"].join(",");
      const authUrl =
        `https://www.pinterest.com/oauth/` +
        `?client_id=${encodeURIComponent(PINTEREST_APP_ID)}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri("pinterest"))}` +
        `&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;
      return c.json({ authUrl });
    }

    /**
     * YouTube and Google Business Profile share Google's OAuth but ask for
     * different scopes, so the platform decides which.
     *
     * `access_type=offline` and `prompt=consent` are both required: without
     * them Google returns no refresh token, and an access token that expires
     * in an hour is useless to anything scheduled.
     */
    if (platform === "youtube" || platform === "google_business") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return c.json({
          error: "Google is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets.",
        }, 400);
      }
      const state = crypto.randomUUID();
      await kv.set(stateKey(state), JSON.stringify({ userId, platform }));
      const scopes = platform === "youtube"
        ? ["https://www.googleapis.com/auth/youtube.upload"]
        : ["https://www.googleapis.com/auth/business.manage"];
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri(platform))}` +
        `&response_type=code&access_type=offline&prompt=consent` +
        `&scope=${encodeURIComponent(scopes.join(" "))}&state=${state}`;
      return c.json({ authUrl });
    }

    return c.json({ error: `Unsupported platform: ${platform}` }, 400);
  } catch (error) {
    console.error("[Social] connect error:", error);
    return c.json({ error: `Failed to start connection: ${error}` }, 500);
  }
});

// ── OAuth callback ────────────────────────────────────────────────────────
function callbackHtml(platform: string, ok: boolean, message: string): string {
  // Notify the opener window (SocialMediaHub listens for this) and close.
  return `<!doctype html><html><head><meta charset="utf-8"><title>${ok ? "Connected" : "Connection failed"}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}
.card{max-width:340px;padding:24px}</style></head>
<body><div class="card">
<h2>${ok ? "✅ Connected!" : "⚠️ Connection failed"}</h2>
<p>${message}</p>
<p style="color:#888;font-size:13px">${ok ? "You can close this window." : ""}</p>
</div>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ type: ${ok ? "'social_connected'" : "'social_error'"}, platform: ${JSON.stringify(platform)}, message: ${JSON.stringify(message)} }, "*");
    }
  } catch (e) {}
  setTimeout(function(){ try { window.close(); } catch(e){} }, ${ok ? 1200 : 4000});
</script>
</body></html>`;
}

socialRouter.get(`${PREFIX}/social/callback/:platform`, async (c) => {
  const platformParam = c.req.param("platform");
  try {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const errorReason = c.req.query("error_description") || c.req.query("error");

    if (errorReason) {
      return c.html(callbackHtml(platformParam, false, `Authorization was denied: ${errorReason}`));
    }
    if (!code || !state) {
      return c.html(callbackHtml(platformParam, false, "Missing authorization code."));
    }

    const stateRaw = await kv.get(stateKey(state));
    if (!stateRaw) {
      return c.html(callbackHtml(platformParam, false, "This authorization link has expired. Please try again."));
    }
    const { userId, platform } = typeof stateRaw === "string" ? JSON.parse(stateRaw) : stateRaw;
    await kv.del(stateKey(state));

    /**
     * TikTok's handshake is its own, so it forks here rather than being bent
     * into Facebook's. It exchanges at a different host, returns the token in
     * a JSON body rather than a query string, and has no equivalent of the
     * Page listing below — the token IS the account.
     */
    /**
     * Each of these finishes against a different host with a different token
     * shape, so they fork before the Facebook exchange rather than being bent
     * into it. `stateRaw` carried whatever the connect step needed to know —
     * for Mastodon that includes the instance and its client secret, because
     * nothing else here knows which server the handshake began with.
     */
    if (platform === "mastodon") {
      const saved = typeof stateRaw === "string" ? JSON.parse(stateRaw) : stateRaw;
      const { instance, clientId, clientSecret } = saved || {};
      if (!instance || !clientId) {
        return c.html(callbackHtml(platform, false, "That Mastodon connection expired. Start again."));
      }

      const tokRes = await fetch(`${instance}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: fbRedirectUri("mastodon"),
          grant_type: "authorization_code",
          code,
          scope: "write:statuses",
        }),
      });
      const tok = await tokRes.json().catch(() => ({}));
      if (!tokRes.ok || !tok?.access_token) {
        return c.html(callbackHtml(platform, false, tok?.error_description || "Mastodon token exchange failed."));
      }

      let handle = instance.replace(/^https?:\/\//, "");
      let avatar: string | undefined;
      try {
        const meRes = await fetch(`${instance}/api/v1/accounts/verify_credentials`, {
          headers: { Authorization: `Bearer ${tok.access_token}` },
        });
        const me = await meRes.json();
        if (me?.acct) handle = `@${me.acct}@${instance.replace(/^https?:\/\//, "")}`;
        avatar = me?.avatar;
      } catch { /* a name is cosmetic; the token is what matters */ }

      const accounts = await getAccounts(userId);
      accounts["mastodon"] = {
        platform: "mastodon", connected: true, name: handle, handle, avatar,
        connectedAt: new Date().toISOString(),
        userAccessToken: tok.access_token,
        instance,
      };
      await saveAccounts(userId, accounts);
      return c.html(callbackHtml(platform, true, `Connected to ${instance.replace(/^https?:\/\//, "")}.`));
    }

    if (platform === "linkedin" || platform === "linkedin_company") {
      const tokRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: fbRedirectUri(platform),
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }).toString(),
      });
      const tok = await tokRes.json().catch(() => ({}));
      if (!tokRes.ok || !tok?.access_token) {
        return c.html(callbackHtml(platform, false, tok?.error_description || "LinkedIn token exchange failed."));
      }

      const accounts = await getAccounts(userId);

      /**
       * A company connection is authored by an organization, so the page the
       * person administers is looked up instead of their identity. This call
       * is also where an unapproved app finds out: without Community
       * Management access LinkedIn refuses it, and that refusal is reported
       * as the approval it is rather than as a broken connection.
       */
      if (platform === "linkedin_company") {
        const orgRes = await fetch(
          "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName)))",
          { headers: { Authorization: `Bearer ${tok.access_token}`, "X-Restli-Protocol-Version": "2.0.0" } },
        );
        const orgs = await orgRes.json().catch(() => ({}));
        if (!orgRes.ok) {
          return c.html(callbackHtml(platform, false,
            `${orgs?.message || "LinkedIn would not list your Pages."} `
            + "This is normally the Community Management approval: until LinkedIn grants it, "
            + "company posting cannot work. Personal posting is unaffected."));
        }
        const first = orgs?.elements?.[0];
        const orgUrn = first?.organization;
        if (!orgUrn) {
          return c.html(callbackHtml(platform, false,
            "No LinkedIn Page is administered by this account, so there is nothing to post to."));
        }
        const pageName = first?.["organization~"]?.localizedName || "LinkedIn Page";

        accounts["linkedin_company"] = {
          platform: "linkedin_company", connected: true,
          name: pageName, handle: pageName,
          connectedAt: new Date().toISOString(),
          userAccessToken: tok.access_token,
          authorUrn: orgUrn,
        };
        await saveAccounts(userId, accounts);
        return c.html(callbackHtml(platform, true, `Connected to ${pageName}.`));
      }

      // The member urn is what a post is authored by, so it is required
      // rather than cosmetic — without it there is nothing to post as.
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const me = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !me?.sub) {
        return c.html(callbackHtml(platform, false, "LinkedIn would not say who you are; the connection was not saved."));
      }

      accounts["linkedin"] = {
        platform: "linkedin", connected: true,
        name: me.name || "LinkedIn", handle: me.name || "LinkedIn", avatar: me.picture,
        connectedAt: new Date().toISOString(),
        userAccessToken: tok.access_token,
        authorUrn: `urn:li:person:${me.sub}`,
      };
      await saveAccounts(userId, accounts);
      return c.html(callbackHtml(platform, true, PLATFORMS.linkedin.caveat));
    }

    if (platform === "threads") {
      const tokRes = await fetch("https://graph.threads.net/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: THREADS_APP_ID,
          client_secret: THREADS_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: fbRedirectUri("threads"),
          code,
        }).toString(),
      });
      const tok = await tokRes.json().catch(() => ({}));
      if (!tokRes.ok || !tok?.access_token) {
        return c.html(callbackHtml(platform, false, tok?.error_message || "Threads token exchange failed."));
      }

      let name = "Threads";
      let avatar: string | undefined;
      const threadsUserId = String(tok.user_id || "");
      try {
        const meRes = await fetch(
          `https://graph.threads.net/v1.0/me?fields=username,threads_profile_picture_url&access_token=${encodeURIComponent(tok.access_token)}`,
        );
        const me = await meRes.json();
        name = me?.username ? `@${me.username}` : name;
        avatar = me?.threads_profile_picture_url;
      } catch { /* cosmetic */ }

      if (!threadsUserId) {
        return c.html(callbackHtml(platform, false, "Threads did not return a user id; the connection was not saved."));
      }

      const accounts = await getAccounts(userId);
      accounts["threads"] = {
        platform: "threads", connected: true, name, handle: name, avatar,
        connectedAt: new Date().toISOString(),
        userAccessToken: tok.access_token,
        threadsUserId,
      };
      await saveAccounts(userId, accounts);
      return c.html(callbackHtml(platform, true, "Connected."));
    }

    if (platform === "pinterest") {
      const tokRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: fbRedirectUri("pinterest"),
        }).toString(),
      });
      const tok = await tokRes.json().catch(() => ({}));
      if (!tokRes.ok || !tok?.access_token) {
        return c.html(callbackHtml(platform, false, tok?.message || "Pinterest token exchange failed."));
      }

      /**
       * A board is picked now rather than at post time, because a pin has
       * nowhere to go without one. The first board is taken as a sensible
       * default and can be changed later; no board at all is reported as
       * something to fix rather than saved as a connection that cannot post.
       */
      let boardId: string | undefined;
      let boardName = "";
      try {
        const boardsRes = await fetch("https://api.pinterest.com/v5/boards?page_size=1", {
          headers: { Authorization: `Bearer ${tok.access_token}` },
        });
        const boards = await boardsRes.json();
        boardId = boards?.items?.[0]?.id;
        boardName = boards?.items?.[0]?.name || "";
      } catch { /* reported below */ }

      if (!boardId) {
        return c.html(callbackHtml(platform, false,
          "Connected, but this Pinterest account has no boards. Create one, then connect again."));
      }

      const accounts = await getAccounts(userId);
      accounts["pinterest"] = {
        platform: "pinterest", connected: true,
        name: boardName ? `Pinterest · ${boardName}` : "Pinterest",
        handle: boardName, connectedAt: new Date().toISOString(),
        userAccessToken: tok.access_token, boardId,
      };
      await saveAccounts(userId, accounts);
      return c.html(callbackHtml(platform, true, PLATFORMS.pinterest.caveat));
    }

    if (platform === "youtube" || platform === "google_business") {
      const tokRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: fbRedirectUri(platform),
        }).toString(),
      });
      const tok = await tokRes.json().catch(() => ({}));
      if (!tokRes.ok || !tok?.access_token) {
        return c.html(callbackHtml(platform, false, tok?.error_description || "Google token exchange failed."));
      }
      if (!tok.refresh_token) {
        // Without it nothing scheduled can ever post, so this is refused
        // rather than saved as a connection that works once and then stops.
        return c.html(callbackHtml(platform, false,
          "Google did not return a refresh token, so scheduled posts could not work. "
          + "Remove this app at myaccount.google.com/permissions and connect again."));
      }

      const accounts = await getAccounts(userId);
      const record: SocialAccount = {
        platform, connected: true,
        name: PLATFORMS[platform as keyof typeof PLATFORMS]?.label || platform,
        handle: "", connectedAt: new Date().toISOString(),
        userAccessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: new Date(Date.now() + (Number(tok.expires_in) || 3600) * 1000).toISOString(),
      };

      /**
       * A Business Profile post belongs to a location, so one is chosen now.
       * This is also where Google's zero-quota gate shows itself: the account
       * listing refuses until the access request is approved, which is worth
       * saying plainly rather than leaving to the first failed post.
       */
      if (platform === "google_business") {
        try {
          const accRes = await fetch(
            "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
            { headers: { Authorization: `Bearer ${tok.access_token}` } },
          );
          const accData = await accRes.json().catch(() => ({}));
          if (!accRes.ok) {
            return c.html(callbackHtml(platform, false,
              `${accData?.error?.message || "Google refused to list your business accounts."} `
              + "This is usually the zero-quota gate: the Business Profile API request has not been approved yet."));
          }
          const accountName = accData?.accounts?.[0]?.name;
          if (accountName) {
            const locRes = await fetch(
              `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title&pageSize=1`,
              { headers: { Authorization: `Bearer ${tok.access_token}` } },
            );
            const locData = await locRes.json().catch(() => ({}));
            const loc = locData?.locations?.[0];
            if (loc?.name) {
              record.locationName = `${accountName}/${loc.name}`;
              record.handle = loc.title || "";
              record.name = loc.title ? `Google · ${loc.title}` : record.name;
            }
          }
        } catch { /* the refusal above is the one that matters */ }

        if (!record.locationName) {
          return c.html(callbackHtml(platform, false,
            "Connected to Google, but no business location came back — so there is nowhere to post. "
            + "This usually means the Business Profile API request is still pending."));
        }
      }

      accounts[platform] = record;
      await saveAccounts(userId, accounts);
      return c.html(callbackHtml(platform, true, PLATFORMS[platform as keyof typeof PLATFORMS]?.caveat || "Connected."));
    }

    if (platform === "tiktok") {
      const form = new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: fbRedirectUri("tiktok"),
      });
      const ttRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const tt = await ttRes.json().catch(() => ({}));
      if (!ttRes.ok || !tt?.access_token) {
        console.error("[Social] tiktok token exchange failed:", tt);
        return c.html(callbackHtml(platform, false, tt?.error_description || "TikTok token exchange failed."));
      }

      let name = "TikTok";
      let avatar: string | undefined;
      try {
        const meRes = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url",
          { headers: { Authorization: `Bearer ${tt.access_token}` } },
        );
        const me = await meRes.json();
        name = me?.data?.user?.display_name || name;
        avatar = me?.data?.user?.avatar_url;
      } catch { /* a name is cosmetic; the token is what matters */ }

      const ttAccounts = await getAccounts(userId);
      ttAccounts["tiktok"] = {
        platform: "tiktok",
        connected: true,
        name,
        handle: name,
        avatar,
        connectedAt: new Date().toISOString(),
        userAccessToken: tt.access_token,
      };
      await saveAccounts(userId, ttAccounts);
      // Said at the moment of connecting, not when a post mysteriously fails
      // to appear: an unaudited app can only post privately.
      return c.html(callbackHtml(
        platform,
        true,
        "Connected. Until TikTok audits this app, posts are published privately — "
        + "submit it for review in TikTok for Developers to post publicly.",
      ));
    }

    // 1) Exchange code → short-lived user token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token` +
        `?client_id=${FB_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(fbRedirectUri("facebook"))}` +
        `&client_secret=${FB_APP_SECRET}` +
        `&code=${encodeURIComponent(code)}`,
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Social] token exchange failed:", tokenData);
      return c.html(callbackHtml(platform, false, tokenData?.error?.message || "Token exchange failed."));
    }

    // 2) Upgrade to a long-lived token (~60 days)
    let userAccessToken = tokenData.access_token;
    try {
      const llRes = await fetch(
        `${GRAPH}/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${FB_APP_ID}` +
          `&client_secret=${FB_APP_SECRET}` +
          `&fb_exchange_token=${userAccessToken}`,
      );
      const llData = await llRes.json();
      if (llRes.ok && llData.access_token) userAccessToken = llData.access_token;
    } catch { /* keep short-lived token */ }

    // 3) List the user's Pages (page tokens don't expire while the user token is valid)
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=name,access_token,followers_count,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${userAccessToken}`,
    );
    const pagesData = await pagesRes.json();
    const page = pagesData?.data?.[0];
    if (!page) {
      return c.html(callbackHtml(platform, false,
        "No Facebook Page found on this account. Create a Page (and link an Instagram Business account) then reconnect."));
    }

    const accounts = await getAccounts(userId);
    accounts["facebook"] = {
      platform: "facebook",
      connected: true,
      name: page.name,
      handle: page.name,
      avatar: page.picture?.data?.url,
      followers: page.followers_count,
      connectedAt: new Date().toISOString(),
      pageId: page.id,
      pageAccessToken: page.access_token,
      userAccessToken,
    };

    // Instagram is available if the Page has a linked IG Business account.
    const ig = page.instagram_business_account;
    if (ig?.id) {
      accounts["instagram"] = {
        platform: "instagram",
        connected: true,
        name: ig.username ? `@${ig.username}` : "Instagram",
        handle: ig.username,
        avatar: ig.profile_picture_url,
        followers: ig.followers_count,
        connectedAt: new Date().toISOString(),
        pageId: page.id,
        pageAccessToken: page.access_token,
        igUserId: ig.id,
        userAccessToken,
      };
    }
    await saveAccounts(userId, accounts);

    const linkedIg = ig?.id ? " (Instagram linked)" : "";
    return c.html(callbackHtml(platform, true, `${page.name} is now connected${linkedIg}.`));
  } catch (error) {
    console.error("[Social] callback error:", error);
    return c.html(callbackHtml(platformParam, false, `Something went wrong: ${error}`));
  }
});

// ── Fetch posts from a connected platform ─────────────────────────────────
socialRouter.get(`${PREFIX}/social/fetch/:platform`, async (c) => {
  try {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Sign in required." }, 401);
    const platform = c.req.param("platform");
    const accounts = await getAccounts(userId);
    const account = accounts[platform];
    if (!account?.connected) {
      return c.json({ error: `${platform} is not connected.` }, 400);
    }

    if (platform === "facebook") {
      const res = await fetch(
        `${GRAPH}/${account.pageId}/posts` +
          `?fields=message,created_time,full_picture,permalink_url,` +
          `likes.summary(true),comments.summary(true),shares` +
          `&limit=20&access_token=${account.pageAccessToken}`,
      );
      const data = await res.json();
      if (!res.ok) return c.json({ error: data?.error?.message || "Failed to fetch posts" }, 502);
      const posts = (data.data || [])
        .filter((p: any) => p.message)
        .map((p: any) => ({
          id: p.id,
          platform: "facebook",
          content: p.message,
          imageUrl: p.full_picture || "",
          mediaUrl: p.full_picture || "",
          likes: p.likes?.summary?.total_count || 0,
          comments: p.comments?.summary?.total_count || 0,
          shares: p.shares?.count || 0,
          timestamp: p.created_time,
          permalink: p.permalink_url || "",
        }));
      return c.json({ posts });
    }

    if (platform === "instagram") {
      const res = await fetch(
        `${GRAPH}/${account.igUserId}/media` +
          `?fields=caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
          `&limit=20&access_token=${account.pageAccessToken}`,
      );
      const data = await res.json();
      if (!res.ok) return c.json({ error: data?.error?.message || "Failed to fetch posts" }, 502);
      const posts = (data.data || []).map((p: any) => ({
        id: p.id,
        platform: "instagram",
        content: p.caption || "",
        imageUrl: p.media_url || p.thumbnail_url || "",
        mediaUrl: p.media_url || p.thumbnail_url || "",
        videoUrl: p.media_type === "VIDEO" ? p.media_url : "",
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        shares: 0,
        timestamp: p.timestamp,
        permalink: p.permalink || "",
      }));
      return c.json({ posts });
    }

    return c.json({ error: `Fetching from ${platform} is not supported yet.` }, 400);
  } catch (error) {
    console.error("[Social] fetch error:", error);
    return c.json({ error: `Failed to fetch content: ${error}` }, 500);
  }
});

// ── Publish / cross-post ──────────────────────────────────────────────────
/**
 * A Facebook Reel, which is not a Facebook video post with a different name.
 *
 * Reels have their own endpoint and their own three-phase handshake —
 * initialise, upload, finish — on a different host from the Graph calls
 * everything else here uses. Posting a vertical video to `/feed` or `/videos`
 * produces an ordinary video post, not a reel, so this cannot be folded into
 * the function below.
 *
 * `upload_phase=finish` returns as soon as Facebook has ACCEPTED the reel, not
 * when it is live: processing continues afterwards. That is why nothing here
 * polls — unlike Instagram, there is no container to publish separately, so
 * acceptance is the honest end of our involvement.
 */
async function publishReelToFacebook(account: SocialAccount, content: string, videoUrl: string) {
  const token = account.pageAccessToken!;

  const startRes = await fetch(`${GRAPH}/${account.pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_phase: "start", access_token: token }),
  });
  const start = await startRes.json();
  if (!startRes.ok || !start?.video_id) {
    throw new Error(start?.error?.message || "Facebook would not start the reel upload.");
  }

  // Facebook fetches the file itself from the URL we hand it, which is why the
  // rendered video has to live somewhere reachable without our credentials.
  const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v18.0/${start.video_id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      file_url: videoUrl,
    },
  });
  const upload = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || upload?.success === false) {
    throw new Error(upload?.error?.message || upload?.debug_info?.message || "Facebook could not fetch the video.");
  }

  const finishRes = await fetch(
    `${GRAPH}/${account.pageId}/video_reels`
    + `?upload_phase=finish&video_state=PUBLISHED`
    + `&video_id=${encodeURIComponent(start.video_id)}`
    + `&description=${encodeURIComponent(content)}`
    + `&access_token=${encodeURIComponent(token)}`,
    { method: "POST" },
  );
  const finish = await finishRes.json();
  if (!finishRes.ok || finish?.success === false) {
    throw new Error(finish?.error?.message || "Facebook would not publish the reel.");
  }
  return start.video_id;
}

async function publishToFacebook(account: SocialAccount, content: string, imageUrl?: string, videoUrl?: string) {
  const base = `${GRAPH}/${account.pageId}`;
  // A video means a reel. Facebook had no video path at all before this — a
  // rendered reel would have silently become a text post.
  if (videoUrl) return publishReelToFacebook(account, content, videoUrl);
  if (imageUrl) {
    const res = await fetch(`${base}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl, caption: content, access_token: account.pageAccessToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Facebook photo post failed");
    return data.post_id || data.id;
  }
  const res = await fetch(`${base}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: content, access_token: account.pageAccessToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Facebook post failed");
  return data.id;
}

/**
 * Post a video to TikTok.
 *
 * THE THING TO KNOW BEFORE THIS LOOKS BROKEN
 *
 * TikTok restricts every post made by an UNAUDITED app to private viewing, and
 * blocks the attempt outright at `/publish/video/init/` for an account that is
 * not private. That is not something the code can work around: lifting it
 * needs TikTok's manual review of the app — a demo video, screenshots and a
 * privacy policy URL — which has a queue.
 *
 * So a correct integration can post successfully and the video can still be
 * private, and the refusal for a public account reads like a bug when it is a
 * policy. The error below says so in as many words, because the alternative is
 * somebody spending a day looking for a fault that is not there.
 *
 * PULL_FROM_URL rather than an upload, for the same reason as Facebook Reels:
 * the rendered video already lives at a signed URL the platform can fetch, and
 * pushing the bytes a second time through this function would be slower and no
 * more reliable.
 */
/**
 * Bluesky, which is the one platform here with no gatekeeper at all.
 *
 * The AT Protocol is an open specification and the endpoints the official
 * client uses are the ones available to everybody. There is no app to
 * register, no review, no quota and no fee — the only credential is an app
 * password the account holder generates in their own settings, which is why
 * `PLATFORMS.bluesky.auth` is `app-password` rather than `oauth`.
 *
 * A session is created per post rather than stored. The tokens are short
 * lived, creating one is a single cheap call, and an app password can be
 * revoked by the holder at any moment — so holding a stale session would only
 * mean failing later in a less obvious way.
 */
async function publishToBluesky(account: SocialAccount, content: string) {
  const service = "https://bsky.social/xrpc";

  const authRes = await fetch(`${service}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: account.handle, password: account.userAccessToken }),
  });
  const auth = await authRes.json().catch(() => ({}));
  if (!authRes.ok || !auth?.accessJwt) {
    throw new Error(auth?.message || "Bluesky refused the app password. Generate a new one in Settings → App Passwords.");
  }

  const res = await fetch(`${service}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessJwt}` },
    body: JSON.stringify({
      repo: auth.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: fitToPlatform("bluesky", content),
        createdAt: new Date().toISOString(),
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Bluesky rejected the post.");
  return data?.uri || data?.cid;
}

/**
 * Mastodon, where the server is part of the account.
 *
 * The same handle on two instances is two different accounts, so the instance
 * is stored alongside the token and every call is made against it. There is no
 * central API to fall back on — posting to the wrong server is posting as
 * somebody else.
 *
 * `Idempotency-Key` is Mastodon's own protection against a retried request
 * becoming two posts, and it is free to use, so it is used.
 */
async function publishToMastodon(account: SocialAccount, content: string) {
  const instance = String(account.instance || "").replace(/\/+$/, "");
  if (!instance) throw new Error("This Mastodon account has no server recorded. Reconnect it.");

  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${account.userAccessToken}`,
      "Idempotency-Key": await sha256Hex(`${account.handle}:${content}`),
    },
    body: JSON.stringify({ status: fitToPlatform("mastodon", content) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Mastodon rejected the post.");
  return data?.id;
}

/** A stable key for the same post, so a retry does not become two posts. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * LinkedIn, to the signed-in person's own profile.
 *
 * `w_member_social` is self-serve and needs no review, and it posts as the
 * member — it cannot post to a company page. That needs the Community
 * Management API and LinkedIn's partner approval, which is a separate
 * application with a screencast, so the caveat on `PLATFORMS.linkedin` says
 * which one this is. Somebody expecting their company page to update would
 * otherwise reasonably call this broken.
 */
async function publishToLinkedIn(account: SocialAccount, content: string) {
  if (!account.authorUrn) throw new Error("This LinkedIn account has no author recorded. Reconnect it.");
  // Personal and company posts are the same call with a different author urn —
  // `urn:li:person:…` or `urn:li:organization:…`. The difference that matters
  // is the scope behind the token, which is settled at connection.

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${account.userAccessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: account.authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: fitToPlatform("linkedin", content) },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "LinkedIn rejected the post.");
  return data?.id;
}

/**
 * Threads, which runs on the Meta app already registered for Facebook.
 *
 * Two steps like Instagram — create a container, then publish it — but on
 * Threads' own host and with its own user id, which is NOT the Instagram one
 * even for the same person. Text posts need no transcoding, so unlike a reel
 * there is nothing to wait for between the two calls.
 */
async function publishToThreads(account: SocialAccount, content: string, imageUrl?: string) {
  const base = "https://graph.threads.net/v1.0";
  const userId = account.threadsUserId;
  if (!userId) throw new Error("This Threads account is missing its user id. Reconnect it.");

  const params = new URLSearchParams({
    media_type: imageUrl ? "IMAGE" : "TEXT",
    text: fitToPlatform("threads", content),
    access_token: account.userAccessToken || "",
  });
  if (imageUrl) params.set("image_url", imageUrl);

  const createRes = await fetch(`${base}/${userId}/threads`, { method: "POST", body: params });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !created?.id) {
    throw new Error(created?.error?.message || "Threads would not accept the post.");
  }

  const pubRes = await fetch(`${base}/${userId}/threads_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: created.id,
      access_token: account.userAccessToken || "",
    }),
  });
  const published = await pubRes.json().catch(() => ({}));
  if (!pubRes.ok) throw new Error(published?.error?.message || "Threads rejected the post.");
  return published?.id;
}

/**
 * A usable Google access token, refreshing it when it has expired.
 *
 * WHY THIS IS NEEDED HERE AND NOWHERE ELSE
 *
 * Google's access tokens last an hour. Every other platform here issues one
 * that outlives the gap between two scheduled posts — Facebook's is sixty
 * days, Bluesky makes a fresh session per post, Mastodon's does not expire.
 * Google's does not survive the night, so a campaign posting at nine in the
 * morning would fail every day with an expiry that nobody is awake to see.
 *
 * The refreshed token is written back, so a run does not refresh on every
 * call, and a missing refresh token is reported as needing a reconnection
 * rather than as an authorisation failure — they are different problems and
 * only one of them is fixed by pressing connect again.
 */
async function googleAccessToken(userId: string, account: SocialAccount): Promise<string> {
  const stillValid = account.expiresAt && Date.parse(account.expiresAt) > Date.now() + 60_000;
  if (stillValid && account.userAccessToken) return account.userAccessToken;

  if (!account.refreshToken) {
    throw new Error(`${account.platform} needs reconnecting — Google did not leave a refresh token.`);
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || `Google would not renew the ${account.platform} token. Reconnect it.`);
  }

  const accounts = await getAccounts(userId);
  const stored = accounts[account.platform];
  if (stored) {
    stored.userAccessToken = data.access_token;
    stored.expiresAt = new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000).toISOString();
    await saveAccounts(userId, accounts);
  }
  return data.access_token;
}

/**
 * Pinterest, where a pin belongs to a board.
 *
 * THE TRAP WORTH KNOWING
 *
 * On TRIAL access every pin is a sandbox entity visible only to its creator —
 * and the API still answers 201 with a real-looking pin id. So a successful
 * response is not the same as a pin anybody can see, which is the identical
 * shape to TikTok's private-until-audited gate and just as easy to mistake
 * for a bug. Standard access needs a recorded video of the OAuth flow, which
 * Pinterest asks for even when the developer is the only user.
 *
 * The board is stored at connection time because there is no default to fall
 * back on: a pin with no board has nowhere to go.
 */
async function publishToPinterest(account: SocialAccount, content: string, imageUrl?: string) {
  if (!imageUrl) throw new Error("Pinterest needs an image.");
  if (!account.boardId) throw new Error("No Pinterest board is selected. Reconnect and choose one.");

  const [title, ...rest] = content.split("\n");
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${account.userAccessToken}` },
    body: JSON.stringify({
      board_id: account.boardId,
      title: fitToPlatform("pinterest", title || content).slice(0, 100),
      description: rest.join("\n").slice(0, 800) || undefined,
      media_source: { source_type: "image_url", url: imageUrl },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Pinterest rejected the pin.");
  return data?.id;
}

/**
 * YouTube, which is the one platform here that will not fetch the file.
 *
 * Every other platform is handed a URL and collects the video itself.
 * YouTube requires the BYTES, through a resumable upload: post the metadata
 * to get a session URI, then PUT the file to it. So the server has to read
 * the video out of the bucket and stream it on — real work the others do not
 * need, and the reason this function is longer than the rest.
 *
 * Quota is NOT the constraint, despite what is widely repeated: since June
 * 2026 uploads no longer draw on the shared 10,000-unit pool, and a default
 * project gets a hundred `videos.insert` calls a day.
 *
 * A vertical video under a minute is treated as a Short by YouTube itself —
 * there is no flag to set, which is why none is sent.
 */
async function publishToYouTube(account: SocialAccount, content: string, videoUrl?: string) {
  if (!videoUrl) throw new Error("YouTube only takes video.");

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error("The rendered video could not be read back for upload.");
  const bytes = new Uint8Array(await videoRes.arrayBuffer());

  const [rawTitle, ...rest] = content.split("\n");
  const metadata = {
    snippet: {
      // YouTube refuses a title over 100 characters outright rather than
      // trimming it, so it is trimmed here.
      title: fitToPlatform("youtube", rawTitle || "Untitled"),
      description: rest.join("\n").slice(0, 5000),
    },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };

  const startRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.userAccessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": String(bytes.byteLength),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "YouTube would not start the upload.");
  }
  const sessionUri = startRes.headers.get("location");
  if (!sessionUri) throw new Error("YouTube did not return an upload session.");

  const putRes = await fetch(sessionUri, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.byteLength) },
    body: bytes,
  });
  const done = await putRes.json().catch(() => ({}));
  if (!putRes.ok) throw new Error(done?.error?.message || "YouTube rejected the upload.");
  return done?.id;
}

/**
 * Google Business Profile — the strongest local-search signal a contractor
 * has, and the one most likely to fail for a reason that is not a bug.
 *
 * Google grants a new project ZERO quota until it approves an access request,
 * so every call refuses until that clears. The refusal is caught below and
 * explained, because "quota exceeded" on a project that has never posted
 * reads as nonsense otherwise.
 *
 * A post belongs to a location, and a business with two premises has two, so
 * the location is chosen at connection rather than guessed.
 */
async function publishToGoogleBusiness(account: SocialAccount, content: string, imageUrl?: string) {
  if (!account.locationName) throw new Error("No Google Business location is selected. Reconnect and choose one.");

  const body: Record<string, unknown> = {
    languageCode: "en-US",
    summary: fitToPlatform("google_business", content),
    topicType: "STANDARD",
  };
  if (imageUrl) body.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${account.locationName}/localPosts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${account.userAccessToken}` },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = String(data?.error?.message || "Google rejected the post.");
    if (res.status === 403 || /quota/i.test(message)) {
      throw new Error(
        `${message} — Google grants zero quota until it approves the Business Profile API request. `
        + "Apply in the Google Cloud console; posting cannot work before that.",
      );
    }
    throw new Error(message);
  }
  return data?.name;
}

async function publishToTikTok(account: SocialAccount, content: string, videoUrl?: string) {
  if (!videoUrl) throw new Error("TikTok only takes video. Render a reel first.");
  const token = account.userAccessToken!;

  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      post_info: {
        title: content.slice(0, 2200),
        privacy_level: "SELF_ONLY",
        disable_comment: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    }),
  });
  const init = await initRes.json().catch(() => ({}));
  const err = init?.error;

  if (!initRes.ok || (err?.code && err.code !== "ok")) {
    const message = String(err?.message || "TikTok refused the post.");
    if (/audit|unaudited|scope|privacy_level/i.test(message)) {
      throw new Error(
        `${message} — TikTok restricts posts from unaudited apps to private. `
        + "Submit the app for review in TikTok for Developers to post publicly.",
      );
    }
    throw new Error(message);
  }

  const publishId = init?.data?.publish_id;
  if (!publishId) throw new Error("TikTok accepted the request but returned no publish id.");
  return publishId;
}

async function publishToInstagram(account: SocialAccount, content: string, imageUrl?: string, videoUrl?: string) {
  const media = videoUrl || imageUrl;
  if (!media) throw new Error("Instagram requires an image or video to post.");
  // 1) Create a media container
  const containerBody: Record<string, string> = {
    caption: content,
    access_token: account.pageAccessToken!,
  };
  if (videoUrl) {
    containerBody.media_type = "REELS";
    containerBody.video_url = videoUrl;
    // Without this a reel appears only in the Reels tab and not on the profile
    // grid, which reads as "it didn't post" to whoever went looking for it.
    containerBody.share_to_feed = "true";
  } else { containerBody.image_url = imageUrl!; }

  const createRes = await fetch(`${GRAPH}/${account.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(createData?.error?.message || "Instagram container creation failed");

  // 2) Wait for Meta to finish transcoding, when there is anything to transcode.
  if (videoUrl) await waitForContainer(createData.id, account.pageAccessToken!);

  // 3) Publish the container
  const pubRes = await fetch(`${GRAPH}/${account.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createData.id, access_token: account.pageAccessToken }),
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok) throw new Error(pubData?.error?.message || "Instagram publish failed");
  return pubData.id;
}

/**
 * Wait until Instagram has actually finished with the video.
 *
 * THE BUG THIS FIXES
 *
 * A reel container was created and `media_publish` was called on the very next
 * line. Meta transcodes video asynchronously, so the container is not
 * publishable yet and the call fails. Images are synchronous, which is why the
 * photo path worked and this never showed — and why it stayed unnoticed: no
 * account has ever been connected, so no reel has ever been attempted.
 *
 * Meta's guidance is to poll roughly once a minute for no more than five.
 * In practice most finish within thirty seconds to two minutes, so this polls
 * more often early and gives up at five minutes rather than hanging a request
 * forever.
 *
 * `ERROR` is reported with Meta's own message where there is one. The usual
 * cause is a video that does not meet the reel specification — wrong aspect
 * ratio, too long, or not H.264 — and Meta's message names it better than a
 * guess would.
 */
async function waitForContainer(
  containerId: string,
  accessToken: string,
  deadlineMs = 5 * 60 * 1000,
): Promise<void> {
  const startedAt = Date.now();
  let waitMs = 5_000;

  while (Date.now() - startedAt < deadlineMs) {
    await new Promise((r) => setTimeout(r, waitMs));
    waitMs = Math.min(30_000, Math.round(waitMs * 1.5));

    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || "Could not read the Instagram upload status.");

    const status = String(data?.status_code || "").toUpperCase();
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(
        data?.status
          || `Instagram could not process the video (${status || "unknown"}). Reels must be MP4/H.264, 9:16, 3–90 seconds.`,
      );
    }
    // IN_PROGRESS / PUBLISHED — keep waiting.
  }

  throw new Error("Instagram is still processing the video after five minutes. It may still appear; check the account before posting again.");
}

/**
 * Publish as a named user, without going through HTTP.
 *
 * WHY THIS IS SEPARATE FROM THE ROUTE
 *
 * The route gets its identity from a session, which is right: a person posting
 * from the app posts as themselves. A scheduled run has no session to get it
 * from — nobody is signed in at three in the morning — and the wrong answers
 * to that are to invent a shared pseudo-user or to let a caller name whichever
 * user it likes in a request body. Both hand out the right to post as a
 * business.
 *
 * So the identity comes in as an argument from a caller that already
 * established it some other way, and the ONLY such caller is the cron tick,
 * which is guarded by a shared secret and reads the user ids from the
 * campaigns actually stored on the server. Nothing reaches this from a
 * request body.
 *
 * The route below now calls this with its authenticated user, so there is one
 * publisher rather than two that can drift.
 */
export async function publishForUser(
  userId: string,
  content: string,
  platforms: string[],
  imageUrl?: string,
  videoUrl?: string,
): Promise<Array<{ platform: string; success: boolean; id?: string; error?: string }>> {
  const accounts = await getAccounts(userId);
  const results: Array<{ platform: string; success: boolean; id?: string; error?: string }> = [];

  for (const platform of platforms) {
    const account = accounts[platform];
    if (!account?.connected) {
      results.push({ platform, success: false, error: "Not connected" });
      continue;
    }
    try {
      /**
       * Asked before anything is sent. A platform that will not take this post
       * — Instagram with no image, TikTok with no video, a caption past the
       * limit — says so as a sentence somebody can act on, rather than as
       * whatever error the platform returns after the attempt.
       */
      if (isPlatform(platform)) {
        const refusal = refusalFor(platform, { content, imageUrl, videoUrl });
        if (refusal) throw new Error(refusal);
      }

      let id: string | undefined;
      if (platform === "facebook") id = await publishToFacebook(account, content, imageUrl, videoUrl);
      else if (platform === "instagram") id = await publishToInstagram(account, content, imageUrl, videoUrl);
      else if (platform === "tiktok") id = await publishToTikTok(account, content, videoUrl);
      else if (platform === "bluesky") id = await publishToBluesky(account, content);
      else if (platform === "mastodon") id = await publishToMastodon(account, content);
      else if (platform === "linkedin" || platform === "linkedin_company") id = await publishToLinkedIn(account, content);
      else if (platform === "threads") id = await publishToThreads(account, content, imageUrl);
      else if (platform === "pinterest") id = await publishToPinterest(account, content, imageUrl);
      else if (platform === "youtube" || platform === "google_business") {
        // Google's hour-long tokens are renewed before the call rather than
        // after a failure, so a scheduled post at nine in the morning works.
        const fresh = { ...account, userAccessToken: await googleAccessToken(userId, account) };
        id = platform === "youtube"
          ? await publishToYouTube(fresh, content, videoUrl)
          : await publishToGoogleBusiness(fresh, content, imageUrl);
      }
      else throw new Error(`Publishing to ${platform} is not supported yet.`);
      results.push({ platform, success: true, id });
    } catch (err) {
      console.error(`[Social] publish to ${platform} failed:`, err);
      results.push({ platform, success: false, error: String(err instanceof Error ? err.message : err) });
    }
  }
  return results;
}

socialRouter.post(`${PREFIX}/social/publish`, async (c) => {
  try {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Sign in required." }, 401);
    const { content, imageUrl, videoUrl, platforms } = await c.req.json();
    if (!content || !Array.isArray(platforms) || platforms.length === 0) {
      return c.json({ error: "content and at least one platform are required." }, 400);
    }

    const results = await publishForUser(userId, content, platforms, imageUrl, videoUrl);

    const anySuccess = results.some((r) => r.success);
    return c.json({ success: anySuccess, results }, anySuccess ? 200 : 502);
  } catch (error) {
    console.error("[Social] publish error:", error);
    return c.json({ error: `Failed to publish: ${error}` }, 500);
  }
});

// ── Import a pulled post into the content library (server mirror) ──────────
socialRouter.post(`${PREFIX}/social/import-to-library`, async (c) => {
  try {
    const userId = await getUserId(c);
    if (!userId) return c.json({ error: "Sign in required." }, 401);
    const { post } = await c.req.json();
    if (!post) return c.json({ error: "Missing post" }, 400);
    const key = `content_library:${userId}:${post.id || crypto.randomUUID()}`;
    await kv.set(key, JSON.stringify({
      ...post,
      importedAt: new Date().toISOString(),
      source: `Imported from ${post.platform}`,
    }));
    return c.json({ success: true });
  } catch (error) {
    console.error("[Social] import error:", error);
    return c.json({ success: false, error: `Failed to import: ${error}` }, 500);
  }
});

// ── AI repurpose caption (OpenAI) ─────────────────────────────────────────
socialRouter.post(`${PREFIX}/social/ai-repurpose`, async (c) => {
  try {
    const { originalContent, sourcePlatform, targetPlatform } = await c.req.json();
    if (!originalContent || !targetPlatform) {
      return c.json({ error: "originalContent and targetPlatform are required." }, 400);
    }
    if (!OPENAI_API_KEY) {
      return c.json({ error: "OpenAI is not configured (missing OPENAI_API_KEY)." }, 400);
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a social media manager. Rewrite the given post so it is optimized for the target platform's tone, length, and hashtag conventions. Return ONLY the rewritten caption, no explanation.",
          },
          {
            role: "user",
            content: `Rewrite this ${sourcePlatform || "social"} post for ${targetPlatform}:\n\n${originalContent}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 400,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[Social] OpenAI error:", data);
      return c.json({ error: data?.error?.message || "AI generation failed" }, 502);
    }
    const caption = data.choices?.[0]?.message?.content?.trim() || "";
    return c.json({ caption });
  } catch (error) {
    console.error("[Social] ai-repurpose error:", error);
    return c.json({ error: `AI generation failed: ${error}` }, 500);
  }
});

// ── Health ────────────────────────────────────────────────────────────────
/**
 * Every platform this server can post to, and whether it is usable here.
 *
 * So a screen does not hardcode a list that drifts from what the publisher
 * actually supports — the bug that would otherwise arrive the first time a
 * platform is added and one of five screens is missed.
 *
 * `configured` is whether the secrets exist, reported as a boolean and never
 * as the secrets themselves. A platform offered without its credentials is a
 * button that fails after the click, so a screen can grey it out instead.
 */
socialRouter.get(`${PREFIX}/social/platforms`, (c) => {
  const configured: Record<string, boolean> = {
    facebook: !!(FB_APP_ID && FB_APP_SECRET),
    instagram: !!(FB_APP_ID && FB_APP_SECRET),
    tiktok: !!(TIKTOK_CLIENT_KEY && TIKTOK_CLIENT_SECRET),
    linkedin: !!(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET),
    linkedin_company: !!(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET),
    pinterest: !!(PINTEREST_APP_ID && PINTEREST_APP_SECRET),
    youtube: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    google_business: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    threads: !!(THREADS_APP_ID && THREADS_APP_SECRET),
    // Neither needs anything registered in advance: Bluesky takes an app
    // password the holder generates, Mastodon registers itself per instance.
    bluesky: true,
    mastodon: true,
  };

  return c.json({
    platforms: Object.values(PLATFORMS).map((spec) => ({
      ...spec,
      configured: configured[spec.id] ?? false,
    })),
  });
});

socialRouter.get(`${PREFIX}/social/health`, (c) =>
  c.json({
    ok: true,
    module: "social-media",
    facebookConfigured: !!(FB_APP_ID && FB_APP_SECRET),
    openaiConfigured: !!OPENAI_API_KEY,
    redirectUri: fbRedirectUri("facebook"),
  }),
);

export { socialRouter };
export default socialRouter;
