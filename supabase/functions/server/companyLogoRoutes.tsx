/**
 * Move a company's logos out of its row and into storage.
 *
 * WHY THIS EXISTS
 *
 * The company editor reads a chosen file with `FileReader.readAsDataURL` and
 * saves the result, so a logo lands in the `companies` row as base64 text. The
 * slow query log found what that costs: two companies, 695 kB of row, 694 kB
 * of it in two columns, shipped to a browser 2,525 times by a list that wanted
 * a name. The list has since been narrowed, but narrowing hid the problem
 * rather than fixing it — the row is still enormous, every write still
 * rewrites it, and the editor still needs the real thing.
 *
 * The right shape was already in the table: `logo_url` holds
 * `…/storage/v1/object/public/make-57095a78-logos/company-logo.png`, 102 bytes,
 * and one company's `logo_primary` is already a URL too. Somebody began this
 * conversion and it was never finished. This finishes it.
 *
 * WHY THE COLUMNS KEEP THEIR NAMES AND THEIR MEANING
 *
 * Every consumer renders these as `<img src={logo_primary}>`, and a browser
 * treats a URL and a data URL identically there. So replacing the contents
 * changes nothing downstream — no component, no type, no screen. That is what
 * makes this safe to do to live rows.
 *
 * WHY A SWEEP RATHER THAN A CHANGE TO THE UPLOAD
 *
 * Because there is more than one path that writes these columns, and a fix in
 * the editor would leave the others. A sweep that converts whatever base64 it
 * finds is correct no matter which screen put it there, and running it after a
 * save keeps the row small without the editor having to know why.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isStaffRequest } from "./requireStaff.ts";
import { sniffImage } from "./imageSniff.ts";

export const companyLogoRoutes = new Hono();

/** The bucket `logo_url` already points at. */
const BUCKET = "make-57095a78-logos";

/** Every column that holds an image for a company. */
const LOGO_COLUMNS = [
  "logo_url", "logo_primary", "logo_secondary", "logo_icon", "logo_square",
  "logo_horizontal", "logo_vertical", "logo_white", "logo_black",
] as const;

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";

/** Who is asking, from the token and nothing else. */
async function caller(c: any): Promise<{ id: string } | null> {
  const token = (c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { data } = await service().auth.getUser(token);
    return data?.user?.id ? { id: data.user.id } : null;
  } catch {
    return null;
  }
}

/**
 * Turn one `data:` URL into bytes, or null if it is not one.
 *
 * Anything already a URL comes back null and is left exactly as it is, which
 * is what makes this safe to run twice.
 */
function decodeDataUrl(value: unknown): { bytes: Uint8Array } | null {
  const text = String(value ?? "");
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(text);
  if (!match) return null;
  if (!match[2]) return null; // not base64; nothing worth storing
  try {
    const binary = atob(match[3]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes };
  } catch {
    return null;
  }
}

/**
 * Convert every base64 logo on one company into a stored file.
 *
 * Returns what changed, so the caller can say so rather than claiming success
 * over a no-op.
 */
companyLogoRoutes.post("/company/logos/store", async (c) => {
  const who = await caller(c);
  const staff = await isStaffRequest(c);
  if (!who && !staff) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const body = await c.req.json().catch(() => ({}));
    const companyId = String(body?.companyId ?? "").trim();
    if (!companyId) return c.json({ success: false, error: "Which company?" }, 400);

    const sb = service();
    const { data: company, error } = await sb
      .from("companies")
      .select(`id, user_id, ${LOGO_COLUMNS.join(", ")}`)
      .eq("id", companyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!company) return c.json({ success: false, error: "No such company." }, 404);

    // Yours, or staff. A company's artwork is not a thing to let a stranger
    // rewrite, even into an identical file.
    if (!staff && String((company as any).user_id ?? "") !== who!.id) {
      return c.json({ success: false, error: "That is not your company." }, 403);
    }

    const patch: Record<string, string> = {};
    const converted: string[] = [];
    let freed = 0;

    for (const column of LOGO_COLUMNS) {
      const current = (company as any)[column];
      const decoded = decodeDataUrl(current);
      if (!decoded) continue;

      // The bytes decide what this is; a column holding something that is not
      // an image is left alone rather than stored under an image name.
      const kind = sniffImage(decoded.bytes);
      if (!kind) continue;

      const path = `${companyId}/${column}.${kind.ext}`;
      const { error: upload } = await sb.storage.from(BUCKET).upload(path, decoded.bytes, {
        contentType: kind.mime,
        upsert: true,
      });
      if (upload) continue;

      patch[column] = `${PROJECT_URL.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
      converted.push(column);
      freed += String(current).length;
    }

    if (converted.length) {
      const { error: saved } = await sb.from("companies").update(patch).eq("id", companyId);
      if (saved) throw new Error(saved.message);
    }

    return c.json({
      success: true,
      converted,
      // Said in bytes because that is the point of the exercise.
      bytesFreed: freed,
    });
  } catch (err) {
    return c.json({ success: false, error: String((err as Error).message) }, 500);
  }
});
