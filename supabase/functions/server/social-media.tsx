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
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

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

const fbRedirectUri = (platform: string) =>
  `${SUPABASE_URL}/functions/v1/make-server-3eae23a6/social/callback/${platform}`;

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

/** Resolve a stable per-user id from the Authorization token (anon → shared bucket). */
async function getUserId(c: any): Promise<string> {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) return "default";
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data?.user?.id || "default";
  } catch {
    return "default";
  }
}

// ── Accounts ──────────────────────────────────────────────────────────────
socialRouter.get(`${PREFIX}/social/accounts`, async (c) => {
  try {
    const userId = await getUserId(c);
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
      return c.json({
        error: "TikTok requires a TikTok for Developers app. Add TIKTOK_CLIENT_KEY/SECRET to enable it.",
      }, 400);
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
async function publishToFacebook(account: SocialAccount, content: string, imageUrl?: string) {
  const base = `${GRAPH}/${account.pageId}`;
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

async function publishToInstagram(account: SocialAccount, content: string, imageUrl?: string, videoUrl?: string) {
  const media = videoUrl || imageUrl;
  if (!media) throw new Error("Instagram requires an image or video to post.");
  // 1) Create a media container
  const containerBody: Record<string, string> = {
    caption: content,
    access_token: account.pageAccessToken!,
  };
  if (videoUrl) { containerBody.media_type = "REELS"; containerBody.video_url = videoUrl; }
  else { containerBody.image_url = imageUrl!; }

  const createRes = await fetch(`${GRAPH}/${account.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(createData?.error?.message || "Instagram container creation failed");

  // 2) Publish the container
  const pubRes = await fetch(`${GRAPH}/${account.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createData.id, access_token: account.pageAccessToken }),
  });
  const pubData = await pubRes.json();
  if (!pubRes.ok) throw new Error(pubData?.error?.message || "Instagram publish failed");
  return pubData.id;
}

socialRouter.post(`${PREFIX}/social/publish`, async (c) => {
  try {
    const userId = await getUserId(c);
    const { content, imageUrl, videoUrl, platforms } = await c.req.json();
    if (!content || !Array.isArray(platforms) || platforms.length === 0) {
      return c.json({ error: "content and at least one platform are required." }, 400);
    }
    const accounts = await getAccounts(userId);
    const results: Array<{ platform: string; success: boolean; id?: string; error?: string }> = [];

    for (const platform of platforms) {
      const account = accounts[platform];
      if (!account?.connected) {
        results.push({ platform, success: false, error: "Not connected" });
        continue;
      }
      try {
        let id: string | undefined;
        if (platform === "facebook") id = await publishToFacebook(account, content, imageUrl);
        else if (platform === "instagram") id = await publishToInstagram(account, content, imageUrl, videoUrl);
        else throw new Error(`Publishing to ${platform} is not supported yet.`);
        results.push({ platform, success: true, id });
      } catch (err) {
        console.error(`[Social] publish to ${platform} failed:`, err);
        results.push({ platform, success: false, error: String(err instanceof Error ? err.message : err) });
      }
    }

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
