/**
 * Turning what somebody knows about a job into context an estimator can use.
 *
 * WHY THIS IS NOT A WIDER `EstimatorInput`
 *
 * `runEstimator` takes six fields and an `extra` block of free text. The
 * obvious move was to add fifteen named fields to that type — and it would have
 * meant the prompt builder, the heuristic fallback and the repricer each
 * learning about every one of them. `extra` is already how blueprint analysis
 * reaches the model, so it is the established seam, and composing into it keeps
 * the engine's contract exactly as it is.
 *
 * THE TWO RULES THAT MATTER
 *
 * **A field nobody filled in is absent, not "unknown".** Sending
 * `Ceiling height: unknown` tells a model something about the job: that
 * somebody looked and could not say. Omitting the line tells it nothing, which
 * is the truth. An estimator that reasons from invented absences produces
 * numbers nobody can account for.
 *
 * **The brief goes in verbatim.** It is the part only the person who saw the
 * job can supply — "the frame is pressure-treated, the footings are sound, the
 * slider is being replaced at the same time" — and summarising it before the
 * model sees it loses exactly the detail that was worth typing. So it is
 * passed through untouched, with only a length ceiling, and it is placed last
 * where a model weights it most heavily.
 *
 * WHY EXCLUSIONS ARE THEIR OWN FIELD
 *
 * Because "the customer is supplying the tile" buried in a paragraph gets
 * missed, and the resulting quote has to be corrected by hand afterwards.
 * Stated separately and phrased as an instruction, it is the difference between
 * a quote that can be sent and one that has to be read line by line first.
 */

export interface QuoteBriefInput {
  // The job
  serviceType?: string | null;
  propertyType?: string | null;
  /** New work, or replacing something that is already there. */
  workNature?: string | null;

  // The place
  unitCount?: number | string | null;
  storeys?: number | string | null;
  accessNotes?: string | null;

  // The size — the numbers a takeoff actually needs
  squareFootage?: number | string | null;
  linearFootage?: number | string | null;
  roomCount?: number | string | null;
  ceilingHeight?: number | string | null;

  // The conditions
  occupancy?: string | null;
  parking?: string | null;
  stairsOrLift?: string | null;
  workingHours?: string | null;

  // The timing
  urgency?: string | null;
  preferredWindow?: string | null;
  deadline?: string | null;

  // What the person actually wants, in their own words
  brief?: string | null;
  exclusions?: string | null;

  /** Prior machine analysis — blueprint or video. Kept for compatibility. */
  blueprintAnalysis?: any;
  aiVideoAnalysis?: any;
}

/** A brief may be long. This is a ceiling against accident, not a budget. */
export const BRIEF_MAX = 6000;
export const EXCLUSIONS_MAX = 2000;

const clean = (value: unknown, max = 300): string => {
  const s = String(value ?? '').trim();
  return s.slice(0, max);
};

/** A number only when it reads as one. `0` square feet is not a measurement. */
const measure = (value: unknown): string => {
  const n = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? String(n) : '';
};

interface Section {
  heading: string;
  lines: string[];
}

/**
 * Compose the context block.
 *
 * Sections appear in a fixed order so two estimates of similar jobs are
 * prompted alike — a model's output moves with the order of its input, and a
 * quote that changes because the fields were composed differently is a quote
 * nobody can reproduce. A section with no filled lines is dropped whole.
 */
export function composeEstimatorContext(input: QuoteBriefInput | null | undefined): string {
  if (!input) return '';
  const i = input;

  const sections: Section[] = [
    {
      heading: 'THE JOB',
      lines: [
        i.serviceType ? `Trade or service: ${clean(i.serviceType, 120)}` : '',
        i.propertyType ? `Property type: ${clean(i.propertyType, 120)}` : '',
        i.workNature ? `Nature of the work: ${clean(i.workNature, 200)}` : '',
      ],
    },
    {
      heading: 'THE PLACE',
      lines: [
        measure(i.unitCount) ? `Units covered: ${measure(i.unitCount)}` : '',
        measure(i.storeys) ? `Storeys: ${measure(i.storeys)}` : '',
        i.accessNotes ? `Access: ${clean(i.accessNotes, 500)}` : '',
      ],
    },
    {
      heading: 'THE SIZE',
      lines: [
        measure(i.squareFootage) ? `Square footage: ${measure(i.squareFootage)}` : '',
        measure(i.linearFootage) ? `Linear footage: ${measure(i.linearFootage)}` : '',
        measure(i.roomCount) ? `Rooms: ${measure(i.roomCount)}` : '',
        measure(i.ceilingHeight) ? `Ceiling height (ft): ${measure(i.ceilingHeight)}` : '',
      ],
    },
    {
      heading: 'THE CONDITIONS',
      lines: [
        i.occupancy ? `Occupancy: ${clean(i.occupancy, 120)}` : '',
        i.parking ? `Parking and staging: ${clean(i.parking, 300)}` : '',
        i.stairsOrLift ? `Stairs or lift: ${clean(i.stairsOrLift, 200)}` : '',
        i.workingHours ? `Working hours allowed: ${clean(i.workingHours, 200)}` : '',
      ],
    },
    {
      heading: 'THE TIMING',
      lines: [
        i.urgency ? `Urgency: ${clean(i.urgency, 120)}` : '',
        i.preferredWindow ? `Preferred window: ${clean(i.preferredWindow, 200)}` : '',
        i.deadline ? `Hard deadline: ${clean(i.deadline, 120)}` : '',
      ],
    },
  ];

  const blocks: string[] = [];

  for (const section of sections) {
    const lines = section.lines.filter(Boolean);
    if (lines.length) blocks.push([section.heading, ...lines].join('\n'));
  }

  // Prior machine analysis, kept in the shape the routes already emitted so a
  // blueprint-started quote reads the same as it did before.
  const analysis = i.blueprintAnalysis || i.aiVideoAnalysis;
  if (analysis) {
    const lines = ['Prior AI analysis available:'];
    if (analysis.rooms?.length) {
      const named = analysis.rooms.map((r: any) => r?.name || r?.type).filter(Boolean).join(', ');
      lines.push(`- Rooms: ${analysis.rooms.length}${named ? ` (${named})` : ''}`);
    }
    const sqft = analysis.squareFootage || analysis.totalSquareFootage;
    if (sqft) lines.push(`- Square footage: ${sqft}`);
    if (Array.isArray(analysis.materials) && analysis.materials.length) {
      lines.push(`- AI-suggested material groups: ${analysis.materials.length}`);
    }
    const prior = analysis.estimatedCosts?.total || analysis.costEstimates?.total;
    if (prior) lines.push(`- Prior cost estimate: ${Number(prior).toLocaleString()}`);
    blocks.push(lines.join('\n'));
  }

  // The brief, verbatim and late. Delimited so a model does not read the next
  // heading as part of it, and so a brief containing its own headings cannot
  // be mistaken for structure we added.
  const brief = clean(i.brief, BRIEF_MAX);
  if (brief) {
    blocks.push([
      'WHAT THE CONTRACTOR WANTS, IN THEIR OWN WORDS',
      'Treat this as the most authoritative description of the job. Where it',
      'conflicts with anything above, follow this.',
      '---',
      brief,
      '---',
    ].join('\n'));
  }

  // Exclusions last, phrased as an instruction rather than a note.
  const exclusions = clean(i.exclusions, EXCLUSIONS_MAX);
  if (exclusions) {
    blocks.push([
      'EXCLUDE FROM THIS ESTIMATE',
      'Do not price these, do not list them as materials or labour, and do not',
      'add them as assumptions:',
      '---',
      exclusions,
      '---',
    ].join('\n'));
  }

  return blocks.join('\n\n');
}
