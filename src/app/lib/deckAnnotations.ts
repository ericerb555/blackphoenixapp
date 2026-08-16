/**
 * Callouts and dimensions for the framing drawing.
 *
 * Derived from the model and the build specification — never typed separately.
 * The whole point of one model driving every view is that the drawing and the
 * fastener schedule cannot disagree, and hand-lettering "2x10 @ 16 o.c." onto a
 * drawing is exactly how they start to.
 *
 * A framing plan a town will accept has to say what every member is, how far
 * apart, what connects it, and what size fastener. This produces those callouts
 * for the specific deck, at code spacing, so an inspector can check the drawing
 * against what was built.
 */
import type { DeckModel } from './deckModel';
import { takeoff, LUMBER_ACTUAL, IN } from './deckModel';
import { buildSpec } from './deckBuildSpec';

export interface DimLine {
  /** Both points at deck level; the renderer flattens them for plan view. */
  from: [number, number, number];
  to: [number, number, number];
  label: string;
  /** Which way the extension ticks point. */
  axis: 'x' | 'z';
}

export interface Callout {
  /** The member being pointed at. */
  target: [number, number, number];
  /** Where the text sits. */
  at: [number, number, number];
  lines: string[];
}

export interface Annotations {
  dimensions: DimLine[];
  callouts: Callout[];
  /** General notes that belong on the sheet rather than pointing at anything. */
  notes: string[];
}

export function buildAnnotations(m: DeckModel): Annotations {
  const bom = takeoff(m);
  const spec = buildSpec(m);
  const halfW = m.widthFt / 2;
  const y = m.heightFt;

  // Pull the ledger fastener line straight out of the spec so the drawing
  // quotes the same spacing the schedule does.
  const ledgerFastener = spec.fasteners.find(f => /lag|bolt/i.test(f.item));
  const hanger = spec.fasteners.find(f => /hanger/i.test(f.item));
  const postCap = spec.fasteners.find(f => /cap/i.test(f.item));
  const postBase = spec.fasteners.find(f => /base/i.test(f.item));

  const beamW = IN(LUMBER_ACTUAL[m.beamSize].w) * m.beamPlies;
  const beamZ = m.depthFt - m.cantileverFt - beamW / 2;

  const dimensions: DimLine[] = [
    {
      from: [-halfW, y, m.depthFt + 2.5], to: [halfW, y, m.depthFt + 2.5],
      label: `${m.widthFt}'-0"`, axis: 'x',
    },
    {
      from: [halfW + 2.5, y, 0], to: [halfW + 2.5, y, m.depthFt],
      label: `${m.depthFt}'-0"`, axis: 'z',
    },
    {
      from: [-halfW - 2.5, y, 0], to: [-halfW - 2.5, y, beamZ],
      label: `${bom.joistSpanFt}'-0" joist span`, axis: 'z',
    },
  ];

  if (m.cantileverFt > 0) {
    dimensions.push({
      from: [-halfW - 2.5, y, beamZ], to: [-halfW - 2.5, y, m.depthFt],
      label: `${m.cantileverFt}'-0" cant.`, axis: 'z',
    });
  }

  // Post spacing, called out between the first two posts — the pattern is
  // typical, so dimensioning every bay just crowds the drawing.
  const postCount = Math.max(2, Math.round(m.widthFt / m.postSpacingFt) + 1);
  if (postCount > 1) {
    const bay = m.widthFt / (postCount - 1);
    dimensions.push({
      from: [-halfW, y, beamZ - 2], to: [-halfW + bay, y, beamZ - 2],
      label: `${Math.round(bay * 12) / 12}' typ.`, axis: 'x',
    });
  }

  const callouts: Callout[] = [];

  if (m.ledgerAttached) {
    callouts.push({
      target: [0, y, 0.2],
      at: [-halfW - 5, y, -1.5],
      lines: [
        `${m.joistSize} P.T. LEDGER`,
        ledgerFastener ? `${ledgerFastener.item.replace(' hot-dip galvanised', ' HDG')}` : 'FASTENERS PER ENGINEER',
        ledgerFastener ? ledgerFastener.where.replace('Ledger to house band joist, ', '') : '',
        'CONT. FLASHING OVER LEDGER',
      ].filter(Boolean),
    });
    callouts.push({
      target: [halfW * 0.7, y, 0.2],
      at: [halfW + 5, y, -1.5],
      lines: ['(2) LATERAL HOLD-DOWNS MIN.', '750 LB EA. — IRC R507.9.2'],
    });
  }

  callouts.push({
    target: [halfW * 0.35, y, m.depthFt * 0.5],
    at: [halfW + 5, y, m.depthFt * 0.45],
    lines: [
      `${bom.joistSize} P.T. JOISTS`,
      `@ ${bom.joistSpacing}" O.C.`,
      hanger ? 'GALV. JOIST HANGER EA. END' : '',
      'FILL ALL HANGER NAIL HOLES',
    ].filter(Boolean),
  });

  callouts.push({
    target: [-halfW * 0.35, y, beamZ],
    at: [-halfW - 5, y, m.depthFt * 0.62],
    lines: [
      `${bom.beam} P.T. BUILT-UP BEAM`,
      'PLIES FASTENED PER SPEC',
      'SPLICES OVER POSTS ONLY',
    ],
  });

  callouts.push({
    target: [halfW * 0.6, y, beamZ],
    at: [halfW + 5, y, m.depthFt + 1.5],
    lines: [
      `${bom.posts} — ${m.postSize} P.T. POSTS @ ${m.postSpacingFt}' O.C.`,
      postCap ? 'GALV. POST CAP TO BEAM' : '',
      postBase ? 'GALV. POST BASE W/ STANDOFF' : '',
      'POSTS BEAR ON FOOTING',
    ].filter(Boolean),
  });

  callouts.push({
    target: [-halfW * 0.6, y, beamZ],
    at: [-halfW - 5, y, m.depthFt + 1.5],
    lines: [
      `${bom.footings} FOOTINGS — 1 PER POST`,
      'BELOW FROST LINE',
      'SIZE PER STRUCTURAL SHEET',
    ],
  });

  callouts.push({
    target: [0, y, m.depthFt - 0.2],
    at: [0, y, m.depthFt + 4.5],
    lines: [`${m.joistSize} P.T. RIM JOIST`],
  });

  const notes = [
    'ALL FRAMING LUMBER PRESSURE-TREATED.',
    'POSTS AND MEMBERS WITHIN 6" OF GRADE RATED FOR GROUND CONTACT.',
    'ALL FASTENERS AND CONNECTORS HOT-DIP GALVANISED OR STAINLESS.',
    'DECKING, GUARD AND STAIRS OMITTED FROM THIS VIEW FOR CLARITY.',
    ...(spec.engineerRequired.length
      ? ['THIS DESIGN EXCEEDS PRESCRIPTIVE TABLES — ENGINEERED DESIGN REQUIRED.']
      : []),
  ];

  return { dimensions, callouts, notes };
}
