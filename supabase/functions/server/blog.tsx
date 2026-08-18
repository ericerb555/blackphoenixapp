/**
 * The blog — where generated articles finally have somewhere to be.
 *
 * Two engines in this server write articles: the SEO engine
 * (`seo_engine:article:`) and the ranking engine (`ranking_content:`). Both had
 * a publish action, and neither had anywhere to publish to — `publish` set a
 * status field on a record and stopped. Nothing became a page, nothing got a
 * URL, and so nothing could ever be found. Writing was built; being read was
 * not.
 *
 * This reads both stores and serves what is marked published. Reading from both
 * rather than picking a winner is deliberate: consolidating the two engines is
 * a separate job, and until it happens an article should be publishable
 * whichever one wrote it. The shapes differ, so they are normalised here, in
 * one place, rather than in every reader.
 *
 * Published means public. Drafts are never served — the whole point of a draft
 * is that someone still has to look at it, and these are written by a model.
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const PREFIX = "/make-server-3eae23a6";
const SEO_ARTICLES = "seo_engine:article:";
const RANKING_CONTENT = "ranking_content:";

export const blogRouter = new Hono();

interface Article {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  type: string;
  keyword: string;
  publishedAt: string;
  source: "seo-engine" | "ranking-engine";
}

/** KV rows arrive as objects from one writer and JSON strings from the other. */
function parse(row: any): any {
  if (!row) return null;
  if (typeof row === "string") { try { return JSON.parse(row); } catch { return null; } }
  return row;
}

/** First couple of sentences, with the markdown stripped, for a summary. */
function excerptOf(body: string): string {
  const plain = String(body || "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*|__|[*_`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= 180) return plain;
  const cut = plain.slice(0, 180);
  const stop = cut.lastIndexOf(". ");
  return (stop > 80 ? cut.slice(0, stop + 1) : cut) + (stop > 80 ? "" : "…");
}

function normalise(raw: any, source: Article["source"]): Article | null {
  const doc = parse(raw);
  if (!doc?.id) return null;
  const body = String(doc.body ?? doc.content ?? doc.article ?? "");
  return {
    id: String(doc.id),
    title: String(doc.title || "Untitled"),
    excerpt: String(doc.excerpt || doc.metaDescription || excerptOf(body)),
    body,
    type: String(doc.type || "blog"),
    keyword: String(doc.targetKeyword || doc.keyword || ""),
    publishedAt: String(doc.publishedAt || doc.updatedAt || doc.createdAt || ""),
    source,
  };
}

async function publishedArticles(): Promise<Article[]> {
  const [seo, ranking] = await Promise.all([
    kv.getByPrefix(SEO_ARTICLES).catch(() => []),
    kv.getByPrefix(RANKING_CONTENT).catch(() => []),
  ]);

  const all = [
    ...((seo as any[]) || []).map((r) => ({ raw: r, source: "seo-engine" as const })),
    ...((ranking as any[]) || []).map((r) => ({ raw: r, source: "ranking-engine" as const })),
  ];

  return all
    .filter(({ raw }) => String(parse(raw)?.status || "").toLowerCase() === "published")
    .map(({ raw, source }) => normalise(raw, source))
    .filter((a): a is Article => !!a && !!a.body)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

// ── Public: the index ────────────────────────────────────────────────────────
blogRouter.get(`${PREFIX}/blog`, async (c) => {
  try {
    const articles = await publishedArticles();
    // The body is deliberately dropped from the list. An index that ships every
    // article in full is slow for the reader and pointless for the crawler.
    return c.json({
      articles: articles.map(({ body, ...rest }) => rest),
    });
  } catch (error: any) {
    console.log(`[blog] list failed: ${error?.message || error}`);
    return c.json({ articles: [] });
  }
});

// ── Public: one article ──────────────────────────────────────────────────────
blogRouter.get(`${PREFIX}/blog/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const article = (await publishedArticles()).find((a) => a.id === id);
    // A draft and a deleted article are the same to a stranger: not here.
    // Saying "this is a draft" would confirm it exists, which is not a
    // stranger's business.
    if (!article) return c.json({ error: "Not found." }, 404);
    return c.json({ article });
  } catch (error: any) {
    console.log(`[blog] fetch failed: ${error?.message || error}`);
    return c.json({ error: "Not found." }, 404);
  }
});

export default blogRouter;
