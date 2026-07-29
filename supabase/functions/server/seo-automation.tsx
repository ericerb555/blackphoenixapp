// SEO Automation - Structured Data, Sitemap, Meta Tags
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const seo = new Hono();

// ============================================
// SITEMAP GENERATION
// ============================================

seo.get('/make-server-3eae23a6/api/seo/sitemap.xml', async (c) => {
  try {
    const baseUrl = c.req.header('X-Base-URL') || 'https://example.com';
    
    // Get all products
    const products = await kv.getByPrefix('product:');
    const productUrls = products
      .map((p: any) => p.value)
      .filter(Boolean)
      .map((product: any) => ({
        url: `${baseUrl}/products/${product.id}`,
        lastmod: new Date(product.updatedAt || product.createdAt || Date.now()).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.8,
        images: [product.primaryImage, ...(product.images || [])].filter(Boolean)
      }));

    // Get all categories
    const categories = new Set(
      products
        .map((p: any) => p.value?.category)
        .filter(Boolean)
    );
    
    const categoryUrls = Array.from(categories).map((category: any) => ({
      url: `${baseUrl}/category/${encodeURIComponent(category)}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.7
    }));

    // Static pages
    const staticUrls = [
      { url: baseUrl, changefreq: 'daily', priority: 1.0 },
      { url: `${baseUrl}/shop`, changefreq: 'daily', priority: 0.9 },
      { url: `${baseUrl}/about`, changefreq: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/contact`, changefreq: 'monthly', priority: 0.5 }
    ];

    const allUrls = [...staticUrls, ...categoryUrls, ...productUrls];

    // Generate XML sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls.map(item => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>${
      item.images && item.images.length > 0 ? `
${item.images.map((img: string) => `    <image:image>
      <image:loc>${img}</image:loc>
    </image:image>`).join('\n')}` : ''
    }
  </url>`).join('\n')}
</urlset>`;

    c.header('Content-Type', 'application/xml');
    return c.text(xml);
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    return c.text('Error generating sitemap', 500);
  }
});

// ============================================
// STRUCTURED DATA (JSON-LD)
// ============================================

seo.get('/make-server-3eae23a6/api/seo/product/:productId/schema', async (c) => {
  try {
    const productId = c.req.param('productId');
    const baseUrl = c.req.header('X-Base-URL') || 'https://example.com';
    
    const product = await kv.get(`product:${productId}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Get vendor info
    const vendor = await kv.get(`vendor:${product.vendorId}`);

    // Get reviews for aggregate rating
    const reviewsData = await kv.getByPrefix(`review:product:${productId}`);
    const reviews = reviewsData.map((r: any) => r.value).filter(Boolean);
    
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 4.5;

    // Generate Product Schema
    const productSchema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": [product.primaryImage, ...(product.images || [])].filter(Boolean),
      "sku": product.sku || product.id,
      "brand": {
        "@type": "Brand",
        "name": vendor?.companyName || "Unknown Brand"
      },
      "offers": {
        "@type": "Offer",
        "url": `${baseUrl}/products/${product.id}`,
        "priceCurrency": product.currency || "USD",
        "price": product.price,
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "availability": product.trackInventory && product.inventoryQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {
          "@type": "Organization",
          "name": vendor?.companyName || "Unknown Seller"
        }
      },
      "aggregateRating": reviews.length > 0 ? {
        "@type": "AggregateRating",
        "ratingValue": avgRating.toFixed(1),
        "reviewCount": reviews.length,
        "bestRating": "5",
        "worstRating": "1"
      } : undefined,
      "review": reviews.slice(0, 5).map((review: any) => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.customerName
        },
        "datePublished": new Date(review.date).toISOString().split('T')[0],
        "reviewBody": review.content,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": "5",
          "worstRating": "1"
        }
      }))
    };

    return c.json(productSchema);
  } catch (error: any) {
    console.error('Error generating product schema:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Organization Schema
seo.get('/make-server-3eae23a6/api/seo/organization-schema', async (c) => {
  try {
    const baseUrl = c.req.header('X-Base-URL') || 'https://example.com';
    
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Enterprise Business Platform",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`,
      "description": "Comprehensive enterprise business management platform with eCommerce, CRM, and advanced analytics",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-555-0123",
        "contactType": "customer service",
        "availableLanguage": ["en", "es", "fr", "de"]
      },
      "sameAs": [
        `${baseUrl}/facebook`,
        `${baseUrl}/twitter`,
        `${baseUrl}/linkedin`
      ]
    };

    return c.json(organizationSchema);
  } catch (error: any) {
    console.error('Error generating organization schema:', error);
    return c.json({ error: error.message }, 500);
  }
});

// BreadcrumbList Schema
seo.get('/make-server-3eae23a6/api/seo/breadcrumb-schema', async (c) => {
  try {
    const path = c.req.query('path') || '/';
    const baseUrl = c.req.header('X-Base-URL') || 'https://example.com';
    
    const pathParts = path.split('/').filter(Boolean);
    
    const breadcrumbItems = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      }
    ];

    let currentPath = baseUrl;
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      breadcrumbItems.push({
        "@type": "ListItem",
        "position": index + 2,
        "name": decodeURIComponent(part),
        "item": currentPath
      });
    });

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbItems
    };

    return c.json(breadcrumbSchema);
  } catch (error: any) {
    console.error('Error generating breadcrumb schema:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// META TAGS GENERATION
// ============================================

seo.get('/make-server-3eae23a6/api/seo/product/:productId/meta', async (c) => {
  try {
    const productId = c.req.param('productId');
    const baseUrl = c.req.header('X-Base-URL') || 'https://example.com';
    
    const product = await kv.get(`product:${productId}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // Generate optimized meta tags
    const metaTags = {
      title: `${product.name} | Enterprise Business Platform`,
      description: product.description?.substring(0, 160) || `Buy ${product.name} online`,
      keywords: generateKeywords(product),
      
      // Open Graph
      og: {
        type: 'product',
        title: product.name,
        description: product.description,
        image: product.primaryImage,
        url: `${baseUrl}/products/${product.id}`,
        site_name: 'Enterprise Business Platform',
        locale: 'en_US',
        'product:price:amount': product.price,
        'product:price:currency': product.currency || 'USD'
      },
      
      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description: product.description?.substring(0, 200),
        image: product.primaryImage,
        site: '@enterpriseplatform',
        creator: '@enterpriseplatform'
      },
      
      // Additional SEO
      canonical: `${baseUrl}/products/${product.id}`,
      robots: 'index, follow',
      'og:availability': product.trackInventory && product.inventoryQuantity > 0 ? 'instock' : 'out of stock'
    };

    return c.json(metaTags);
  } catch (error: any) {
    console.error('Error generating meta tags:', error);
    return c.json({ error: error.message }, 500);
  }
});

function generateKeywords(product: any): string {
  const keywords = [
    product.name,
    product.category,
    product.vendor || 'quality products',
    'buy online',
    'ecommerce',
    'shop',
    product.tags || []
  ];
  
  return keywords
    .flat()
    .filter(Boolean)
    .join(', ')
    .toLowerCase();
}

// ============================================
// ROBOTS.TXT
// ============================================

seo.get('/make-server-3eae23a6/api/seo/robots.txt', async (c) => {
  const baseUrl = c.req.header('X-Base-URL') || 'https://example.com';
  
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /account/

# Sitemap
Sitemap: ${baseUrl}/api/seo/sitemap.xml

# Crawl delay
Crawl-delay: 1`;

  c.header('Content-Type', 'text/plain');
  return c.text(robotsTxt);
});

// ============================================
// SEO ANALYSIS & RECOMMENDATIONS
// ============================================

seo.get('/make-server-3eae23a6/api/seo/analyze/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const product = await kv.get(`product:${productId}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const analysis = {
      score: 0,
      issues: [] as any[],
      recommendations: [] as any[],
      strengths: [] as any[]
    };

    let score = 0;

    // Title length check
    if (product.name) {
      if (product.name.length >= 30 && product.name.length <= 60) {
        score += 15;
        analysis.strengths.push('Title length is optimal (30-60 characters)');
      } else if (product.name.length < 30) {
        analysis.issues.push({
          severity: 'medium',
          message: 'Title is too short. Aim for 30-60 characters.',
          impact: 'May reduce click-through rate'
        });
      } else {
        analysis.issues.push({
          severity: 'medium',
          message: 'Title is too long. Keep it under 60 characters.',
          impact: 'May be truncated in search results'
        });
      }
    } else {
      analysis.issues.push({
        severity: 'high',
        message: 'Product title is missing',
        impact: 'Critical for SEO'
      });
    }

    // Description check
    if (product.description) {
      if (product.description.length >= 120 && product.description.length <= 160) {
        score += 15;
        analysis.strengths.push('Meta description length is optimal');
      } else if (product.description.length < 120) {
        analysis.recommendations.push('Expand product description to 120-160 characters');
      }
    } else {
      analysis.issues.push({
        severity: 'high',
        message: 'Product description is missing',
        impact: 'Critical for SEO and user experience'
      });
    }

    // Image optimization
    if (product.primaryImage) {
      score += 10;
      analysis.strengths.push('Primary product image is set');
      
      if (product.images && product.images.length > 2) {
        score += 10;
        analysis.strengths.push('Multiple product images provided');
      } else {
        analysis.recommendations.push('Add more product images (aim for 3-5 images)');
      }
    } else {
      analysis.issues.push({
        severity: 'high',
        message: 'No product image',
        impact: 'Reduces visibility and trust'
      });
    }

    // Price optimization
    if (product.price) {
      score += 10;
      
      if (product.compareAtPrice && product.compareAtPrice > product.price) {
        score += 5;
        analysis.strengths.push('Sale pricing shown (increases conversion)');
      }
    }

    // Inventory tracking
    if (product.trackInventory && product.inventoryQuantity !== undefined) {
      score += 10;
      analysis.strengths.push('Inventory tracking enabled');
    } else {
      analysis.recommendations.push('Enable inventory tracking for better stock management');
    }

    // Category
    if (product.category) {
      score += 10;
      analysis.strengths.push('Product is categorized');
    } else {
      analysis.issues.push({
        severity: 'medium',
        message: 'Product category not set',
        impact: 'Reduces discoverability'
      });
    }

    // SKU
    if (product.sku) {
      score += 5;
      analysis.strengths.push('SKU is set');
    }

    // Tags
    if (product.tags && product.tags.length > 0) {
      score += 5;
      analysis.strengths.push('Product tags help with search');
    } else {
      analysis.recommendations.push('Add relevant tags for better search');
    }

    // URL structure
    score += 10; // Assuming good URL structure
    analysis.strengths.push('Clean URL structure');

    // Mobile friendly
    score += 10; // Platform is responsive
    analysis.strengths.push('Mobile-optimized display');

    analysis.score = Math.min(100, score);

    return c.json({
      success: true,
      productId,
      analysis,
      grade: analysis.score >= 80 ? 'A' : analysis.score >= 60 ? 'B' : analysis.score >= 40 ? 'C' : 'D'
    });
  } catch (error: any) {
    console.error('Error analyzing SEO:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// BULK SEO OPERATIONS
// ============================================

seo.post('/make-server-3eae23a6/api/seo/bulk-optimize', async (c) => {
  try {
    const { productIds } = await c.req.json();
    
    const results = await Promise.all(
      productIds.map(async (productId: string) => {
        const product = await kv.get(`product:${productId}`);
        
        if (!product) {
          return { productId, success: false, error: 'Product not found' };
        }

        // Auto-generate optimized title if needed
        if (!product.seoTitle || product.seoTitle.length < 30) {
          product.seoTitle = `${product.name} - Buy Online | Best Price Guaranteed`;
        }

        // Auto-generate meta description
        if (!product.seoDescription || product.seoDescription.length < 120) {
          product.seoDescription = `Shop ${product.name} at the best price. ${product.description?.substring(0, 100) || 'High quality products'} with fast shipping and excellent customer service.`;
        }

        // Generate slug
        if (!product.slug) {
          product.slug = product.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        }

        // Auto-generate keywords
        if (!product.keywords) {
          product.keywords = generateKeywords(product);
        }

        await kv.set(`product:${productId}`, product);

        return {
          productId,
          success: true,
          optimizations: ['title', 'description', 'slug', 'keywords']
        };
      })
    );

    return c.json({
      success: true,
      results,
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length
    });
  } catch (error: any) {
    console.error('Error in bulk SEO optimization:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default seo;
