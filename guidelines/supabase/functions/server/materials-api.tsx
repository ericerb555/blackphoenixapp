import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";

const materialsRouter = new Hono();

// CORS is already enabled globally in the main app, no need to duplicate it here
// materialsRouter.use("/*", cors({
//   origin: "*",
//   allowHeaders: ["Content-Type", "Authorization"],
//   allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   credentials: true
// }));

console.log("🏗️ Materials API Router Loading...");

// ============================================================================
// HOME DEPOT API INTEGRATION
// ============================================================================

interface HomeDepotProduct {
  itemId: string;
  productLabel: string;
  description: string;
  brand: string;
  price: number;
  storeSkuNumber: string;
  uom: string;
  imageUrl: string;
  inventoryAvailable: boolean;
  categoryName: string;
}

// Search Home Depot products
materialsRouter.get("/home-depot/search", async (c) => {
  console.log("🏠 Home Depot API search called");
  
  try {
    const query = c.req.query("q") || "";
    const apiKey = Deno.env.get("HOME_DEPOT_API_KEY");

    if (!apiKey) {
      console.error("❌ HOME_DEPOT_API_KEY not configured");
      return c.json({ 
        success: false, 
        error: "Home Depot API key not configured",
        products: []
      });
    }

    if (!query) {
      return c.json({ success: true, products: [], source: "home_depot" });
    }

    console.log(`🔍 Searching Home Depot for: "${query}"`);

    const response = await fetch(
      `https://api.homedepot.com/v1/products/search?keyword=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ Home Depot API error: ${response.status}`);
      return c.json({ 
        success: false, 
        error: `Home Depot API error: ${response.statusText}`,
        products: []
      });
    }

    const data = await response.json();
    console.log(`✅ Found ${data.products?.length || 0} products from Home Depot`);

    const products = (data.products || []).map((p: any) => ({
      id: `hd_${p.itemId}`,
      name: p.productLabel || p.description,
      description: p.description || "",
      category: p.categoryName || "General",
      manufacturer: p.brand || "Home Depot",
      basePrice: parseFloat(p.price) || 0,
      unit: p.uom || "each",
      inStock: p.inventoryAvailable !== false,
      qualityRating: 4.0,
      source: "home_depot",
      sku: p.storeSkuNumber,
      imageUrl: p.imageUrl,
      storeUrl: `https://www.homedepot.com/p/${p.itemId}`
    }));

    return c.json({ 
      success: true, 
      products,
      source: "home_depot",
      total: products.length
    });

  } catch (error) {
    console.error("❌ Home Depot API error:", error);
    return c.json({ 
      success: false, 
      error: String(error),
      products: []
    }, 500);
  }
});

// ============================================================================
// LOWE'S API INTEGRATION
// ============================================================================

interface LowesProduct {
  productId: string;
  name: string;
  description: string;
  brand: string;
  pricing: {
    sellingPrice: number;
  };
  uom: string;
  images: Array<{ url: string }>;
  availability: {
    inStock: boolean;
  };
  category: string;
}

// Search Lowe's products
materialsRouter.get("/lowes/search", async (c) => {
  console.log("🔵 Lowe's API search called");
  
  try {
    const query = c.req.query("q") || "";
    const apiKey = Deno.env.get("LOWES_API_KEY");

    if (!apiKey) {
      console.error("❌ LOWES_API_KEY not configured");
      return c.json({ 
        success: false, 
        error: "Lowe's API key not configured",
        products: []
      });
    }

    if (!query) {
      return c.json({ success: true, products: [], source: "lowes" });
    }

    console.log(`🔍 Searching Lowe's for: "${query}"`);

    const response = await fetch(
      `https://api.lowes.com/product/search?searchTerm=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ Lowe's API error: ${response.status}`);
      return c.json({ 
        success: false, 
        error: `Lowe's API error: ${response.statusText}`,
        products: []
      });
    }

    const data = await response.json();
    console.log(`✅ Found ${data.products?.length || 0} products from Lowe's`);

    const products = (data.products || []).map((p: any) => ({
      id: `lowes_${p.productId}`,
      name: p.name,
      description: p.description || "",
      category: p.category || "General",
      manufacturer: p.brand || "Lowe's",
      basePrice: p.pricing?.sellingPrice || 0,
      unit: p.uom || "each",
      inStock: p.availability?.inStock !== false,
      qualityRating: 4.0,
      source: "lowes",
      sku: p.productId,
      imageUrl: p.images?.[0]?.url,
      storeUrl: `https://www.lowes.com/pd/${p.productId}`
    }));

    return c.json({ 
      success: true, 
      products,
      source: "lowes",
      total: products.length
    });

  } catch (error) {
    console.error("❌ Lowe's API error:", error);
    return c.json({ 
      success: false, 
      error: String(error),
      products: []
    }, 500);
  }
});

// ============================================================================
// GRAINGER API INTEGRATION
// ============================================================================

interface GraingerProduct {
  id: string;
  description: string;
  shortDescription: string;
  brand: string;
  pricing: {
    price: number;
  };
  unitOfMeasure: string;
  imageUrl: string;
  availability: {
    available: boolean;
  };
  categoryName: string;
  sku: string;
}

// Search Grainger products
materialsRouter.get("/grainger/search", async (c) => {
  console.log("⚙️ Grainger API search called");
  
  try {
    const query = c.req.query("q") || "";
    const apiKey = Deno.env.get("GRAINGER_API_KEY");

    if (!apiKey) {
      console.error("❌ GRAINGER_API_KEY not configured");
      return c.json({ 
        success: false, 
        error: "Grainger API key not configured",
        products: []
      });
    }

    if (!query) {
      return c.json({ success: true, products: [], source: "grainger" });
    }

    console.log(`🔍 Searching Grainger for: "${query}"`);

    const response = await fetch(
      `https://api.grainger.com/products/v2/search?searchQuery=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ Grainger API error: ${response.status}`);
      return c.json({ 
        success: false, 
        error: `Grainger API error: ${response.statusText}`,
        products: []
      });
    }

    const data = await response.json();
    console.log(`✅ Found ${data.products?.length || 0} products from Grainger`);

    const products = (data.products || []).map((p: any) => ({
      id: `grainger_${p.id}`,
      name: p.shortDescription || p.description,
      description: p.description || "",
      category: p.categoryName || "Industrial",
      manufacturer: p.brand || "Grainger",
      basePrice: p.pricing?.price || 0,
      unit: p.unitOfMeasure || "each",
      inStock: p.availability?.available !== false,
      qualityRating: 4.5,
      source: "grainger",
      sku: p.sku,
      imageUrl: p.imageUrl,
      storeUrl: `https://www.grainger.com/product/${p.id}`
    }));

    return c.json({ 
      success: true, 
      products,
      source: "grainger",
      total: products.length
    });

  } catch (error) {
    console.error("❌ Grainger API error:", error);
    return c.json({ 
      success: false, 
      error: String(error),
      products: []
    }, 500);
  }
});

// ============================================================================
// UNIFIED SEARCH - Search all stores at once
// ============================================================================

materialsRouter.get("/search", async (c) => {
  console.log("🔍 Unified materials search called");
  
  try {
    const query = c.req.query("q") || "";
    const stores = c.req.query("stores")?.split(",") || ["home_depot", "lowes", "grainger"];
    
    if (!query) {
      return c.json({ 
        success: true, 
        products: [],
        byStore: {},
        total: 0
      });
    }

    console.log(`🔍 Searching all stores for: "${query}"`);
    console.log(`📍 Enabled stores: ${stores.join(", ")}`);

    const allProducts: any[] = [];
    let homeDepotCount = 0;
    let lowesCount = 0;
    let graingerCount = 0;

    // Search Home Depot
    if (stores.includes("home_depot")) {
      try {
        const apiKey = Deno.env.get("HOME_DEPOT_API_KEY");
        if (apiKey) {
          console.log("🏠 Searching Home Depot...");
          const response = await fetch(
            `https://api.homedepot.com/v1/products/search?keyword=${encodeURIComponent(query)}`,
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const products = (data.products || []).map((p: any) => ({
              id: `hd_${p.itemId}`,
              name: p.productLabel || p.description,
              description: p.description || "",
              category: p.categoryName || "General",
              manufacturer: p.brand || "Home Depot",
              basePrice: parseFloat(p.price) || 0,
              unit: p.uom || "each",
              inStock: p.inventoryAvailable !== false,
              qualityRating: 4.0,
              source: "home_depot",
              sku: p.storeSkuNumber,
              imageUrl: p.imageUrl,
              storeUrl: `https://www.homedepot.com/p/${p.itemId}`
            }));
            allProducts.push(...products);
            homeDepotCount = products.length;
            console.log(`✅ Home Depot: ${homeDepotCount} products`);
          }
        } else {
          console.warn("⚠️ HOME_DEPOT_API_KEY not configured");
        }
      } catch (error) {
        console.error("❌ Home Depot search error:", error);
      }
    }

    // Search Lowe's
    if (stores.includes("lowes")) {
      try {
        const apiKey = Deno.env.get("LOWES_API_KEY");
        if (apiKey) {
          console.log("🔵 Searching Lowe's...");
          const response = await fetch(
            `https://api.lowes.com/product/search?searchTerm=${encodeURIComponent(query)}`,
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const products = (data.products || []).map((p: any) => ({
              id: `lowes_${p.productId}`,
              name: p.name,
              description: p.description || "",
              category: p.category || "General",
              manufacturer: p.brand || "Lowe's",
              basePrice: p.pricing?.sellingPrice || 0,
              unit: p.uom || "each",
              inStock: p.availability?.inStock !== false,
              qualityRating: 4.0,
              source: "lowes",
              sku: p.productId,
              imageUrl: p.images?.[0]?.url,
              storeUrl: `https://www.lowes.com/pd/${p.productId}`
            }));
            allProducts.push(...products);
            lowesCount = products.length;
            console.log(`✅ Lowe's: ${lowesCount} products`);
          }
        } else {
          console.warn("⚠️ LOWES_API_KEY not configured");
        }
      } catch (error) {
        console.error("❌ Lowe's search error:", error);
      }
    }

    // Search Grainger
    if (stores.includes("grainger")) {
      try {
        const apiKey = Deno.env.get("GRAINGER_API_KEY");
        if (apiKey) {
          console.log("⚙️ Searching Grainger...");
          const response = await fetch(
            `https://api.grainger.com/products/v2/search?searchQuery=${encodeURIComponent(query)}`,
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            const products = (data.products || []).map((p: any) => ({
              id: `grainger_${p.id}`,
              name: p.shortDescription || p.description,
              description: p.description || "",
              category: p.categoryName || "Industrial",
              manufacturer: p.brand || "Grainger",
              basePrice: p.pricing?.price || 0,
              unit: p.unitOfMeasure || "each",
              inStock: p.availability?.available !== false,
              qualityRating: 4.5,
              source: "grainger",
              sku: p.sku,
              imageUrl: p.imageUrl,
              storeUrl: `https://www.grainger.com/product/${p.id}`
            }));
            allProducts.push(...products);
            graingerCount = products.length;
            console.log(`✅ Grainger: ${graingerCount} products`);
          }
        } else {
          console.warn("⚠️ GRAINGER_API_KEY not configured");
        }
      } catch (error) {
        console.error("❌ Grainger search error:", error);
      }
    }

    console.log(`✅ Total products found: ${allProducts.length}`);

    return c.json({
      success: true,
      products: allProducts,
      total: allProducts.length,
      byStore: {
        home_depot: homeDepotCount,
        lowes: lowesCount,
        grainger: graingerCount
      }
    });

  } catch (error) {
    console.error("❌ Unified search error:", error);
    return c.json({ 
      success: false, 
      error: String(error),
      products: [],
      total: 0
    }, 500);
  }
});

console.log("✅ Materials API Router loaded successfully");

export default materialsRouter;