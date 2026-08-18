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

export default async function handler(req, res) {
  const projects = await fetchProjects();

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
