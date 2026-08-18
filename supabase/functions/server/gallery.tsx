/**
 * The public gallery — past work, shown on the Black Phoenix Builds page.
 *
 * The landing page has always asked for `GET /gallery`. There was no such
 * route, so it 404'd and `GalleryPreview` quietly fell back to a hardcoded
 * PLACEHOLDERS array: the public site advertised projects that were not Eric's.
 * A silent fallback to invented work is worse than an empty section, because
 * nobody notices it is wrong.
 *
 * TWO DECISIONS WORTH KNOWING
 *
 * **A separate, deliberately public bucket.** The media library keeps job
 * photos in a private bucket behind 24-hour signed URLs, which is right for
 * customers' houses and useless for a public page — the links expire. Published
 * marketing photos are a different thing with a different rule, so they get
 * their own public bucket rather than loosening the private one.
 *
 * **Nothing is public until it is published.** `published` defaults to false on
 * anything uploaded later, and only the website import arrives already true —
 * those 35 photos were already on a public website, so publishing them changes
 * nothing about who can see them. A site photo of a customer's kitchen dropped
 * into the library later does not become public because it landed in the same
 * place.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const PREFIX = "/make-server-3eae23a6";
const BUCKET = "make-3eae23a6-gallery";
const KEY = "gallery:";

export const galleryRouter = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Staff-only. Mirrors the check the rest of the server uses. */
async function requireStaff(c: any): Promise<boolean> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await service().auth.getUser(token);
  const user = error ? null : data?.user;
  if (!user?.email) return false;
  const owners = (Deno.env.get("PLATFORM_OWNER_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  owners.push("ericerb555@proton.me");
  const role = String(
    user.app_metadata?.role || user.user_metadata?.role || user.user_metadata?.accountType || "",
  ).toLowerCase().replace(/[\s-]+/g, "_");
  return owners.includes(String(user.email).toLowerCase())
    || ["owner", "platform_owner", "business_owner", "admin", "master_admin", "management"].includes(role);
}

async function ensureBucket() {
  const db = service();
  const { data: buckets } = await db.storage.listBuckets();
  if ((buckets || []).some((b: any) => b.name === BUCKET)) return;
  // Public on purpose: a gallery image is marketing material meant to be seen
  // by strangers, and a signed URL that expires would empty the page.
  await db.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 15728640,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  });
}

const publicUrl = (path: string) =>
  service().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// ── Public: what the landing page reads ──────────────────────────────────────
galleryRouter.get(`${PREFIX}/gallery`, async (c) => {
  try {
    const rows = ((await kv.getByPrefix(KEY)) as any[] || []).filter(Boolean);
    const projects = rows
      .filter((r) => r.published)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        image: r.image,
        // `before` is optional — a project without one renders as a single photo
        // rather than a slider, which is the honest presentation when there is
        // no before shot rather than inventing one.
        before: r.before || null,
      }));
    return c.json({ projects });
  } catch (error: any) {
    // An empty gallery is a fine failure. The page shows its heading and no
    // cards, which is true, where a 500 would show an error to a customer.
    console.log(`[gallery] list failed: ${error?.message || error}`);
    return c.json({ projects: [] });
  }
});

// ── Staff: bring the old website's photos across ─────────────────────────────
/**
 * The 35 job photos from blackphoenixbuilds.com, copied into this app's own
 * storage rather than linked. Eric is moving everything here; a gallery that
 * hotlinks the old site's CDN empties the day that site lapses.
 *
 * Idempotent: each photo is keyed by its source URL, so running this twice
 * imports nothing the second time.
 */
const WEBSITE_PHOTOS: { url: string; title: string; category: string }[] = [
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a82c7c1f9.png", title: "Completed Project 01", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a84a22004.png", title: "Completed Project 02", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a8546216e.png", title: "Completed Project 03", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a869665c3.png", title: "Completed Project 04", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a879c442e.png", title: "Completed Project 05", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a8a8d7da8.png", title: "Completed Project 06", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a8ced9b05.png", title: "Completed Project 07", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a8e65a066.png", title: "Completed Project 08", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a8ee8db98.png", title: "Completed Project 09", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775a8fb34129.png", title: "Completed Project 10", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775aaac03c62.png", title: "Completed Project 11", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6775aabd78e29.png", title: "Completed Project 12", category: "Completed Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e6389bf133.jpg", title: "Recent Project 01", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e638c5f5eb.jpg", title: "Recent Project 02", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63889d810.jpg", title: "Recent Project 03", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e6395f0110.jpg", title: "Recent Project 04", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e639b38397.jpg", title: "Recent Project 05", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63e523aa1.jpg", title: "Recent Project 06", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63a256d83.jpg", title: "Recent Project 07", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63a5392fd.jpg", title: "Recent Project 08", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63aa5ac5a.jpg", title: "Recent Project 09", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63a94792d.jpg", title: "Recent Project 10", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691fa30f6a796.jpg", title: "Recent Project 11", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d15d350aa.jpg", title: "Recent Project 12", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d1599e608.jpg", title: "Recent Project 13", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d15209552.jpg", title: "Recent Project 14", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d14c0c3d7.jpg", title: "Recent Project 15", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d25be0970.jpg", title: "Recent Project 16", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d1676d044.jpg", title: "Recent Project 17", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d26731c36.jpg", title: "Recent Project 18", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d1dd2f3cd.jpg", title: "Recent Project 19", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_6920d1df2bd0d.jpg", title: "Recent Project 20", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63bc8ba8e.jpg", title: "Recent Project 21", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e63b5a26e9.jpg", title: "Recent Project 22", category: "Recent Projects" },
  { url: "https://files.cdn-files-a.com/uploads/10153532/2000_691e638af2acc.jpg", title: "Recent Project 23", category: "Recent Projects" },
];

galleryRouter.post(`${PREFIX}/gallery/import-website`, async (c) => {
  if (!await requireStaff(c)) return c.json({ error: "Administrator access is required." }, 403);
  try {
    await ensureBucket();
    const db = service();
    const existing = ((await kv.getByPrefix(KEY)) as any[] || []).filter(Boolean);
    const seen = new Set(existing.map((r: any) => r.sourceUrl).filter(Boolean));

    let imported = 0, skipped = 0;
    const failures: string[] = [];

    for (const [index, photo] of WEBSITE_PHOTOS.entries()) {
      if (seen.has(photo.url)) { skipped++; continue; }
      try {
        const res = await fetch(photo.url);
        if (!res.ok) { failures.push(`${photo.title}: HTTP ${res.status}`); continue; }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const ext = photo.url.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
        const path = `website/${photo.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}.${ext}`;

        const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, {
          contentType: ext === "png" ? "image/png" : "image/jpeg",
          upsert: true,
        });
        if (upErr) { failures.push(`${photo.title}: ${upErr.message}`); continue; }

        const id = `gal_${crypto.randomUUID()}`;
        await kv.set(`${KEY}${id}`, {
          id,
          title: photo.title,
          category: photo.category,
          image: publicUrl(path),
          storagePath: path,
          sourceUrl: photo.url,
          // Already public on the old website, so publishing changes nothing
          // about who can see them.
          published: true,
          order: index,
          createdAt: new Date().toISOString(),
        });
        imported++;
      } catch (err: any) {
        failures.push(`${photo.title}: ${err?.message || err}`);
      }
    }

    return c.json({
      success: true,
      imported,
      skipped,
      failed: failures.length,
      failures: failures.slice(0, 10),
      total: WEBSITE_PHOTOS.length,
    });
  } catch (error: any) {
    console.log(`[gallery] import failed: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || "Import failed." }, 500);
  }
});

// ── Staff: everything, including the unpublished ─────────────────────────────
galleryRouter.get(`${PREFIX}/gallery/all`, async (c) => {
  if (!await requireStaff(c)) return c.json({ error: "Administrator access is required." }, 403);
  const rows = ((await kv.getByPrefix(KEY)) as any[] || []).filter(Boolean);
  return c.json({ projects: rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) });
});

galleryRouter.patch(`${PREFIX}/gallery/:id`, async (c) => {
  if (!await requireStaff(c)) return c.json({ error: "Administrator access is required." }, 403);
  const id = c.req.param("id");
  const existing = await kv.get(`${KEY}${id}`) as any;
  if (!existing) return c.json({ error: "Not found." }, 404);
  const body = await c.req.json().catch(() => ({}));
  const updated = {
    ...existing,
    title: body.title !== undefined ? String(body.title).slice(0, 200) : existing.title,
    category: body.category !== undefined ? String(body.category).slice(0, 80) : existing.category,
    published: body.published !== undefined ? !!body.published : existing.published,
    order: body.order !== undefined ? Number(body.order) || 0 : existing.order,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(`${KEY}${id}`, updated);
  return c.json({ success: true, project: updated });
});

galleryRouter.delete(`${PREFIX}/gallery/:id`, async (c) => {
  if (!await requireStaff(c)) return c.json({ error: "Administrator access is required." }, 403);
  const id = c.req.param("id");
  const existing = await kv.get(`${KEY}${id}`) as any;
  if (existing?.storagePath) {
    await service().storage.from(BUCKET).remove([existing.storagePath]).catch(() => {});
  }
  await kv.del(`${KEY}${id}`);
  return c.json({ success: true });
});

export default galleryRouter;
