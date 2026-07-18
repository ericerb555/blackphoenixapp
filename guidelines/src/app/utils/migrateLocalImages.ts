/**
 * migrateLocalImages — one-time (idempotent) sweep that moves base64 images out
 * of the heavy localStorage keys and into Supabase Storage, replacing them with
 * permanent URLs. This is what shrinks the app's localStorage footprint and the
 * server backup payload.
 *
 * Safe to run repeatedly: only actual `data:image` values are uploaded; URLs and
 * everything else are left untouched. If the server is unreachable, images are
 * left in place and the sweep simply retries next load.
 */
import { migrateImagesDeep } from './imageStorage';

// localStorage keys known to hold base64 images (from codebase audit).
const IMAGE_HEAVY_KEYS = [
  'companies_cache',
  'company_logo_variants',
  'company_branding_profile',
  'company_documents',
  'media_library_items',
];

const RUN_FLAG = 'bp_image_migration_v1_done';

export async function migrateLocalImages(force = false): Promise<{ totalMigrated: number }> {
  let totalMigrated = 0;

  // Skip if we've already completed a clean sweep (unless forced).
  if (!force && localStorage.getItem(RUN_FLAG) === '1') {
    return { totalMigrated: 0 };
  }

  let hadFailure = false;

  for (const key of IMAGE_HEAVY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'null' || raw === 'undefined') continue;

    // Quick check: only do the expensive walk if base64 images are present.
    if (!raw.includes('data:image')) continue;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // not JSON — skip
    }

    try {
      const beforeSize = raw.length;
      const { value, migrated } = await migrateImagesDeep(parsed, `company/${key}`);
      if (migrated > 0) {
        localStorage.setItem(key, JSON.stringify(value));
        totalMigrated += migrated;
        const afterSize = localStorage.getItem(key)?.length || 0;
        console.log(
          `🖼️ [ImageMigration] ${key}: moved ${migrated} images to Storage ` +
          `(${(beforeSize / 1024).toFixed(0)}KB → ${(afterSize / 1024).toFixed(0)}KB)`,
        );
      }
      // If any images remain as base64, the upload failed — retry next load.
      if (JSON.stringify(value).includes('data:image')) hadFailure = true;
    } catch (e) {
      console.warn(`[ImageMigration] Failed migrating ${key}:`, e);
      hadFailure = true;
    }
  }

  // Only set the done-flag if everything migrated cleanly.
  if (!hadFailure) {
    localStorage.setItem(RUN_FLAG, '1');
  }

  if (totalMigrated > 0) {
    console.log(`✅ [ImageMigration] Migrated ${totalMigrated} images to Supabase Storage`);
  }

  return { totalMigrated };
}
