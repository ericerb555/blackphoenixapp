/**
 * The sitemap, generated rather than maintained.
 *
 * The static file it replaces listed the landing pages and nothing else,
 * because when it was written nothing else had a URL. Now every published job
 * has one, and a static list would be wrong the first time Eric publishes a
 * photo — and wrong quietly, which is the kind that lasts for months.
 *
 * Only published work appears here, because only published work is reachable.
 * A sitemap that points at pages returning nothing teaches Google to trust the
 * whole file less, so it is better to list twenty real pages than fifty
 * hopeful ones.
 */

const ORIGIN = 'https://theblackphoenixcompany.com';
const API = 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o';

/** Routes that exist as pages regardless of data. */
const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/work', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/builds-landing-page', changefreq: 'monthly', priority: '0.9' },
  { path: '/handyman-landing-page', changefreq: 'monthly', priority: '0.8' },
  { path: '/public-store', changefreq: 'weekly', priority: '0.8' },
  { path: '/property-management-landing-page', changefreq: 'monthly', priority: '0.7' },
  { path: '/contractor-network-landing-page', changefreq: 'monthly', priority: '0.7' },
  { path: '/emergency-services-landing-page', changefreq: 'monthly', priority: '0.7' },
  { path: '/territory-landing-page', changefreq: 'monthly', priority: '0.6' },
  { path: '/marketing-hub-landing-page', changefreq: 'monthly', priority: '0.6' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.6' },
  { path: '/investment-opportunities', changefreq: 'monthly', priority: '0.5' },
];

const escapeXml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const urlEntry = ({ loc, changefreq, priority, lastmod, image, title }) =>
  `  <url>\n    <loc>${escapeXml(loc)}</loc>\n` +
  (lastmod ? `    <lastmod>${escapeXml(String(lastmod).slice(0, 10))}</lastmod>\n` : '') +
  `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n` +
  // The image extension: it is how a photograph of a finished kitchen can turn
  // up in an image search, which for a renovation company is where a good deal
  // of the traffic actually is.
  (image
    ? `    <image:image>\n      <image:loc>${escapeXml(image)}</image:loc>\n` +
      `      <image:title>${escapeXml(title)}</image:title>\n    </image:image>\n`
    : '') +
  `  </url>`;

async function fetchArticles() {
  try {
    const res = await fetch(API + "/blog", { headers: { Authorization: "Bearer " + ANON } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.articles) ? data.articles : [];
  } catch {
    return [];
  }
}

async function fetchProjects() {
  try {
    const res = await fetch(`${API}/gallery`, { headers: { Authorization: `Bearer ${ANON}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

/**
 * The shop, one entry per product.
 *
 * Eric, 2026-11-19: "i want the ecommerce store to start making money".
 *
 * MEASURED THAT DAY: 123 products in the catalogue, 48 URLs in this
 * sitemap, and not one of them a product. The whole shop was a single line
 * — `/public-store`. A dropship catalogue lives or dies on long-tail
 * product search, and a search engine was being told the shop had one page
 * with no idea what was in it.
 *
 * The limit is 1000 because a sitemap may hold 50,000 URLs but this one is
 * generated on every request; a catalogue that grows past a thousand wants
 * a sitemap index rather than a bigger single file.
 */
async function fetchProducts() {
  try {
    const res = await fetch(`${API}/products?limit=1000`, { headers: { Authorization: `Bearer ${ANON}` } });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
    /*
     * A product with no id cannot have a URL, and one with no name gives a
     * crawler nothing to index. Both are dropped rather than emitted as a
     * page that resolves to nothing — a sitemap full of soft 404s is worse
     * for a domain than a short sitemap.
     */
    return rows.filter((r) => r && String(r.id || '').trim() && String(r.name || '').trim());
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  const [projects, articles, products] = await Promise.all([
    fetchProjects(), fetchArticles(), fetchProducts(),
  ]);

  const entries = [
    ...STATIC_PAGES.map((p) => urlEntry({ loc: `${ORIGIN}${p.path}`, changefreq: p.changefreq, priority: p.priority })),
    ...projects.map((p) =>
      urlEntry({
        loc: `${ORIGIN}/work/${encodeURIComponent(p.id)}`,
        changefreq: 'yearly',
        priority: '0.7',
        image: p.image,
        title: p.title,
      }),
    ),
    ...articles.map((a) =>
      urlEntry({
        loc: ORIGIN + '/blog/' + encodeURIComponent(a.id),
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: a.publishedAt,
      }),
    ),
    /*
     * Every product, with its photograph.
     *
     * 'daily' because a dropship price and its stock move under us, and 0.7
     * because these are the pages the shop actually wants found — above a
     * blog post, below the front door.
     */
    ...products.map((item) =>
      urlEntry({
        loc: `${ORIGIN}/shop-item/${encodeURIComponent(item.id)}`,
        changefreq: 'daily',
        priority: '0.7',
        image: Array.isArray(item.images) ? item.images[0] : item.image,
        title: item.name,
      }),
    ),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    entries.join('\n') +
    `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // Long grace period: a crawler arriving while the gallery is briefly
  // unreachable should get the previous sitemap rather than a short one, since
  // a sitemap that suddenly loses pages reads as pages having been removed.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
