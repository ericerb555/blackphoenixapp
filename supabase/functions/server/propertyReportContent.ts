/**
 * propertyReportContent.ts — the Property Health Report, as blocks.
 *
 * ONE RENDERER, TWO SOURCES — KEPT, AT THE LEVEL THAT MATTERS
 *
 * The plan's architecture note says the fifteen authored products and the three
 * generated reports must share a renderer, or *"the reports end up looking like
 * a different company made them"*. The authored books are built by
 * `scripts/digital-products/lib/pdfBook.mjs`, which runs under Node and takes
 * chapters of blocks: `h2`, `h3`, `p`, `bullets`, `numbers`, `checks`,
 * `callout`, `table`, `fields`, `rule`, `break`.
 *
 * This file emits **exactly that vocabulary** and nothing else. So the content
 * is renderer-agnostic: it renders to HTML today through `reportHtml.ts`, and
 * the same structure can go through `pdfBook` unchanged if jsPDF is ever proven
 * under Deno. The shared thing is the document's shape, which is what makes two
 * documents look like one company — not the library that draws it.
 *
 * Why HTML first rather than a PDF: there is no PDF renderer on the server, and
 * `documents-need-a-view-and-a-pdf` is the standing expectation that every
 * business document can be *seen as it will look* and printed. A view that
 * prints satisfies both today, without shipping an unproven dependency into the
 * function that carries payments.
 *
 * NOTHING HERE INVENTS A FIGURE
 *
 * Every number comes from a record. Where a judgement is made — what counts as
 * poor condition, what to do first — the rule is stated in the report so the
 * owner can disagree with it. A generated document that reasons silently is one
 * nobody can check.
 */
import type { PropertyDetail } from './propertyReportData.ts';
import type { PropertyEvidence } from './propertyReportRules.ts';
import { buildCapitalPlan, type PlanInput, type CapitalPlan } from './capitalPlanRules.ts';

export interface Block {
  t: 'h2' | 'h3' | 'p' | 'bullets' | 'numbers' | 'checks' | 'callout' | 'table' | 'fields' | 'rule' | 'break';
  text?: string;
  items?: string[];
  heading?: string;
  body?: string;
  head?: string[];
  rows?: string[][];
  pairs?: Array<[string, string]>;
}

export interface Chapter {
  title: string;
  blocks: Block[];
}

export interface Report {
  title: string;
  subtitle: string;
  /** Shown under the title: the property and when it was produced. */
  meta: Array<[string, string]>;
  chapters: Chapter[];
}

/**
 * Condition words, ranked.
 *
 * The inspection form writes a free string, and `readAreas` defaults it to
 * "Good". Ranking them is a judgement, so the report prints this scale rather
 * than applying it invisibly.
 */
const RANK: Record<string, number> = {
  excellent: 4, good: 3, fair: 2, poor: 1, failed: 0, unsafe: 0,
};

function rankOf(condition: string): number {
  const key = String(condition || '').trim().toLowerCase();
  // Unknown words sit above poor and below good: an unrecognised condition must
  // not quietly become the worst thing in the building, nor the best.
  return key in RANK ? RANK[key] : 2.5;
}

const dateOf = (iso: string) => String(iso || '').slice(0, 10) || 'undated';

/** The newest assessment of each distinct area. */
function latestByArea(detail: PropertyDetail) {
  const byName = new Map<string, PropertyDetail['areas'][number]>();
  for (const area of detail.areas) {
    const key = area.name.toLowerCase();
    const held = byName.get(key);
    // areas arrive newest-inspection-first, so the first sighting wins.
    if (!held) byName.set(key, area);
  }
  return [...byName.values()].sort((a, b) => rankOf(a.condition) - rankOf(b.condition));
}

export function propertyHealthReport(detail: PropertyDetail, evidence: PropertyEvidence, now = new Date()): Report {
  const property = detail.property || {};
  const areas = latestByArea(detail);
  const needsWork = areas.filter((a) => rankOf(a.condition) <= 2);
  const worst = areas.filter((a) => rankOf(a.condition) <= 1);
  const completedJobs = detail.jobs.filter((j) => ['completed', 'complete', 'closed'].includes(String(j?.status || '').toLowerCase()));
  const openJobs = detail.jobs.filter((j) => !['completed', 'complete', 'closed', 'cancelled'].includes(String(j?.status || '').toLowerCase()));
  const lastInspected = dateOf(detail.inspections[0]?.completedAt || detail.inspections[0]?.startedAt);

  const chapters: Chapter[] = [];

  /* ── What this says, in one page ──────────────────────────────────────── */
  chapters.push({
    title: 'Where this property stands',
    blocks: [
      {
        t: 'p',
        text: `This report is built from ${evidence.completedInspections === 1 ? 'the one completed inspection' : `${evidence.completedInspections} completed inspections`} of this property, `
          + `${evidence.distinctAreas} ${evidence.distinctAreas === 1 ? 'area' : 'areas'} assessed, `
          + `${detail.jobs.length} ${detail.jobs.length === 1 ? 'job' : 'jobs'} on record`
          + `${evidence.conditionsReports ? ` and ${evidence.conditionsReports} tenancy conditions ${evidence.conditionsReports === 1 ? 'report' : 'reports'}` : ''}. `
          + `The most recent inspection was ${lastInspected}. Nothing in it is estimated — every line comes from one of those records.`,
      },
      {
        t: 'fields',
        pairs: [
          ['Property', String(property.name || property.address || 'this property')],
          ['Address', String(property.address || 'not recorded')],
          ['Units', evidence.units ? String(evidence.units) : 'not recorded'],
          ['Built', evidence.yearBuilt ? String(evidence.yearBuilt) : 'not recorded'],
          ['Last inspected', lastInspected],
          ['Areas assessed', String(evidence.distinctAreas)],
        ],
      },
      {
        t: 'callout',
        heading: worst.length
          ? `${worst.length} ${worst.length === 1 ? 'area needs' : 'areas need'} attention now`
          : needsWork.length
            ? `${needsWork.length} ${needsWork.length === 1 ? 'area is' : 'areas are'} worth planning for`
            : 'Nothing inspected is in poor condition',
        body: worst.length
          ? `${worst.map((a) => a.name).join(', ')} ${worst.length === 1 ? 'was' : 'were'} assessed at the bottom of the scale. Those are the lines to read first.`
          : needsWork.length
            ? `${needsWork.map((a) => a.name).join(', ')} came back fair rather than good. None is urgent; all are cheaper to deal with before they are.`
            : 'Every area assessed came back good or better. That is worth knowing with the same confidence as a problem would be.',
      },
    ],
  });

  /* ── Condition, area by area ──────────────────────────────────────────── */
  chapters.push({
    title: 'Condition, area by area',
    blocks: [
      {
        t: 'p',
        text: 'Worst first, because that is the order the work should be read in. Where an area was inspected more than once, this is the most recent assessment.',
      },
      {
        t: 'table',
        head: ['Area', 'Condition', 'Inspected', 'What was noted'],
        rows: areas.map((a) => [a.name, a.condition, a.inspectedAt, a.notes || '—']),
      },
      {
        t: 'p',
        text: 'The scale is Excellent, Good, Fair, Poor, Failed. A condition word we do not recognise is treated as between Fair and Good rather than as the worst thing in the building — if one of these looks wrong, the inspection record is what to correct.',
      },
    ],
  });

  /* ── What is still open ───────────────────────────────────────────────── */
  const openBlocks: Block[] = [];
  if (detail.openItems.length) {
    openBlocks.push({ t: 'p', text: `${detail.openItems.length} ${detail.openItems.length === 1 ? 'item' : 'items'} found during inspection ${detail.openItems.length === 1 ? 'has' : 'have'} not been closed off.` });
    openBlocks.push({
      t: 'table',
      head: ['Area', 'Finding', 'Found'],
      rows: detail.openItems.map((i) => [i.area || '—', i.what || '—', i.inspectedAt]),
    });
  } else {
    openBlocks.push({ t: 'p', text: 'No inspection finding is still open. Everything raised during a walk-through has been closed off.' });
  }
  if (openJobs.length) {
    openBlocks.push({ t: 'h3', text: 'Work requested and not yet finished' });
    openBlocks.push({
      t: 'table',
      head: ['Requested', 'What', 'State'],
      rows: openJobs.slice(0, 40).map((j) => [dateOf(j?.createdAt), String(j?.title || j?.description || '—').slice(0, 120), String(j?.status || 'open')]),
    });
  }
  chapters.push({ title: 'What is still open', blocks: openBlocks });

  /* ── What has been done ──────────────────────────────────────────────── */
  chapters.push({
    title: 'What has been done to this property',
    blocks: completedJobs.length
      ? [
        { t: 'p', text: `${completedJobs.length} ${completedJobs.length === 1 ? 'job has' : 'jobs have'} been completed here. This is the maintenance history a buyer, an insurer or a lender will ask for.` },
        {
          t: 'table',
          head: ['Completed', 'What was done'],
          rows: completedJobs.slice(0, 60).map((j) => [dateOf(j?.completedAt || j?.updatedAt || j?.createdAt), String(j?.title || j?.description || '—').slice(0, 140)]),
        },
      ]
      : [{ t: 'p', text: 'No completed work is recorded against this property yet. That is not the same as nothing having been done — it means nothing has been done through us, so this report cannot evidence it.' }],
  });

  /* ── What to do next ─────────────────────────────────────────────────── */
  const next: string[] = [];
  for (const area of worst) next.push(`${area.name} — assessed ${area.condition.toLowerCase()}. ${area.notes || 'No note was left, so start by looking at it again.'}`);
  for (const item of detail.openItems.slice(0, 6)) next.push(`${item.area || 'Open finding'} — ${item.what || 'no detail recorded'} (found ${item.inspectedAt})`);
  if (needsWork.length && !worst.length) {
    for (const area of needsWork.slice(0, 5)) next.push(`${area.name} — fair rather than good. Cheaper to plan than to react to.`);
  }

  chapters.push({
    title: 'What to do next',
    blocks: [
      {
        t: 'p',
        text: next.length
          ? 'In the order this report would do them: anything assessed at the bottom of the scale, then open findings oldest first.'
          : 'Nothing here is urgent. The useful next step is the one below.',
      },
      ...(next.length ? [{ t: 'numbers' as const, items: next.slice(0, 12) }] : []),
      {
        t: 'callout',
        heading: 'What would make the next one of these better',
        /**
         * Ten is the switch, not twelve.
         *
         * The gate already requires eight distinct areas, so a report that
         * exists has had a real walk-through. Telling the owner of a ten-area
         * inspection to "get a fuller inspection" reads as a sales line and
         * ignores what they just did. Below ten there genuinely is coverage
         * missing; at ten and above the useful advice is a second look next
         * year, because one inspection says what condition things are in and
         * two say which way they are moving.
         */
        body: areas.length < 10
          ? `This report covers ${areas.length} ${areas.length === 1 ? 'area' : 'areas'}. A fuller inspection makes every section of it sharper, and it is the one thing that changes what this document can tell you.`
          : 'The strongest thing you can add is a second inspection in twelve months. One inspection says what condition things are in; two say which way they are moving, which is what actually predicts cost.',
      },
    ],
  });

  return {
    title: 'Property Health Report',
    subtitle: String(property.name || property.address || 'Your property'),
    meta: [
      ['Property', String(property.name || property.address || '—')],
      ['Produced', now.toISOString().slice(0, 10)],
      ['Built from', `${evidence.completedInspections} completed ${evidence.completedInspections === 1 ? 'inspection' : 'inspections'}, ${evidence.distinctAreas} areas, ${detail.jobs.length} jobs`],
    ],
    chapters,
  };
}

/* ───────────────────────────────────────────────────────────────────────────
 * The 10-Year Capital Plan
 * ─────────────────────────────────────────────────────────────────────────── */

const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * Condition by inspected area, lower-cased, newest assessment winning.
 *
 * The capital plan matches components to areas by keyword, so what it needs is
 * a flat map rather than the inspection structure.
 */
export function conditionsFrom(detail: PropertyDetail): Record<string, string> {
  const out: Record<string, string> = {};
  for (const area of detail.areas) {
    const key = area.name.toLowerCase();
    if (!(key in out)) out[key] = area.condition;
  }
  return out;
}

export function capitalPlanReport(
  detail: PropertyDetail,
  evidence: PropertyEvidence,
  rates: PlanInput['rates'],
  settings: PlanInput['settings'],
  ratesAreOurs: boolean,
  now = new Date(),
): Report {
  const property = detail.property || {};
  const thisYear = now.getFullYear();
  const age = thisYear - (evidence.yearBuilt || thisYear);
  const plan: CapitalPlan = buildCapitalPlan({
    property: {
      units: Number(property.units) || 1,
      squareFootage: Number(property.squareFootage) || 0,
      bathrooms: Number(property.bathrooms) || 0,
      yearBuilt: evidence.yearBuilt,
    },
    conditions: conditionsFrom(detail),
    rates,
    settings,
    thisYear,
  });

  const chapters: Chapter[] = [];

  /* ── What it is built on ──────────────────────────────────────────────── */
  chapters.push({
    title: 'What this plan is built on',
    blocks: [
      {
        t: 'p',
        text: 'Every component this property is likely to replace, when it is likely to need replacing, and what that will cost — priced through our own trade rates rather than a national average. '
          + `The building was put up in ${evidence.yearBuilt}, which makes it ${age} years old.`,
      },
      {
        t: 'fields',
        pairs: [
          ['Property', String(property.name || property.address || '—')],
          ['Built', String(evidence.yearBuilt)],
          ['Units', String(Number(property.units) || 1)],
          ['Floor area', Number(property.squareFootage)
            ? `${Number(property.squareFootage).toLocaleString('en-US')} sq ft`
            : 'not recorded — the sizes below are derived from the unit count'],
          ['Components planned', String(plan.components.length)],
          ['Inspected', `${plan.seenCount} of ${plan.components.length} confirmed by inspection`],
        ],
      },
      {
        t: 'callout',
        heading: `${plan.seenCount} lines were seen, ${plan.assumedCount} are assumed from the building's age`,
        body: 'Nothing on record says when each component was last replaced, so each one starts as old as the building and only an inspection moves it. '
          + 'Every line below is marked accordingly. Where a component has been replaced and we were not told, its real remaining life is longer than this plan shows — '
          + 'tell us the year and the plan changes.',
      },
    ],
  });

  /* ── The next ten years ───────────────────────────────────────────────── */
  chapters.push({
    title: 'The next ten years, year by year',
    blocks: plan.byYear.length
      ? [
        { t: 'p', text: `${dollars(plan.tenYearTotal)} falls due across the next ten years, at today's prices grown three per cent a year. Years with nothing due are left out.` },
        {
          t: 'table',
          head: ['Year', 'What is due', 'Cost'],
          rows: plan.byYear.map((y) => [String(y.year), y.items.join(', '), dollars(y.total)]),
        },
        {
          t: 'callout',
          heading: `Set aside ${dollars(plan.monthlyReserve)} a month`,
          body: `That is ${dollars(plan.tenYearTotal)} spread across ten years, rounded up to the nearest ten dollars. `
            + 'A monthly figure is a decision somebody can act on; an annual total is a figure people argue with.',
        },
      ]
      : [{ t: 'p', text: 'Nothing is due within the next ten years on this plan. Every component is either recently replaced or has life left beyond the window, and the full schedule below shows when each one lands.' }],
  });

  /* ── Every component ──────────────────────────────────────────────────── */
  chapters.push({
    title: 'Every component, and when it lands',
    blocks: [
      {
        t: 'p',
        text: 'Soonest first. "Seen" means an inspection looked at it; "assumed" means its age is the building’s age, because nothing has looked yet.'
          + (plan.overdueCount
            ? ' ' + plan.overdueCount + (plan.overdueCount === 1 ? ' component is' : ' components are')
              + ' already past their nominal life, so the plan sequences them across the first five years rather than stacking them into one year'
              + ' — safety first, then what was inspected and found worst, then the building envelope.'
            : ''),
      },
      {
        t: 'table',
        head: ['Component', 'Qty', 'Life', 'Age', 'Left', 'Due', 'Cost today', 'When due', 'Basis'],
        rows: plan.components.map((c) => [
          c.name,
          `${c.quantity.toLocaleString('en-US')} ${c.unit}`,
          `${c.usefulLife}y`,
          `${c.effectiveAge}y`,
          `${c.remainingLife}y`,
          String(c.scheduledYear || c.dueYear),
          dollars(c.costToday),
          dollars(c.costWhenDue),
          c.basisOfAge === 'seen' ? `Seen — ${c.condition}` : 'Assumed',
        ]),
      },
    ],
  });

  /* ── Why each line says what it says ─────────────────────────────────── */
  chapters.push({
    title: 'Why each line says what it says',
    blocks: [
      { t: 'p', text: 'The reasoning behind every remaining life, so you can disagree with a specific line rather than with the plan.' },
      { t: 'bullets', items: plan.components.map((c) => `${c.name} — ${c.note}`) },
    ],
  });

  /* ── How it was costed ───────────────────────────────────────────────── */
  chapters.push({
    title: 'How these costs were worked out',
    blocks: [
      {
        t: 'p',
        text: ratesAreOurs
          ? 'Each line is our own hourly rate for the trade, times the hours the work takes, plus materials at our own markup, plus the overhead and profit our quotes carry. These are the rates our crews are billed out at — corrected against jobs we have actually finished, not taken from a national table.'
          : 'Each line is our standard rate for the trade, times the hours the work takes, plus materials at our standard markup, plus overhead and profit. No custom rates have been published for this account yet, so these are our published standards rather than figures corrected against finished jobs.',
      },
      {
        t: 'table',
        head: ['Component', 'Hours', 'Rate', 'Labour', 'Materials', 'Quoted today'],
        rows: plan.components.map((c) => [
          c.name,
          String(c.labourHours),
          `${dollars(c.hourlyRate)}/hr`,
          dollars(c.labourCost),
          dollars(c.materialCost),
          dollars(c.costToday),
        ]),
      },
      {
        t: 'p',
        text: `Materials carry our category markup, then ${settings.overheadPercentage} per cent overhead and ${settings.profitMargin} per cent profit — the same arithmetic as a quote for the work, so a line here and a quote for that line will not disagree. New Hampshire has no sales tax, so there is no tax line.`,
      },
      {
        t: 'callout',
        heading: 'What this plan is not',
        body: 'It is not a quote, and it is not an engineer’s condition survey. It is what the work would cost at our rates if it were done today, and when the arithmetic says it is likely to be needed. '
          + 'Ask us to quote any line and the figure will be built from these same rates, against the actual component rather than its category.',
      },
    ],
  });

  return {
    title: '10-Year Capital Plan',
    subtitle: String(property.name || property.address || 'Your property'),
    meta: [
      ['Property', String(property.name || property.address || '—')],
      ['Produced', now.toISOString().slice(0, 10)],
      ['Basis', `${plan.seenCount} inspected, ${plan.assumedCount} from the building's age`],
      ['Ten-year total', dollars(plan.tenYearTotal)],
    ],
    chapters,
  };
}
