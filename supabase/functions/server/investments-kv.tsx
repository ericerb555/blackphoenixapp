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
import * as kv from './kv_store.tsx';

const investmentsRouter = new Hono();

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
    investors: 14,
    funded: 62,
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
    investors: 31,
    funded: 78,
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
    investors: 8,
    funded: 41,
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

// ── Opportunities ────────────────────────────────────────────────────────
investmentsRouter.get(`${PREFIX}/investments/opportunities`, async (c) => {
  try {
    await ensureSeeded();
    const opportunities = (await kv.getByPrefix(OPP_PREFIX)) || [];
    opportunities.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
    return c.json({ opportunities });
  } catch (error: any) {
    console.log(`Error fetching opportunities: ${error?.message || error}`);
    return c.json({ error: `Failed to fetch opportunities: ${error?.message || error}` }, 500);
  }
});

investmentsRouter.get(`${PREFIX}/investments/opportunities/:id`, async (c) => {
  try {
    const opportunity = await kv.get(OPP(c.req.param('id')));
    if (!opportunity) return c.json({ error: 'Opportunity not found' }, 404);
    return c.json({ opportunity });
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

export default investmentsRouter;
