// Marketing Assets API Routes
// AI-powered asset generation for products
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const marketingAssetsRouter = new Hono();

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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      console.error('OpenAI API key not configured');
      return c.json({
        error: 'AI generation not configured. Please set OPENAI_API_KEY environment variable.',
        success: false
      }, 500);
    }

    // Generate assets for each platform
    for (const platform of platforms) {
      try {
        // Get platform dimensions
        const dimensionsMap: Record<string, string> = {
          instagram: '1080x1080',
          facebook: '1200x630',
          twitter: '1200x675',
          linkedin: '1200x627',
          email: '600x400',
          web: '728x90'
        };

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

        // Call OpenAI DALL-E API
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024', // DALL-E 3 standard size
            quality: 'standard',
            style: 'natural'
          }),
        });

        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          console.error(`OpenAI API error for ${platform}:`, errorData);
          
          // Fallback to Unsplash for demo
          const fallbackUrl = `https://source.unsplash.com/1200x1200/?${productName.split(' ')[0]},product,${platform}&sig=${Date.now()}`;
          assets.push({
            id: `asset_${Date.now()}_${platform}`,
            type: assetType,
            url: fallbackUrl,
            platform,
            dimensions,
            prompt,
            source: 'unsplash_fallback'
          });
          continue;
        }

        const imageData = await imageResponse.json();
        const imageUrl = imageData.data[0]?.url;

        if (imageUrl) {
          assets.push({
            id: `asset_${Date.now()}_${platform}`,
            type: assetType,
            url: imageUrl,
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
            url: imageUrl,
            prompt,
            createdAt: new Date().toISOString()
          });
        }

      } catch (platformError) {
        console.error(`Error generating asset for ${platform}:`, platformError);
        
        // Fallback to Unsplash
        const fallbackUrl = `https://source.unsplash.com/1200x1200/?${productName.split(' ')[0]},product,${platform}&sig=${Date.now()}`;
        assets.push({
          id: `asset_${Date.now()}_${platform}`,
          type: assetType,
          url: fallbackUrl,
          platform,
          dimensions: dimensionsMap[platform] || '1200x1200',
          prompt: 'Fallback image',
          source: 'unsplash_fallback'
        });
      }
    }

    console.log(`Successfully generated ${assets.length} assets`);

    return c.json({
      success: true,
      assets,
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
