/**
 * Growth & Marketing Router
 *
 * Real, backend-wired implementations for what used to be UI-only mockups:
 *  - SMS Marketing        → Twilio send + KV-persisted contacts & campaigns
 *  - Abandoned Cart        → KV-persisted carts + Resend recovery emails
 *  - Promotions Manager    → KV-persisted promos (so the store can honor them)
 *  - Exit-Intent capture   → persists leads to the same KV leads store + welcome email
 *  - AI Ranking Engine     → OpenAI-generated SEO content, persisted to KV
 *
 * All data lives in the shared KV table via ./kv_store.tsx.
 */

import { Hono } from "npm:hono";
import OpenAI from "npm:openai@4";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// ── KV key helpers ──────────────────────────────────────────────────────────
const SMS_CONTACT = (id: string) => `sms_contact:${id}`;
const SMS_CAMPAIGN = (id: string) => `sms_campaign:${id}`;
const CART = (id: string) => `abandoned_cart:${id}`;
const PROMO = (id: string) => `promotion:${id}`;
const LEAD = (id: string) => `lead:${id}`;
const RANK_CONTENT = (id: string) => `ranking_content:${id}`;
const RANK_SETTINGS = "ranking_settings:default";

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ── Provider helpers ────────────────────────────────────────────────────────
async function sendSMSViaTwilio(to: string, message: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)");

  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio API failed for ${to}: ${err}`);
  }
  return await res.json();
}

async function sendEmailViaResend(to: string[], subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("NOTIFICATION_FROM_NAME") || Deno.env.get("COMPANY_NAME") || "Black Phoenix Company";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API failed: ${err}`);
  }
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════════════
// SMS MARKETING
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/sms/contacts", async (c) => {
  try {
    const contacts = (await kv.getByPrefix("sms_contact:")) || [];
    contacts.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    return c.json({ success: true, contacts });
  } catch (e: any) {
    console.log("SMS contacts list error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/sms/contacts", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.phone) return c.json({ success: false, error: "Phone number is required" }, 400);
    const id = uid("c");
    const contact = {
      id,
      name: b.name || "Unknown",
      phone: b.phone,
      tags: Array.isArray(b.tags) ? b.tags : [],
      optedIn: b.optedIn !== false,
      createdAt: Date.now(),
    };
    await kv.set(SMS_CONTACT(id), contact);
    return c.json({ success: true, contact });
  } catch (e: any) {
    console.log("SMS contact create error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.delete("/make-server-57095a78/sms/contacts/:id", async (c) => {
  try {
    await kv.del(SMS_CONTACT(c.req.param("id")));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.get("/make-server-57095a78/sms/campaigns", async (c) => {
  try {
    const campaigns = (await kv.getByPrefix("sms_campaign:")) || [];
    campaigns.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    return c.json({ success: true, campaigns });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Actually send an SMS blast through Twilio to a chosen audience.
router.post("/make-server-57095a78/sms/send", async (c) => {
  try {
    const b = await c.req.json();
    const { name, message, audience } = b as { name?: string; message?: string; audience?: string };
    if (!message) return c.json({ success: false, error: "Message body is required" }, 400);

    const all = ((await kv.getByPrefix("sms_contact:")) || []).filter((x: any) => x.optedIn);
    const recipients = (!audience || audience === "all")
      ? all
      : all.filter((x: any) => (x.tags || []).includes(audience));

    if (recipients.length === 0) return c.json({ success: false, error: "No opted-in contacts in this audience" }, 400);

    let sent = 0;
    const errors: string[] = [];
    for (const r of recipients) {
      const personalized = message.replace(/\{name\}/g, (r.name || "there").split(" ")[0]);
      try {
        await sendSMSViaTwilio(r.phone, personalized);
        sent++;
        await kv.set(SMS_CONTACT(r.id), { ...r, lastTexted: new Date().toISOString() });
      } catch (err: any) {
        errors.push(err.message);
        console.log("SMS send failed:", err.message);
      }
    }

    const id = uid("camp");
    const campaign = {
      id,
      name: name || "Untitled Campaign",
      message,
      audience: audience || "all",
      sentTo: sent,
      sentAt: new Date().toISOString(),
      status: sent > 0 ? "sent" : "failed",
      replies: 0,
      clicks: 0,
      errors,
      createdAt: Date.now(),
    };
    await kv.set(SMS_CAMPAIGN(id), campaign);

    if (sent === 0) {
      return c.json({ success: false, error: `Failed to send. ${errors[0] || "Check Twilio configuration."}`, campaign }, 502);
    }
    return c.json({ success: true, campaign, sent, attempted: recipients.length, errors });
  } catch (e: any) {
    console.log("SMS send error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ABANDONED CART RECOVERY
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/abandoned-carts", async (c) => {
  try {
    const carts = (await kv.getByPrefix("abandoned_cart:")) || [];
    carts.sort((a: any, b: any) => new Date(b.abandonedAt).getTime() - new Date(a.abandonedAt).getTime());
    return c.json({ success: true, carts });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Upsert an abandoned cart (called by the storefront when a checkout is left).
router.post("/make-server-57095a78/abandoned-carts", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.email) return c.json({ success: false, error: "Email is required" }, 400);
    const id = b.id || uid("ac");
    const cart = {
      id,
      email: b.email,
      name: b.name || b.email.split("@")[0],
      items: Array.isArray(b.items) ? b.items : [],
      total: Number(b.total) || 0,
      abandonedAt: b.abandonedAt || new Date().toISOString(),
      status: b.status || "abandoned",
      emailsSent: b.emailsSent || 0,
      source: b.source || "PublicStore",
    };
    await kv.set(CART(id), cart);
    return c.json({ success: true, cart });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/abandoned-carts/:id/recover", async (c) => {
  try {
    const id = c.req.param("id");
    const cart: any = await kv.get(CART(id));
    if (!cart) return c.json({ success: false, error: "Cart not found" }, 404);
    const b = await c.req.json().catch(() => ({}));
    const subject: string = b.subject || `You left something behind, ${(cart.name || "").split(" ")[0]}!`;
    const bodyText: string = b.body || "Your cart is still waiting for you. Complete your order today!";

    const itemsHtml = (cart.items || [])
      .map((i: any) => `<li>${i.name} × ${i.qty} — $${(i.price * i.qty).toFixed(2)}</li>`)
      .join("");
    const html = `
      <div style="font-family:Arial,sans-serif;background:#0a0a0a;padding:32px;color:#fff;">
        <div style="max-width:560px;margin:0 auto;background:#111;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px;text-align:center;">
            <h1 style="margin:0;color:#fff;">${subject}</h1>
          </div>
          <div style="padding:28px;">
            <p style="color:#d1d5db;white-space:pre-wrap;">${bodyText.replace(/</g, "&lt;")}</p>
            <ul style="color:#fbbf24;">${itemsHtml}</ul>
            <p style="color:#10b981;font-size:18px;font-weight:bold;">Total: $${Number(cart.total).toFixed(2)}</p>
            <p style="text-align:center;margin-top:24px;">
              <a href="https://theblackphoenixcompany.com/public-store" style="background:#ea580c;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;">Return to Cart</a>
            </p>
          </div>
        </div>
      </div>`;

    await sendEmailViaResend([cart.email], subject, html);

    const updated = { ...cart, status: "emailed", emailsSent: (cart.emailsSent || 0) + 1, lastEmailed: new Date().toISOString() };
    await kv.set(CART(id), updated);
    return c.json({ success: true, cart: updated });
  } catch (e: any) {
    console.log("Cart recovery email error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/abandoned-carts/:id/mark-recovered", async (c) => {
  try {
    const id = c.req.param("id");
    const cart: any = await kv.get(CART(id));
    if (!cart) return c.json({ success: false, error: "Cart not found" }, 404);
    const updated = { ...cart, status: "recovered", recoveredAt: new Date().toISOString() };
    await kv.set(CART(id), updated);
    return c.json({ success: true, cart: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PROMOTIONS
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/promotions", async (c) => {
  try {
    const promotions = (await kv.getByPrefix("promotion:")) || [];
    promotions.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    return c.json({ success: true, promotions });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/promotions", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.name || !b.code) return c.json({ success: false, error: "Name and code are required" }, 400);
    const id = b.id || uid("promo");
    const promo = {
      id,
      name: b.name,
      type: b.type || "coupon",
      code: b.code,
      discountType: b.discountType || "percentage",
      discountValue: Number(b.discountValue) || 0,
      discount: b.discount || (b.discountType === "fixed" ? `$${b.discountValue} OFF` : b.discountType === "none" ? "Free Entry" : `${b.discountValue}% OFF`),
      limit: Number(b.limit) || 500,
      used: Number(b.used) || 0,
      revenue: Number(b.revenue) || 0,
      expires: b.expires || "",
      status: b.status || "active",
      createdAt: Date.now(),
    };
    await kv.set(PROMO(id), promo);
    return c.json({ success: true, promotion: promo });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.put("/make-server-57095a78/promotions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing: any = await kv.get(PROMO(id));
    if (!existing) return c.json({ success: false, error: "Promotion not found" }, 404);
    const b = await c.req.json();
    const promo = {
      ...existing,
      ...b,
      id,
      discount: b.discountType === "fixed" ? `$${b.discountValue} OFF` : b.discountType === "none" ? "Free Entry" : `${b.discountValue}% OFF`,
    };
    await kv.set(PROMO(id), promo);
    return c.json({ success: true, promotion: promo });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.delete("/make-server-57095a78/promotions/:id", async (c) => {
  try {
    await kv.del(PROMO(c.req.param("id")));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Validate a promo code (for the store/checkout to actually honor promotions).
router.get("/make-server-57095a78/promotions/validate/:code", async (c) => {
  try {
    const code = c.req.param("code").toUpperCase();
    const promotions = (await kv.getByPrefix("promotion:")) || [];
    const match = promotions.find((p: any) => (p.code || "").toUpperCase() === code);
    if (!match) return c.json({ success: false, valid: false, error: "Code not found" });
    const expired = match.expires && new Date(match.expires) < new Date();
    const limitReached = match.limit && match.used >= match.limit;
    const valid = match.status === "active" && !expired && !limitReached;
    return c.json({ success: true, valid, promotion: match, reason: expired ? "expired" : limitReached ? "limit reached" : valid ? "ok" : match.status });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// EXIT-INTENT LEAD CAPTURE
// ════════════════════════════════════════════════════════════════════════════

router.post("/make-server-57095a78/exit-intent/capture", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.email || !b.email.includes("@")) return c.json({ success: false, error: "Valid email required" }, 400);
    const id = uid("lead");
    const lead = {
      id,
      email: b.email,
      name: b.name || "",
      source: b.source || "exit-intent",
      promoCode: b.promoCode || "",
      page: b.page || "",
      status: "new",
      capturedAt: new Date().toISOString(),
      createdAt: Date.now(),
    };
    await kv.set(LEAD(id), lead);

    // Best-effort welcome email with the promo code (don't fail capture if email fails).
    let emailSent = false;
    if (b.promoCode && Deno.env.get("RESEND_API_KEY")) {
      try {
        const html = `
          <div style="font-family:Arial,sans-serif;background:#0a0a0a;padding:32px;color:#fff;">
            <div style="max-width:520px;margin:0 auto;background:#111;border-radius:16px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px;text-align:center;">
                <h1 style="margin:0;color:#fff;">Here's your discount!</h1>
              </div>
              <div style="padding:28px;text-align:center;">
                <p style="color:#d1d5db;">Use this code at checkout:</p>
                <div style="display:inline-block;background:rgba(234,88,12,0.15);border:1px solid #ea580c;color:#fb923c;font-size:24px;font-weight:bold;letter-spacing:3px;padding:14px 28px;border-radius:12px;margin:12px 0;">${b.promoCode}</div>
                <p style="text-align:center;margin-top:24px;">
                  <a href="https://theblackphoenixcompany.com/public-store" style="background:#ea580c;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;">Shop Now</a>
                </p>
              </div>
            </div>
          </div>`;
        await sendEmailViaResend([b.email], `Your ${b.promoCode} discount is inside 🔥`, html);
        emailSent = true;
      } catch (err: any) {
        console.log("Exit-intent welcome email failed:", err.message);
      }
    }
    return c.json({ success: true, lead, emailSent });
  } catch (e: any) {
    console.log("Exit-intent capture error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.get("/make-server-57095a78/exit-intent/leads", async (c) => {
  try {
    const all = (await kv.getByPrefix("lead:")) || [];
    const leads = all.filter((l: any) => l.source === "exit-intent");
    leads.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    return c.json({ success: true, leads });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AI RANKING ENGINE — real OpenAI content generation + persistence
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/ranking/content", async (c) => {
  try {
    const content = (await kv.getByPrefix("ranking_content:")) || [];
    content.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    const settings = (await kv.get(RANK_SETTINGS)) || { autoRunning: false };
    return c.json({ success: true, content, settings });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/ranking/generate", async (c) => {
  try {
    const b = await c.req.json();
    const type: string = b.type || "blog";
    const businessName: string = b.businessName || "Black Phoenix Company";
    const businessCity: string = b.businessCity || "Nashua, NH";
    const services: string = b.targetServices || "Roofing, HVAC, Plumbing";
    const primary = services.split(",")[0].trim();

    const typeLabels: Record<string, string> = { blog: "Blog Post", faq: "FAQ Page", service: "Service Page", local: "Local Landing Page" };

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    let body = "";
    let title = "";
    let targetKeyword = "";
    let scores = { seoScore: 90, geoScore: 88, voiceScore: 86 };

    if (apiKey) {
      const openai = new OpenAI({ apiKey });
      const prompt = `You are an expert local SEO + GEO (generative engine optimization) copywriter.
Write a ${typeLabels[type]} for "${businessName}", a home-services contractor in ${businessCity}.
Services: ${services}.
Focus keyword should target "${type}" intent (e.g. ${type === "blog" ? "informational" : type === "faq" ? "question-based" : type === "service" ? "commercial" : "local near-me"} search).
Return STRICT JSON only, no markdown fences, with keys:
{"title": string, "targetKeyword": string, "body": string (markdown, 800-1200 words, includes H2/H3, an FAQ section with question headers for voice search, and a clear call to action), "seoScore": number 80-99, "geoScore": number 80-99, "voiceScore": number 80-99}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      let raw = completion.choices[0]?.message?.content || "{}";
      raw = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(raw);
      title = parsed.title;
      targetKeyword = parsed.targetKeyword;
      body = parsed.body;
      scores = { seoScore: parsed.seoScore || 90, geoScore: parsed.geoScore || 88, voiceScore: parsed.voiceScore || 86 };
    } else {
      title = `${primary} Services in ${businessCity} — ${businessName}`;
      targetKeyword = `${primary.toLowerCase()} ${businessCity.toLowerCase()}`;
      body = `# ${title}\n\n${businessName} provides professional ${primary.toLowerCase()} services across ${businessCity}. (Add OPENAI_API_KEY for AI-written, fully optimized content.)`;
      scores = { seoScore: 85, geoScore: 82, voiceScore: 80 };
    }

    const id = uid("rc");
    const piece = {
      id,
      type,
      title,
      targetKeyword,
      body,
      status: "draft",
      wordCount: body.split(/\s+/).length,
      ...scores,
      generatedAt: new Date().toISOString().split("T")[0],
      createdAt: Date.now(),
    };
    await kv.set(RANK_CONTENT(id), piece);
    return c.json({ success: true, piece, aiGenerated: !!apiKey });
  } catch (e: any) {
    console.log("Ranking generate error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/ranking/publish/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const piece: any = await kv.get(RANK_CONTENT(id));
    if (!piece) return c.json({ success: false, error: "Content not found" }, 404);
    const updated = { ...piece, status: "published", publishedAt: new Date().toISOString() };
    await kv.set(RANK_CONTENT(id), updated);
    return c.json({ success: true, piece: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/ranking/auto", async (c) => {
  try {
    const b = await c.req.json().catch(() => ({}));
    const settings = { autoRunning: !!b.autoRunning, updatedAt: new Date().toISOString(), ...b };
    await kv.set(RANK_SETTINGS, settings);
    return c.json({ success: true, settings });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default router;
