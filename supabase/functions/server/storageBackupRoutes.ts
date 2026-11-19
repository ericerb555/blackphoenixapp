/**
 * The scheduled run that makes the second copy.
 *
 * Split from `storageBackup.ts` so the decisions in that file stay testable:
 * this half talks to Storage and cannot be loaded by `node --test`, that half
 * is pure and has twelve tests on it. Same division as `trashTakeoff.ts` and
 * the route that calls it.
 *
 * GUARDED BY A SHARED SECRET, READ FROM THE ROW THE SCHEDULER SENDS
 *
 * Same shape as `/store/cron-tick`, `/exchange/cron-tick` and
 * `/cron/screening/expire-invitations`, and for the reason written out at
 * length on the first of those: holding the value in two places — the
 * environment and `private_cron_config` — means rotating it is a two-step
 * dance that was got wrong three times in one morning, and a cron job that
 * starts answering 401 has nobody to tell. The row the scheduler builds its
 * header from is the source of truth; the environment variable is a fallback
 * for a hand-run.
 *
 * It refuses when the secret is unset rather than falling open. An unset
 * secret is exactly the state a half-finished deploy leaves behind.
 */
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";
import {
  BACKUP_BUCKET, isBackupSource, planCopies, buildManifest, manifestKey,
  LATEST_MANIFEST_KEY, type StoredObject,
} from "./storageBackup.ts";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Every object in a bucket, paged, because `list` caps at 100 by default. */
async function listAll(client: any, bucket: string): Promise<StoredObject[]> {
  const out: StoredObject[] = [];
  const PAGE = 100;

  // Depth-first through folders: Storage's `list` is not recursive, and a
  // non-recursive listing of `project-photos` returns the per-user folders
  // rather than the photographs inside them — which would have produced a
  // backup of nothing while reporting a clean run.
  const walk = async (prefix: string): Promise<void> => {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: PAGE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !data?.length) return;

      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        // A folder has no id and no metadata; a file has both.
        if (!entry.id && !entry.metadata) {
          await walk(path);
        } else {
          out.push({
            name: path,
            size: Number(entry.metadata?.size) || 0,
            updatedAt: String(entry.updated_at || entry.created_at || ""),
          });
        }
      }
      if (data.length < PAGE) return;
    }
  };

  await walk("");
  return out;
}

async function ensureBackupBucket(client: any): Promise<void> {
  try {
    const { data } = await client.storage.listBuckets();
    if (!data?.some((b: any) => b.name === BACKUP_BUCKET)) {
      await client.storage.createBucket(BACKUP_BUCKET, { public: false });
    }
  } catch (err) {
    console.log(`[storage-backup] could not ensure bucket: ${(err as any)?.message || err}`);
  }
}

/**
 * Run the backup. Returns the manifest it wrote.
 *
 * Copies by download-then-upload rather than Storage's `copy`, which works
 * within a bucket and not across them. At the scale this runs — 165 objects,
 * about 236 MB, and only what changed after the first run — that is cheaper
 * than the sentence explaining why it would not be.
 */
export async function runStorageBackup(): Promise<any> {
  const client = admin();
  await ensureBackupBucket(client);

  const { data: buckets, error: bucketErr } = await client.storage.listBuckets();
  if (bucketErr) throw new Error(`could not list buckets: ${bucketErr.message}`);

  const sources: Record<string, StoredObject[]> = {};
  for (const b of buckets || []) {
    if (!isBackupSource(b.name)) continue;
    sources[b.name] = await listAll(client, b.name);
  }

  // What the backup already holds, by target path, so the run is incremental.
  const existing = new Map<string, number>();
  for (const held of await listAll(client, BACKUP_BUCKET)) {
    existing.set(held.name, held.size);
  }

  const plan = planCopies(sources, existing);
  let copied = 0;
  let failed = 0;

  for (const entry of plan) {
    try {
      const { data: blob, error: dlErr } = await client.storage
        .from(entry.bucket).download(entry.name);
      if (dlErr || !blob) throw new Error(dlErr?.message || "no body");

      const { error: upErr } = await client.storage
        .from(BACKUP_BUCKET)
        .upload(entry.target, blob, { upsert: true, contentType: blob.type || undefined });
      if (upErr) throw new Error(upErr.message);
      copied += 1;
    } catch (err) {
      /*
       * One object failing must not end the run — the next ninety might be
       * fine, and a backup that stops at the first awkward file is a backup of
       * whatever sorted alphabetically first. Counted into the manifest so a
       * run that failed on everything cannot read as success.
       */
      failed += 1;
      console.log(`[storage-backup] ${entry.bucket}/${entry.name} failed: ${(err as any)?.message || err}`);
    }
  }

  const nowIso = new Date().toISOString();
  const manifest = buildManifest(nowIso, sources, copied, failed);

  /*
   * The manifest goes to the key-value store, which lives in Postgres — so it
   * IS inside the nightly database backup even though the bytes are not. If a
   * bucket is lost entirely, "what was in it" has an answer.
   */
  await kv.set(manifestKey(nowIso), manifest);
  await kv.set(LATEST_MANIFEST_KEY, manifest);

  console.log(
    `[storage-backup] ${manifest.objects} objects / ${manifest.bytes} bytes across ` +
    `${manifest.buckets} buckets; copied ${copied}, failed ${failed}`,
  );
  return manifest;
}

/** Read the cron secret: the scheduler's row first, the environment second. */
export async function expectedBackupSecret(): Promise<string> {
  try {
    const { data } = await admin()
      .from("private_cron_config")
      .select("value")
      .eq("key", "storage_backup_secret")
      .maybeSingle();
    const fromRow = String(data?.value || "");
    if (fromRow) return fromRow;
  } catch {
    // Fall through. A database blip must not turn a machine endpoint into an
    // open one — the caller still refuses when this returns empty.
  }
  return Deno.env.get("STORAGE_BACKUP_SECRET") || "";
}
