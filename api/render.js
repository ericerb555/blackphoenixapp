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

  const jsonLd = `<script type="application/ld+json">${JSON.stringify(meta.schema)}</script>`;

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
