/**
 * Blueprint Export API — CaptureCAD Studio Backend
 * 
 * Handles export of CAD/design plans to PDF, DWG, PNG formats
 * Integrated with Quote System and Supabase Storage
 * 
 * ENDPOINTS:
 * - POST   /make-server-3eae23a6/blueprints/export              → Create new export
 * - GET    /make-server-3eae23a6/blueprints/export/:exportId   → Get export status
 * - GET    /make-server-3eae23a6/blueprints/project/:projectId/exports → List project exports
 * - GET    /make-server-3eae23a6/blueprints/exports            → Get all exports (admin)
 * - DELETE /make-server-3eae23a6/blueprints/export/:exportId   → Delete export
 * 
 * STORAGE:
 * - Bucket: make-824f083c-blueprints (private)
 * - Path:   projects/:projectId/:fileName
 * - Signed URLs valid for 1 hour
 * 
 * INTEGRATION POINTS:
 * - Quote system via quoteId (optional)
 * - Project system via projectId
 * - KV Store for metadata
 * - Supabase Storage for files
 * 
 * TODO FOR PRODUCTION:
 * 1. Replace generateSimulatedBlueprint() with real PDF/DWG/PNG generation
 * 2. Implement actual CAD rendering using libraries like:
 *    - jsPDF or pdfkit for PDF generation
 *    - node-dxf for DWG/DXF CAD files
 *    - Canvas API or Sharp for PNG rasterization
 * 3. Add authentication/authorization checks
 * 4. Implement file size limits and validation
 * 5. Add webhook notifications on export completion
 * 6. Implement batch export functionality
 * 7. Add export templates and custom branding
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const blueprintRouter = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Bucket name for blueprint storage
const BUCKET_NAME = "make-824f083c-blueprints";

// Initialize storage bucket on startup
async function initializeBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`📦 Creating blueprint storage bucket: ${BUCKET_NAME}`);
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50MB limit
      });
      // Ignore 409 / "already exists" from a concurrent init or prior deploy.
      if (error && (error as any).statusCode !== "409" && !/already exists/i.test(error.message || "")) {
        console.error("❌ Failed to create blueprint bucket:", error);
      } else {
        console.log("✅ Blueprint bucket ready");
      }
    } else {
      console.log("✅ Blueprint bucket already exists");
    }
  } catch (error) {
    console.error("❌ Error initializing blueprint bucket:", error);
  }
}

// Call initialization
initializeBucket();

/**
 * Generate Blueprint Export
 * POST /make-server-3eae23a6/blueprints/export
 * 
 * Body: {
 *   projectId: string;
 *   projectName: string;
 *   quoteId?: string;
 *   sheetSize: string (A0, A1, A2, A3, A4, ANSI_D, ANSI_E);
 *   scale: string (1:50, 1:100, 1:200, 1:500, 1:1000);
 *   format: string (pdf, dwg, png);
 *   layers: {
 *     architectural: boolean;
 *     plumbing: boolean;
 *     electrical: boolean;
 *   };
 *   elements: any[]; // Drawing elements from canvas
 *   metadata?: any;
 * }
 */
blueprintRouter.post("/make-server-3eae23a6/blueprints/export", async (c) => {
  try {
    const body = await c.req.json();
    const {
      projectId,
      projectName,
      quoteId,
      sheetSize,
      scale,
      format,
      layers,
      elements,
      metadata = {},
    } = body;

    console.log(`📐 Generating blueprint export for project: ${projectName}`);
    console.log(`   Sheet: ${sheetSize} | Scale: ${scale} | Format: ${format}`);
    console.log(`   Layers: Arch=${layers.architectural}, Plumbing=${layers.plumbing}, Electrical=${layers.electrical}`);

    // Validate required fields
    if (!projectId || !projectName || !sheetSize || !scale || !format || !layers) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Get quote data if quoteId provided
    let quoteData = null;
    if (quoteId) {
      quoteData = await kv.get(`quote:${quoteId}`);
      console.log(`📋 Linked to quote: ${quoteId}`);
    }

    // Generate export ID
    const exportId = `BP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Create export metadata
    const exportData = {
      exportId,
      projectId,
      projectName,
      quoteId: quoteId || null,
      sheetSize,
      scale,
      format,
      layers,
      elementCount: elements?.length || 0,
      metadata: {
        ...metadata,
        generatedAt: timestamp,
        generatedBy: "CaptureCAD Studio",
        version: "1.0.0",
      },
      status: "processing",
      createdAt: timestamp,
    };

    // Store export metadata in KV
    await kv.set(`blueprint:export:${exportId}`, exportData);

    // In a real implementation, here you would:
    // 1. Generate the actual PDF/DWG/PNG file using libraries like:
    //    - PDF: jsPDF, PDFKit, or pdfmake
    //    - DWG: node-dxf or similar CAD library
    //    - PNG: canvas rendering
    // 2. Process the elements array to create the blueprint
    // 3. Apply the selected layers (filter elements by layer type)
    // 4. Apply sheet size and scale transformations

    // For now, we'll simulate the file generation
    const simulatedFileContent = generateSimulatedBlueprint({
      projectName,
      sheetSize,
      scale,
      format,
      layers,
      elements,
      quoteData,
    });

    // Upload to Supabase Storage
    const fileName = `${exportId}_${projectName.replace(/\s+/g, "_")}.${format}`;
    const filePath = `projects/${projectId}/${fileName}`;

    console.log(`📤 Uploading to storage: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, simulatedFileContent, {
        contentType: getContentType(format),
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError);
      await kv.set(`blueprint:export:${exportId}`, {
        ...exportData,
        status: "failed",
        error: uploadError.message,
      });
      return c.json({ error: "Failed to upload blueprint", details: uploadError.message }, 500);
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      console.error("❌ Error creating signed URL:", signedUrlError);
    }

    // Update export metadata with success status
    const completedExport = {
      ...exportData,
      status: "completed",
      filePath,
      fileName,
      downloadUrl: signedUrlData?.signedUrl || null,
      fileSize: simulatedFileContent.length,
      completedAt: new Date().toISOString(),
    };

    await kv.set(`blueprint:export:${exportId}`, completedExport);

    // Also store in project history
    const projectExports = (await kv.get(`blueprint:project:${projectId}:exports`)) || [];
    projectExports.push({
      exportId,
      fileName,
      format,
      timestamp,
    });
    await kv.set(`blueprint:project:${projectId}:exports`, projectExports);

    console.log(`✅ Blueprint export completed: ${exportId}`);

    return c.json({
      success: true,
      exportId,
      downloadUrl: signedUrlData?.signedUrl,
      fileName,
      fileSize: simulatedFileContent.length,
      metadata: completedExport,
    });

  } catch (error) {
    console.error("❌ Error in blueprint export:", error);
    return c.json({ 
      error: "Blueprint export failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

/**
 * Get Export Status
 * GET /make-server-3eae23a6/blueprints/export/:exportId
 */
blueprintRouter.get("/make-server-3eae23a6/blueprints/export/:exportId", async (c) => {
  try {
    const exportId = c.req.param("exportId");
    const exportData = await kv.get(`blueprint:export:${exportId}`);

    if (!exportData) {
      return c.json({ error: "Export not found" }, 404);
    }

    // If completed and has a file path, regenerate signed URL
    if (exportData.status === "completed" && exportData.filePath) {
      const { data: signedUrlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(exportData.filePath, 3600);

      exportData.downloadUrl = signedUrlData?.signedUrl || exportData.downloadUrl;
    }

    return c.json(exportData);
  } catch (error) {
    console.error("❌ Error fetching export:", error);
    return c.json({ error: "Failed to fetch export" }, 500);
  }
});

/**
 * List Project Exports
 * GET /make-server-3eae23a6/blueprints/project/:projectId/exports
 */
blueprintRouter.get("/make-server-3eae23a6/blueprints/project/:projectId/exports", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const exports = (await kv.get(`blueprint:project:${projectId}:exports`)) || [];

    // Fetch full details for each export
    const exportsWithDetails = await Promise.all(
      exports.map(async (exp: any) => {
        const fullData = await kv.get(`blueprint:export:${exp.exportId}`);
        return fullData || exp;
      })
    );

    return c.json({
      projectId,
      exports: exportsWithDetails,
      count: exportsWithDetails.length,
    });
  } catch (error) {
    console.error("❌ Error listing project exports:", error);
    return c.json({ error: "Failed to list exports" }, 500);
  }
});

/**
 * Get All Exports (Admin)
 * GET /make-server-3eae23a6/blueprints/exports
 */
blueprintRouter.get("/make-server-3eae23a6/blueprints/exports", async (c) => {
  try {
    const exports = await kv.getByPrefix("blueprint:export:");
    return c.json({
      exports,
      count: exports.length,
    });
  } catch (error) {
    console.error("❌ Error fetching all exports:", error);
    return c.json({ error: "Failed to fetch exports" }, 500);
  }
});

/**
 * Delete Export
 * DELETE /make-server-3eae23a6/blueprints/export/:exportId
 */
blueprintRouter.delete("/make-server-3eae23a6/blueprints/export/:exportId", async (c) => {
  try {
    const exportId = c.req.param("exportId");
    const exportData = await kv.get(`blueprint:export:${exportId}`);

    if (!exportData) {
      return c.json({ error: "Export not found" }, 404);
    }

    // Delete from storage
    if (exportData.filePath) {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([exportData.filePath]);

      if (deleteError) {
        console.error("⚠️ Error deleting file from storage:", deleteError);
      }
    }

    // Delete from KV
    await kv.del(`blueprint:export:${exportId}`);

    console.log(`🗑️ Deleted export: ${exportId}`);

    return c.json({ success: true, message: "Export deleted" });
  } catch (error) {
    console.error("❌ Error deleting export:", error);
    return c.json({ error: "Failed to delete export" }, 500);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate simulated blueprint content
 * In production, replace this with actual PDF/DWG/PNG generation
 */
function generateSimulatedBlueprint(config: any): Uint8Array {
  const {
    projectName,
    sheetSize,
    scale,
    format,
    layers,
    elements,
    quoteData,
  } = config;

  // Create a simple text representation for simulation
  const content = `
===========================================
BLUEPRINT EXPORT
===========================================

Project: ${projectName}
Sheet Size: ${sheetSize}
Scale: ${scale}
Format: ${format}

Layers:
- Architectural: ${layers.architectural ? "✓" : "✗"}
- Plumbing: ${layers.plumbing ? "✓" : "✗"}
- Electrical: ${layers.electrical ? "✓" : "✗"}

Elements: ${elements?.length || 0} components

${quoteData ? `Quote ID: ${quoteData.quoteId || "N/A"}\nQuote Total: $${quoteData.total || "N/A"}` : "No quote attached"}

Generated: ${new Date().toISOString()}
Generator: CaptureCAD Studio v1.0.0

===========================================
NOTE: This is a simulated export for demo.
In production, this would be a real ${format.toUpperCase()} file.
===========================================
  `.trim();

  return new TextEncoder().encode(content);
}

/**
 * Get content type for file format
 */
function getContentType(format: string): string {
  switch (format.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "dwg":
      return "application/acad";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

export { blueprintRouter };
