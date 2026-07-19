/**
 * Data Backup Router
 * 
 * Handles backing up and restoring localStorage data to/from the database
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const dataBackupRouter = new Hono();

const BACKUP_KEY_PREFIX = "data_backup:";
const LATEST_KEY = `${BACKUP_KEY_PREFIX}latest`;
const INDEX_KEY = `${BACKUP_KEY_PREFIX}index`;
const MAX_BACKUPS = 5; // Keep last 5 backups
// Hard cap so a single oversized blob can never blow the KV row /
// edge memory / Postgres statement-timeout limits (previous root cause).
// Raised to 2 MB: the original statement-timeout root cause was the 30s backup
// loop hammering the DB (now throttled to 5 min + circuit breaker), not the
// size of a single write. A single ~1 MB compressed write completes fast.
const MAX_BACKUP_BYTES = 2 * 1024 * 1024; // 2 MB

interface BackupData {
  timestamp: string;
  data: Record<string, any>;
  version: number;
}

// Lightweight metadata index so cleanup/listing never has to load the
// full (potentially large) backup blobs via getByPrefix.
interface BackupIndexEntry {
  key: string;
  timestamp: string;
  itemCount: number;
}

/**
 * GET /health
 * Health check endpoint
 */
dataBackupRouter.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "data-backup",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /data/backup
 * Save a backup of localStorage data
 */
dataBackupRouter.post("/backup", async (c) => {
  try {
    const body = await c.req.json();
    const backup: BackupData = body;

    if (!backup || !backup.data) {
      return c.json({ error: "Invalid backup data" }, 400);
    }

    // Guard: reject oversized payloads instead of trying to write a monster
    // row (which previously caused statement timeouts / memory-limit / 413).
    // Return 200 so the client treats it as handled and does not spam retries.
    const payloadBytes = JSON.stringify(backup).length;
    if (payloadBytes > MAX_BACKUP_BYTES) {
      console.warn(
        `⚠️ [DataBackup] Rejected oversized backup (${(payloadBytes / 1024).toFixed(0)} KB > ${MAX_BACKUP_BYTES / 1024} KB)`
      );
      return c.json({
        success: false,
        skipped: true,
        reason: "payload_too_large",
        bytes: payloadBytes,
      });
    }

    const itemCount = Object.keys(backup.data).length;

    // Generate backup key with timestamp
    const backupKey = `${BACKUP_KEY_PREFIX}${Date.now()}`;

    // Save the backup row and update the "latest" pointer.
    // The latest pointer stores only the key (not a second full copy of the
    // blob) to avoid doubling the write cost.
    await kv.set(backupKey, backup);
    await kv.set(LATEST_KEY, { key: backupKey });

    console.log(`✅ [DataBackup] Saved backup with ${itemCount} items`);

    // Update the lightweight metadata index and prune old backups.
    // This never loads full blobs into memory (unlike getByPrefix), so it
    // stays well under the statement-timeout / memory limits.
    try {
      let index: BackupIndexEntry[] = (await kv.get(INDEX_KEY)) || [];
      if (!Array.isArray(index)) index = [];

      index.push({ key: backupKey, timestamp: backup.timestamp, itemCount });
      // Newest last; keep only the most recent MAX_BACKUPS.
      index.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

      if (index.length > MAX_BACKUPS) {
        const toDelete = index.slice(0, index.length - MAX_BACKUPS);
        index = index.slice(index.length - MAX_BACKUPS);
        const keys = toDelete.map((e) => e.key);
        if (keys.length > 0) {
          await kv.mdel(keys);
          console.log(`🗑️ [DataBackup] Cleaned up ${keys.length} old backups`);
        }
      }

      await kv.set(INDEX_KEY, index);
    } catch (cleanupError) {
      console.error("[DataBackup] Index/cleanup error:", cleanupError);
      // Don't fail the backup if cleanup fails
    }

    return c.json({ success: true, backupKey, itemCount });
  } catch (error) {
    console.error("[DataBackup] Backup error:", error);
    return c.json({ error: "Failed to save backup" }, 500);
  }
});

/**
 * GET /data/restore
 * Restore the latest backup
 */
dataBackupRouter.get("/restore", async (c) => {
  try {
    // The latest pointer stores { key } referencing the actual backup row.
    // Fall back gracefully if an older full-blob value is still stored there.
    const latest = await kv.get(LATEST_KEY);

    if (!latest) {
      console.log("[DataBackup] No backup found");
      return c.json({ error: "No backup found" }, 404);
    }

    let backup: BackupData | null = null;
    if (latest.key && !latest.data) {
      backup = await kv.get(latest.key);
    } else if (latest.data) {
      backup = latest; // legacy: full blob stored directly
    }

    if (!backup || !backup.data) {
      console.log("[DataBackup] No backup found");
      return c.json({ error: "No backup found" }, 404);
    }

    console.log(`✅ [DataBackup] Restored backup with ${Object.keys(backup.data).length} items`);

    return c.json(backup);
  } catch (error) {
    console.error("[DataBackup] Restore error:", error);
    return c.json({ error: "Failed to restore backup" }, 500);
  }
});

/**
 * GET /data/backups
 * List all available backups
 */
dataBackupRouter.get("/backups", async (c) => {
  try {
    // Read the lightweight index instead of scanning every full blob.
    let index: BackupIndexEntry[] = (await kv.get(INDEX_KEY)) || [];
    if (!Array.isArray(index)) index = [];

    const backupList = index
      .slice()
      .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

    return c.json({
      success: true,
      backups: backupList,
      total: backupList.length,
    });
  } catch (error) {
    console.error("[DataBackup] List backups error:", error);
    return c.json({ error: "Failed to list backups" }, 500);
  }
});

/**
 * GET /data/backup/:key
 * Get a specific backup by key
 */
dataBackupRouter.get("/backup/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const backup = await kv.get(key);
    
    if (!backup) {
      return c.json({ error: "Backup not found" }, 404);
    }
    
    return c.json(backup);
  } catch (error) {
    console.error("[DataBackup] Get backup error:", error);
    return c.json({ error: "Failed to get backup" }, 500);
  }
});

/**
 * DELETE /data/backup/:key
 * Delete a specific backup
 */
dataBackupRouter.delete("/backup/:key", async (c) => {
  try {
    const key = c.req.param("key");
    
    // Don't allow deleting the latest pointer or the index itself
    if (key === LATEST_KEY || key === INDEX_KEY) {
      return c.json({ error: "Cannot delete this key" }, 400);
    }

    await kv.del(key);

    // Keep the metadata index in sync.
    try {
      let index: BackupIndexEntry[] = (await kv.get(INDEX_KEY)) || [];
      if (Array.isArray(index)) {
        const next = index.filter((e) => e.key !== key);
        if (next.length !== index.length) {
          await kv.set(INDEX_KEY, next);
        }
      }
    } catch (indexError) {
      console.error("[DataBackup] Index update error on delete:", indexError);
    }

    return c.json({
      success: true,
      message: "Backup deleted",
    });
  } catch (error) {
    console.error("[DataBackup] Delete backup error:", error);
    return c.json({ error: "Failed to delete backup" }, 500);
  }
});

export default dataBackupRouter;