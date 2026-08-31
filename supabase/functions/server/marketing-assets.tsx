// Marketing Assets API Routes
// AI-powered asset generation for products
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

export const marketingAssetsRouter = new Hono();

// Private Supabase Storage bucket for generated marketing images. DALL-E's
// returned URLs are temporary (they expire in ~1 hour), so we persist the
// bytes here and hand the frontend a long-lived signed URL that renders
// reliably and survives being saved into the Content Library / scheduler.
const MARKETING_BUCKET = 'make-3eae23a6-marketing';
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function ensureMarketingBucket(supabase: ReturnType<typeof serviceClient>) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === MARKETING_BUCKET)) {
      await supabase.storage.createBucket(MARKETING_BUCKET, { public: false });
    }
  } catch (err) {
    console.log(`Marketing bucket ensure error (continuing): ${err}`);
  }
}

/**
 * Persist a base64 PNG to storage and return a durable signed URL. Returns null
 * on any failure so the caller can fall back gracefully.
 */
async function storeGeneratedImage(b64: string, keyHint: string): Promise<string | null> {
  try {
    const supabase = serviceClient();
    await ensureMarketingBucket(supabase);
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const path = `${keyHint}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error: upErr } = await supabase.storage
      .from(MARKETING_BUCKET)
      .upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (upErr) {
      console.log(`Marketing image upload error: ${upErr.message}`);
      return null;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(MARKETING_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr || !signed?.signedUrl) {
      console.log(`Marketing image sign error: ${signErr?.message || 'no url'}`);
      return null;
    }
    return signed.signedUrl;
  } catch (err) {
    console.log(`storeGeneratedImage failed: ${err}`);
    return null;
  }
}

/**
 * Real Unsplash fallback via the official API (UNSPLASH_ACCESS_KEY). The old
 * random-photo redirect endpoint was shut down in 2024 and produced broken
 * images, so we use the official search endpoint and return an actual photo
 * URL, or null if Unsplash isn't configured / has no match.
 */
async function unsplashFallback(query: string): Promise<string | null> {
  try {
    const key = Deno.env.get('UNSPLASH_ACCESS_KEY');
    if (!key) return null;
    const q = encodeURIComponent((query || 'product').split(' ').slice(0, 3).join(' '));
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=squarish`,
      { headers: { Authorization: `Client-ID ${key}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.urls?.regular || null;
  } catch (err) {
    console.log(`unsplashFallback failed: ${err}`);
    return null;
  }
}

// Generate Marketing Assets using OpenAI DALL-E
marketingAssetsRouter.post('/marketing-assets/generate', async (c) => {
  try {
    const {
      productId,
      productName,
      productDescription,
      assetType,
      platforms,
      customPrompt,
      existingImages
    } = await c.req.json();

    console.log(`Generating ${assetType} assets for product ${productId}`);

    const assets = [];
    const errors: string[] = [];
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      console.error('OpenAI API key not configured');
      return c.json({
        error: 'AI generation not configured. Please set OPENAI_API_KEY environment variable.',
        success: false
      }, 500);
    }

    /**
     * Declared out here rather than inside the try below.
     *
     * The fallback path in the catch reads this map, and while it was declared
     * inside the try it was out of scope there — so the moment asset generation
     * failed, the code meant to recover from that failed too, with a
     * ReferenceError instead of a fallback image. A bug in error handling only
     * shows up when something else has already gone wrong, which is why it sat
     * there unnoticed until the server was type-checked for the first time.
     */
    const dimensionsMap: Record<string, string> = {
      instagram: '1080x1080',
      facebook: '1200x630',
      twitter: '1200x675',
      linkedin: '1200x627',
      email: '600x400',
      web: '728x90'
    };

    // Generate assets for each platform
    for (const platform of platforms) {
      try {
        const dimensions = dimensionsMap[platform] || '1200x1200';

        // Build comprehensive prompt
        let prompt = '';
        
        if (assetType === 'product-photo') {
          prompt = customPrompt || `Professional commercial product photography of ${productName}. ${productDescription}. High quality studio lighting, clean white background, product prominently displayed, sharp focus, 8k resolution, commercial photography style, professional e-commerce photo.`;
        } else if (assetType === 'social-ad') {
          prompt = customPrompt || `Eye-catching social media advertisement for ${productName}. ${productDescription}. Bold colors, modern design, product prominently featured, lifestyle context, professional marketing design, engaging composition for ${platform}.`;
        } else if (assetType === 'video') {
          prompt = customPrompt || `Cinematic product showcase thumbnail for ${productName}. ${productDescription}. Dynamic composition, professional lighting, premium quality, perfect for video thumbnail, engaging and eye-catching.`;
        } else if (assetType === 'banner') {
          prompt = customPrompt || `Professional web banner design for ${productName}. ${productDescription}. Clean modern design, product featured, commercial banner ad style, ${dimensions} dimensions, attention-grabbing composition.`;
        }

        // Any assetType outside the four branches above left `prompt` as the
        // empty string, and an empty prompt is rejected outright
        // ("Invalid 'prompt': empty string") — so the asset silently degraded
        // to a stock photo and looked like a model failure rather than a
        // missing branch. Note customPrompt was unreachable in that case too,
        // because it is only consulted inside the branches.
        if (!prompt.trim()) {
          prompt = customPrompt || [
            `Professional marketing photography for ${productName || 'this product'}.`,
            productDescription || '',
            `Styled for ${platform}. Natural lighting, premium commercial quality,`,
            'product clearly featured, no text or logos in the image.',
          ].filter(Boolean).join(' ');
        }

        // Call OpenAI DALL-E API. We request b64_json (not url) so we get the
        // raw bytes and can persist them ourselves — DALL-E's hosted URLs are
        // temporary (~1h) and were the reason saved ads later broke.
        // Model availability differs per account. Verified against this
        // project: 'dall-e-3' returns "The model 'dall-e-3' does not exist",
        // and `style` returns "Unknown parameter: 'style'" — so every asset
        // generated here was silently falling through to the Unsplash stock
        // fallback instead of a real branded image. Try the current model
        // first, exactly as creative-studio.tsx and marketplace.tsx already do,
        // and send only parameters both accept (b64 is the default).
        let imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          // Exactly the parameter set verified working against this account in
          // content-studio: model, prompt, n, size. `quality`, `style` and
          // `response_format` are each rejected by one model or the other, and
          // any rejection here silently degrades the asset to a stock photo.
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
          }),
        });

        if (!imageResponse.ok) {
          // Log the provider's own message — a bare status here cost real time
          // diagnosing, because the reason a model is refused (unknown
          // parameter vs unknown model vs content policy) changes the fix.
          const why = await imageResponse.clone().text().catch(() => '');
          console.log(`[marketing-assets] gpt-image-1 failed (HTTP ${imageResponse.status}): ${why.slice(0, 300)}`);
          imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            // No response_format: this endpoint rejects it outright
            // ("Unknown parameter: 'response_format'"), which is what made the
            // fallback fail too. b64 is returned by default.
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: prompt,
              n: 1,
              size: '1024x1024',
            }),
          });
        }

        if (!imageResponse.ok) {
          const errorData = await imageResponse.json().catch(() => ({}));
          const detail = errorData?.error?.message || `HTTP ${imageResponse.status}`;
          console.error(`OpenAI API error for ${platform}: ${detail}`, errorData);

          // Real Unsplash fallback (the old random-photo redirect endpoint is
          // dead and produced broken images). Only push if we actually get a
          // usable photo URL — otherwise record the error so the frontend can
          // surface an honest "unavailable" message instead of a broken img.
          const fallbackUrl = await unsplashFallback(productName);
          if (fallbackUrl) {
            assets.push({
              id: `asset_${Date.now()}_${platform}`,
              type: assetType,
              url: fallbackUrl,
              platform,
              dimensions,
              prompt,
              source: 'unsplash_fallback',
            });
          } else {
            errors.push(`${platform}: ${detail}`);
          }
          continue;
        }

        const imageData = await imageResponse.json();
        const b64 = imageData.data?.[0]?.b64_json as string | undefined;
        const rawUrl = imageData.data?.[0]?.url as string | undefined;

        // Persist to storage → durable signed URL. Fall back to the raw DALL-E
        // URL only if storage fails, so the image still shows immediately.
        let finalUrl: string | undefined;
        if (b64) {
          finalUrl = (await storeGeneratedImage(b64, `${productId || 'product'}_${platform}`)) || undefined;
        }
        if (!finalUrl && rawUrl) finalUrl = rawUrl;

        if (finalUrl) {
          assets.push({
            id: `asset_${Date.now()}_${platform}`,
            type: assetType,
            url: finalUrl,
            platform,
            dimensions,
            prompt,
            source: 'openai_dalle'
          });

          // Store asset metadata in KV
          const assetKey = `asset_${productId}_${Date.now()}_${platform}`;
          await kv.set(assetKey, {
            productId,
            platform,
            type: assetType,
            url: finalUrl,
            prompt,
            createdAt: new Date().toISOString()
          });
        } else {
          errors.push(`${platform}: image generated but could not be stored`);
        }

      } catch (platformError) {
        console.error(`Error generating asset for ${platform}:`, platformError);

        const fallbackUrl = await unsplashFallback(productName);
        if (fallbackUrl) {
          assets.push({
            id: `asset_${Date.now()}_${platform}`,
            type: assetType,
            url: fallbackUrl,
            platform,
            dimensions: dimensionsMap[platform] || '1200x1200',
            prompt: 'Fallback image',
            source: 'unsplash_fallback'
          });
        } else {
          errors.push(`${platform}: ${platformError instanceof Error ? platformError.message : String(platformError)}`);
        }
      }
    }

    console.log(`Successfully generated ${assets.length} assets (${errors.length} error(s))`);

    // If nothing was produced, return a 502 with details so the frontend shows
    // its "unavailable" toast rather than rendering a broken image.
    if (assets.length === 0) {
      return c.json({
        success: false,
        assets: [],
        error: 'No marketing assets could be generated.',
        details: errors.join(' | ') || 'Unknown error',
      }, 502);
    }

    return c.json({
      success: true,
      assets,
      errors,
      message: `Generated ${assets.length} marketing asset(s)`
    });

  } catch (error) {
    console.error('Error in marketing asset generation:', error);
    return c.json({
      error: 'Failed to generate marketing assets',
      details: error.message,
      success: false
    }, 500);
  }
});

// Get all assets for a product
marketingAssetsRouter.get('/marketing-assets/product/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const allAssets = await kv.getByPrefix(`asset_${productId}_`);
    
    return c.json({
      success: true,
      assets: allAssets,
      count: allAssets.length
    });
  } catch (error) {
    console.error('Error fetching product assets:', error);
    return c.json({
      error: 'Failed to fetch assets',
      details: error.message
    }, 500);
  }
});

// Delete asset
marketingAssetsRouter.delete('/marketing-assets/:assetId', async (c) => {
  try {
    const assetId = c.req.param('assetId');
    await kv.del(assetId);
    
    return c.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return c.json({
      error: 'Failed to delete asset',
      details: error.message
    }, 500);
  }
});

// Generate product description using GPT-4
marketingAssetsRouter.post('/marketing-assets/generate-description', async (c) => {
  try {
    // Accept both the e-commerce shape ({ category, features }) and the Ad Studio
    // shape ({ productDescription, tone, context }).
    const { productName, category, features, productDescription, tone, context } = await c.req.json();

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({
        error: 'OpenAI API key not configured',
        success: false
      }, 500);
    }

    const isAd = context === 'service_promo' || context === 'ecommerce_product';
    const contextLine = [
      category ? `Category: ${category}` : '',
      features ? `Features: ${features}` : '',
      productDescription ? `Details: ${productDescription}` : '',
      tone ? `Tone: ${tone}` : '',
    ].filter(Boolean).join('\n');

    // For Ad Studio we want punchy ad copy split into a headline and tagline plus a
    // longer description. Return JSON so the client can populate each field cleanly.
    const prompt = isAd
      ? `Write advertising copy for "${productName}".
${contextLine}

Respond ONLY with strict JSON of the form:
{"headline":"<max 6 words, punchy>","tagline":"<one persuasive sentence>","description":"<2 short paragraphs>"}`
      : `Write a compelling, professional product description for an e-commerce store.

Product Name: ${productName}
${contextLine}

The description should be 2-3 paragraphs, highlight key benefits, use persuasive language, be SEO-friendly, and end with a call-to-action.

Respond ONLY with strict JSON of the form:
{"headline":"<product name or short hook>","tagline":"<one-line summary>","description":"<the full 2-3 paragraph description>"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert marketing copywriter. Always respond with valid JSON only, no markdown fences.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 600
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return c.json({
        error: 'Failed to generate description',
        success: false
      }, 500);
    }

    const data = await response.json();
    const raw = (data.choices[0]?.message?.content || '').trim();

    // Parse the JSON payload, tolerating accidental markdown fences. Fall back to
    // treating the whole response as the description if parsing fails.
    let headline = productName;
    let tagline = '';
    let description = raw;
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
      const parsed = JSON.parse(cleaned);
      headline = parsed.headline || headline;
      tagline = parsed.tagline || tagline;
      description = parsed.description || description;
    } catch {
      // Not JSON — use the raw text as the description and derive a tagline.
      tagline = raw.split('\n').find((l: string) => l.trim())?.slice(0, 140) || '';
    }

    return c.json({
      success: true,
      headline,
      tagline,
      description
    });

  } catch (error) {
    console.error('Error generating description:', error);
    return c.json({
      error: 'Failed to generate description',
      details: error.message,
      success: false
    }, 500);
  }
});

// Generate SEO metadata using GPT-4
marketingAssetsRouter.post('/marketing-assets/generate-seo', async (c) => {
  try {
    const { productName, description, category } = await c.req.json();
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({
        error: 'OpenAI API key not configured',
        success: false
      }, 500);
    }

    const prompt = `Generate SEO-optimized metadata for this product:

Product: ${productName}
Category: ${category}
Description: ${description}

Generate:
1. Meta Title (max 60 characters, include main keyword)
2. Meta Description (max 160 characters, compelling and keyword-rich)
3. 5-7 relevant tags/keywords

Format as JSON:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "tags": ["tag1", "tag2", ...]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return c.json({
        error: 'Failed to generate SEO metadata',
        success: false
      }, 500);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Parse JSON response
    const seoData = JSON.parse(content);

    return c.json({
      success: true,
      ...seoData
    });

  } catch (error) {
    console.error('Error generating SEO metadata:', error);
    return c.json({
      error: 'Failed to generate SEO metadata',
      details: error.message,
      success: false
    }, 500);
  }
});
