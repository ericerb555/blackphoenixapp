// Product Page Pilot — PagePilot-style AI advertorial / campaign landing pages.
//
// The store exposes a FIXED number of campaign "slots" (MAX_SLOTS). Each slot
// holds one AI-generated advertorial landing page, and each page features a
// capped number of products (MAX_PRODUCTS) so it stays a tight, high-converting
// funnel instead of a product dump. When every slot is full the operator has to
// retire an old campaign to publish a new one — built-in scarcity.
//
// Flow:
//   GET    /page-pilot/config          -> { maxSlots, maxProducts }
//   GET    /page-pilot/list            -> all campaigns (admin)
//   GET    /page-pilot/slots           -> slot map (index -> campaign|null)
//   GET    /page-pilot/one/:id         -> one campaign by id
//   GET    /page-pilot/by-slug/:slug   -> one PUBLISHED campaign by slug (storefront)
//   POST   /page-pilot/generate        -> AI writes the advertorial from products, saves a draft
//   PUT    /page-pilot/:id             -> edit copy / assign a slot / publish / swap products
//   DELETE /page-pilot/:id             -> remove a campaign (frees its slot)
//
// Everything is KV-backed and best-effort so the tool works out of the box.
import { Hono } from 'npm:hono';
import OpenAI from 'npm:openai@4';
import * as kv from './kv_store.tsx';

const pagePilotRouter = new Hono();

const PREFIX = '/make-server-3eae23a6';
const CP = (id: string) => `pagepilot:campaign:${id}`;
const CP_PREFIX = 'pagepilot:campaign:';

// Store-wide limits (adjustable). Slots are numbered 1..MAX_SLOTS.
const MAX_SLOTS = 6;
const MAX_PRODUCTS = 4;

// ── Helpers ───────────────────────────────────────────────────────────────
function slugify(input: string): string {
  return String(input || 'campaign')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'campaign';
}

// Keep only the product fields we render, and enforce the per-page cap.
function normalizeProducts(products: any[]): any[] {
  return (Array.isArray(products) ? products : [])
    .slice(0, MAX_PRODUCTS)
    .map((p) => ({
      id: String(p.id ?? p.sku ?? crypto.randomUUID()),
      name: String(p.name ?? p.title ?? 'Product'),
      description: String(p.description ?? ''),
      price: Number(p.price) || 0,
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : undefined,
      image: String(p.image ?? p.primaryImage ?? (Array.isArray(p.images) ? p.images[0] : '') ?? ''),
      images: Array.isArray(p.images) ? p.images.filter((u: any) => typeof u === 'string' && u.trim()) : undefined,
      category: p.category ? String(p.category) : undefined,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      reviews: typeof p.reviews === 'number' ? p.reviews : undefined,
      badge: p.badge ? String(p.badge) : undefined,
    }));
}

async function allCampaigns(): Promise<any[]> {
  const all = ((await kv.getByPrefix(CP_PREFIX)) || []) as any[];
  return all.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

// Which campaign (if any) occupies a given slot, excluding one id.
async function slotOccupant(slot: number, excludeId?: string): Promise<any | null> {
  const all = await allCampaigns();
  return all.find((c) => c.slot === slot && c.id !== excludeId) || null;
}

// ── Config + slot map ───────────────────────────────────────────────────────
pagePilotRouter.get(`${PREFIX}/page-pilot/config`, (c) =>
  c.json({ maxSlots: MAX_SLOTS, maxProducts: MAX_PRODUCTS }),
);

pagePilotRouter.get(`${PREFIX}/page-pilot/slots`, async (c) => {
  try {
    const all = await allCampaigns();
    const slots = [] as any[];
    for (let i = 1; i <= MAX_SLOTS; i++) {
      const occupant = all.find((x) => x.slot === i) || null;
      slots.push({
        slot: i,
        campaign: occupant
          ? { id: occupant.id, slug: occupant.slug, title: occupant.title, status: occupant.status, productCount: (occupant.products || []).length }
          : null,
      });
    }
    return c.json({ success: true, maxSlots: MAX_SLOTS, maxProducts: MAX_PRODUCTS, slots });
  } catch (error: any) {
    return c.json({ error: `Failed to load slots: ${error?.message || error}` }, 500);
  }
});

pagePilotRouter.get(`${PREFIX}/page-pilot/list`, async (c) => {
  try {
    return c.json({ success: true, campaigns: await allCampaigns() });
  } catch (error: any) {
    return c.json({ error: `Failed to list campaigns: ${error?.message || error}` }, 500);
  }
});

// Track a storefront interaction on a campaign (best-effort counters).
//   body: { type: 'click' | 'view' | 'purchase', revenue?, orderId? }
//   'click' = shopper clicked a CTA/product; 'purchase' = attributed order completed.
pagePilotRouter.post(`${PREFIX}/page-pilot/track/:id`, async (c) => {
  try {
    const campaign = await kv.get(CP(c.req.param('id')));
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
    let body: any = {};
    try { body = await c.req.json(); } catch (_) { /* default */ }
    const type = String(body.type || 'click');
    if (type === 'view') {
      campaign.views = (campaign.views || 0) + 1;
    } else if (type === 'purchase') {
      // Guard against double-counting the same order (Stripe returns can re-fire).
      const orderId = body.orderId ? String(body.orderId) : '';
      campaign.attributedOrders = Array.isArray(campaign.attributedOrders) ? campaign.attributedOrders : [];
      if (orderId && campaign.attributedOrders.includes(orderId)) {
        return c.json({ success: true, duplicate: true });
      }
      if (orderId) campaign.attributedOrders.push(orderId);
      campaign.orders = (campaign.orders || 0) + 1;
      campaign.revenue = (campaign.revenue || 0) + (Number(body.revenue) || 0);
    } else {
      campaign.clicks = (campaign.clicks || 0) + 1;
    }
    await kv.set(CP(campaign.id), campaign);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: `Failed to track: ${error?.message || error}` }, 500);
  }
});

pagePilotRouter.get(`${PREFIX}/page-pilot/one/:id`, async (c) => {
  try {
    const campaign = await kv.get(CP(c.req.param('id')));
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
    return c.json({ success: true, campaign });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch campaign: ${error?.message || error}` }, 500);
  }
});

// Public storefront lookup by slug — only returns published pages.
pagePilotRouter.get(`${PREFIX}/page-pilot/by-slug/:slug`, async (c) => {
  try {
    const slug = c.req.param('slug');
    const all = await allCampaigns();
    const campaign = all.find((x) => x.slug === slug && x.status === 'published');
    if (!campaign) return c.json({ error: 'Campaign page not found' }, 404);
    // Best-effort view counter.
    try {
      campaign.views = (campaign.views || 0) + 1;
      await kv.set(CP(campaign.id), campaign);
    } catch (_) { /* ignore */ }
    return c.json({ success: true, campaign });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch campaign page: ${error?.message || error}` }, 500);
  }
});

// ── Generate the advertorial with AI ──────────────────────────────────────
pagePilotRouter.post(`${PREFIX}/page-pilot/generate`, async (c) => {
  try {
    const body = await c.req.json();
    const title = String(body.title || '').trim();
    const angle = String(body.angle || '').trim();
    const sourceUrl = String(body.sourceUrl || '').trim();
    const accent = String(body.accent || '#ea580c');
    const products = normalizeProducts(body.products || []);

    if (!products.length) {
      return c.json({ error: 'Select at least one product to build a campaign page.' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ error: 'AI is not configured (missing OPENAI_API_KEY).' }, 500);
    const openai = new OpenAI({ apiKey });

    const productLines = products
      .map((p, i) => `  ${i + 1}. ${p.name} — $${p.price}${p.originalPrice ? ` (was $${p.originalPrice})` : ''}${p.category ? ` [${p.category}]` : ''}${p.description ? ` — ${p.description.slice(0, 200)}` : ''}`)
      .join('\n');

    const system = `You are a direct-response DTC copywriter who writes high-converting advertorial landing pages (the "editorial-style" pages that top Meta/TikTok dropshipping brands run cold traffic to). You write with a specific, benefit-led, emotionally resonant voice — not generic marketing fluff. You never invent fake statistics or medical/false claims. Output ONLY valid JSON.`;

    const user = `Write one advertorial landing page that sells the following product(s) as a focused funnel.

CAMPAIGN TITLE (working name): ${title || '(none — infer a compelling one)'}
DESIRED ANGLE / HOOK: ${angle || '(none — choose the strongest angle for these products)'}
SOURCE / INSPIRATION URL: ${sourceUrl || '(none)'}

PRODUCTS ON THIS PAGE (max ${MAX_PRODUCTS}):
${productLines}

Return JSON with EXACTLY this shape:
{
  "title": string,                     // short internal campaign name
  "headline": string,                  // big hero headline, benefit-driven hook
  "subheadline": string,               // one supporting sentence under the headline
  "heroTagline": string,               // 3-6 word eyebrow/kicker above the headline
  "ctaLabel": string,                  // button text, e.g. "Get Yours 40% Off"
  "benefits": [ { "title": string, "body": string } ],   // 3-4 benefit blocks
  "story": string,                     // 2-3 short paragraphs of advertorial body copy (use \\n\\n between paragraphs)
  "socialProof": [ { "quote": string, "author": string } ], // 3 realistic testimonials (clearly illustrative, not fake named people)
  "faq": [ { "q": string, "a": string } ],   // 4 objection-handling Q&As
  "urgency": string,                   // one urgency/scarcity line (honest, no fake countdowns)
  "closingPitch": string               // final push paragraph before the CTA
}
Output ONLY the JSON object.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let content: any;
    try {
      content = JSON.parse(raw);
    } catch (parseErr) {
      console.log(`[page-pilot] failed to parse model JSON: ${parseErr}. Raw: ${raw.slice(0, 400)}`);
      return c.json({ error: 'The AI returned an unexpected format. Please try again.' }, 502);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const finalTitle = String(content.title || title || products[0].name).trim();
    const campaign = {
      id,
      slug: `${slugify(finalTitle)}-${id.slice(0, 6)}`,
      slot: null as number | null,
      status: 'draft',
      title: finalTitle,
      angle,
      sourceUrl,
      accent,
      products,
      content,
      views: 0,
      clicks: 0,
      orders: 0,
      revenue: 0,
      attributedOrders: [] as string[],
      created_at: now,
      updated_at: now,
    };
    await kv.set(CP(id), campaign);
    return c.json({ success: true, campaign }, 201);
  } catch (error: any) {
    console.log(`[page-pilot] generate error: ${error?.message || error}`);
    return c.json({ error: `Failed to generate campaign page: ${error?.message || error}` }, 500);
  }
});

// ── Update: edit copy, assign a slot, publish, swap products ───────────────
pagePilotRouter.put(`${PREFIX}/page-pilot/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(CP(id));
    if (!existing) return c.json({ error: 'Campaign not found' }, 404);
    const body = await c.req.json();

    // Resolve intended slot + status first so we can validate together.
    let nextSlot = existing.slot;
    if (body.slot !== undefined) {
      nextSlot = body.slot === null ? null : Number(body.slot);
      if (nextSlot !== null && (!Number.isInteger(nextSlot) || nextSlot < 1 || nextSlot > MAX_SLOTS)) {
        return c.json({ error: `Slot must be between 1 and ${MAX_SLOTS}.` }, 400);
      }
      if (nextSlot !== null) {
        const occupant = await slotOccupant(nextSlot, id);
        if (occupant) {
          return c.json({ error: `Slot ${nextSlot} is already used by "${occupant.title}". Retire it first or pick another slot.`, occupant: { id: occupant.id, title: occupant.title } }, 409);
        }
      }
    }

    const nextStatus = body.status !== undefined ? String(body.status) : existing.status;
    // Publishing requires an assigned slot.
    if (nextStatus === 'published' && (nextSlot === null || nextSlot === undefined)) {
      return c.json({ error: 'Assign this campaign to a slot before publishing.' }, 400);
    }

    const nextProducts = body.products !== undefined ? normalizeProducts(body.products) : existing.products;

    const record = {
      ...existing,
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.angle !== undefined ? { angle: String(body.angle) } : {}),
      ...(body.accent !== undefined ? { accent: String(body.accent) } : {}),
      products: nextProducts,
      slot: nextSlot,
      status: nextStatus,
      id,
      updated_at: new Date().toISOString(),
    };
    await kv.set(CP(id), record);
    return c.json({ success: true, campaign: record });
  } catch (error: any) {
    return c.json({ error: `Failed to update campaign: ${error?.message || error}` }, 500);
  }
});

pagePilotRouter.delete(`${PREFIX}/page-pilot/:id`, async (c) => {
  try {
    await kv.del(CP(c.req.param('id')));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: `Failed to delete campaign: ${error?.message || error}` }, 500);
  }
});

export default pagePilotRouter;
