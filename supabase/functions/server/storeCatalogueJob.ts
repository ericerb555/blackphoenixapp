/**
 * The job that stops the catalogue lying.
 *
 * WHAT IT FIXES
 *
 * The store could sell what cannot ship and sell at a margin that had quietly
 * gone negative. `syncInventory` was an administrator button, so a product CJ
 * ran out of overnight stayed on sale until somebody remembered to press it,
 * and a supplier cost rise was invisible until a month's figures came in.
 *
 * WHAT IT WILL NOT DECIDE
 *
 * The margin floor and the re-price band are the owner's numbers, not a
 * developer's. Until somebody has set them this job does nothing except ask
 * for them — because a floor invented here would be a pricing decision taken
 * by the wrong person, and it would be invisible precisely because it looked
 * like a default.
 *
 * HOW IT WORKS THROUGH THE CATALOGUE
 *
 * A cursor, not the whole list. Two CJ calls per product and a hundred and
 * twenty products would be two hundred and forty calls in one tick against a
 * rate-limited API. Each tick takes the next slice and remembers where it got
 * to, so the catalogue is swept continuously rather than all at once.
 */
import * as kv from "./kv_store.tsx";
import { Hono } from "npm:hono@4";
import { registerStoreJob, askForGuidance, withdrawAsk, type StoreJobContext, type StoreJobResult } from "./storeAutonomy.ts";
import { fetchCJVariantSnapshot, storedOrSecretKey as cjKey, CJ_ACCESS_DISABLED } from "./cjdropshipping.tsx";
import * as config from "./dropshipper-config.tsx";
import { isStaffRequest } from "./requireStaff.ts";
import {
  type CataloguePolicy, normalisePolicy, decideListing,
  MARGIN_FLOOR_MAX, REPRICE_BAND_MAX,
} from "./storeCataloguePolicy.ts";

export const storeCatalogueRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

const POLICY_KEY = "store:catalogue:policy";
const CURSOR_KEY = "store:catalogue:cursor";
const PRODUCT_PREFIX = "product_cj_";
const INVENTORY_PREFIX = "dropshipper_inventory:";

/** Products examined per tick. Two CJ calls each, against a throttled API. */
const PER_TICK = 12;

async function readPolicy(): Promise<CataloguePolicy> {
  return normalisePolicy(await kv.get(POLICY_KEY));
}

/** The named policies the ask offers, so a choice sets real numbers. */
const POLICY_CHOICES: Record<string, { marginFloor: number; repriceBand: number }> = {
  standard: { marginFloor: 0.35, repriceBand: 0.1 },
  tight: { marginFloor: 0.5, repriceBand: 0.1 },
  "always-ask": { marginFloor: 0.35, repriceBand: 0 },
};

/**
 * Ask the owner for the two numbers, and act on the answer.
 *
 * Returns the policy once it exists, or null while the question is open. The
 * job does nothing at all in the meantime — which is the correct behaviour for
 * "I have not been told what the rules are".
 */
async function policyOrAsk(): Promise<CataloguePolicy | null> {
  const policy = await readPolicy();
  if (policy.configured) return policy;

  const ask = await askForGuidance({
    job: "catalogue",
    dedupeKey: "policy",
    question: "What margin should the store protect, and how far may it move a price on its own?",
    because:
      "CJ's costs move. To take a product off sale or raise its price without asking every time, this job needs a margin floor and a limit on how big an automatic rise may be. Those are pricing decisions, so it will not invent them — it does nothing until you choose.",
    wouldHaveDone:
      "Nothing. The catalogue is not being checked for stock or cost drift while this is unanswered.",
    choices: [
      { key: "standard", label: "35% floor, raise up to 10%", consequence: "Most cost rises are absorbed by a small automatic price increase. Anything bigger stops and asks." },
      { key: "tight", label: "50% floor, raise up to 10%", consequence: "Protects a wider margin, so more products will come off sale or ask." },
      { key: "always-ask", label: "35% floor, never re-price automatically", consequence: "Stock still goes off sale by itself, but every price change waits for you." },
    ],
    detail: [
      ["Products this would govern", "the live CJ catalogue"],
      ["For exact figures", "PUT /store/catalogue/policy { marginFloor, repriceBand }"],
      ["Margin means", "(price − cost − shipping) ÷ price"],
    ],
  });

  if (ask.status !== "answered") return null;

  const chosen = POLICY_CHOICES[String(ask.answer || "")];
  if (!chosen) return null;
  const saved: CataloguePolicy = {
    configured: true,
    ...chosen,
    updatedAt: new Date().toISOString(),
    updatedBy: ask.answeredBy || "answered in the review queue",
  };
  await kv.set(POLICY_KEY, saved);
  console.log(`[catalogue] policy set from the queue: floor ${saved.marginFloor}, band ${saved.repriceBand}`);
  return saved;
}

/** Live CJ listings, in a stable order so a cursor means something. */
async function listings(): Promise<any[]> {
  const rows = ((await kv.getByPrefix(PRODUCT_PREFIX)) || []) as any[];
  return rows
    .filter((p) => p && typeof p === "object" && p.sku)
    .sort((a, b) => String(a.sku).localeCompare(String(b.sku)));
}

/** The variant id, from the supplier inventory record the importer wrote. */
async function knownVid(sku: string): Promise<string | undefined> {
  const raw = await kv.get(`${INVENTORY_PREFIX}${sku}`);
  if (!raw) return undefined;
  try {
    const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
    return rec?.vid ? String(rec.vid) : undefined;
  } catch {
    return undefined;
  }
}

async function catalogueJob(ctx: StoreJobContext): Promise<StoreJobResult> {
  const policy = await policyOrAsk();
  if (!policy) {
    return { ran: false, detail: "Waiting on a margin floor and a re-price band. Nothing is being checked." };
  }

  const all = await listings();
  if (all.length === 0) return { ran: false, detail: "No CJ products are listed." };

  // Pick up where the last tick stopped.
  const cursor = String((await kv.get(CURSOR_KEY)) || "");
  const startAt = cursor ? all.findIndex((p) => String(p.sku) > cursor) : 0;
  const from = startAt < 0 ? 0 : startAt;
  const slice = all.slice(from, from + PER_TICK);
  const batch = slice.length > 0 ? slice : all.slice(0, PER_TICK);

  const apiKey = cjKey((await config.getProvider("cjdropshipping"))?.apiKey) || undefined;

  let checked = 0;
  let delisted = 0;
  let relisted = 0;
  let repriced = 0;
  let asked = 0;
  let unknown = 0;
  const problems: string[] = [];

  for (const product of batch) {
    const sku = String(product.sku);
    let facts;
    try {
      facts = await fetchCJVariantSnapshot(apiKey, String(product.providerProductId || ""), await knownVid(sku));
      checked += 1;
    } catch (error: any) {
      const message = String(error?.message || error);
      /**
       * CJ has switched API access off for the account.
       *
       * Stop the sweep rather than repeating the same failure against every
       * remaining product. Before this, a disabled account produced 123
       * identical errors, of which the heartbeat showed five — so the real
       * problem arrived as a wall of noise with no instruction in it, and
       * nothing reached the queue a person actually reads.
       *
       * It is one ask, raised once, because it is one problem with one fix and
       * that fix is on CJ's dashboard rather than here.
       */
      if (message.startsWith(CJ_ACCESS_DISABLED)) {
        await askAboutDisabledAccess(message);
        return {
          ran: false,
          detail: `CJ has switched API access off for the account, so nothing could be checked. ${checked}/${all.length} done before it stopped — raised in the queue.`,
          counts: { checked, delisted, relisted, repriced, asked: asked + 1, unknown },
        };
      }
      problems.push(`${sku}: ${message.slice(0, 160)}`);
      continue;
    }

    if (facts.stock === null && facts.cost === null) unknown += 1;

    /**
     * An open question about this product's price blocks any further change to
     * it. Acting while asking would make the question pointless, and acting on
     * a stale answer is worse than waiting.
     */
    const pendingAnswer = await applyPriceAnswer(product, policy);
    if (pendingAnswer === "waiting") { asked += 1; continue; }
    if (pendingAnswer === "applied") { repriced += 1; continue; }

    const action = decideListing(
      {
        price: Number(product.price || 0),
        cost: Number(product.cost_price || 0),
        shipping: Number(product.shippingCost || 0),
        isActive: product.isActive === true,
        offSaleReason: product.offSaleReason,
      },
      { cost: facts.cost, stock: facts.stock },
      policy,
    );

    const now = new Date().toISOString();
    const base: Record<string, any> = {
      catalogueCheckedAt: now,
      // Keep what CJ said, so a decision can be read back later.
      supplierStock: facts.stock,
      supplierCost: facts.cost,
      ...(facts.vid ? { vid: facts.vid } : {}),
      ...(facts.cost !== null ? { cost_price: facts.cost } : {}),
    };

    if (action.kind === "delist") {
      await kv.set(`${PRODUCT_PREFIX}${sku}`, {
        ...product, ...base,
        isActive: false, storeStatus: "out_of_stock",
        offSaleReason: action.reason, offSaleAt: now, offSaleWhy: action.why,
        inventoryQuantity: facts.stock ?? 0, updatedAt: now,
      });
      delisted += 1;
    } else if (action.kind === "relist") {
      await kv.set(`${PRODUCT_PREFIX}${sku}`, {
        ...product, ...base,
        isActive: true, storeStatus: "live",
        offSaleReason: undefined, offSaleAt: undefined, offSaleWhy: undefined,
        relistedAt: now, inventoryQuantity: facts.stock ?? 0, updatedAt: now,
      });
      relisted += 1;
    } else if (action.kind === "reprice") {
      await kv.set(`${PRODUCT_PREFIX}${sku}`, {
        ...product, ...base,
        price: action.newPrice,
        repricedAt: now, repricedWhy: action.why, priceBefore: Number(product.price || 0),
        inventoryQuantity: facts.stock ?? product.inventoryQuantity, updatedAt: now,
      });
      repriced += 1;
    } else if (action.kind === "ask") {
      // Off sale while the question is open: a listing below the floor is
      // losing money on every sale, so waiting is not a neutral act.
      await kv.set(`${PRODUCT_PREFIX}${sku}`, {
        ...product, ...base,
        isActive: false, storeStatus: "price_review",
        offSaleReason: "margin", offSaleAt: now, offSaleWhy: action.why,
        inventoryQuantity: facts.stock ?? product.inventoryQuantity, updatedAt: now,
      });
      await askForGuidance({
        job: "catalogue",
        dedupeKey: `margin:${sku}`,
        question: `"${String(product.name || sku).slice(0, 80)}" no longer clears the margin floor. What should it cost?`,
        because: action.why,
        wouldHaveDone: "Taken it off sale and left it there, rather than keep selling below your floor.",
        choices: [
          { key: "raise", label: `Raise to $${action.neededPrice.toFixed(2)}`, consequence: "Goes back on sale at the new price, clearing the floor." },
          { key: "keep-off", label: "Leave it off sale", consequence: "Stays delisted until somebody changes the price by hand." },
          { key: "accept", label: "Keep selling at the old price", consequence: `Goes back on sale at $${Number(product.price || 0).toFixed(2)} on a ${(action.marginNow * 100).toFixed(1)}% margin, and stops asking about this product.` },
        ],
        detail: [
          ["Product", String(product.name || sku)],
          ["SKU", sku],
          ["Selling at", `$${Number(product.price || 0).toFixed(2)}`],
          ["CJ now charges", facts.cost === null ? "unknown" : `$${facts.cost.toFixed(2)}`],
          ["Shipping", `$${Number(product.shippingCost || 0).toFixed(2)}`],
          ["Margin now", `${(action.marginNow * 100).toFixed(1)}%`],
          ["Floor", `${(policy.marginFloor * 100).toFixed(0)}%`],
          ["Price that clears it", `$${action.neededPrice.toFixed(2)}`],
        ],
        subject: { kind: "product", id: sku },
      });
      delisted += 1;
      asked += 1;
    } else if (facts.cost !== null || facts.stock !== null) {
      // Nothing to do, but record what CJ said so the next run can compare.
      await kv.set(`${PRODUCT_PREFIX}${sku}`, {
        ...product, ...base,
        inventoryQuantity: facts.stock ?? product.inventoryQuantity,
      });
    }
  }

  await kv.set(CURSOR_KEY, String(batch[batch.length - 1]?.sku || ""));

  const bits = [
    `${checked}/${all.length} checked`,
    delisted ? `${delisted} off sale` : null,
    relisted ? `${relisted} back on sale` : null,
    repriced ? `${repriced} re-priced` : null,
    asked ? `${asked} waiting on you` : null,
    unknown ? `${unknown} CJ would not answer` : null,
  ].filter(Boolean);

  return {
    ran: checked > 0,
    detail: bits.join(", ") || "Nothing to do.",
    counts: { checked, delisted, relisted, repriced, asked, unknown },
    error: problems.length ? problems.slice(0, 5).join("; ") : undefined,
  };
}

/**
 * Act on an answered price question for one product.
 *
 * "waiting" means the question is open and this product must be left alone.
 * "applied" means the answer has now been carried out. "none" means there was
 * no question.
 */
async function applyPriceAnswer(product: any, policy: CataloguePolicy): Promise<"none" | "waiting" | "applied"> {
  const sku = String(product.sku);
  if (product.offSaleReason !== "margin" && !product.marginAcceptedAt) return "none";

  const ask = await askForGuidance({
    job: "catalogue",
    dedupeKey: `margin:${sku}`,
    question: `"${String(product.name || sku).slice(0, 80)}" no longer clears the margin floor. What should it cost?`,
    because: product.offSaleWhy || "The margin fell below the floor.",
    choices: [
      { key: "raise", label: "Raise the price" },
      { key: "keep-off", label: "Leave it off sale" },
      { key: "accept", label: "Keep selling at the old price" },
    ],
    detail: [["SKU", sku]],
    subject: { kind: "product", id: sku },
  });

  if (ask.status === "open") return "waiting";
  if (ask.status !== "answered") return "none";

  const now = new Date().toISOString();
  const cost = Number(product.supplierCost ?? product.cost_price ?? 0);
  const shipping = Number(product.shippingCost || 0);

  if (ask.answer === "raise") {
    const needed = Math.ceil(((cost + shipping) / (1 - policy.marginFloor)) * 100) / 100;
    await kv.set(`${PRODUCT_PREFIX}${sku}`, {
      ...product,
      price: needed, priceBefore: Number(product.price || 0),
      isActive: true, storeStatus: "live",
      offSaleReason: undefined, offSaleWhy: undefined,
      repricedAt: now, repricedWhy: `Raised to $${needed.toFixed(2)} on your instruction${ask.note ? `: ${ask.note}` : ""}.`,
      updatedAt: now,
    });
    return "applied";
  }
  if (ask.answer === "accept") {
    await kv.set(`${PRODUCT_PREFIX}${sku}`, {
      ...product,
      isActive: true, storeStatus: "live",
      offSaleReason: undefined, offSaleWhy: undefined,
      // Recorded so the job stops asking about this product's margin.
      marginAcceptedAt: now,
      marginAcceptedNote: ask.note || undefined,
      updatedAt: now,
    });
    return "applied";
  }
  // keep-off: it is already off sale. Nothing to do, and nothing to re-ask.
  return "applied";
}

// ── Setting the policy by hand ──────────────────────────────────────────────

storeCatalogueRouter.get(`${PREFIX}/store/catalogue/policy`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  return c.json({ success: true, policy: await readPolicy() });
});

storeCatalogueRouter.put(`${PREFIX}/store/catalogue/policy`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  try {
    const body = await c.req.json().catch(() => ({}));
    const floor = Number(body?.marginFloor);
    const band = Number(body?.repriceBand);
    if (!Number.isFinite(floor) || floor <= 0 || floor >= MARGIN_FLOOR_MAX) {
      return c.json({ success: false, error: `marginFloor must be between 0 and ${MARGIN_FLOOR_MAX} as a fraction — 0.35 is 35%.` }, 400);
    }
    if (!Number.isFinite(band) || band < 0 || band > REPRICE_BAND_MAX) {
      return c.json({ success: false, error: `repriceBand must be between 0 and ${REPRICE_BAND_MAX} as a fraction. Zero means never re-price automatically.` }, 400);
    }
    const policy: CataloguePolicy = {
      configured: true,
      marginFloor: floor,
      repriceBand: band,
      updatedAt: new Date().toISOString(),
      updatedBy: String(body?.by || "") || undefined,
    };
    await kv.set(POLICY_KEY, policy);
    // The question has been answered another way, so take it out of the queue.
    await withdrawAsk("catalogue", "policy");
    return c.json({ success: true, policy });
  } catch (error: any) {
    return c.json({ success: false, error: String(error?.message || error) }, 500);
  }
});

/** Registered explicitly, not by import side effect. */
/**
 * One ask for a disabled CJ account, with the fix in it.
 *
 * Deliberately NOT a question with alternatives to weigh. Every other ask in
 * this system offers a choice because there is a judgement to make; this one
 * has exactly one answer — somebody has to turn API access back on at CJ — so
 * what it provides is the link, the error code, and a way to say "done, try
 * again" or "stop asking".
 *
 * `askIsWellFormed` requires at least two choices, which is the right rule:
 * an ask with one option is a notification wearing a question's clothes. These
 * two are real, though. "I have fixed it" is what makes the next tick retry
 * instead of waiting for the dedupe to lapse, and "leave the store alone" is a
 * genuine alternative for somebody who has decided to stop selling CJ goods
 * rather than chase the account.
 */
async function askAboutDisabledAccess(message: string): Promise<void> {
  await askForGuidance({
    job: "catalogue",
    dedupeKey: "cj-access-disabled",
    question: "CJ has switched API access off for the account. Can you turn it back on?",
    because:
      "Every product check comes back with CJ error 1600014. The API key still authenticates normally — a fresh token was issued and the account shows its full points allowance unused — so this is a setting on the CJ account rather than a key, a token or anything this server can change.",
    wouldHaveDone:
      "Nothing. No stock level and no cost can be read while this stands, so the catalogue is not being checked and no product will go off sale or change price. Orders cannot be forwarded to CJ either.",
    choices: [
      {
        key: "fixed",
        label: "I have turned it back on — try again",
        consequence: "The catalogue is checked on the next tick, and this question closes.",
      },
      {
        key: "leave-it",
        label: "Leave the store alone for now",
        consequence: "Nothing is checked and nothing changes price. Ask again when CJ is sorted.",
      },
    ],
    detail: [
      ["Where to fix it", "cjdropshipping.com/my.html#/authorize/APIStores — My CJ, then Authorization, then API Stores"],
      ["CJ's error code", "1600014"],
      ["What CJ said", message.replace(`${CJ_ACCESS_DISABLED}: `, "").slice(0, 300)],
      ["What still works", "Authentication. The key is valid; only the data endpoints are refused."],
      ["If CJ gives no way to re-enable it", "Their support can say why 1600014 is set — quote the code and the requestId from a failed call."],
    ],
  });
}

export function registerStoreCatalogueJob(): void {
  registerStoreJob("catalogue", catalogueJob);
}
