/**
 * content-filter.tsx — shared "safe catalog" guard.
 *
 * Dropshipper feeds (Zendrop, generic providers, hot-products radar, catalog
 * staging) occasionally surface adult / sexual-wellness products. We never want
 * those to be imported or updated into our store, so every product write path
 * runs candidates through `isAdultProduct` and drops the matches.
 *
 * The match is intentionally conservative-but-broad: it scans the product's
 * name, description, category, tags, and brand for adult keywords. It uses
 * word-boundary matching so innocent substrings (e.g. "class", "assemble",
 * "cockpit") don't trigger a false positive.
 */

// Keywords that mark a product as adult / sexual. Kept lowercase; matched with
// word boundaries against the combined product text.
const ADULT_KEYWORDS: string[] = [
  "sex", "sexy", "sexual", "adult toy", "adult toys", "sex toy", "sex toys",
  "dildo", "vibrator", "vibrators", "butt plug", "buttplug", "anal",
  "masturbat", "masturbator", "fleshlight", "onahole", "pocket pussy",
  "penis", "vagina", "vaginal", "clitoral", "clitoris", "g-spot", "gspot",
  "nipple clamp", "cock ring", "cockring", "penis ring", "penis pump",
  "bondage", "bdsm", "fetish", "handcuffs sex", "sex swing", "restraint kit",
  "lubricant", "lube", "personal lubricant", "arousal gel", "arousal",
  "condom", "condoms", "aphrodisiac", "libido", "erotic", "erotica",
  "lingerie", "crotchless", "g-string", "thong panties", "nipple tassel",
  "pasties", "strap-on", "strapon", "strap on dildo", "prostate massager",
  "kegel", "ben wa", "love egg", "bullet vibe", "wand massager sex",
  "orgasm", "clit", "pheromone", "porn", "xxx", "18+", "nsfw",
  "sexual wellness", "intimate massager", "adult novelty", "adult product",
  "enhancement pill", "male enhancement", "female enhancement",
];

// Build one case-insensitive, word-boundary regex from the keyword list.
// For multi-word phrases we allow flexible whitespace between the words.
const ADULT_REGEX = new RegExp(
  "(^|[^a-z0-9])(" +
    ADULT_KEYWORDS
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
      .join("|") +
    ")([^a-z0-9]|$)",
  "i",
);

/** Collect the searchable text fields from any product-ish object. */
function productText(product: any): string {
  if (!product || typeof product !== "object") return "";
  const parts: string[] = [];
  const push = (v: any) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) for (const x of v) push(x);
  };
  push(product.name);
  push(product.title);
  push(product.description);
  push(product.body_html);
  push(product.category);
  push(product.categoryName);
  push(product.product_type);
  push(product.tags);
  push(product.brand);
  push(product.manufacturer);
  return parts.join(" ").toLowerCase();
}

/**
 * True if the product looks like an adult / sexual-wellness item and must be
 * excluded from the store.
 */
export function isAdultProduct(product: any): boolean {
  const text = productText(product);
  if (!text) return false;
  return ADULT_REGEX.test(text);
}

/** Drop every adult product from a list. */
export function filterAdultProducts<T>(products: T[]): T[] {
  if (!Array.isArray(products)) return products;
  return products.filter((p) => !isAdultProduct(p));
}
