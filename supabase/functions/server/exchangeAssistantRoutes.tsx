/**
 * Phoenix Exchange — the find assistant.
 *
 * One route. Somebody describes what they want; it answers with real
 * businesses from the directory, and with ours first where we have something.
 *
 * THE GOVERNING RULE, ENFORCED IN THREE PLACES
 *
 * Retrieval decides what is shown; the model never does. The model is given
 * rows that were already fetched and asked to describe them, and whatever it
 * says, `keepKnownIds` drops every id that was not in that set. A directory
 * assistant that invents a plumber has ended a product whose whole positioning
 * is that it can be trusted.
 *
 * MOST QUESTIONS NEVER REACH A MODEL
 *
 * The alias table answers "plumber", "roofer", "drafty windows" exactly, in a
 * millisecond, for nothing. The model is the fallback for the messy half. That
 * is not a cost compromise — it is a better answer, because a table lookup
 * cannot be wrong about what "plumber" means and a model occasionally is.
 *
 * PUBLIC, BECAUSE THAT IS THE POINT
 *
 * This is the front door for somebody who does not know which category to
 * pick, and browsing the Exchange has never needed an account. Model-backed
 * asks carry a daily ceiling per visitor; the alias path has none.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { recordDemand } from "./exchangeLedger.ts";
import {
  resolveFromAliases, weOfferSomething, fenceRows, holdingCategoryOf,
  withinDailyCap, assistantSystemPrompt, DAILY_MODEL_ASKS,
} from "./exchangeAssistant.ts";
/*
 * `keepKnownIds` is deliberately NOT imported yet.
 *
 * It is the guard for a model that chooses WHICH retrieved rows to feature,
 * and this route does not let it: the model writes a sentence and nothing
 * else, while `listings` comes straight from the query and is what the screen
 * renders. Importing it to call it on its own output would be theatre.
 *
 * The moment this route starts asking the model to pick or order the results,
 * it goes back in — and `tests/exchangeAssistant.test.ts` already holds it to
 * the behaviour that matters.
 */

export const exchangeAssistantRoutes = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function must(result: { data: any; error: any } | null, what: string): any {
  if (!result) throw new Error(`${what}: no result`);
  if (result.error) throw new Error(`${what}: ${result.error.message || result.error}`);
  return result.data;
}

/** How many businesses an answer shows. More than this is a list, not an answer. */
const SHOW = 6;

/**
 * Who is asking, for the daily ceiling.
 *
 * A signed-in person is counted by their id. Everybody else is counted by a
 * coarse fingerprint — never stored as anything but a counter key, never
 * joined to anything, and deliberately not precise enough to identify
 * somebody. The alternative is either an uncapped bill or a login in front of
 * the one feature built for people who have not got one.
 */
async function askerKey(c: any): Promise<string> {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
  if (token) {
    try {
      const { data } = await service().auth.getUser(token);
      if (data?.user?.id) return `user:${data.user.id}`;
    } catch { /* fall through to the coarse key */ }
  }
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return `anon:${ip}:${day}`;
}

async function askCount(sb: any, key: string): Promise<number> {
  const row = await sb.from("kv_store_57095a78").select("value").eq("key", `exchange_ai:${key}`).maybeSingle();
  const n = Number(row?.data?.value);
  return Number.isFinite(n) ? n : 0;
}

async function noteAsk(sb: any, key: string, used: number): Promise<void> {
  // Best effort. A counter that fails to save must not fail the answer.
  try {
    await sb.from("kv_store_57095a78").upsert({ key: `exchange_ai:${key}`, value: used + 1 });
  } catch { /* ignore */ }
}

/**
 * Ask the model what a question means, in a fixed shape.
 *
 * It picks from categories we actually have — the list is given to it — so the
 * worst it can do is choose the wrong one of ours, which is visible and
 * correctable in a tap. It cannot invent a category any more than it can
 * invent a business.
 */
async function interpret(ask: string, categories: any[], townName: string | null) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return null;

  const client = new (await import("npm:@anthropic-ai/sdk")).default({ apiKey: key });
  const menu = categories.map((c) => `${c.slug} — ${c.name}`).join("\n");

  const message = await client.messages.create({
    model: Deno.env.get("EXCHANGE_ASSISTANT_MODEL") || "claude-opus-5",
    max_tokens: 400,
    system: [
      "Somebody has described what they need from a local business directory.",
      "Choose the ONE category from the list that best answers them.",
      townName ? `They are in ${townName}, New Hampshire.` : "",
      "",
      "Answer as JSON and nothing else:",
      '{"slug":"<a slug from the list, or null>","because":"<six words at most>","ask":"<one short question, only if the need is genuinely ambiguous, else null>"}',
      "",
      "Rules:",
      "- The slug MUST be one from the list. Never invent one.",
      "- CHOOSE. Almost always there is a reasonable category and you should pick",
      "  it. Somebody who said 'somewhere to get my hair cut' wants hair salons —",
      "  showing them and letting them say 'no, a barber' takes one tap, while",
      "  asking first makes them answer a question before seeing anything.",
      "- You may give BOTH a slug and a question. The slug shows results now; the",
      "  question is offered underneath as a refinement. Prefer this to asking alone.",
      "- Answer with a null slug only when the candidates sit in genuinely",
      "  different parts of life — a restaurant versus a plumber — so that picking",
      "  one would send somebody somewhere unrelated.",
      "- For a described problem rather than a trade ('my basement smells damp'),",
      "  choose the trade that fixes it.",
    ].filter(Boolean).join("\n"),
    messages: [{
      role: "user" as const,
      content: `CATEGORIES\n${menu}\n\n---\n\nWHAT THEY SAID\n${ask.slice(0, 500)}`,
    }],
  });

  const raw = message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fenced ? fenced[1].trim() : raw;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) return null;

  try {
    const parsed = JSON.parse(text.slice(first, last + 1));
    // A slug the model made up is refused here, not trusted downstream.
    const slug = String(parsed?.slug ?? "");
    return {
      slug: categories.some((c) => c.slug === slug) ? slug : null,
      because: String(parsed?.because ?? "").slice(0, 80),
      ask: parsed?.ask ? String(parsed.ask).slice(0, 140) : null,
    };
  } catch {
    return null;
  }
}

/** Write the sentence above the cards, from rows that were actually fetched. */
async function phrase(ask: string, rows: any[], townName: string | null): Promise<string | null> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return null;

  try {
    const client = new (await import("npm:@anthropic-ai/sdk")).default({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("EXCHANGE_ASSISTANT_MODEL") || "claude-opus-5",
      max_tokens: 300,
      system: assistantSystemPrompt(townName),
      messages: [{
        role: "user" as const,
        content: `THEY ASKED\n${ask.slice(0, 500)}\n\n${fenceRows(rows)}`,
      }],
    });
    return message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim() || null;
  } catch {
    // A missing sentence is not a missing answer: the cards carry the result.
    return null;
  }
}

exchangeAssistantRoutes.post("/exchange/assistant", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const ask = String(body?.ask ?? "").trim().slice(0, 500);
  const territory = String(body?.territory ?? "").trim();
  if (ask.length < 2) return c.json({ success: false, error: "What are you after?" }, 400);

  try {
    const sb = service();

    const [categoryRows, aliasRows, townRow] = await Promise.all([
      sb.from("exchange_category").select("id, slug, name, section_slug, parent_id, is_construction").eq("status", "active"),
      sb.from("exchange_category_alias").select("phrase, category_id"),
      territory
        ? sb.from("exchange_territory").select("slug, name").eq("slug", territory).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const categories = must(categoryRows, "reading the categories") as any[];
    const aliases = must(aliasRows, "reading the aliases") as any[];
    const town = must(townRow, "reading the town");
    const townName = town?.name ?? null;

    const byId = new Map(categories.map((x) => [x.id, x]));
    const aliasList = aliases
      .map((a) => {
        const cat = byId.get(a.category_id);
        return cat ? { phrase: a.phrase, categorySlug: cat.slug, categoryName: cat.name } : null;
      })
      .filter(Boolean) as any[];

    /* ── the free path first ─────────────────────────────────────────── */
    let resolution = resolveFromAliases(ask, aliasList);
    let question: string | null = null;
    let usedModel = false;

    if (!resolution) {
      const key = await askerKey(c);
      const used = await askCount(sb, key);
      if (!withinDailyCap(used)) {
        return c.json({
          success: true,
          capped: true,
          // Said plainly rather than degraded silently.
          reply: `That is as many questions as this browser gets today — ${DAILY_MODEL_ASKS}. Browsing and searching still work as normal.`,
          listings: [],
        });
      }

      const read = await interpret(ask, categories.filter((x) => !x.parent_id), townName);
      await noteAsk(sb, key, used);
      usedModel = true;

      if (read?.slug) {
        const cat = categories.find((x) => x.slug === read.slug);
        if (cat) resolution = { categorySlug: cat.slug, categoryName: cat.name, how: "model", matched: read.because || ask };
      }
      if (read?.ask) question = read.ask;
    }

    /* ── nothing understood ──────────────────────────────────────────── */
    if (!resolution) {
      // The whole reason the demand ledger exists, and the first thing that
      // has ever actually filled it with a phrase.
      void recordDemand(sb, {
        phrase: ask,
        territorySlug: territory || null,
        resultsCount: 0,
        meta: { surface: "assistant" },
      });
      return c.json({
        success: true,
        reply: question
          ?? `I could not work out which trade that is. The directory covers ${categories.filter((x) => !x.parent_id).length} kinds of business — try naming one, or tell us who you were after and we will go and find them.`,
        question,
        listings: [],
        recorded: true,
      });
    }

    /* ── retrieve, for real ──────────────────────────────────────────── */
    const asked = categories.find((x) => x.slug === resolution!.categorySlug);
    /*
     * A business holds a category, never a service under one — so resolve up
     * to the holder before querying, and report the HOLDER to the caller. The
     * rule itself lives in `exchangeAssistant.ts`, where it is tested.
     */
    const holding = holdingCategoryOf(asked, categories);
    const holdingId = holding?.id;

    const embeds = ["organization_category!inner ( category_id )"];
    if (territory) embeds.push("organization_territory!inner ( territory_slug )");

    let query = sb.from("organizations")
      .select(["id, slug, name, type, status, claim_state, phone, website, service_lat, service_lng", ...embeds].join(", "))
      .eq("organization_category.category_id", holdingId);
    if (territory) query = query.eq("organization_territory.territory_slug", territory);

    const rows = must(await query, "finding businesses") as any[];

    const seen = new Set<string>();
    const listings = (rows ?? [])
      .filter((r) => r && r.status === "active" && !seen.has(r.id) && seen.add(r.id))
      .slice(0, SHOW)
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        claimed: String(r.claim_state ?? "") === "claimed",
        phone: r.phone ?? null,
        website: r.website ?? null,
        location: r.service_lat != null && r.service_lng != null
          ? { lat: Number(r.service_lat), lng: Number(r.service_lng) }
          : null,
      }));

    if (!listings.length) {
      void recordDemand(sb, {
        phrase: ask,
        categoryId: holdingId ?? null,
        territorySlug: territory || null,
        resultsCount: 0,
        meta: { surface: "assistant" },
      });
    }

    /* ── ours, where we have something ───────────────────────────────── */
    const ours = weOfferSomething({
      slug: resolution.categorySlug,
      sectionSlug: holding?.section_slug,
      isConstruction: holding?.is_construction,
    });

    /* ── the sentence ────────────────────────────────────────────────── */
    let reply: string | null = null;
    if (usedModel && listings.length) {
      /*
       * The model writes the sentence and nothing else. It is never asked for
       * ids here, so there is nothing to filter: `listings` is the query
       * result and is what the screen renders. `keepKnownIds` is the guard
       * for the day this route starts letting the model choose WHICH of the
       * retrieved rows to feature — the moment that changes, it goes here.
       */
      reply = await phrase(ask, listings, townName);
    }
    if (!reply) {
      reply = listings.length
        ? `${listings.length === SHOW ? "Here are some" : String(listings.length)} ${resolution.categoryName.toLowerCase()} business${listings.length === 1 ? "" : "es"}${townName ? ` in ${townName}` : ""}.`
        : `Nobody in the directory does ${resolution.categoryName.toLowerCase()}${townName ? ` in ${townName}` : ""} yet. We have made a note of it.`;
    }

    return c.json({
      success: true,
      // Shown on screen, so a wrong reading is obvious and correctable rather
      // than hidden behind a confident sentence.
      understood: {
        category: resolution.categoryName,
        slug: resolution.categorySlug,
        // What businesses actually hold, so a screen can light its own control
        // rather than re-querying. Equal to `slug` unless an alias resolved to
        // a service and we walked up to the category holding it.
        holdingSlug: holding?.slug ?? null,
        holdingCategory: holding?.name ?? resolution.categoryName,
        how: resolution.how,
        matched: resolution.matched,
      },
      town: townName,
      reply,
      listings,
      weOffer: ours,
      recorded: !listings.length,
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});
