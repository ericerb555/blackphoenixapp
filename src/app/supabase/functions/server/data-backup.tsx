/**
 * Data Backup Router
 * 
 * Handles backing up and restoring localStorage data to/from the database
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const dataBackupRouter = new Hono();

const BACKUP_KEY_PREFIX = "data_backup:";
const MAX_BACKUPS = 10; // Keep last 10 backups

interface BackupData {
  timestamp: string;
  data: Record<string, any>;
  version: number;
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

    // Generate backup key with timestamp
    const backupKey = `${BACKUP_KEY_PREFIX}${Date.now()}`;
    
    // Save backup to KV store
    await kv.set(backupKey, backup);
    
    // Also save as "latest" backup for quick restore
    await kv.set(`${BACKUP_KEY_PREFIX}latest`, backup);
    
    console.log(`✅ [DataBackup] Saved backup with ${Object.keys(backup.data).length} items`);

    // Clean up old backups (keep last MAX_BACKUPS)
    try {
      const allBackups = await kv.getByPrefix(BACKUP_KEY_PREFIX);
      if (allBackups.length > MAX_BACKUPS) {
        // Sort by timestamp (key contains timestamp)
        const sortedKeys = allBackups
          .map(b => b.key)
          .filter(key => key !== `${BACKUP_KEY_PREFIX}latest`)
          .sort();
        
        // Delete oldest backups
        const toDelete = sortedKeys.slice(0, sortedKeys.length - MAX_BACKUPS);
        for (const key of toDelete) {
          await kv.del(key);
        }
        console.log(`🗑️ [DataBackup] Cleaned up ${toDelete.length} old backups`);
      }
    } catch (cleanupError) {
      console.error('[DataBackup] Cleanup error:', cleanupError);
      // Don't fail the backup if cleanup fails
    }

    return c.json({
      success: true,
      backupKey,
      itemCount: Object.keys(backup.data).length,
    });
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
    // Get the latest backup
    const backup = await kv.get(`${BACKUP_KEY_PREFIX}latest`);
    
    if (!backup) {
      console.log('[DataBackup] No backup found');
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
    const allBackups = await kv.getByPrefix(BACKUP_KEY_PREFIX);
    
    const backupList = allBackups
      .filter(b => b.key !== `${BACKUP_KEY_PREFIX}latest`)
      .map(b => ({
        key: b.key,
        timestamp: b.value.timestamp,
        itemCount: Object.keys(b.value.data || {}).length,
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
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
    
    // Don't allow deleting the latest backup
    if (key === `${BACKUP_KEY_PREFIX}latest`) {
      return c.json({ error: "Cannot delete latest backup" }, 400);
    }
    
    await kv.del(key);
    
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