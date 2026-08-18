/**
 * Per-town filing requirements, and a log of what has actually been submitted.
 *
 * No permitting portal publishes an API a contractor can file through — Accela,
 * OpenGov, Tyler EnerGov and the rest are licensed per jurisdiction and have to
 * be enabled by the town. So this does not pretend to submit anything. It holds
 * the two things that actually cause resubmissions:
 *
 *   1. What each town wants. One combined PDF or a file per sheet, a size cap,
 *      a naming convention, a sheet order, which extra documents must ride
 *      along. Every town differs, and the rule is discovered by being rejected.
 *
 *   2. What was sent, when, under which confirmation number, and what came back.
 *      Across a dozen open permits this is the part that gets forgotten, and a
 *      missed request for information quietly expires an application.
 */
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

export const townPermitsRouter = new Hono();

const PREFIX = '/make-server-3eae23a6';
const TOWN_PREFIX = 'town_requirements:';
const SUBMISSION_PREFIX = 'permit_submission:';

const auth = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function requireAdmin(c: any): Promise<{ email: string | null; admin: boolean }> {
  const header = c.req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) return { email: null, admin: false };
  const { data, error } = await auth.auth.getUser(header.substring(7));
  if (error || !data?.user) return { email: null, admin: false };
  const role = String((data.user.user_metadata as any)?.role || '').toLowerCase();
  return { email: data.user.email || null, admin: role === 'admin' || role === 'owner' || role === 'super_admin' };
}

/** The portals towns actually run. Knowing the vendor predicts most of the rules. */
export const PORTAL_VENDORS = [
  'Accela', 'OpenGov / ViewPoint', 'Tyler EnerGov', 'CityView',
  'CloudPermit', 'eTRAKiT', 'SmartGov', 'Other online portal',
  'Email submission', 'Paper / in person',
];

const SUBMISSION_STATUSES = [
  'draft', 'submitted', 'under_review', 'info_requested',
  'approved', 'denied', 'withdrawn', 'expired',
] as const;

const slug = (s: string) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Towns ────────────────────────────────────────────────────────────────────
townPermitsRouter.get(`${PREFIX}/town-permits/towns`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const all = ((await kv.getByPrefix(TOWN_PREFIX)) || []) as any[];
  const towns = all.map(t => (typeof t === 'string' ? JSON.parse(t) : t)).filter(Boolean);
  towns.sort((a, b) => `${a.state} ${a.name}`.localeCompare(`${b.state} ${b.name}`));
  return c.json({ success: true, towns, vendors: PORTAL_VENDORS });
});

/**
 * The load case a town enforces, and when it was last actually established.
 *
 * These live on the town rather than on each design because they are a property
 * of the jurisdiction, not of the deck — two identical decks in neighbouring
 * towns are genuinely different builds. Frost depth in particular is published
 * by no national source; it comes from the building department, and entered once
 * here is the only place it can come from.
 *
 * `loadSource` is not decoration. A designer reading these puts them in front of
 * someone who has to confirm them before they reach a permit set, and "40 psf"
 * with no provenance is not something anyone can confirm. Zero and empty mean
 * not yet established, and stay blank downstream rather than being filled in
 * with a plausible number.
 *
 * `loadsUpdatedAt` only moves when a value actually changes. The whole town form
 * posts every field on every save, so stamping it on each write would turn "when
 * was this last confirmed with the town" — the one question it exists to answer
 * — into "when was this record last touched for any reason at all".
 */
function loadCase(body: any, existing: any, now: string) {
  const next = {
    groundSnowPsf: Number(body.groundSnowPsf ?? existing?.groundSnowPsf ?? 0) || 0,
    frostDepthIn: Number(body.frostDepthIn ?? existing?.frostDepthIn ?? 0) || 0,
    codeEdition: String(body.codeEdition ?? existing?.codeEdition ?? '').trim(),
    loadSource: String(body.loadSource ?? existing?.loadSource ?? '').trim(),
  };
  const was = {
    groundSnowPsf: Number(existing?.groundSnowPsf ?? 0) || 0,
    frostDepthIn: Number(existing?.frostDepthIn ?? 0) || 0,
    codeEdition: String(existing?.codeEdition ?? '').trim(),
    loadSource: String(existing?.loadSource ?? '').trim(),
  };
  const changed = (Object.keys(next) as (keyof typeof next)[]).some(k => next[k] !== was[k]);
  const anySet = next.groundSnowPsf > 0 || next.frostDepthIn > 0 || !!next.codeEdition;
  return {
    ...next,
    loadsUpdatedAt: (changed && anySet) ? now : String(existing?.loadsUpdatedAt ?? ''),
  };
}

townPermitsRouter.post(`${PREFIX}/town-permits/towns`, async (c) => {
  const { email, admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const body = await c.req.json().catch(() => ({} as any));

  const name = String(body.name || '').trim();
  const state = String(body.state || '').trim().toUpperCase().slice(0, 2);
  if (!name || !state) return c.json({ success: false, error: 'Town name and state are required.' }, 400);

  const id = body.id || `${slug(name)}-${state.toLowerCase()}`;
  const existing = (await kv.get(`${TOWN_PREFIX}${id}`)) as any;
  const now = new Date().toISOString();
  const loads = loadCase(body, existing, now);

  const town = {
    id,
    name,
    state,
    portalVendor: String(body.portalVendor || existing?.portalVendor || 'Other online portal'),
    portalUrl: String(body.portalUrl ?? existing?.portalUrl ?? ''),
    contactName: String(body.contactName ?? existing?.contactName ?? ''),
    contactPhone: String(body.contactPhone ?? existing?.contactPhone ?? ''),
    contactEmail: String(body.contactEmail ?? existing?.contactEmail ?? ''),

    // The rules that decide whether an upload is accepted.
    combinedPdf: body.combinedPdf ?? existing?.combinedPdf ?? true,
    maxFileSizeMb: Number(body.maxFileSizeMb ?? existing?.maxFileSizeMb ?? 0) || 0,
    namingConvention: String(body.namingConvention ?? existing?.namingConvention ?? ''),
    sheetOrder: Array.isArray(body.sheetOrder) ? body.sheetOrder.map(String) : (existing?.sheetOrder ?? []),
    requiredDocuments: Array.isArray(body.requiredDocuments)
      ? body.requiredDocuments.map(String)
      : (existing?.requiredDocuments ?? []),
    requiresWetStamp: body.requiresWetStamp ?? existing?.requiresWetStamp ?? false,
    requiresEngineerOver: Number(body.requiresEngineerOver ?? existing?.requiresEngineerOver ?? 0) || 0,

    /**
     * The load case this town enforces.
     *
     * These live on the town rather than on each design because they are a
     * property of the jurisdiction, not of the deck — two identical decks in
     * neighbouring towns are genuinely different builds. Frost depth in
     * particular is published by nobody nationally; it comes from the building
     * department and the only place to keep it is here, entered once.
     *
     * `loadSource` is not decoration. A designer reading these puts them in
     * front of an operator who has to confirm them before they reach a permit
     * set, and "40 psf" with no provenance is not something anyone can confirm.
     * Zero means not yet established, and stays blank downstream rather than
     * being filled in with a plausible number.
     */
    ...loads,

    permitFeeNote: String(body.permitFeeNote ?? existing?.permitFeeNote ?? ''),
    typicalReviewDays: Number(body.typicalReviewDays ?? existing?.typicalReviewDays ?? 0) || 0,
    notes: String(body.notes ?? existing?.notes ?? ''),

    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: email,
  };

  await kv.set(`${TOWN_PREFIX}${id}`, town);
  return c.json({ success: true, town }, existing ? 200 : 201);
});

townPermitsRouter.delete(`${PREFIX}/town-permits/towns/:id`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const id = c.req.param('id');
  // Refuse to orphan a submission's requirements record.
  const subs = ((await kv.getByPrefix(SUBMISSION_PREFIX)) || []) as any[];
  const inUse = subs.map(s => (typeof s === 'string' ? JSON.parse(s) : s)).filter((s: any) => s?.townId === id);
  if (inUse.length) {
    return c.json({
      success: false,
      error: `${inUse.length} submission(s) reference this town. Remove or reassign them first.`,
    }, 409);
  }
  await kv.del(`${TOWN_PREFIX}${id}`);
  return c.json({ success: true });
});

// ── Submissions ──────────────────────────────────────────────────────────────
townPermitsRouter.get(`${PREFIX}/town-permits/submissions`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const all = ((await kv.getByPrefix(SUBMISSION_PREFIX)) || []) as any[];
  const rows = all.map(s => (typeof s === 'string' ? JSON.parse(s) : s)).filter(Boolean);
  rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  const now = Date.now();
  const open = rows.filter(r => !['approved', 'denied', 'withdrawn', 'expired'].includes(r.status));
  return c.json({
    success: true,
    submissions: rows,
    counts: rows.reduce((m: any, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {}),
    // The two states that cost money if missed: a town waiting on us, and an
    // application sitting past the review time the town quoted.
    needsAttention: open.filter(r => {
      if (r.status === 'info_requested') return true;
      if (!r.submittedAt || !r.expectedDays) return false;
      return (now - Date.parse(r.submittedAt)) / 86_400_000 > r.expectedDays;
    }).map(r => ({ id: r.id, project: r.projectName, town: r.townName, status: r.status, submittedAt: r.submittedAt })),
  });
});

townPermitsRouter.post(`${PREFIX}/town-permits/submissions`, async (c) => {
  const { email, admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const body = await c.req.json().catch(() => ({} as any));

  const id = body.id || `SUB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const existing = (await kv.get(`${SUBMISSION_PREFIX}${id}`)) as any;
  const now = new Date().toISOString();

  const status = SUBMISSION_STATUSES.includes(body.status) ? body.status : (existing?.status || 'draft');
  const projectName = String(body.projectName ?? existing?.projectName ?? '').trim();
  if (!projectName) return c.json({ success: false, error: 'Project name is required.' }, 400);

  const town = body.townId ? (await kv.get(`${TOWN_PREFIX}${body.townId}`)) as any : null;

  const submission = {
    id,
    projectName,
    address: String(body.address ?? existing?.address ?? ''),
    parcel: String(body.parcel ?? existing?.parcel ?? ''),
    townId: body.townId ?? existing?.townId ?? null,
    townName: town ? `${town.name}, ${town.state}` : (existing?.townName ?? ''),
    portalUrl: town?.portalUrl || existing?.portalUrl || '',

    status,
    confirmationNumber: String(body.confirmationNumber ?? existing?.confirmationNumber ?? ''),
    permitNumber: String(body.permitNumber ?? existing?.permitNumber ?? ''),
    submittedAt: body.submittedAt ?? existing?.submittedAt ?? (status !== 'draft' && !existing?.submittedAt ? now : existing?.submittedAt ?? null),
    decidedAt: ['approved', 'denied'].includes(status) ? (existing?.decidedAt || now) : (existing?.decidedAt ?? null),
    // Copied from the town at submission time rather than read live, so a later
    // change to the town's record does not rewrite history.
    expectedDays: Number(body.expectedDays ?? existing?.expectedDays ?? town?.typicalReviewDays ?? 0) || 0,

    documentsSent: Array.isArray(body.documentsSent) ? body.documentsSent.map(String) : (existing?.documentsSent ?? []),
    feePaid: Number(body.feePaid ?? existing?.feePaid ?? 0) || 0,
    notes: String(body.notes ?? existing?.notes ?? ''),

    history: [
      ...(existing?.history ?? []),
      ...(existing && existing.status !== status
        ? [{ at: now, from: existing.status, to: status, by: email }]
        : existing ? [] : [{ at: now, from: null, to: status, by: email }]),
    ],

    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await kv.set(`${SUBMISSION_PREFIX}${id}`, submission);
  return c.json({ success: true, submission }, existing ? 200 : 201);
});

townPermitsRouter.delete(`${PREFIX}/town-permits/submissions/:id`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  await kv.del(`${SUBMISSION_PREFIX}${c.req.param('id')}`);
  return c.json({ success: true });
});

/**
 * Check a packet against a town's rules before it is uploaded.
 *
 * Every rule here is one a portal enforces silently — an oversized file is
 * refused with no explanation, a missing document is discovered a week later.
 * Cheaper to answer before submitting than after.
 */
townPermitsRouter.post(`${PREFIX}/town-permits/preflight`, async (c) => {
  const { admin } = await requireAdmin(c);
  if (!admin) return c.json({ success: false, error: 'Administrator access is required.' }, 403);
  const body = await c.req.json().catch(() => ({} as any));

  const town = (await kv.get(`${TOWN_PREFIX}${String(body.townId || '')}`)) as any;
  if (!town) return c.json({ success: false, error: 'That town has no requirements recorded yet.' }, 404);

  const fileSizeMb = Number(body.fileSizeMb) || 0;
  const fileCount = Number(body.fileCount) || 0;
  const documents: string[] = Array.isArray(body.documents) ? body.documents.map(String) : [];
  const needsEngineer = !!body.needsEngineer;

  const blocking: string[] = [];
  const warnings: string[] = [];

  if (town.maxFileSizeMb > 0 && fileSizeMb > town.maxFileSizeMb) {
    blocking.push(`File is ${fileSizeMb.toFixed(1)}MB but ${town.name} caps uploads at ${town.maxFileSizeMb}MB. Re-export at a lower DPI.`);
  }
  if (town.combinedPdf && fileCount > 1) {
    blocking.push(`${town.name} wants one combined PDF; you have ${fileCount} files.`);
  }
  if (!town.combinedPdf && fileCount === 1) {
    warnings.push(`${town.name} usually wants each sheet as its own file.`);
  }
  const missing = (town.requiredDocuments || []).filter((d: string) =>
    !documents.some(x => x.toLowerCase().includes(String(d).toLowerCase().slice(0, 8))));
  if (missing.length) {
    blocking.push(`Missing required document(s): ${missing.join(', ')}.`);
  }
  if (needsEngineer && town.requiresWetStamp) {
    warnings.push(`${town.name} requires a wet stamp — a scanned seal will not be accepted.`);
  }
  if (town.namingConvention) {
    warnings.push(`Name files as: ${town.namingConvention}`);
  }

  return c.json({
    success: true,
    town: { id: town.id, name: town.name, state: town.state, portalUrl: town.portalUrl, portalVendor: town.portalVendor },
    ready: blocking.length === 0,
    blocking,
    warnings,
    sheetOrder: town.sheetOrder || [],
  });
});

export default townPermitsRouter;
