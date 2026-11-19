/**
 * Serve the app's shell with a head a crawler can read.
 *
 * The app is a single-page app: every URL returns the same index.html and the
 * content is assembled in the browser. Google runs JavaScript imperfectly and
 * late; Facebook, LinkedIn, iMessage and most AI assistants do not run it at
 * all — they read the HTML and stop. So a shared link to a finished kitchen
 * showed the site's homepage description, and a job page had nothing to rank.
 *
 * This sits in front of the public pages that describe one thing. It fetches
 * that thing, rewrites the title, description, canonical and social tags,
 * attaches JSON-LD, and returns the same shell the app has always used. A
 * person gets the app exactly as before; a crawler gets the page.
 *
 * WHY NOT A FRAMEWORK
 *
 * The textbook answer is to move to Next.js. That is a month of risk against
 * ~185 working routes to solve a problem that is head tags and a fetch. If this
 * app ever needs real server rendering — a catalogue too large to hydrate, say
 * — that is the moment to reconsider, not now.
 */

const ORIGIN = 'https://theblackphoenixcompany.com';
const API = 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o';

const BUSINESS = {
  name: 'Black Phoenix Builds',
  phone: '+1-603-207-2248',
  street: '50a Northwestern Drive',
  city: 'Salem',
  region: 'NH',
  postal: '03079',
  country: 'US',
};

/** Anything interpolated into HTML goes through this. Titles come from a database. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * The JSON-LD block, with the one escape that keeps it inside its own tag.
 *
 * JSON is not HTML. Inside a <script> the parser is hunting for the literal
 * text </script> and nothing else, so a schema value containing one — a
 * project title, a category, anything typed into the admin — closes the block
 * early and everything after it is parsed as markup. JSON.stringify does not
 * escape < , because in every other context it carries no meaning.
 *
 * Emitting it as the six characters \u003c is the whole fix. JSON.parse reads
 * them back as < , so the structured data a crawler sees is byte-identical,
 * and the HTML parser never meets an angle bracket to act on. L-1 of
 * tasks/security-audit-2026-10-16.md.
 *
 * The doubled backslash in the source is load-bearing: '\u003c' written as a
 * JavaScript escape is simply < , and the replace would swap the character
 * for itself and change nothing.
 */
export function jsonLdBlock(schema) {
  return (
    `<script type="application/ld+json">` +
    JSON.stringify(schema).replace(/</g, '\\u003c') +
    `</script>`
  );
}

/** Replace a tag if it is there, add it if it is not. */
function setTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `    ${replacement}\n  </head>`);
}

function applyMeta(html, meta) {
  let out = html;
  out = setTag(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
  out = setTag(out, /<meta name="title"[^>]*>/, `<meta name="title" content="${esc(meta.title)}" />`);
  out = setTag(out, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(meta.description)}" />`);
  out = setTag(out, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(meta.url)}" />`);
  out = setTag(out, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(meta.url)}" />`);
  out = setTag(out, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(meta.title)}" />`);
  out = setTag(out, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(meta.description)}" />`);
  out = setTag(out, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(meta.image)}" />`);
  out = setTag(out, /<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(meta.type || 'website')}" />`);
  out = setTag(out, /<meta property="twitter:url"[^>]*>/, `<meta property="twitter:url" content="${esc(meta.url)}" />`);
  out = setTag(out, /<meta property="twitter:title"[^>]*>/, `<meta property="twitter:title" content="${esc(meta.title)}" />`);
  out = setTag(out, /<meta property="twitter:description"[^>]*>/, `<meta property="twitter:description" content="${esc(meta.description)}" />`);
  out = setTag(out, /<meta property="twitter:image"[^>]*>/, `<meta property="twitter:image" content="${esc(meta.image)}" />`);

  const jsonLd = jsonLdBlock(meta.schema);

  /**
   * The readable copy goes in a <noscript>.
   *
   * Anything that runs JavaScript renders the real page a moment later, so
   * putting this in the body directly would flash duplicate content at every
   * human visitor. Crawlers that do not execute scripts read noscript happily,
   * and those are exactly the ones this is for.
   */
  const noscript =
    `<noscript><main><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>` +
    (meta.image ? `<img src="${esc(meta.image)}" alt="${esc(meta.title)}" width="800" />` : '') +
    (meta.links || []).map((l) => `<p><a href="${esc(l.href)}">${esc(l.text)}</a></p>`).join('') +
    `<p>${esc(BUSINESS.name)} — ${esc(BUSINESS.street)}, ${esc(BUSINESS.city)}, ${esc(BUSINESS.region)} ` +
    `${esc(BUSINESS.postal)}. <a href="tel:${esc(BUSINESS.phone)}">${esc(BUSINESS.phone)}</a></p></main></noscript>`;

  return out.replace('</head>', `    ${jsonLd}\n  </head>`).replace('<div id="root"></div>', `${noscript}<div id="root"></div>`);
}

const localBusiness = {
  '@type': 'GeneralContractor',
  name: BUSINESS.name,
  telephone: BUSINESS.phone,
  url: ORIGIN,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.street,
    addressLocality: BUSINESS.city,
    addressRegion: BUSINESS.region,
    postalCode: BUSINESS.postal,
    addressCountry: BUSINESS.country,
  },
  areaServed: ['Salem NH', 'Southern New Hampshire', 'Northern Massachusetts'],
};

async function fetchJson(path) {
  try {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${ANON}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchProjects() {
  const data = await fetchJson('/gallery');
  return Array.isArray(data?.projects) ? data.projects : [];
}

/**
 * An article's own page.
 *
 * Both content engines could mark an article published and neither had
 * anywhere to publish it to. This is the head that makes one findable: its own
 * title, its own description, and Article schema naming the business as the
 * publisher — which is what lets a piece about kitchen layouts rank for kitchen
 * layouts rather than inheriting the homepage's description.
 */
async function articleMeta(id) {
  const data = await fetchJson(`/blog/${encodeURIComponent(id)}`);
  const article = data?.article;
  if (!article) return blogIndexMeta();

  const description = String(article.excerpt || '').slice(0, 300) ||
    `An article from ${BUSINESS.name}, ${BUSINESS.city} ${BUSINESS.region}.`;

  return {
    title: `${article.title} | ${BUSINESS.name}`,
    description,
    url: `${ORIGIN}/blog/${encodeURIComponent(article.id)}`,
    image: `${ORIGIN}/bpb-phoenix-logo.png`,
    type: 'article',
    links: [{ href: `${ORIGIN}/blog`, text: 'All articles' }],
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description,
      datePublished: article.publishedAt || undefined,
      url: `${ORIGIN}/blog/${encodeURIComponent(article.id)}`,
      author: localBusiness,
      publisher: localBusiness,
      about: article.keyword || undefined,
    },
  };
}

async function blogIndexMeta() {
  const data = await fetchJson('/blog');
  const articles = Array.isArray(data?.articles) ? data.articles : [];
  return {
    title: `Advice & Guides — Renovation Notes | ${BUSINESS.name}`,
    description:
      `Renovation advice from ${BUSINESS.name} — kitchens, bathrooms, additions and exterior work ` +
      `across southern New Hampshire. ${BUSINESS.city}, ${BUSINESS.region}. Call ${BUSINESS.phone}.`,
    url: `${ORIGIN}/blog`,
    image: `${ORIGIN}/bpb-phoenix-logo.png`,
    type: 'website',
    links: articles.slice(0, 25).map((a) => ({
      href: `${ORIGIN}/blog/${encodeURIComponent(a.id)}`,
      text: a.title,
    })),
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Advice & Guides',
      url: `${ORIGIN}/blog`,
      publisher: localBusiness,
      blogPost: articles.slice(0, 25).map((a) => ({
        '@type': 'BlogPosting',
        headline: a.title,
        url: `${ORIGIN}/blog/${encodeURIComponent(a.id)}`,
        datePublished: a.publishedAt || undefined,
      })),
    },
  };
}

/**
 * A single product, as a crawler sees it.
 *
 * Eric, 2026-11-19: "i want the ecommerce store to start making money".
 *
 * Measured that morning: 123 products, one real sale ever, and a sitemap
 * that listed the shop as a single page. Nobody searching for a thing this
 * shop sells could arrive at it, because no page described a thing it
 * sells. The checkout was never the problem — one August order proves the
 * money path works end to end.
 *
 * PRICE AND AVAILABILITY GO IN THE STRUCTURED DATA, because that is what
 * puts a price under a result instead of a blue link, and it is the whole
 * difference between being listed and being clicked.
 *
 * A MISSING PRODUCT RETURNS THE SHOP, not a page claiming to be a product
 * that is not there. Dropship catalogues churn: an item withdrawn upstream
 * would otherwise leave a page insisting it is for sale, which is a soft
 * 404 at best and a complaint at worst. Same rule the work pages already
 * follow for an unpublished project.
 */
async function productMeta(id) {
  const data = await fetchJson(`/products/${encodeURIComponent(id)}`);
  const item = data?.product || (data && data.id ? data : null);
  if (!item || !item.id) return shopIndexMeta();

  const name = String(item.name || '').trim();
  const price = Number(item.price);
  const image = Array.isArray(item.images) ? item.images[0] : item.image || '';
  const url = `${ORIGIN}/shop-item/${encodeURIComponent(item.id)}`;

  /*
   * The description a searcher reads. Built from the product\u2019s own text,
   * trimmed to roughly what Google shows, and falling back to the name and
   * category rather than to nothing \u2014 an empty description is a result
   * nobody clicks.
   */
  const blurb = String(item.description || '').replace(/\s+/g, ' ').trim();
  const description = (blurb ||
    `${name}${item.category ? ` \u2014 ${item.category}` : ''}. Shipped by ${BUSINESS.name}.`)
    .slice(0, 300);

  return {
    title: `${name} | ${BUSINESS.name}`,
    description,
    url,
    image,
    links: [{ href: `${ORIGIN}/public-store`, text: 'Everything in the shop' }],
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: image ? [image] : undefined,
      sku: String(item.sku || item.id),
      url,
      /*
       * Only when there is a real price. An Offer with a zero or missing
       * price is rejected by Google and can suppress the rich result for
       * the whole page \u2014 worse than having none.
       */
      offers: Number.isFinite(price) && price > 0 ? {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'USD',
        url,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: BUSINESS.name },
      } : undefined,
    },
  };
}

/** The shop itself, for a crawler that asked for no particular product. */
async function shopIndexMeta() {
  const data = await fetchJson('/products?limit=24');
  const products = Array.isArray(data?.products) ? data.products : [];
  return {
    title: `Shop | ${BUSINESS.name}`,
    description:
      `Homeware, tools and everyday goods shipped by ${BUSINESS.name}` +
      (products.length ? ` \u2014 ${products.length}+ items in stock.` : '.'),
    url: `${ORIGIN}/public-store`,
    image: (Array.isArray(products[0]?.images) ? products[0].images[0] : '') || '',
    links: products.slice(0, 25).map((item) => ({
      href: `${ORIGIN}/shop-item/${encodeURIComponent(item.id)}`,
      text: String(item.name || 'Product'),
    })),
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Shop | ${BUSINESS.name}`,
      url: `${ORIGIN}/public-store`,
    },
  };
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';

  let shell;
  try {
    // The built shell, fetched rather than bundled: its script tags carry a
    // content hash that changes every deploy, so a copy baked in here would go
    // stale and serve a build that no longer exists.
    const shellRes = await fetch(`${proto}://${host}/index.html`);
    shell = await shellRes.text();
  } catch {
    res.status(302).setHeader('Location', '/');
    return res.end();
  }

  const id = (req.query?.id || '').toString().trim();
  const kind = (req.query?.kind || 'work').toString().trim();

  if (kind === 'product') {
    const meta = id ? await productMeta(id) : await shopIndexMeta();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    /*
     * A shorter cache than the blog keeps, because a dropship price and its
     * availability move under us and a stale price in a search result is a
     * customer arriving expecting a number we no longer charge.
     */
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=3600');
    return res.status(200).send(applyMeta(shell, meta));
  }

  if (kind === 'blog') {
    const meta = id ? await articleMeta(id) : await blogIndexMeta();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).send(applyMeta(shell, meta));
  }

  const projects = await fetchProjects();

  let meta;
  if (id) {
    const project = projects.find((p) => p.id === id);
    if (!project) {
      // Unknown or unpublished: hand back the index rather than a page claiming
      // to be a project that is not there.
      meta = indexMeta(projects);
    } else {
      meta = {
        title: `${project.title} — ${project.category} | ${BUSINESS.name}`,
        description:
          `${project.title}: a ${String(project.category || 'renovation').toLowerCase()} project by ` +
          `${BUSINESS.name} in ${BUSINESS.city}, ${BUSINESS.region}. Full-service renovation across ` +
          `southern New Hampshire — call ${BUSINESS.phone}.`,
        url: `${ORIGIN}/work/${encodeURIComponent(project.id)}`,
        image: project.image,
        type: 'article',
        links: [{ href: `${ORIGIN}/work`, text: 'See all our work' }],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: project.title,
          image: project.image,
          url: `${ORIGIN}/work/${encodeURIComponent(project.id)}`,
          genre: project.category,
          creator: localBusiness,
        },
      };
    }
  } else {
    meta = indexMeta(projects);
  }

  // A short edge cache with a long grace period: these pages change when Eric
  // publishes a photo, which is rare, and a crawler arriving mid-deploy should
  // still get something rather than waiting on a cold render.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(applyMeta(shell, meta));
}

function indexMeta(projects) {
  return {
    title: `Our Work — Kitchens, Bathrooms & Renovations | ${BUSINESS.name}`,
    description:
      `${projects.length} completed renovation projects by ${BUSINESS.name} — kitchens, bathrooms, ` +
      `additions and exterior work across southern New Hampshire. ${BUSINESS.city}, ${BUSINESS.region}. ` +
      `Call ${BUSINESS.phone}.`,
    url: `${ORIGIN}/work`,
    image: projects[0]?.image || `${ORIGIN}/bpb-phoenix-logo.png`,
    type: 'website',
    links: projects.slice(0, 25).map((p) => ({
      href: `${ORIGIN}/work/${encodeURIComponent(p.id)}`,
      text: `${p.title} — ${p.category}`,
    })),
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Our Work',
      url: `${ORIGIN}/work`,
      about: localBusiness,
      hasPart: projects.slice(0, 25).map((p) => ({
        '@type': 'CreativeWork',
        name: p.title,
        image: p.image,
        url: `${ORIGIN}/work/${encodeURIComponent(p.id)}`,
      })),
    },
  };
}
