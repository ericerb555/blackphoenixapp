/**
 * The structural model a deck is drawn from.
 *
 * One model, three views. The 3D view, the framing plan and the dimensioned 2D
 * plan are all generated from these same members — so a joist that moves in one
 * moves in all of them, and the framing plan can never disagree with the picture
 * the customer approved. Drawing each view separately is how a set ends up
 * internally inconsistent, which is exactly what a plans examiner looks for.
 *
 * Everything is in FEET internally, because that is how decks are specified and
 * how span tables are published. Lumber dimensions are the only exception and
 * are handled in inches, since 2x8 is a name rather than a measurement.
 */

export type LumberSize = '2x6' | '2x8' | '2x10' | '2x12';
export type PostSize = '4x4' | '6x6';
export type JoistSpacing = 12 | 16 | 24;

/** Actual dressed lumber dimensions in inches — a 2x8 is really 1.5 x 7.25. */
export const LUMBER_ACTUAL: Record<string, { w: number; h: number }> = {
  '2x6': { w: 1.5, h: 5.5 },
  '2x8': { w: 1.5, h: 7.25 },
  '2x10': { w: 1.5, h: 9.25 },
  '2x12': { w: 1.5, h: 11.25 },
  '4x4': { w: 3.5, h: 3.5 },
  '6x6': { w: 5.5, h: 5.5 },
};

export const IN = (inches: number) => inches / 12;

export interface DeckModel {
  /** Along the house wall. */
  widthFt: number;
  /** Out from the house. */
  depthFt: number;
  /** Deck surface height above grade. */
  heightFt: number;

  joistSize: LumberSize;
  joistSpacing: JoistSpacing;
  /** Beam is built up from this many plies of this size. */
  beamSize: LumberSize;
  beamPlies: number;
  postSize: PostSize;
  /** Centre-to-centre spacing of posts along the beam. */
  postSpacingFt: number;

  /** Ledger-attached to the house, or free-standing on its own posts. */
  ledgerAttached: boolean;
  /** How far the joists cantilever past the beam. */
  cantileverFt: number;

  deckingDirection: 'parallel' | 'perpendicular';
  guardrail: boolean;
  stairs: boolean;
  stairWidthFt: number;
}

export const DEFAULT_DECK: DeckModel = {
  widthFt: 16,
  depthFt: 12,
  heightFt: 3,
  joistSize: '2x10',
  joistSpacing: 16,
  beamSize: '2x10',
  beamPlies: 2,
  postSize: '6x6',
  postSpacingFt: 6,
  ledgerAttached: true,
  cantileverFt: 1,
  deckingDirection: 'parallel',
  guardrail: true,
  stairs: true,
  stairWidthFt: 4,
};

/** A single physical piece of lumber, positioned in world space. */
export interface Member {
  id: string;
  kind: 'ledger' | 'joist' | 'rim' | 'beam' | 'post' | 'decking' | 'footing' | 'rail' | 'stair';
  /** Centre position, feet. x = along house, y = up, z = out from house. */
  pos: [number, number, number];
  /** Size in feet. */
  size: [number, number, number];
  label?: string;
}

/**
 * Expand the model into the actual pieces of lumber.
 *
 * This is the single place framing is decided. Every view renders whatever this
 * returns, so none of them can drift from the others.
 *
 * Origin is the middle of the house wall at grade: x runs along the wall, z runs
 * out from the house, y is up.
 */
export function buildMembers(m: DeckModel): Member[] {
  const out: Member[] = [];
  const joist = LUMBER_ACTUAL[m.joistSize];
  const beam = LUMBER_ACTUAL[m.beamSize];
  const post = LUMBER_ACTUAL[m.postSize];

  const joistH = IN(joist.h);
  const joistW = IN(joist.w);
  const beamH = IN(beam.h);
  const beamW = IN(beam.w) * m.beamPlies;
  const postW = IN(post.w);
  const deckingT = IN(1);

  // Top of joists sits one decking thickness below the walking surface.
  const joistTop = m.heightFt - deckingT;
  const joistCentreY = joistTop - joistH / 2;

  const halfW = m.widthFt / 2;

  // Ledger against the house (only when attached).
  if (m.ledgerAttached) {
    out.push({
      id: 'ledger',
      kind: 'ledger',
      pos: [0, joistCentreY, joistW / 2],
      size: [m.widthFt, joistH, joistW],
      label: `${m.joistSize} ledger — lag or through-bolt to rim per code`,
    });
  }

  // Beam carries the joists, set back from the outer edge by the cantilever.
  const beamZ = m.depthFt - m.cantileverFt - beamW / 2;
  out.push({
    id: 'beam',
    kind: 'beam',
    pos: [0, joistCentreY - joistH / 2 - beamH / 2, beamZ],
    size: [m.widthFt, beamH, beamW],
    label: `(${m.beamPlies}) ${m.beamSize} built-up beam`,
  });

  // Posts under the beam, and a footing under each post.
  const beamTopY = joistCentreY - joistH / 2;
  const postTopY = beamTopY - beamH;
  const postCount = Math.max(2, Math.round(m.widthFt / m.postSpacingFt) + 1);
  for (let i = 0; i < postCount; i++) {
    const x = -halfW + (m.widthFt * i) / (postCount - 1);
    // Keep the end posts inboard of the beam end so they are not hanging off it.
    const px = Math.max(-halfW + postW / 2, Math.min(halfW - postW / 2, x));
    out.push({
      id: `post-${i}`,
      kind: 'post',
      pos: [px, postTopY / 2, beamZ],
      size: [postW, postTopY, postW],
      label: `${m.postSize} post`,
    });
    out.push({
      id: `footing-${i}`,
      kind: 'footing',
      pos: [px, -0.5, beamZ],
      size: [1.5, 1, 1.5],
      label: 'Footing — size per soil + snow load',
    });
  }

  // Joists spanning house to beam, at the specified spacing.
  const spacingFt = m.joistSpacing / 12;
  const joistCount = Math.floor(m.widthFt / spacingFt) + 1;
  for (let i = 0; i < joistCount; i++) {
    const x = -halfW + i * spacingFt;
    if (x > halfW + 0.01) break;
    out.push({
      id: `joist-${i}`,
      kind: 'joist',
      pos: [Math.min(x, halfW - joistW / 2), joistCentreY, m.depthFt / 2],
      size: [joistW, joistH, m.depthFt],
      label: i === 0 ? `${m.joistSize} @ ${m.joistSpacing}" o.c.` : undefined,
    });
  }

  // Rim joist closing the outer edge.
  out.push({
    id: 'rim',
    kind: 'rim',
    pos: [0, joistCentreY, m.depthFt - joistW / 2],
    size: [m.widthFt, joistH, joistW],
    label: `${m.joistSize} rim joist`,
  });

  // Decking boards.
  const boardW = IN(5.5);
  const gap = IN(0.25);
  if (m.deckingDirection === 'parallel') {
    const rows = Math.ceil(m.depthFt / (boardW + gap));
    for (let i = 0; i < rows; i++) {
      const z = i * (boardW + gap) + boardW / 2;
      if (z > m.depthFt) break;
      out.push({ id: `deck-${i}`, kind: 'decking', pos: [0, m.heightFt - deckingT / 2, z], size: [m.widthFt, deckingT, boardW] });
    }
  } else {
    const cols = Math.ceil(m.widthFt / (boardW + gap));
    for (let i = 0; i < cols; i++) {
      const x = -halfW + i * (boardW + gap) + boardW / 2;
      if (x > halfW) break;
      out.push({ id: `deck-${i}`, kind: 'decking', pos: [x, m.heightFt - deckingT / 2, m.depthFt / 2], size: [boardW, deckingT, m.depthFt] });
    }
  }

  // Guardrail — required by code above 30in, but drawn whenever asked for.
  //
  // Built out of the pieces a railing is actually made of: posts, a top and
  // bottom rail between them, and balusters. It used to be three solid slabs
  // the full height and length of each side, which is not a guardrail — it is a
  // parapet wall, and it read that way in every rendering and every plan.
  //
  // Baluster spacing is the code rule rather than a look: R312.1.3 says a 4in
  // sphere must not pass through, so with 1.5in stock the centres have to stay
  // under 5.5in. Posts follow the usual 6ft maximum.
  if (m.guardrail) {
    const railH = IN(36);          // top of rail above the deck surface
    const postSq = IN(3.5);        // 4x4 nominal
    const balSq = IN(1.5);         // 2x2 nominal
    const railTh = IN(1.5);
    const deckY = m.heightFt;
    const MAX_BAL_SPACING = IN(5.5);
    const MAX_POST_SPACING = 6;

    /** One run of railing between two points along a straight side. */
    const run = (
      id: string,
      from: [number, number],   // x,z
      to: [number, number],
      ) => {
      const dx = to[0] - from[0];
      const dz = to[1] - from[1];
      const len = Math.hypot(dx, dz);
      if (len < 0.5) return;
      const along = len;
      const horizontal = Math.abs(dx) > Math.abs(dz);

      // Posts, evenly divided so no bay exceeds the maximum.
      const bays = Math.max(1, Math.ceil(along / MAX_POST_SPACING));
      for (let i = 0; i <= bays; i++) {
        const t = i / bays;
        const x = from[0] + dx * t;
        const z = from[1] + dz * t;
        out.push({
          id: `${id}-post-${i}`, kind: 'rail',
          pos: [x, deckY + railH / 2, z],
          size: [postSq, railH, postSq],
        });
      }

      // Top and bottom rails, and the balusters between them.
      const railW = horizontal ? along : railTh;
      const railD = horizontal ? railTh : along;
      const cx = (from[0] + to[0]) / 2;
      const cz = (from[1] + to[1]) / 2;

      out.push({
        id: `${id}-top`, kind: 'rail',
        pos: [cx, deckY + railH - IN(0.75), cz],
        size: [railW, IN(1.5), railD],
      });
      out.push({
        id: `${id}-bottom`, kind: 'rail',
        pos: [cx, deckY + IN(3.75), cz],
        size: [railW, IN(1.5), railD],
      });

      const balCount = Math.max(1, Math.ceil(along / MAX_BAL_SPACING) - 1);
      const balH = railH - IN(6);
      for (let i = 1; i <= balCount; i++) {
        const t = i / (balCount + 1);
        const x = from[0] + dx * t;
        const z = from[1] + dz * t;
        out.push({
          id: `${id}-bal-${i}`, kind: 'rail',
          pos: [x, deckY + IN(4.5) + balH / 2, z],
          size: [balSq, balH, balSq],
        });
      }
    };

    run('rail-out', [-halfW, m.depthFt], [halfW, m.depthFt]);
    run('rail-l', [-halfW, 0], [-halfW, m.depthFt]);
    run('rail-r', [halfW, 0], [halfW, m.depthFt]);
  }

  // Stairs — one tread per riser, stepping down and out from the deck edge.
  if (m.stairs) {
    const riser = IN(7);
    const tread = IN(11);
    const steps = Math.max(1, Math.round(m.heightFt / riser));
    for (let i = 0; i < steps; i++) {
      out.push({
        id: `stair-${i}`,
        kind: 'stair',
        pos: [halfW - m.stairWidthFt / 2, m.heightFt - riser * (i + 1), m.depthFt + tread * (i + 0.5)],
        size: [m.stairWidthFt, IN(1), tread],
      });
    }
  }

  return out;
}

/** Colours by member kind, shared by every view so nothing is colour-coded twice. */
export const MEMBER_COLOR: Record<Member['kind'], string> = {
  ledger: '#8a5a2b',
  joist: '#b07840',
  rim: '#8a5a2b',
  beam: '#6b4423',
  post: '#5a3818',
  decking: '#c89860',
  footing: '#9ca3af',
  rail: '#a06a35',
  stair: '#c89860',
};

/** What the framing view shows — decking and rails hide the structure. */
export const STRUCTURAL_KINDS: Member['kind'][] = ['ledger', 'joist', 'rim', 'beam', 'post', 'footing'];

/** Quantities for a materials schedule, derived rather than typed twice. */
export function takeoff(m: DeckModel) {
  const members = buildMembers(m);
  const count = (k: Member['kind']) => members.filter((x) => x.kind === k).length;
  const deckArea = m.widthFt * m.depthFt;
  return {
    deckAreaSqFt: Math.round(deckArea),
    joists: count('joist'),
    joistSize: m.joistSize,
    joistSpacing: m.joistSpacing,
    posts: count('post'),
    postSize: m.postSize,
    footings: count('footing'),
    beam: `(${m.beamPlies}) ${m.beamSize}`,
    deckingBoards: count('decking'),
    stairSteps: count('stair'),
    // Longest unsupported joist run — the number a span table is read against.
    joistSpanFt: Math.round((m.depthFt - m.cantileverFt) * 10) / 10,
  };
}
