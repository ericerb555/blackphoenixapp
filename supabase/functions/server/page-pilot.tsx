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
import Anthropic from 'npm:@anthropic-ai/sdk';
import * as kv from './kv_store.tsx';

// ── Which model writes the page ─────────────────────────────────────────────
// Set PAGE_PILOT_PROVIDER=anthropic to write pages with Claude instead of
// gpt-4o. Defaults to openai, so an unset variable changes nothing. The prompt
// is byte-identical on both paths — the point is to compare the writing, not
// two different briefs.
//
// One real difference the flag cannot hide: the OpenAI call passes
// temperature 0.8 to loosen it up, and Claude rejects sampling parameters
// outright. Variety there has to come from the prompt, which is what the
// "directions already in use" block does.
// `override` is the per-request escape hatch: comparing the two writers by
// changing a deployed secret and waiting for a redeploy makes the comparison
// too slow to actually do, so the generate call accepts a provider directly.
// Both targets are already-configured providers, so this grants no access the
// caller didn't have — an unrecognised value falls through to the default.
function pagePilotProvider(override?: unknown): 'anthropic' | 'openai' {
  const pick = String(override || Deno.env.get('PAGE_PILOT_PROVIDER') || '').toLowerCase();
  if (pick === 'anthropic' || pick === 'claude') return 'anthropic';
  if (pick === 'openai') return 'openai';
  return 'openai';
}

/**
 * Ask Claude for the campaign JSON. Returns the raw text; the caller parses and
 * validates it exactly as it does the OpenAI response.
 */
async function writeWithClaude(system: string, user: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: Deno.env.get('PAGE_PILOT_ANTHROPIC_MODEL') || 'claude-opus-5',
    // Thinking is on by default and counts against max_tokens, so a limit sized
    // for the JSON alone would truncate the page mid-object. The JSON runs
    // ~2.5k tokens; the rest is headroom for reasoning.
    max_tokens: 16000,
    // Someone is watching a spinner while this runs. Medium keeps the wait
    // reasonable; raise it if the writing is worth the extra seconds.
    output_config: { effort: (Deno.env.get('PAGE_PILOT_EFFORT') || 'medium') as any },
    system,
    messages: [{ role: 'user', content: user }],
  });

  return message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
}

/**
 * Pull a JSON object out of a model response. gpt-4o is held to JSON mode and
 * returns bare JSON; Claude is asked for JSON in the prompt and will sometimes
 * wrap it in a fence or a sentence, which is a formatting quirk rather than a
 * failure — recover it instead of erroring the whole generation.
 */
function extractJson(raw: string): string {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) return text.slice(first, last + 1);
  return text;
}

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
    .map((p) => {
      // Digital products (`marketplace_product:` rows — ebooks, templates,
      // calculators, AI reports) store price in CENTS and use `title` rather
      // than `name`. Passing one through unconverted advertised a $129 report
      // as "$12900". Convert only when the caller says so, or when the row is
      // explicitly flagged digital — never guess from magnitude, since a real
      // physical product can legitimately cost $12,900.
      const isDigital = p.isDigital === true || p.kind === 'digital' || p.type === 'digital';
      const inCents = p.priceInCents === true || (isDigital && p.priceInCents !== false);
      const money = (v: any) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return undefined;
        return inCents ? Math.round(n) / 100 : n;
      };

      return {
        id: String(p.id ?? p.sku ?? crypto.randomUUID()),
        name: String(p.name ?? p.title ?? 'Product'),
        description: String(p.description ?? p.subtitle ?? ''),
        price: money(p.price) ?? 0,
        originalPrice: p.originalPrice != null ? money(p.originalPrice) : undefined,
        image: String(p.image ?? p.primaryImage ?? (Array.isArray(p.images) ? p.images[0] : '') ?? ''),
        images: Array.isArray(p.images) ? p.images.filter((u: any) => typeof u === 'string' && u.trim()) : undefined,
        category: p.category ? String(p.category) : undefined,
        rating: typeof p.rating === 'number' ? p.rating : undefined,
        reviews: typeof p.reviews === 'number' ? p.reviews : undefined,
        badge: p.badge ? String(p.badge) : undefined,
        // Carried through so the copywriter can address the right reader —
        // digital products already record who they are for.
        audience: Array.isArray(p.audience) ? p.audience.map((a: any) => String(a)) : undefined,
        features: Array.isArray(p.features) ? p.features.map((f: any) => String(f)) : undefined,
        isDigital,
      };
    });
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

    const provider = pagePilotProvider(body.provider);
    const apiKey = Deno.env.get(provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY');
    if (!apiKey) {
      return c.json({
        error: `AI is not configured (missing ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}).`,
      }, 500);
    }

    const productLines = products
      .map((p, i) => `  ${i + 1}. ${p.name} — $${p.price}${p.originalPrice ? ` (was $${p.originalPrice})` : ''}${p.category ? ` [${p.category}]` : ''}${p.audience?.length ? ` {for: ${p.audience.join(', ')}}` : ''}${p.features?.length ? ` {includes: ${p.features.slice(0, 6).join('; ')}}` : ''}${p.description ? ` — ${p.description.slice(0, 200)}` : ''}`)
      .join('\n');

    // A downloadable report sold with "fast shipping" and "easy returns" reads
    // as a template nobody adapted. Tell the writer what it is actually selling.
    const allDigital = products.length > 0 && products.every((p) => p.isDigital);
    const digitalNote = allDigital
      ? `\nIMPORTANT — these are DIGITAL products (instant download / online delivery). Never mention shipping, delivery times, packaging, or physical returns. Sell the outcome the buyer gets and how fast they get it. Objections to handle are about format, what is actually included, whether it applies to their situation, and refund policy — not postage.`
      : '';

    // Each page used to be designed blind, so the model kept reaching for the
    // same safe defaults — asked for three products it returned luxe/serif twice
    // and serif three times out of three. Show it what is already on the shelf
    // and require something different. This is the only reliable way to get a
    // varied SET rather than three independently reasonable pages that happen to
    // look alike.
    let varietyNote = '';
    try {
      const existing = await allCampaigns();
      const used = existing
        .map((c: any) => c?.content?.design)
        .filter(Boolean)
        .slice(0, 12);
      if (used.length) {
        const archetypes = used.map((d: any) => d.archetype).filter(Boolean);
        const displays = used.map((d: any) => d.display).filter(Boolean);
        const accents = used.map((d: any) => d?.palette?.accent).filter(Boolean);
        const tally = (arr: string[]) =>
          Object.entries(arr.reduce((m: any, v) => ((m[v] = (m[v] || 0) + 1), m), {}))
            .map(([k, n]) => `${k} x${n}`).join(', ');

        varietyNote = `

DIRECTIONS ALREADY IN USE ON THIS STORE — do NOT repeat them unless this product
genuinely demands it, and if you do repeat one, say why in the rationale:
  archetypes: ${tally(archetypes) || 'none yet'}
  typefaces : ${tally(displays) || 'none yet'}
  accents   : ${accents.slice(0, 8).join(', ') || 'none yet'}

These pages sit side by side in one store. A shopper who lands on two of them
should not feel they are looking at the same template with the words swapped.
Pick the archetype that genuinely fits THIS product — and if the obvious choice
is already used twice, take the second-best fit instead and make it work.
Choose an accent that is visibly distinct from the ones listed above, not a
neighbouring shade of them.`;
      }
    } catch (err) {
      // Variety guidance is a nice-to-have; never block generation on it.
      console.log(`[page-pilot] could not load existing designs: ${err}`);
    }

    const system = `You are a direct-response DTC copywriter AND art director who writes high-converting advertorial landing pages (the "editorial-style" pages that top Meta/TikTok dropshipping brands run cold traffic to). You write with a specific, benefit-led, emotionally resonant voice — not generic marketing fluff. You never invent fake statistics or medical/false claims.

On art direction you are deliberately varied. "Luxe" and "serif" are your defaults and you must resist them: reach for those only when the product is genuinely a premium, restrained object. A budget gadget, a novelty item, a tool, a toy and a technical product each deserve a different look, and a page for one should be visually unmistakable from a page for another. Output ONLY valid JSON.`;

    const user = `Write one advertorial landing page that sells the following product(s) as a focused funnel.${varietyNote}

CAMPAIGN TITLE (working name): ${title || '(none — infer a compelling one)'}
DESIRED ANGLE / HOOK: ${angle || '(none — choose the strongest angle for these products)'}
SOURCE / INSPIRATION URL: ${sourceUrl || '(none)'}

PRODUCTS ON THIS PAGE (max ${MAX_PRODUCTS}):
${productLines}
${digitalNote}

You are also the ART DIRECTOR for this page. Every campaign currently renders in
the same layout with the same orange accent, so every product looks identical.
Choose a direction that belongs to THIS product and this audience — a Y2K camera,
a bridal dress and a Christmas tree should not look remotely alike. Pick the
palette from the product's own world, not from a generic "ecommerce" palette, and
make it entertaining to read as well as informative.

Return JSON with EXACTLY this shape:
{
  "title": string,                     // short internal campaign name
  "headline": string,                  // big hero headline, benefit-driven hook
  "subheadline": string,               // one supporting sentence under the headline
  "heroTagline": string,               // 3-6 word eyebrow/kicker above the headline
  "ctaLabel": string,                  // button text, e.g. "Get Yours 40% Off"
  "benefits": [ { "title": string, "body": string } ],   // 3-4 benefit blocks
  "story": string,                     // 2-3 short paragraphs of advertorial body copy (use \\n\\n between paragraphs)
  "socialProof": [ { "quote": string, "author": string } ], // 3 illustrative testimonials — mark the author as a placeholder, never a fake named real person
  "faq": [ { "q": string, "a": string } ],   // 4 objection-handling Q&As
  "urgency": string,                   // one urgency/scarcity line (honest, no fake countdowns)
  "closingPitch": string,              // final push paragraph before the CTA
  "funFacts": [ string ],              // 2-3 genuinely interesting, TRUE facts about this product or its category — the entertaining part. No invented statistics.
  "design": {
    "archetype": "editorial" | "bold" | "demo" | "story" | "luxe",
        // editorial = magazine advertorial, long copy, serif, image-led
        // bold      = huge type, high contrast, punchy, minimal copy
        // demo      = product-forward, specs and comparison, technical
        // story     = narrative scroll, before/after, emotional
        // luxe      = restrained, whitespace, elegant, understated
    "palette": {
      "accent": string,      // hex — the product's signature colour, NOT a default orange
      "accentDeep": string,  // hex — darker partner for gradients and hovers
      "ground": string,      // hex — page background
      "surface": string,     // hex — card background, must sit on ground
      "ink": string          // hex — body text, must pass contrast on ground AND surface
    },
    "display": "serif" | "grotesk" | "condensed" | "mono",
    "hero": "split" | "full-bleed" | "stacked" | "centered",
    "mood": string,          // 3-6 words describing the feel
    "rationale": string,     // one sentence: why this direction suits THIS product
    "imagePrompts": {
      "hero": string,        // art direction for the hero image — composition, light, vantage
      "lifestyle": string,   // the product in use, in its natural context
      "detail": string       // a close macro shot of the thing that justifies the price
    }
  }
}
Output ONLY the JSON object.`;

    let raw: string;
    const startedAt = Date.now();
    try {
      if (provider === 'anthropic') {
        raw = await writeWithClaude(system, user);
      } else {
        const openai = new OpenAI({ apiKey });
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
        raw = completion.choices?.[0]?.message?.content || '{}';
      }
    } catch (err: any) {
      console.log(`[page-pilot] ${provider} request failed: ${err?.message || err}`);
      return c.json({ error: 'The AI could not be reached. Please try again.' }, 502);
    }
    console.log(`[page-pilot] wrote page via ${provider} in ${Date.now() - startedAt}ms`);

    let content: any;
    try {
      content = JSON.parse(extractJson(raw || '{}'));
    } catch (parseErr) {
      console.log(`[page-pilot] failed to parse ${provider} JSON: ${parseErr}. Raw: ${raw.slice(0, 400)}`);
      return c.json({ error: 'The AI returned an unexpected format. Please try again.' }, 502);
    }

    // The design block drives real CSS, so a malformed value would render an
    // unreadable page rather than fail loudly. Validate every field against a
    // known set and fall back per-field — never discard the whole direction
    // because one hex was wrong.
    const HEX = /^#[0-9a-fA-F]{6}$/;
    const ARCHETYPES = ['editorial', 'bold', 'demo', 'story', 'luxe'];
    const DISPLAYS = ['serif', 'grotesk', 'condensed', 'mono'];
    const HEROES = ['split', 'full-bleed', 'stacked', 'centered'];
    const pick = (v: any, allowed: string[], fallback: string) =>
      allowed.includes(String(v)) ? String(v) : fallback;
    const hex = (v: any, fallback: string) => (HEX.test(String(v)) ? String(v) : fallback);

    const rawDesign = content.design || {};
    const rawPalette = rawDesign.palette || {};
    const design = {
      archetype: pick(rawDesign.archetype, ARCHETYPES, 'editorial'),
      display: pick(rawDesign.display, DISPLAYS, 'grotesk'),
      hero: pick(rawDesign.hero, HEROES, 'split'),
      mood: String(rawDesign.mood || ''),
      rationale: String(rawDesign.rationale || ''),
      palette: {
        // `accent` falls back to the caller's value only as a last resort — the
        // whole point is that pages stop sharing one orange.
        accent: hex(rawPalette.accent, accent),
        accentDeep: hex(rawPalette.accentDeep, '#7c2d12'),
        ground: hex(rawPalette.ground, '#ffffff'),
        surface: hex(rawPalette.surface, '#f8f6f4'),
        ink: hex(rawPalette.ink, '#171412'),
      },
      imagePrompts: {
        hero: String(rawDesign.imagePrompts?.hero || ''),
        lifestyle: String(rawDesign.imagePrompts?.lifestyle || ''),
        detail: String(rawDesign.imagePrompts?.detail || ''),
      },
    };
    content.design = design;
    content.funFacts = Array.isArray(content.funFacts)
      ? content.funFacts.map((f: any) => String(f)).filter(Boolean).slice(0, 3)
      : [];

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
      // Kept for older campaigns and the editor's colour picker, but the
      // renderer should prefer content.design.palette.accent — that is the one
      // chosen for this specific product.
      accent: design.palette.accent,
      // Which writer produced this page. Without it a saved campaign gives no
      // way to tell the two apart after the fact, which is the whole point of
      // running them side by side.
      writtenBy: provider,
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
