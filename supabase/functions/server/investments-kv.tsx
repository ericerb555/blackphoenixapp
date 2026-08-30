// Investments API — KV-backed, zero-setup.
//
// Previously these routes read from dedicated Postgres tables
// (investment_opportunities / investor_commitments / payout_distributions),
// which require manual table provisioning. This router stores everything in
// the shared KV table so the whole investor experience works out of the box.
//
// Frontend contract (see src/app/components/portals/InvestmentTab.tsx and
// src/app/components/InvestmentOpportunityManager.tsx):
//   GET    /investments/opportunities                       -> { opportunities }
//   GET    /investments/opportunities/:id                   -> { opportunity }
//   POST   /investments/opportunities                       -> { opportunity }
//   PUT    /investments/opportunities/:id                   -> { opportunity }
//   DELETE /investments/opportunities/:id                   -> { success }
//   GET    /investments/commitments/investor/:email         -> { commitments }
//   POST   /investments/commitments                         -> { commitment }
//   PUT    /investments/commitments/:id                     -> { commitment }
//   GET    /investments/payouts/investor/:email             -> { payouts }
//   POST   /investments/payouts                             -> { payout }
//   PUT    /investments/payouts/:id                         -> { payout }
//   GET    /investments/documents/opportunity/:id           -> { documents }
//   POST   /investments/documents/:id/sign                  -> { success, document }
//   GET    /investments/analytics/portfolio/:email          -> { summary, commitments, recentPayouts }
import { Hono } from 'npm:hono';
import OpenAI from 'npm:openai@4';
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

const investmentsRouter = new Hono();

// Stripe client for the AI Property Intelligence subscription (same account/key
// pattern as stripe-connect.tsx). The browser never sees the secret key.
function getStripe(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

// Server-authoritative monthly pricing (cents) per subscription tier.
const AI_TIER_PRICING: Record<string, { amount: number; label: string }> = {
  starter: { amount: 2900, label: 'Property Intelligence — Landlord' },
  professional: { amount: 7900, label: 'Property Intelligence — Pro Investor' },
  enterprise: { amount: 19900, label: 'Property Intelligence — Condo Association' },
};

// ── Regrid parcel data ──────────────────────────────────────────────────────
// Grounds the AI feasibility study in the real parcel record (zoning, acreage,
// land use, owner, assessed values). Regrid has strong NH/MA coverage. Fully
// best-effort: if the key is missing or the lookup fails, analysis proceeds on
// AI estimates alone.
interface ParcelFacts {
  parcelNumber?: string;
  owner?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  zoning?: string;
  zoningDescription?: string;
  zoningType?: string;
  landUse?: string;
  acreage?: number;
  buildingSqft?: number;
  yearBuilt?: string | number;
  landValue?: number;
  improvementValue?: number;
  parcelValue?: number;
  lat?: number;
  lon?: number;
  source: 'regrid' | 'massgis' | 'nh-granit';
  sourceLabel?: string; // human-friendly provider name for the UI
}

async function fetchRegridParcel(address: string): Promise<ParcelFacts | null> {
  const token = Deno.env.get('REGRID_API_KEY');
  if (!token || !address.trim()) return null;
  try {
    const url = `https://app.regrid.com/api/v2/parcels/address?query=${encodeURIComponent(address)}&limit=1&token=${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.log(`[regrid] lookup for "${address}" returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const feature = data?.parcels?.features?.[0] || data?.features?.[0];
    const f = feature?.properties?.fields || feature?.properties || null;
    if (!f) return null;
    const num = (v: any) => (v === null || v === undefined || v === '' ? undefined : Number(v));
    return {
      parcelNumber: f.parcelnumb || f.parcelnumb_no_formatting,
      owner: f.owner,
      address: f.address || f.saddno ? [f.saddno, f.saddstr].filter(Boolean).join(' ') : f.address,
      city: f.scity || f.city,
      county: f.county,
      state: f.state2 || f.state,
      zip: f.szip || f.zip,
      zoning: f.zoning,
      zoningDescription: f.zoning_description,
      zoningType: f.zoning_type,
      landUse: f.usedesc || f.lbcs_activity_desc,
      acreage: num(f.ll_gisacre ?? f.gisacre),
      buildingSqft: num(f.ll_bldg_footprint_sqft),
      yearBuilt: f.yearbuilt,
      landValue: num(f.landval),
      improvementValue: num(f.improvval),
      parcelValue: num(f.parval),
      lat: num(f.lat),
      lon: num(f.lon),
      source: 'regrid',
    };
  } catch (err: any) {
    console.log(`[regrid] lookup failed for "${address}": ${err?.message || err}`);
    return null;
  }
}

function parcelPromptBlock(p: ParcelFacts | null): string {
  if (!p) return '';
  const lines: string[] = [];
  const add = (label: string, v: any) => { if (v !== undefined && v !== null && v !== '') lines.push(`- ${label}: ${v}`); };
  add('Parcel number', p.parcelNumber);
  add('Owner of record', p.owner);
  add('County', p.county);
  add('State', p.state);
  add('Official zoning code', p.zoning);
  add('Zoning description', p.zoningDescription);
  add('Zoning type', p.zoningType);
  add('Land use', p.landUse);
  add('Lot size (acres)', p.acreage);
  add('Building footprint (sqft)', p.buildingSqft);
  add('Year built', p.yearBuilt);
  add('Assessed land value', p.landValue);
  add('Assessed improvement value', p.improvementValue);
  add('Total assessed value', p.parcelValue);
  if (!lines.length) return '';
  const src = p.sourceLabel || (p.source === 'regrid' ? 'the official Regrid parcel record' : 'the official government parcel record');
  return `\n\nVERIFIED PARCEL DATA (from ${src} — treat these as authoritative and build the analysis around them; do NOT contradict them):\n${lines.join('\n')}`;
}

// ── ATTOM valuation data ────────────────────────────────────────────────────
// Adds an AVM (automated valuation) with a value range + confidence, core
// building characteristics, and the last recorded sale — used to ground the
// study's value and ROI numbers. Best-effort: skipped cleanly if unavailable.
interface ValuationFacts {
  avmValue?: number;
  avmHigh?: number;
  avmLow?: number;
  confidence?: number;
  beds?: number;
  baths?: number;
  livingSqft?: number;
  lotSqft?: number;
  yearBuilt?: string | number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  source: 'attom';
}

async function fetchAttomValuation(address: string): Promise<ValuationFacts | null> {
  const apiKey = Deno.env.get('ATTOM_API_KEY');
  if (!apiKey || !address.trim()) return null;
  // ATTOM wants address1 = street, address2 = "City, ST ZIP".
  const firstComma = address.indexOf(',');
  const address1 = firstComma > -1 ? address.slice(0, firstComma).trim() : address.trim();
  const address2 = firstComma > -1 ? address.slice(firstComma + 1).trim() : '';
  try {
    const url = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: { Accept: 'application/json', apikey: apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.log(`[attom] AVM lookup for "${address}" returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const p = data?.property?.[0];
    if (!p) return null;
    const num = (v: any) => (v === null || v === undefined || v === '' ? undefined : Number(v));
    const amt = p.avm?.amount || {};
    return {
      avmValue: num(amt.value),
      avmHigh: num(amt.high),
      avmLow: num(amt.low),
      confidence: num(amt.scr ?? p.avm?.condCode),
      beds: num(p.building?.rooms?.beds),
      baths: num(p.building?.rooms?.bathstotal ?? p.building?.rooms?.bathsfull),
      livingSqft: num(p.building?.size?.livingsize ?? p.building?.size?.universalsize),
      lotSqft: num(p.lot?.lotsize2 ?? (p.lot?.lotsize1 ? Number(p.lot.lotsize1) * 43560 : undefined)),
      yearBuilt: p.summary?.yearbuilt,
      lastSalePrice: num(p.sale?.amount?.saleamt),
      lastSaleDate: p.sale?.salesearchdate || p.sale?.saleTransDate,
      source: 'attom',
    };
  } catch (err: any) {
    console.log(`[attom] AVM lookup failed for "${address}": ${err?.message || err}`);
    return null;
  }
}

function valuationPromptBlock(v: ValuationFacts | null): string {
  if (!v) return '';
  const lines: string[] = [];
  const add = (label: string, val: any) => { if (val !== undefined && val !== null && val !== '') lines.push(`- ${label}: ${val}`); };
  add('AVM estimated value', v.avmValue ? `$${v.avmValue.toLocaleString()}` : undefined);
  add('AVM value range', v.avmLow && v.avmHigh ? `$${v.avmLow.toLocaleString()} – $${v.avmHigh.toLocaleString()}` : undefined);
  add('AVM confidence score', v.confidence);
  add('Beds', v.beds);
  add('Baths', v.baths);
  add('Living area (sqft)', v.livingSqft);
  add('Lot size (sqft)', v.lotSqft);
  add('Year built', v.yearBuilt);
  add('Last sale price', v.lastSalePrice ? `$${v.lastSalePrice.toLocaleString()}` : undefined);
  add('Last sale date', v.lastSaleDate);
  if (!lines.length) return '';
  return `\n\nVERIFIED VALUATION DATA (from ATTOM — use these to anchor current value, ARV, and ROI estimates; do NOT contradict them):\n${lines.join('\n')}`;
}

// ── Free government parcel data (no API key required) ───────────────────────
// A zero-cost alternative to Regrid, strongest in exactly the states this
// business serves: Massachusetts (MassGIS standardized assessor parcels) and
// New Hampshire (NH GRANIT statewide parcels). We geocode the address with the
// free US Census geocoder, then query the state's public ArcGIS parcel service
// — first by point, then by address string as a fallback (the free geocoder
// can interpolate slightly off-parcel). Every step is best-effort: a miss just
// returns null and analysis falls back to the next source. Endpoints are
// overridable via env in case a state re-publishes its service.
const CENSUS_GEOCODER =
  'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const MASSGIS_PARCELS_URL =
  Deno.env.get('MASSGIS_PARCELS_URL') ||
  'https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Property_Tax_Parcels/FeatureServer/0/query';
const NH_GRANIT_PARCELS_URL =
  Deno.env.get('NH_GRANIT_PARCELS_URL') ||
  'https://nhgeodata.unh.edu/nhgeodata/rest/services/CAD/ParcelMosaic/MapServer/1/query';

async function fetchWithTimeout(url: string, ms = 12000): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err: any) {
    console.log(`[free-data] fetch failed ${url}: ${err?.message || err}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface GeoResult {
  lat: number;
  lon: number;
  state?: string;
  number?: string;
  street?: string;
  city?: string;
  matched?: string;
}

// Geocode a one-line address with the free US Census geocoder.
async function geocodeCensus(address: string): Promise<GeoResult | null> {
  const url = `${CENSUS_GEOCODER}?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const res = await fetchWithTimeout(url);
  if (!res || !res.ok) {
    if (res) console.log(`[census] geocode "${address}" returned ${res.status}`);
    return null;
  }
  try {
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    if (!match?.coordinates) return null;
    const comp = match.addressComponents || {};
    const street = [comp.streetName, comp.suffixType].filter(Boolean).join(' ').trim();
    return {
      lat: Number(match.coordinates.y),
      lon: Number(match.coordinates.x),
      state: comp.state,
      number: comp.fromAddress,
      street,
      city: comp.city,
      matched: match.matchedAddress,
    };
  } catch (err: any) {
    console.log(`[census] parse failed for "${address}": ${err?.message || err}`);
    return null;
  }
}

// Query an ArcGIS FeatureServer/MapServer layer, returning the first feature's
// attributes. `whereOrPoint` is either a SQL where clause or a lon/lat point.
async function arcgisQuery(
  baseUrl: string,
  q: { point?: { lat: number; lon: number }; where?: string },
): Promise<Record<string, any> | null> {
  const params = new URLSearchParams({
    outFields: '*',
    returnGeometry: 'false',
    outSR: '4326',
    f: 'json',
  });
  if (q.point) {
    params.set('geometry', `${q.point.lon},${q.point.lat}`);
    params.set('geometryType', 'esriGeometryPoint');
    params.set('inSR', '4326');
    params.set('spatialRel', 'esriSpatialRelIntersects');
  } else {
    params.set('where', q.where || '1=1');
    params.set('resultRecordCount', '1');
  }
  const res = await fetchWithTimeout(`${baseUrl}?${params.toString()}`);
  if (!res || !res.ok) {
    if (res) console.log(`[arcgis] ${baseUrl} returned ${res.status}`);
    return null;
  }
  try {
    const data = await res.json();
    return data?.features?.[0]?.attributes || null;
  } catch (err: any) {
    console.log(`[arcgis] parse failed ${baseUrl}: ${err?.message || err}`);
    return null;
  }
}

// Escape single quotes for an ArcGIS SQL literal.
const sqlLit = (v: string) => v.replace(/'/g, "''");

// Read a value from an attributes bag trying several possible field names.
function pick(attrs: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    const v = attrs[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// MassGIS standardized assessor parcels → ParcelFacts.
function mapMassGis(a: Record<string, any>, geo: GeoResult): ParcelFacts {
  const num = (v: any) => (v === undefined || v === null || v === '' ? undefined : Number(v));
  return {
    parcelNumber: pick(a, ['LOC_ID', 'MAP_PAR_ID', 'PROP_ID']),
    owner: pick(a, ['OWNER1']),
    address: pick(a, ['SITE_ADDR']) || [pick(a, ['ADDR_NUM']), pick(a, ['FULL_STR'])].filter(Boolean).join(' ').trim(),
    city: pick(a, ['CITY']),
    state: 'MA',
    zip: pick(a, ['ZIP']),
    zoning: pick(a, ['ZONING']),
    landUse: pick(a, ['USE_DESC', 'USE_CODE']),
    acreage: num(pick(a, ['LOT_SIZE'])),
    buildingSqft: num(pick(a, ['BLD_AREA', 'RES_AREA'])),
    yearBuilt: pick(a, ['YEAR_BUILT']),
    landValue: num(pick(a, ['LAND_VAL'])),
    improvementValue: num(pick(a, ['BLDG_VAL'])),
    parcelValue: num(pick(a, ['TOTAL_VAL'])),
    lat: geo.lat,
    lon: geo.lon,
    source: 'massgis',
    sourceLabel: 'MassGIS Assessor Parcels (free)',
  };
}

// NH GRANIT statewide parcel mosaic → ParcelFacts. This statewide layer carries
// parcel id, town, street address, and a standardized land-use code (SLUC) — but
// NOT owner, assessed value, zoning, or acreage (those live in each town's own
// assessing system). We pass the land-use code through labeled so the AI can
// interpret it, and leave the value/zoning fields empty rather than fabricate.
function mapNhGranit(a: Record<string, any>, geo: GeoResult): ParcelFacts {
  const slu = pick(a, ['SLU', 'SLUC']);
  return {
    parcelNumber: pick(a, ['PID', 'DisplayId', 'NH_GIS_ID']),
    address: pick(a, ['StreetAddress']),
    city: pick(a, ['Town']),
    state: 'NH',
    landUse: slu ? `NH standardized land-use code ${slu}` : undefined,
    lat: geo.lat,
    lon: geo.lon,
    source: 'nh-granit',
    sourceLabel: 'NH GRANIT Statewide Parcels (free)',
  };
}

// Orchestrator: free parcel lookup for MA & NH via Census geocode + state GIS.
async function fetchFreeParcel(address: string): Promise<ParcelFacts | null> {
  if (!address.trim()) return null;
  const geo = await geocodeCensus(address);
  if (!geo) return null;
  const state = (geo.state || '').toUpperCase();
  try {
    if (state === 'MA' || /\bMA\b/i.test(address)) {
      // Point-in-parcel first, then fall back to an address-string match.
      let attrs = await arcgisQuery(MASSGIS_PARCELS_URL, { point: geo });
      if (!attrs && geo.number && geo.street && geo.city) {
        const where = `ADDR_NUM='${sqlLit(geo.number)}' AND UPPER(FULL_STR) LIKE '%${sqlLit(geo.street.toUpperCase())}%' AND UPPER(CITY)='${sqlLit(geo.city.toUpperCase())}'`;
        attrs = await arcgisQuery(MASSGIS_PARCELS_URL, { where });
      }
      if (attrs) return mapMassGis(attrs, geo);
    }
    if (state === 'NH' || /\bNH\b/i.test(address)) {
      let attrs = await arcgisQuery(NH_GRANIT_PARCELS_URL, { point: geo });
      if (!attrs && geo.number && geo.street && geo.city) {
        const where = `UPPER(StreetAddress) LIKE '${sqlLit(geo.number.toUpperCase())} %${sqlLit(geo.street.toUpperCase())}%' AND UPPER(Town)='${sqlLit(geo.city.toUpperCase())}'`;
        attrs = await arcgisQuery(NH_GRANIT_PARCELS_URL, { where });
      }
      if (attrs) return mapNhGranit(attrs, geo);
    }
  } catch (err: any) {
    console.log(`[free-data] parcel lookup failed for "${address}": ${err?.message || err}`);
  }
  return null;
}

const PREFIX = '/make-server-3eae23a6';
const OPP = (id: string) => `investment:opportunity:${id}`;
const OPP_PREFIX = 'investment:opportunity:';
const COMMIT = (id: string) => `investment:commitment:${id}`;
const COMMIT_PREFIX = 'investment:commitment:';
const PAYOUT = (id: string) => `investment:payout:${id}`;
const PAYOUT_PREFIX = 'investment:payout:';
const DOC = (oppId: string, id: string) => `investment:document:${oppId}:${id}`;
const DOC_PREFIX = (oppId: string) => `investment:document:${oppId}:`;
const SEED_FLAG = 'investment:seeded:v1';
// Partner-property submissions: an investor who already owns a property asks us
// to help decide (and execute) the best strategy — fix & flip, lease, subdivide
// & build, repurpose, or a quick sale. Stored with the strategy score computed
// on the intake page so the owner's pipeline can triage without recomputing.
const PARTNER = (id: string) => `investment:partner-property:${id}`;
const PARTNER_PREFIX = 'investment:partner-property:';
// AI Property Intelligence: address-driven feasibility studies + the light
// subscription/usage gate that turns it into a paid product for landlords and
// condo associations. Reports are stored per-id and indexed by requester email.
const AI_REPORT = (id: string) => `investment:ai-report:${id}`;
const AI_REPORT_PREFIX = 'investment:ai-report:';
const AI_SUB = (email: string) => `property_ai_subscription:${email.toLowerCase()}`;
const AI_USAGE = (email: string) => `property_ai_usage:${email.toLowerCase()}`;
const AI_FREE_LIMIT = 2; // free feasibility studies before a subscription is required

// ── Demo opportunities seeded on first read so the tab shows live cards ──────
const DEMO_OPPORTUNITIES = [
  {
    title: 'Company Equity — Series A',
    category: 'Company Equity',
    description: 'Own a stake in the parent company as it scales its multi-portal property services platform across new territories.',
    minInvestment: 25000,
    maxInvestment: 250000,
    projectedROI: 22,
    term: '4 years',
    status: 'open',
    investors: 0,
    funded: 0,
    targetRaise: 1500000,
    highlight: 'Equity Upside',
    location: 'Company-wide',
    benefits: ['Board reporting access', 'Pro-rata rights', 'Quarterly distributions'],
  },
  {
    title: 'Turnkey Rental Portfolio',
    category: 'Turnkey',
    description: 'Fractional ownership in a managed portfolio of cash-flowing single-family rentals with full property management included.',
    minInvestment: 10000,
    maxInvestment: 100000,
    projectedROI: 14,
    term: '5 years',
    status: 'open',
    investors: 0,
    funded: 0,
    targetRaise: 800000,
    highlight: 'Passive Income',
    location: 'Dallas, TX',
    benefits: ['Monthly rental income', 'Professionally managed', 'Appreciation upside'],
  },
  {
    title: 'Value-Add Multifamily',
    category: 'Value-Add',
    description: 'Reposition a 48-unit multifamily asset through renovations and operational improvements to drive net operating income.',
    minInvestment: 50000,
    maxInvestment: 500000,
    projectedROI: 19,
    term: '3 years',
    status: 'open',
    investors: 0,
    funded: 0,
    targetRaise: 2000000,
    highlight: 'Forced Appreciation',
    location: 'Austin, TX',
    benefits: ['Refinance cash-out potential', 'Depreciation benefits', 'Quarterly updates'],
  },
];

async function ensureSeeded() {
  const seeded = await kv.get(SEED_FLAG);
  if (seeded) return;
  const now = new Date().toISOString();
  const entries = DEMO_OPPORTUNITIES.map((o) => {
    const id = crypto.randomUUID();
    return { key: OPP(id), value: { ...o, id, created_at: now, updated_at: now } };
  });
  await kv.mset(entries);
  await kv.set(SEED_FLAG, now);
}

// Funding progress and investor counts are NEVER stored as truth — they are
// computed live from real commitments so every opportunity starts at zero and
// only moves when a genuine commitment is recorded. Cancelled/rejected/withdrawn
// commitments don't count. This is what "start with zero funding" means: the
// listings exist, the numbers are real.
const DEAD_COMMITMENT = new Set(['cancelled', 'canceled', 'rejected', 'withdrawn', 'declined']);

async function fundingByOpportunity(): Promise<Map<string, { raised: number; investors: number }>> {
  const commitments = ((await kv.getByPrefix(COMMIT_PREFIX)) || []) as any[];
  const map = new Map<string, { raised: number; seen: Set<string> }>();
  for (const commit of commitments) {
    const oppId = commit?.opportunity_id;
    if (!oppId) continue;
    if (DEAD_COMMITMENT.has(String(commit?.status || '').toLowerCase())) continue;
    const amount = parseFloat(commit?.commitment_amount) || 0;
    const entry = map.get(oppId) || { raised: 0, seen: new Set<string>() };
    entry.raised += amount;
    const who = String(commit?.investor_email || commit?.id || '').toLowerCase();
    if (who) entry.seen.add(who);
    map.set(oppId, entry);
  }
  const out = new Map<string, { raised: number; investors: number }>();
  for (const [id, v] of map) out.set(id, { raised: v.raised, investors: v.seen.size });
  return out;
}

/** Overlay real, computed funding onto a stored opportunity. */
function withLiveFunding(opp: any, funding: Map<string, { raised: number; investors: number }>): any {
  const f = funding.get(opp.id) || { raised: 0, investors: 0 };
  const target = Number(opp.targetRaise) || 0;
  return {
    ...opp,
    amountRaised: f.raised,
    investors: f.investors,
    funded: target > 0 ? Math.min(100, Math.round((f.raised / target) * 100)) : 0,
  };
}

// ── Opportunities ────────────────────────────────────────────────────────
investmentsRouter.get(`${PREFIX}/investments/opportunities`, async (c) => {
  try {
    await ensureSeeded();
    const opportunities = (await kv.getByPrefix(OPP_PREFIX)) || [];
    opportunities.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    const funding = await fundingByOpportunity();
    return c.json({ opportunities: opportunities.map((o: any) => withLiveFunding(o, funding)) });
  } catch (error: any) {
    console.log(`Error fetching opportunities: ${error?.message || error}`);
    return c.json({ error: `Failed to fetch opportunities: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.get(`${PREFIX}/investments/opportunities/:id`, async (c) => {
  try {
    const opportunity = await kv.get(OPP(c.req.param('id')));
    if (!opportunity) return c.json({ error: 'Opportunity not found' }, 404);
    const funding = await fundingByOpportunity();
    return c.json({ opportunity: withLiveFunding(opportunity, funding) });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch opportunity: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.post(`${PREFIX}/investments/opportunities`, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = body.id || crypto.randomUUID();
    const opportunity = { ...body, id, created_at: body.created_at || now, updated_at: now };
    await kv.set(OPP(id), opportunity);
    return c.json({ opportunity }, 201);
  } catch (error: any) {
    return c.json({ error: `Failed to create opportunity: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.put(`${PREFIX}/investments/opportunities/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(OPP(id));
    if (!existing) return c.json({ error: 'Opportunity not found' }, 404);
    const body = await c.req.json();
    const opportunity = { ...existing, ...body, id, updated_at: new Date().toISOString() };
    await kv.set(OPP(id), opportunity);
    return c.json({ opportunity });
  } catch (error: any) {
    return c.json({ error: `Failed to update opportunity: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.delete(`${PREFIX}/investments/opportunities/:id`, async (c) => {
  try {
    await kv.del(OPP(c.req.param('id')));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: `Failed to delete opportunity: ${error?.message || error}` }, 500);
  }
});

// ── Commitments ──────────────────────────────────────────────────────────
investmentsRouter.get(`${PREFIX}/investments/commitments/investor/:email`, async (c) => {
  try {
    const email = c.req.param('email');
    const all = ((await kv.getByPrefix(COMMIT_PREFIX)) || []) as any[];
    const commitments = all.filter((x) => x.investor_email === email);
    // Nest the opportunity so the frontend can render its title/category.
    for (const commit of commitments) {
      if (commit.opportunity_id) {
        commit.opportunity = (await kv.get(OPP(commit.opportunity_id))) || null;
      }
    }
    commitments.sort((a, b) => (b.commitment_date || '').localeCompare(a.commitment_date || ''));
    return c.json({ commitments });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch commitments: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.post(`${PREFIX}/investments/commitments`, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = body.id || crypto.randomUUID();
    const commitment = {
      ...body,
      id,
      status: body.status || 'pending',
      total_received: body.total_received || 0,
      commitment_date: body.commitment_date || now,
      created_at: now,
      updated_at: now,
    };
    await kv.set(COMMIT(id), commitment);
    return c.json({ commitment }, 201);
  } catch (error: any) {
    return c.json({ error: `Failed to create commitment: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.put(`${PREFIX}/investments/commitments/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(COMMIT(id));
    if (!existing) return c.json({ error: 'Commitment not found' }, 404);
    const body = await c.req.json();
    const commitment = { ...existing, ...body, id, updated_at: new Date().toISOString() };
    await kv.set(COMMIT(id), commitment);
    return c.json({ commitment });
  } catch (error: any) {
    return c.json({ error: `Failed to update commitment: ${error?.message || error}` }, 500);
  }
});

// ── Payouts / distributions ──────────────────────────────────────────────
investmentsRouter.get(`${PREFIX}/investments/payouts/investor/:email`, async (c) => {
  try {
    const email = c.req.param('email');
    const all = ((await kv.getByPrefix(PAYOUT_PREFIX)) || []) as any[];
    const payouts = all
      .filter((x) => x.investor_email === email)
      .sort((a, b) => (b.payout_date || '').localeCompare(a.payout_date || ''));
    return c.json({ payouts });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch payouts: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.post(`${PREFIX}/investments/payouts`, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = body.id || crypto.randomUUID();
    const payout = {
      ...body,
      id,
      status: body.status || 'pending',
      payout_date: body.payout_date || now,
      created_at: now,
      updated_at: now,
    };
    await kv.set(PAYOUT(id), payout);
    return c.json({ payout }, 201);
  } catch (error: any) {
    return c.json({ error: `Failed to create payout: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.put(`${PREFIX}/investments/payouts/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(PAYOUT(id));
    if (!existing) return c.json({ error: 'Payout not found' }, 404);
    const body = await c.req.json();
    const payout = { ...existing, ...body, id, updated_at: new Date().toISOString() };
    await kv.set(PAYOUT(id), payout);
    return c.json({ payout });
  } catch (error: any) {
    return c.json({ error: `Failed to update payout: ${error?.message || error}` }, 500);
  }
});

// ── Documents ────────────────────────────────────────────────────────────
investmentsRouter.get(`${PREFIX}/investments/documents/opportunity/:id`, async (c) => {
  try {
    const documents = (await kv.getByPrefix(DOC_PREFIX(c.req.param('id')))) || [];
    return c.json({ documents });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch documents: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.post(`${PREFIX}/investments/documents/:id/sign`, async (c) => {
  try {
    const oppId = c.req.param('id');
    const body = await c.req.json();
    const now = new Date().toISOString();
    const docId = body.document_id || crypto.randomUUID();
    const document = {
      id: docId,
      opportunity_id: oppId,
      investor_email: body.investor_email || '',
      signature: body.signature || '',
      name: body.name || 'Investment Agreement',
      signed_at: now,
    };
    await kv.set(DOC(oppId, docId), document);
    return c.json({ success: true, document }, 201);
  } catch (error: any) {
    return c.json({ error: `Failed to sign document: ${error?.message || error}` }, 500);
  }
});

// ── Portfolio analytics ──────────────────────────────────────────────────
investmentsRouter.get(`${PREFIX}/investments/analytics/portfolio/:email`, async (c) => {
  try {
    const email = c.req.param('email');
    const allCommitments = ((await kv.getByPrefix(COMMIT_PREFIX)) || []) as any[];
    const commitments = allCommitments.filter(
      (x) => x.investor_email === email && ['approved', 'active', 'completed'].includes(x.status),
    );
    for (const commit of commitments) {
      if (commit.opportunity_id) {
        commit.opportunity = (await kv.get(OPP(commit.opportunity_id))) || null;
      }
    }

    const allPayouts = ((await kv.getByPrefix(PAYOUT_PREFIX)) || []) as any[];
    const payouts = allPayouts
      .filter((x) => x.investor_email === email && x.status === 'completed')
      .sort((a, b) => (b.payout_date || '').localeCompare(a.payout_date || ''));

    const totalInvested = commitments.reduce((sum, x) => sum + (parseFloat(x.commitment_amount) || 0), 0);
    const totalReceived = commitments.reduce((sum, x) => sum + (parseFloat(x.total_received) || 0), 0);

    return c.json({
      summary: {
        totalInvested,
        totalReceived,
        currentValue: totalInvested + totalReceived,
        totalROI: totalInvested > 0 ? ((totalReceived / totalInvested) * 100).toFixed(2) : '0',
        activeInvestments: commitments.filter((x) => x.status === 'active').length,
        completedInvestments: commitments.filter((x) => x.status === 'completed').length,
        totalPayouts: payouts.length,
      },
      commitments,
      recentPayouts: payouts.slice(0, 10),
    });
  } catch (error: any) {
    return c.json({ error: `Failed to compute portfolio: ${error?.message || error}` }, 500);
  }
});

// ── Partner properties (owner-has-property strategy intake) ────────────────
// Public submit — anyone with a property can ask us to partner. We stamp a
// status of 'new' so it lands at the top of the owner's review pipeline.
investmentsRouter.post(`${PREFIX}/investments/partner-properties`, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();
    const id = body.id || crypto.randomUUID();
    const record = {
      id,
      contact: body.contact || {},
      property: body.property || {},
      recommendation: body.recommendation || null,
      // Denormalize a few fields so the pipeline list is cheap to render.
      contact_name: body?.contact?.name || '',
      contact_email: (body?.contact?.email || '').toLowerCase(),
      recommended_strategy: body?.recommendation?.primary?.label || 'Under review',
      recommended_score: body?.recommendation?.primary?.score ?? null,
      status: 'new',
      owner_notes: '',
      created_at: now,
      updated_at: now,
    };
    await kv.set(PARTNER(id), record);
    return c.json({ success: true, partnerProperty: record }, 201);
  } catch (error: any) {
    console.log(`Error creating partner property: ${error?.message || error}`);
    return c.json({ error: `Failed to submit partner property: ${error?.message || error}` }, 500);
  }
});

// List all submissions for the owner's review pipeline (newest first).
investmentsRouter.get(`${PREFIX}/investments/partner-properties`, async (c) => {
  try {
    const partnerProperties = ((await kv.getByPrefix(PARTNER_PREFIX)) || []) as any[];
    partnerProperties.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return c.json({ success: true, partnerProperties });
  } catch (error: any) {
    console.log(`Error fetching partner properties: ${error?.message || error}`);
    return c.json({ error: `Failed to fetch partner properties: ${error?.message || error}` }, 500);
  }
});

// An investor can look up the properties they submitted by email.
investmentsRouter.get(`${PREFIX}/investments/partner-properties/investor/:email`, async (c) => {
  try {
    const email = (c.req.param('email') || '').toLowerCase();
    const all = ((await kv.getByPrefix(PARTNER_PREFIX)) || []) as any[];
    const partnerProperties = all
      .filter((x) => (x.contact_email || '') === email)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return c.json({ success: true, partnerProperties });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch partner properties: ${error?.message || error}` }, 500);
  }
});

// Owner updates a submission (status change, notes, or agreed strategy).
investmentsRouter.put(`${PREFIX}/investments/partner-properties/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await kv.get(PARTNER(id));
    if (!existing) return c.json({ error: 'Partner property not found' }, 404);
    const body = await c.req.json();
    const record = { ...existing, ...body, id, updated_at: new Date().toISOString() };
    await kv.set(PARTNER(id), record);
    return c.json({ success: true, partnerProperty: record });
  } catch (error: any) {
    return c.json({ error: `Failed to update partner property: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.delete(`${PREFIX}/investments/partner-properties/:id`, async (c) => {
  try {
    await kv.del(PARTNER(c.req.param('id')));
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: `Failed to delete partner property: ${error?.message || error}` }, 500);
  }
});

// ── AI Property Intelligence ───────────────────────────────────────────────

// Resolve the requester's role from a bearer token (best-effort). Platform
// owners/admins never hit the paywall.
async function resolveRole(authHeader?: string): Promise<{ role: string | null; email: string | null }> {
  const token = authHeader?.split(' ')[1];
  if (!token) return { role: null, email: null };
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.id) return { role: null, email: null };
    const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
    const role = perms?.role || user.app_metadata?.role || null;
    return { role, email: (user.email || '').toLowerCase() };
  } catch {
    return { role: null, email: null };
  }
}

function isPrivileged(role: string | null): boolean {
  return role === 'admin' || role === 'owner' || role === 'super_admin' || role === 'platform_owner';
}

// Subscription status for the AI studio (used by the frontend to show the gate).
investmentsRouter.get(`${PREFIX}/investments/ai-subscription/:email`, async (c) => {
  try {
    const email = (c.req.param('email') || '').toLowerCase();
    const { role } = await resolveRole(c.req.header('Authorization'));
    const sub = (await kv.get(AI_SUB(email))) as any;
    const usage = ((await kv.get(AI_USAGE(email))) as any)?.count || 0;
    const active = isPrivileged(role) || !!sub?.active;
    return c.json({
      success: true,
      active,
      privileged: isPrivileged(role),
      subscription: sub || null,
      usage,
      freeLimit: AI_FREE_LIMIT,
      freeRemaining: Math.max(0, AI_FREE_LIMIT - usage),
    });
  } catch (error: any) {
    return c.json({ error: `Failed to load AI subscription: ${error?.message || error}` }, 500);
  }
});

// Create a Stripe Checkout session (subscription mode) for a tier. Pricing is
// server-authoritative — the client only names the tier.
investmentsRouter.post(`${PREFIX}/investments/ai-subscription/checkout`, async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || '').toLowerCase();
    const tier = String(body.tier || 'professional');
    const pricing = AI_TIER_PRICING[tier];
    if (!email) return c.json({ error: 'An email is required to subscribe.' }, 400);
    if (!pricing) return c.json({ error: `Unknown subscription tier: ${tier}` }, 400);

    const stripe = getStripe();
    if (!stripe) return c.json({ error: 'Billing is not configured (missing STRIPE_SECRET_KEY).' }, 500);

    const origin = String(body.origin || '').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          unit_amount: pricing.amount,
          product_data: { name: pricing.label },
        },
      }],
      metadata: { kind: 'property_ai', email, tier, audience: body.audience || 'landlord' },
      success_url: `${origin}/property-ai-studio?ai_sub=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/property-ai-studio?ai_sub=cancel`,
    });

    return c.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.log(`Error creating AI subscription checkout: ${error?.message || error}`);
    return c.json({ error: `Failed to start checkout: ${error?.message || error}` }, 500);
  }
});

// Confirm a completed Checkout session and activate the subscription entitlement.
investmentsRouter.post(`${PREFIX}/investments/ai-subscription/confirm`, async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = String(body.session_id || '');
    if (!sessionId) return c.json({ error: 'A session_id is required.' }, 400);

    const stripe = getStripe();
    if (!stripe) return c.json({ error: 'Billing is not configured (missing STRIPE_SECRET_KEY).' }, 500);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return c.json({ success: false, active: false, error: 'Payment not completed yet.' }, 402);
    }

    const email = (session.metadata?.email || session.customer_email || '').toLowerCase();
    if (!email) return c.json({ error: 'Could not resolve the subscriber email from the session.' }, 400);
    const now = new Date().toISOString();
    const subscription = {
      email,
      active: true,
      tier: session.metadata?.tier || 'professional',
      plan: AI_TIER_PRICING[session.metadata?.tier || 'professional']?.label || 'Property Intelligence',
      audience: session.metadata?.audience || 'landlord',
      stripe_customer: session.customer || null,
      stripe_subscription: session.subscription || null,
      stripe_session: session.id,
      started_at: now,
      updated_at: now,
    };
    await kv.set(AI_SUB(email), subscription);
    return c.json({ success: true, active: true, subscription });
  } catch (error: any) {
    console.log(`Error confirming AI subscription: ${error?.message || error}`);
    return c.json({ error: `Failed to confirm subscription: ${error?.message || error}` }, 500);
  }
});

// Generate an AI feasibility study for an address.
investmentsRouter.post(`${PREFIX}/investments/ai-property-analysis`, async (c) => {
  try {
    const body = await c.req.json();
    const address = String(body.address || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!address) return c.json({ error: 'Please provide a property address.' }, 400);

    // ── Gate ──────────────────────────────────────────────────────────────
    const { role } = await resolveRole(c.req.header('Authorization'));
    const sub = email ? ((await kv.get(AI_SUB(email))) as any) : null;
    const usageRec = email ? ((await kv.get(AI_USAGE(email))) as any) : null;
    const usage = usageRec?.count || 0;
    const privileged = isPrivileged(role);
    const subscribed = !!sub?.active;
    if (!privileged && !subscribed && usage >= AI_FREE_LIMIT) {
      return c.json({
        error: 'You have used all of your free feasibility studies. Subscribe to run unlimited analyses.',
        needsSubscription: true,
        usage,
        freeLimit: AI_FREE_LIMIT,
      }, 402);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ error: 'AI is not configured (missing OPENAI_API_KEY).' }, 500);
    const openai = new OpenAI({ apiKey });

    // Ground the study in the real parcel record + valuation where available.
    // Parcel data is sourced free-first (MassGIS / NH GRANIT via Census
    // geocode) and only falls back to paid Regrid if the free lookup misses.
    const [freeParcel, valuation] = await Promise.all([
      fetchFreeParcel(address),
      fetchAttomValuation(address),
    ]);
    const parcel = freeParcel || (await fetchRegridParcel(address));

    const system = `You are a senior real estate development and land-use analyst. Given a property address you produce a rigorous, realistic feasibility study for maximizing the property's value. You reason about likely zoning, lot characteristics, and the local market for that city/region based on general knowledge. When verified parcel data is provided, treat it as authoritative and build every strategy around it. When exact data is unknown, you make clearly-labeled reasonable estimates and ranges — never fabricate precise figures as if certain. You output ONLY valid JSON matching the requested schema.`;

    const user = `Property address: "${address}".
${body.propertyType ? `Owner says property type: ${body.propertyType}.` : ''}
${body.notes ? `Owner notes: ${body.notes}.` : ''}${parcelPromptBlock(parcel)}${valuationPromptBlock(valuation)}

Produce a feasibility study as JSON with EXACTLY this shape:
{
  "propertyOverview": { "summary": string, "estimatedType": string, "estimatedValueRange": string, "lotSizeEstimate": string, "yearBuiltEstimate": string, "keyFacts": string[] },
  "zoning": { "likelyDesignation": string, "allowedUses": string[], "constraints": string[], "rezonePotential": string },
  "marketSnapshot": { "summary": string, "medianValue": string, "rentTrend": string, "demandLevel": "low"|"moderate"|"high", "notableFactors": string[] },
  "strategies": [
    {
      "name": string,
      "category": "rezone"|"subdivide"|"build-up"|"rehab"|"other",
      "fitScore": number,
      "summary": string,
      "estimatedCost": string,
      "projectedReturn": string,
      "roiEstimate": string,
      "riskLevel": "low"|"medium"|"high",
      "steps": [ { "phase": string, "description": string, "duration": string } ],
      "permitsAndProcesses": string[],
      "timeline": string,
      "risks": string[],
      "keyConsiderations": string[]
    }
  ],
  "recommendedStrategy": string,
  "disclaimer": string
}

Include 3 to 5 diverse strategies spanning rezoning, subdividing, building up/adding units, and rehab where plausible for this property. Order strategies by fitScore descending. Be specific and actionable in steps, permits, and timelines. Output ONLY the JSON object.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    let analysis: any;
    try {
      analysis = JSON.parse(raw);
    } catch (parseErr) {
      console.log(`AI property analysis: failed to parse model JSON: ${parseErr}. Raw: ${raw.slice(0, 500)}`);
      return c.json({ error: 'The AI returned an unexpected format. Please try again.' }, 502);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const report = {
      id,
      address,
      email,
      property_type: body.propertyType || '',
      notes: body.notes || '',
      parcel: parcel || null,
      valuation: valuation || null,
      analysis,
      created_at: now,
    };
    await kv.set(AI_REPORT(id), report);

    // Count usage against the free tier (only for non-privileged, non-subscribed).
    let newUsage = usage;
    if (email && !privileged && !subscribed) {
      newUsage = usage + 1;
      await kv.set(AI_USAGE(email), { count: newUsage, updated_at: now });
    }

    return c.json({
      success: true,
      report,
      usage: newUsage,
      freeRemaining: privileged || subscribed ? null : Math.max(0, AI_FREE_LIMIT - newUsage),
    }, 201);
  } catch (error: any) {
    console.log(`Error generating AI property analysis: ${error?.message || error}`);
    return c.json({ error: `Failed to generate analysis: ${error?.message || error}` }, 500);
  }
});

// Find a stored AI subscription record by its Stripe customer or subscription id
// (used by the webhook, where we only get Stripe ids, not the email).
async function findSubByStripe(opts: { customer?: string | null; subscription?: string | null }): Promise<any | null> {
  const all = ((await kv.getByPrefix('property_ai_subscription:')) || []) as any[];
  return (
    all.find((s) =>
      (opts.subscription && s.stripe_subscription === opts.subscription) ||
      (opts.customer && s.stripe_customer === opts.customer),
    ) || null
  );
}

async function setSubActive(record: any, active: boolean, note: string) {
  if (!record?.email) return;
  await kv.set(AI_SUB(record.email), {
    ...record,
    active,
    status_note: note,
    updated_at: new Date().toISOString(),
  });
  console.log(`[ai-sub] ${record.email} -> active=${active} (${note})`);
}

// Stripe webhook — keeps the AI subscription entitlement in sync with billing
// so a cancellation or failed renewal automatically revokes access. Configure a
// Stripe endpoint pointing here and store its signing secret as
// STRIPE_WEBHOOK_SECRET. Uses the raw request body for signature verification.
investmentsRouter.post(`${PREFIX}/investments/stripe-webhook`, async (c) => {
  const stripe = getStripe();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripe) return c.json({ error: 'Billing not configured (missing STRIPE_SECRET_KEY).' }, 500);
  if (!webhookSecret) return c.json({ error: 'Webhook not configured (missing STRIPE_WEBHOOK_SECRET).' }, 500);

  const signature = c.req.header('stripe-signature') || '';
  const payload = await c.req.text();

  let event: any;
  try {
    // Async variant is required under Deno's Web Crypto.
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err: any) {
    console.log(`[ai-sub webhook] signature verification failed: ${err?.message || err}`);
    return c.json({ error: `Webhook signature verification failed: ${err?.message || err}` }, 400);
  }

  try {
    const obj = event.data?.object || {};
    switch (event.type) {
      case 'checkout.session.completed': {
        // Belt-and-suspenders activation (the confirm route usually handles this).
        const email = (obj.metadata?.email || obj.customer_email || '').toLowerCase();
        if (email && obj.metadata?.kind === 'property_ai') {
          const existing = (await kv.get(AI_SUB(email))) as any;
          await kv.set(AI_SUB(email), {
            ...(existing || {}),
            email,
            active: true,
            tier: obj.metadata?.tier || existing?.tier || 'professional',
            audience: obj.metadata?.audience || existing?.audience || 'landlord',
            stripe_customer: obj.customer || existing?.stripe_customer || null,
            stripe_subscription: obj.subscription || existing?.stripe_subscription || null,
            stripe_session: obj.id,
            updated_at: new Date().toISOString(),
            started_at: existing?.started_at || new Date().toISOString(),
          });
          console.log(`[ai-sub] activated via checkout.session.completed for ${email}`);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const rec = await findSubByStripe({ customer: obj.customer, subscription: obj.id });
        if (rec) {
          const good = obj.status === 'active' || obj.status === 'trialing';
          await setSubActive(rec, good, `subscription.updated:${obj.status}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const rec = await findSubByStripe({ customer: obj.customer, subscription: obj.id });
        if (rec) await setSubActive(rec, false, 'subscription.deleted');
        break;
      }
      case 'invoice.payment_failed': {
        const rec = await findSubByStripe({ customer: obj.customer, subscription: obj.subscription });
        if (rec) await setSubActive(rec, false, 'invoice.payment_failed');
        break;
      }
      case 'invoice.payment_succeeded': {
        const rec = await findSubByStripe({ customer: obj.customer, subscription: obj.subscription });
        if (rec && !rec.active) await setSubActive(rec, true, 'invoice.payment_succeeded');
        break;
      }
      default:
        break;
    }
    return c.json({ received: true });
  } catch (err: any) {
    console.log(`[ai-sub webhook] handler error for ${event?.type}: ${err?.message || err}`);
    return c.json({ error: `Webhook handler error: ${err?.message || err}` }, 500);
  }
});

// Admin: list all AI subscribers for a revenue/status view.
investmentsRouter.get(`${PREFIX}/investments/ai-subscribers`, async (c) => {
  try {
    const { role } = await resolveRole(c.req.header('Authorization'));
    if (!isPrivileged(role)) {
      return c.json({ error: 'Administrator access is required to view subscribers.' }, 403);
    }
    const subs = ((await kv.getByPrefix('property_ai_subscription:')) || []) as any[];
    subs.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
    const monthly = subs.reduce((sum, s) => sum + (s.active ? (AI_TIER_PRICING[s.tier]?.amount || 0) : 0), 0);
    return c.json({
      success: true,
      subscribers: subs.map((s) => ({
        email: s.email,
        active: !!s.active,
        tier: s.tier,
        plan: s.plan || AI_TIER_PRICING[s.tier]?.label,
        audience: s.audience,
        priceMonthly: (AI_TIER_PRICING[s.tier]?.amount || 0) / 100,
        started_at: s.started_at,
        updated_at: s.updated_at,
        status_note: s.status_note || null,
        stripe_subscription: s.stripe_subscription || null,
      })),
      stats: {
        total: subs.length,
        active: subs.filter((s) => s.active).length,
        mrr: monthly / 100,
      },
    });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch subscribers: ${error?.message || error}` }, 500);
  }
});

// List a requester's saved reports (newest first).
investmentsRouter.get(`${PREFIX}/investments/ai-reports/:email`, async (c) => {
  try {
    const email = (c.req.param('email') || '').toLowerCase();
    const all = ((await kv.getByPrefix(AI_REPORT_PREFIX)) || []) as any[];
    const reports = all
      .filter((r) => (r.email || '') === email)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return c.json({ success: true, reports });
  } catch (error: any) {
    return c.json({ error: `Failed to fetch reports: ${error?.message || error}` }, 500);
  }
});

export default investmentsRouter;
