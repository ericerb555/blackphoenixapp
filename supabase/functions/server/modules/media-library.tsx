/**
 * Media Library API — Enterprise Media Management Backend
 * 
 * Handles upload, storage, and management of images and videos
 * Integrated with Supabase Storage and KV Store
 * 
 * ENDPOINTS:
 * - POST   /make-server-57095a78/media/upload              → Upload media file
 * - GET    /make-server-57095a78/media                     → List all media
 * - GET    /make-server-57095a78/media/:mediaId            → Get media details
 * - DELETE /make-server-57095a78/media/:mediaId            → Delete media
 * - PUT    /make-server-57095a78/media/:mediaId            → Update media metadata
 * - GET    /make-server-57095a78/media/folder/:folderId    → Get media by folder
 * 
 * STORAGE:
 * - Bucket: make-824f083c-media (private)
 * - Path:   media/:year/:month/:filename
 * - Signed URLs valid for 24 hours
 * 
 * SUPPORTED FORMATS:
 * - Images: JPG, PNG, GIF, WebP, SVG, BMP, TIFF
 * - Videos: MP4, MOV, WebM, AVI, MKV, FLV
 * - Max Size: 100MB per file
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const mediaRouter = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BUCKET_NAME = "make-824f083c-media";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (project storage cap; 100MB caused a 413 on bucket creation)

// Supported file types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff'
];

const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // MOV
  'video/webm',
  'video/x-msvideo', // AVI
  'video/x-matroska', // MKV
  'video/x-flv' // FLV
];

const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];

// Initialize storage bucket on startup
async function initializeBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE
      });
      
      // A 409 / "already exists" means another init call (or a prior deploy)
      // created it first — that's fine, treat it as success.
      if (error && (error as any).statusCode !== "409" && !/already exists/i.test(error.message || "")) {
        console.error(`❌ Failed to create bucket ${BUCKET_NAME}:`, error);
      } else {
        console.log(`✅ Bucket ready: ${BUCKET_NAME}`);
      }
    } else {
      console.log(`✅ Bucket ${BUCKET_NAME} already exists`);
    }
  } catch (error) {
    console.error("❌ Error initializing bucket:", error);
  }
}

// Initialize on startup
initializeBucket();

// Helper to get file extension from filename
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// Helper to determine media type from MIME type
function getMediaType(mimeType: string): 'image' | 'video' | null {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video';
  return null;
}

// Helper to generate storage path
function generateStoragePath(filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now();
  const ext = getFileExtension(filename);
  const randomId = Math.random().toString(36).substring(2, 15);
  
  return `media/${year}/${month}/${timestamp}-${randomId}.${ext}`;
}

// Upload media file
mediaRouter.post("/make-server-57095a78/media/upload", async (c) => {
  console.log("📤 Media upload request received");
  try {
    const formData = await c.req.formData();
    console.log("📋 FormData parsed successfully");
    
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string | null;
    const tags = formData.get('tags') as string | null;
    const description = formData.get('description') as string | null;
    const project = formData.get('project') as string | null;
    const client = formData.get('client') as string | null;

    console.log("📁 File details:", {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      folder: folder || 'none'
    });

    if (!file) {
      console.error("❌ No file provided in request");
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ 
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, 400);
    }

    // Validate file type
    const mediaType = getMediaType(file.type);
    if (!mediaType) {
      return c.json({ 
        error: `Unsupported file type: ${file.type}. Supported formats: JPG, PNG, GIF, WebP, SVG, BMP, TIFF, MP4, MOV, WebM, AVI, MKV, FLV` 
      }, 400);
    }

    // Generate storage path
    const storagePath = generateStoragePath(file.name);

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return c.json({ error: 'Failed to upload file to storage' }, 500);
    }

    // Generate signed URL (valid for 24 hours)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 86400); // 24 hours

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return c.json({ error: 'Failed to generate signed URL' }, 500);
    }

    // Create media metadata
    const mediaId = `MEDIA-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const mediaItem = {
      id: mediaId,
      type: mediaType,
      name: file.name,
      url: signedUrlData.signedUrl,
      storagePath: storagePath,
      size: file.size,
      mimeType: file.type,
      dimensions: { width: 0, height: 0 }, // TODO: Extract actual dimensions
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'System User', // TODO: Get from auth
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      folder: folder || undefined,
      project: project || undefined,
      client: client || undefined,
      favorite: false,
      description: description || undefined
    };

    // Store in KV
    await kv.set(`media:${mediaId}`, mediaItem);
    
    // Add to folder index if specified
    if (folder) {
      const folderMediaKey = `media:folder:${folder}`;
      const folderMedia = await kv.get(folderMediaKey) || [];
      folderMedia.push(mediaId);
      await kv.set(folderMediaKey, folderMedia);
    }

    // Add to global media index
    const allMediaKey = 'media:all';
    const allMedia = await kv.get(allMediaKey) || [];
    allMedia.push(mediaId);
    await kv.set(allMediaKey, allMedia);

    console.log(`✅ Media uploaded successfully: ${mediaId}`);

    return c.json({
      success: true,
      media: mediaItem
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return c.json({ 
      error: 'Failed to upload media',
      details: error.message 
    }, 500);
  }
});

// List all media
mediaRouter.get("/make-server-57095a78/media", async (c) => {
  try {
    const allMediaKey = 'media:all';
    const mediaIds = await kv.get(allMediaKey) || [];
    
    const mediaItems = await Promise.all(
      mediaIds.map(async (id: string) => {
        const item = await kv.get(`media:${id}`);
        
        // Refresh signed URL if needed
        if (item && item.storagePath) {
          const { data: signedUrlData } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(item.storagePath, 86400);
          
          if (signedUrlData) {
            item.url = signedUrlData.signedUrl;
            if (item.type === 'image') {
              item.thumbnail = signedUrlData.signedUrl;
            }
          }
        }
        
        return item;
      })
    );

    return c.json({
      success: true,
      media: mediaItems.filter(Boolean)
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    return c.json({ 
      error: 'Failed to fetch media',
      details: error.message 
    }, 500);
  }
});

// Get media by ID
mediaRouter.get("/make-server-57095a78/media/:mediaId", async (c) => {
  try {
    const { mediaId } = c.req.param();
    const mediaItem = await kv.get(`media:${mediaId}`);

    if (!mediaItem) {
      return c.json({ error: 'Media not found' }, 404);
    }

    // Refresh signed URL
    if (mediaItem.storagePath) {
      const { data: signedUrlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(mediaItem.storagePath, 86400);
      
      if (signedUrlData) {
        mediaItem.url = signedUrlData.signedUrl;
      }
    }

    return c.json({
      success: true,
      media: mediaItem
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    return c.json({ 
      error: 'Failed to fetch media',
      details: error.message 
    }, 500);
  }
});

// Delete media
mediaRouter.delete("/make-server-57095a78/media/:mediaId", async (c) => {
  try {
    const { mediaId } = c.req.param();
    const mediaItem = await kv.get(`media:${mediaId}`);

    if (!mediaItem) {
      return c.json({ error: 'Media not found' }, 404);
    }

    // Delete from storage
    if (mediaItem.storagePath) {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([mediaItem.storagePath]);
      
      if (deleteError) {
        console.error('Storage delete error:', deleteError);
      }
    }

    // Remove from KV
    await kv.del(`media:${mediaId}`);

    // Remove from folder index
    if (mediaItem.folder) {
      const folderMediaKey = `media:folder:${mediaItem.folder}`;
      const folderMedia = await kv.get(folderMediaKey) || [];
      const updatedFolderMedia = folderMedia.filter((id: string) => id !== mediaId);
      await kv.set(folderMediaKey, updatedFolderMedia);
    }

    // Remove from global index
    const allMediaKey = 'media:all';
    const allMedia = await kv.get(allMediaKey) || [];
    const updatedAllMedia = allMedia.filter((id: string) => id !== mediaId);
    await kv.set(allMediaKey, updatedAllMedia);

    console.log(`✅ Media deleted successfully: ${mediaId}`);

    return c.json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting media:', error);
    return c.json({ 
      error: 'Failed to delete media',
      details: error.message 
    }, 500);
  }
});

// Update media metadata
mediaRouter.put("/make-server-57095a78/media/:mediaId", async (c) => {
  try {
    const { mediaId } = c.req.param();
    const updates = await c.req.json();
    
    const mediaItem = await kv.get(`media:${mediaId}`);
    if (!mediaItem) {
      return c.json({ error: 'Media not found' }, 404);
    }

    // Update allowed fields
    const updatedMedia = {
      ...mediaItem,
      ...(updates.name && { name: updates.name }),
      ...(updates.tags && { tags: updates.tags }),
      ...(updates.folder && { folder: updates.folder }),
      ...(updates.project && { project: updates.project }),
      ...(updates.client && { client: updates.client }),
      ...(updates.description && { description: updates.description }),
      ...(updates.favorite !== undefined && { favorite: updates.favorite })
    };

    await kv.set(`media:${mediaId}`, updatedMedia);

    console.log(`✅ Media updated successfully: ${mediaId}`);

    return c.json({
      success: true,
      media: updatedMedia
    });

  } catch (error) {
    console.error('Error updating media:', error);
    return c.json({ 
      error: 'Failed to update media',
      details: error.message 
    }, 500);
  }
});

// Get media by folder
mediaRouter.get("/make-server-57095a78/media/folder/:folderId", async (c) => {
  try {
    const { folderId } = c.req.param();
    const folderMediaKey = `media:folder:${folderId}`;
    const mediaIds = await kv.get(folderMediaKey) || [];
    
    const mediaItems = await Promise.all(
      mediaIds.map(async (id: string) => {
        const item = await kv.get(`media:${id}`);
        
        // Refresh signed URL
        if (item && item.storagePath) {
          const { data: signedUrlData } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(item.storagePath, 86400);
          
          if (signedUrlData) {
            item.url = signedUrlData.signedUrl;
          }
        }
        
        return item;
      })
    );

    return c.json({
      success: true,
      media: mediaItems.filter(Boolean)
    });

  } catch (error) {
    console.error('Error fetching folder media:', error);
    return c.json({ 
      error: 'Failed to fetch folder media',
      details: error.message 
    }, 500);
  }
});

export default mediaRouter;