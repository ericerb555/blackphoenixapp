/**
 * Store AI Pricing Agent — for the owner's Product Catalog pricing desk.
 *
 * Given a set of catalog products (by id), asks the LLM to estimate, per item:
 *   • a realistic MARKET RETAIL price (so you price to the market, not a flat markup), and
 *   • a realistic per-item SHIPPING cost — useful when the dropship supplier doesn't
 *     expose live shipping, so every item still gets a defensible landed cost.
 *
 * The server applies margin guardrails (floor/ceiling + charm pricing) to the
 * price, and clamps shipping to a sane range, so the model can't return numbers
 * that would sell at a loss.
 *
 * Route (admin only):
 *   POST /make-server-3eae23a6/store-ai-pricing/suggest
 *     body: { items:[{id,name,category,cost,shipping?,currentPrice?}],
 *             strategy?: 'competitive'|'value'|'premium',
 *             minMarginPct?: number, maxMarkupPct?: number,
 *             estimateShipping?: boolean }
 *     → { success, suggestions:[{ id, suggestedPrice, suggestedShipping, margin, confidence, rationale }] }
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const storeAiPricingRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

async function requireAdmin(c: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user }, error } = await supabase.auth.getUser(accessToken ?? "");
  if (error || !user?.id) return { ok: false, error: `Authorization error while running AI pricing: ${error?.message || "no user"}`, status: 401 };
  const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
  const role = perms?.role || user.app_metadata?.role;
  if (role !== "admin" && role !== "owner" && role !== "super_admin") {
    return { ok: false, error: "Administrator access is required to run AI pricing.", status: 403 };
  }
  return { ok: true };
}

const money = (n: any) => { const v = Number(n); return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0; };

storeAiPricingRouter.post(`${PREFIX}/store-ai-pricing/suggest`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const items = (Array.isArray(body.items) ? body.items : [])
      .map((i: any) => ({
        id: String(i.id || ""),
        name: String(i.name || ""),
        category: String(i.category || "General"),
        cost: Number(i.cost) || 0,
        shipping: Number(i.shipping) || 0,
        currentPrice: Number(i.currentPrice) || 0,
      }))
      .filter((i: any) => i.id && i.cost > 0);
    if (items.length === 0) return c.json({ success: false, error: "No priceable items provided (each needs an id and a cost > 0)." }, 400);

    const minMargin = Math.max(0, Number(body.minMarginPct ?? 20)) / 100;
    const maxMarkup = Math.max(minMargin, Number(body.maxMarkupPct ?? 400) / 100);
    const strategy = ["competitive", "value", "premium"].includes(body.strategy) ? body.strategy : "competitive";
    const estimateShipping = body.estimateShipping !== false;

    const clampPrice = (price: number, cost: number) => {
      const floor = cost * (1 + minMargin);
      const ceil = cost * (1 + maxMarkup);
      let p = Math.min(Math.max(price, floor), ceil);
      p = Math.max(0.99, Math.round(p) - 0.01); // charm pricing
      return money(p);
    };
    // Shipping sanity: non-negative, and never absurd relative to cost.
    const clampShipping = (ship: number, cost: number) => {
      const v = Math.max(0, money(ship));
      const cap = Math.max(50, cost * 1.5); // heavy/bulky items can ship for more, but cap runaway values
      return money(Math.min(v, cap));
    };

    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) return c.json({ success: false, error: "OPENAI_API_KEY is not configured." }, 500);

    const strategyHint = {
      competitive: "Price to match or slightly undercut typical online marketplace prices to maximize sales volume.",
      value: "Price on the lower end of the market range to win price-sensitive shoppers while staying above the margin floor.",
      premium: "Price toward the higher end where the product/category supports it, without exceeding the ceiling.",
    }[strategy];

    const shippingLine = estimateShipping
      ? `- "shipping": estimate a realistic per-item SHIPPING cost in USD to ship this within the US, inferred from the product's likely size/weight for its category (small light item ≈ 3-7, medium ≈ 8-15, large/heavy ≈ 16-40). A number.`
      : "";

    const chunks: any[][] = [];
    for (let i = 0; i < items.length; i += 40) chunks.push(items.slice(i, i + 40));

    const suggestions: any[] = [];
    for (const chunk of chunks) {
      const prompt = `You are a pricing strategist for an e-commerce store. For each product, estimate a realistic MARKET RETAIL price a shopper would expect to pay online for a similar item, based on the product name and category. ${strategyHint}
Goal: competitive prices that drive sales — do NOT overprice.
Return STRICT JSON: {"prices":[{"id","price"${estimateShipping ? ',"shipping"' : ""},"confidence","rationale"}]}.
- "id": echo the product id exactly.
- "price": your suggested retail price in USD (a number). We apply margin guardrails afterward, so price to the market, not to a fixed markup.
${shippingLine}
- "confidence": 0-1 how sure you are.
- "rationale": <= 12 words on the reasoning.
Products:
${JSON.stringify(chunk.map((i) => ({ id: i.id, name: i.name, category: i.category, myCost: i.cost })))}`;

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAIKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a precise e-commerce pricing assistant. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.log("[store-ai-pricing] OpenAI error:", resp.status, errText);
        return c.json({ success: false, error: `AI pricing failed (HTTP ${resp.status}).`, details: errText.slice(0, 300) }, 502);
      }
      const data = await resp.json();
      let parsed: any = {};
      try { parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
      const rows = Array.isArray(parsed.prices) ? parsed.prices : [];
      const byId: Record<string, any> = {};
      for (const r of rows) byId[String(r.id)] = r;

      for (const item of chunk) {
        const r = byId[item.id];
        const rawPrice = Number(r?.price);
        const suggestedPrice = clampPrice(Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : item.cost * (1 + minMargin), item.cost);
        const suggestedShipping = estimateShipping
          ? clampShipping(Number.isFinite(Number(r?.shipping)) ? Number(r.shipping) : item.shipping, item.cost)
          : money(item.shipping);
        const landed = money(item.cost + suggestedShipping);
        const margin = suggestedPrice > 0 ? Math.round(((suggestedPrice - landed) / suggestedPrice) * 100) : 0;
        suggestions.push({
          id: item.id,
          cost: item.cost,
          currentPrice: item.currentPrice,
          suggestedPrice,
          suggestedShipping,
          margin,
          confidence: Number.isFinite(Number(r?.confidence)) ? Number(r.confidence) : 0.4,
          rationale: r?.rationale ? String(r.rationale) : "Priced to margin floor (no market signal).",
        });
      }
    }

    return c.json({ success: true, strategy, estimateShipping, minMarginPct: minMargin * 100, maxMarkupPct: maxMarkup * 100, suggestions });
  } catch (error) {
    console.log("[store-ai-pricing/suggest] error:", error);
    return c.json({ success: false, error: `Failed to generate AI pricing: ${error}` }, 500);
  }
});

export default storeAiPricingRouter;
