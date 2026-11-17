/**
 * A second copy of every stored file, and a written record of what exists.
 *
 * Eric: "fix the storage backup."
 *
 * WHAT WAS WRONG
 *
 * The Supabase docs are explicit: "Database backups do not include objects you
 * store via the Storage API." The project is on the Pro plan, so Postgres is
 * backed up daily with seven days retained — and the photographs behind every
 * trash estimate, the house captures, the gallery, the reels and the marketing
 * assets were all outside that. A deleted file or an emptied bucket had no
 * second copy anywhere.
 *
 * WHAT THIS DOES AND DOES NOT PROTECT AGAINST
 *
 * Said plainly, because a thing named "backup" that quietly protects against
 * nothing is worse than no backup at all — this project already had one of
 * those, `autoBackup.ts`, which copied localStorage into other localStorage
 * keys every thirty seconds and deleted data when it hit the quota.
 *
 *   Covered:     a file deleted by hand, a bucket emptied, an overwrite, a bad
 *                migration, a feature that cleans up too enthusiastically.
 *                These are the losses that actually happen.
 *   NOT covered: losing the Supabase project or the account. The copy lives in
 *                the same project, so that blast radius is shared. An off-site
 *                copy needs a destination outside Supabase; the manifest below
 *                is what makes that recoverable as a decision rather than a
 *                discovery.
 *
 * WHY A MANIFEST AS WELL AS A COPY
 *
 * The manifest is written to the key-value store, which lives in Postgres —
 * so it IS inside the daily database backup even though the bytes are not.
 * If a bucket is ever lost entirely, the question "what was in it" has an
 * answer: every path, size and timestamp, as of the last run. That turns "we
 * lost some photographs" into a list.
 *
 * WHY IT ONLY EVER COPIES
 *
 * It never deletes from the backup bucket, which means a file deleted from the
 * original is still there afterwards — the entire point. Growth is bounded by
 * everything ever stored, which at the time of writing is 165 objects and
 * about 236 MB across nineteen buckets, against a 100 GB allowance. If that
 * ratio ever changes, prune by age deliberately rather than by mirroring
 * deletions.
 */

/** Where the second copy goes. Never a source. */
export const BACKUP_BUCKET = "media-backup";

/** Buckets that are never sources: the backup itself, and Supabase internals. */
const NEVER_SOURCE = new Set([BACKUP_BUCKET]);

export interface StoredObject {
  /** Path within its bucket. */
  name: string;
  size: number;
  updatedAt: string;
}

export interface CopyPlanEntry {
  bucket: string;
  name: string;
  /** Where it lands in the backup bucket. */
  target: string;
  reason: "new" | "changed";
}

/**
 * Is this bucket a source we copy from?
 *
 * The backup bucket is excluded by name rather than by convention, because the
 * failure if it is not is a copy of a copy of a copy — growth that looks like
 * a runaway bill and is really one missing line.
 */
export function isBackupSource(bucket: string): boolean {
  const name = String(bucket || "").trim();
  if (!name) return false;
  return !NEVER_SOURCE.has(name);
}

/**
 * Where an object from `bucket` lands in the backup bucket.
 *
 * Prefixed with the source bucket so two buckets holding `logo.png` do not
 * collide, and so a restore knows where each file came back to. No timestamp
 * in the path: this is a mirror of latest-known state, not a version history,
 * and a dated path per run would multiply 165 objects by every run forever.
 */
export function backupPathFor(bucket: string, name: string): string {
  const clean = String(name || "").replace(/^\/+/, "");
  return `${bucket}/${clean}`;
}

/**
 * What needs copying, given what the backup already holds.
 *
 * Size is the change signal rather than the timestamp. An object re-uploaded
 * at the same byte length is the case this misses, and the alternative misses
 * more: Storage updates `updated_at` on metadata changes that leave the bytes
 * identical, so trusting it re-copies the whole library on a touch. Deciding
 * by size keeps an incremental run genuinely incremental.
 *
 * Pure, so the rule is testable without a project to talk to.
 */
export function planCopies(
  sources: Record<string, StoredObject[]>,
  existing: Map<string, number>,
): CopyPlanEntry[] {
  const plan: CopyPlanEntry[] = [];

  for (const [bucket, objects] of Object.entries(sources)) {
    if (!isBackupSource(bucket)) continue;
    for (const obj of objects || []) {
      if (!obj?.name) continue;
      const target = backupPathFor(bucket, obj.name);
      const have = existing.get(target);
      if (have === undefined) {
        plan.push({ bucket, name: obj.name, target, reason: "new" });
      } else if (Number(have) !== Number(obj.size)) {
        plan.push({ bucket, name: obj.name, target, reason: "changed" });
      }
    }
  }
  return plan;
}

export interface BackupManifest {
  at: string;
  buckets: number;
  objects: number;
  bytes: number;
  copied: number;
  failed: number;
  /** Every object known at this run: `bucket/path` → size. */
  index: Record<string, number>;
}

/** The key a run's manifest is filed under. One per day, overwritten within it. */
export function manifestKey(nowIso: string): string {
  return `storage_backup:${String(nowIso).slice(0, 10)}`;
}

/** The key holding the most recent run, whenever it was. */
export const LATEST_MANIFEST_KEY = "storage_backup:latest";

export function buildManifest(
  nowIso: string,
  sources: Record<string, StoredObject[]>,
  copied: number,
  failed: number,
): BackupManifest {
  const index: Record<string, number> = {};
  let objects = 0;
  let bytes = 0;
  let buckets = 0;

  for (const [bucket, list] of Object.entries(sources)) {
    if (!isBackupSource(bucket)) continue;
    buckets += 1;
    for (const obj of list || []) {
      if (!obj?.name) continue;
      index[backupPathFor(bucket, obj.name)] = Number(obj.size) || 0;
      objects += 1;
      bytes += Number(obj.size) || 0;
    }
  }

  return { at: nowIso, buckets, objects, bytes, copied, failed, index };
}
