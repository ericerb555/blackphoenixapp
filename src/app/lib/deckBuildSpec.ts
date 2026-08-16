/**
 * The build specification — how this specific deck goes together.
 *
 * Generated from the model rather than written as boilerplate, so it says "your
 * 16ft ledger takes 18 lag screws at 11in on centre" instead of "attach the
 * ledger securely". A generic spec is the one a crew ignores and an inspector
 * cannot check.
 *
 * BASIS AND ITS LIMITS
 *
 * Spacings and connector types here follow the American Wood Council's DCA 6,
 * Prescriptive Residential Wood Deck Construction Guide, and IRC section R507.
 * DCA 6 exists precisely so an ordinary deck can be permitted without an
 * engineer's stamp — but it is prescriptive, which means it holds only inside
 * its own limits. Outside them the honest answer is that the deck needs an
 * engineer, and this module says so rather than extrapolating a table past
 * where it applies.
 *
 * Every generated sheet states the edition it was derived from and that the
 * authority having jurisdiction may have adopted something different. Fastener
 * schedules must be checked against the locally adopted code before anyone
 * builds or submits.
 */
import type { DeckModel } from './deckModel';
import { takeoff } from './deckModel';

export interface SpecSection {
  title: string;
  /** Why this connection matters — the part crews skip and inspectors check. */
  critical?: string;
  lines: string[];
  reference?: string;
}

export interface BuildSpec {
  sections: SpecSection[];
  fasteners: { item: string; qty: string; where: string }[];
  lumber: { item: string; size: string; qty: number; note?: string }[];
  engineerRequired: string[];
  basis: string;
}

/**
 * Ledger lag/bolt spacing, DCA 6 Table 5 — 1/2in lag screws or through-bolts
 * into a 2x band joist. Spacing tightens as the joist span grows, because the
 * ledger carries half of whatever the joists carry.
 */
const LEDGER_SPACING_IN: [number, number][] = [
  [6, 30], [8, 23], [10, 18], [12, 15], [14, 13], [16, 11], [18, 10],
];

function ledgerSpacingFor(joistSpanFt: number): number | null {
  // Beyond the table there is no prescriptive answer, and interpolating past
  // the last row is exactly the kind of guess that puts a deck on the ground.
  if (joistSpanFt > 18) return null;
  for (const [span, spacing] of LEDGER_SPACING_IN) {
    if (joistSpanFt <= span) return spacing;
  }
  return null;
}

export function buildSpec(m: DeckModel): BuildSpec {
  const bom = takeoff(m);
  const sections: SpecSection[] = [];
  const fasteners: BuildSpec['fasteners'] = [];
  const engineerRequired: string[] = [];

  const spacing = ledgerSpacingFor(bom.joistSpanFt);
  const ledgerFastenerCount = spacing
    ? Math.max(4, Math.ceil((m.widthFt * 12) / spacing) + 1)
    : 0;

  // ── Ledger ────────────────────────────────────────────────────────────────
  if (m.ledgerAttached) {
    if (!spacing) {
      engineerRequired.push(
        `Joist span of ${bom.joistSpanFt}ft exceeds the DCA 6 ledger table (max 18ft). The ledger connection must be designed by an engineer.`,
      );
    }
    sections.push({
      title: 'Ledger to house',
      critical:
        'This single connection is the most common cause of deck collapse. Nails alone are never acceptable, and the ledger must never be fastened through brick veneer, stucco or foam sheathing to nothing solid.',
      lines: [
        `Ledger board: ${m.joistSize} pressure-treated, ${m.widthFt}ft long, same depth as the joists.`,
        'Remove siding down to the sheathing and locate the house rim/band joist. If there is no solid rim to land on — cantilevered floor, brick veneer, masonry — stop and build the deck free-standing instead.',
        spacing
          ? `Fasten with 1/2" hot-dip galvanised lag screws or through-bolts at ${spacing}" on centre, staggered in two rows: upper row 2" down from the top edge, lower row 2" up from the bottom, and not less than 2" from either end.`
          : 'Fastener schedule to be specified by the engineer of record.',
        spacing ? `That is approximately ${ledgerFastenerCount} fasteners for a ${m.widthFt}ft ledger.` : '',
        'Lag screws must fully penetrate the band joist with at least 1/2" of thread beyond. Through-bolts with washers both sides are preferred wherever the back is reachable.',
        'Flash the ledger: continuous corrosion-resistant Z-flashing tucked behind the housewrap and lapped over the top of the ledger. Water behind a ledger rots the band joist, and the failure is hidden until it is total.',
        'Do not stack washers to make up a gap. If the ledger cannot sit tight to solid framing, it is not a ledger.',
      ].filter(Boolean),
      reference: 'IRC R507.9 · DCA 6 Table 5 & Figure 13',
    });
    fasteners.push({
      item: '1/2" × 4" hot-dip galvanised lag screw or through-bolt',
      qty: spacing ? `${ledgerFastenerCount}` : 'per engineer',
      where: `Ledger to house band joist, ${spacing ? `${spacing}" o.c. staggered` : 'per engineer'}`,
    });
    fasteners.push({
      item: 'Lateral load hold-down device (e.g. DTT2Z with 1/2" threaded rod)',
      qty: '2 minimum',
      where: 'Ties deck joists back to house floor framing — required for attached decks',
    });

    sections.push({
      title: 'Lateral load connection',
      critical:
        'Separate from the ledger fasteners. Lag screws resist the deck falling down; these resist it pulling away from the house. Both are required on an attached deck.',
      lines: [
        'Install at least two hold-down tension devices connecting deck joists to the house floor framing, each with a minimum 750 lb capacity.',
        'Place them within 24" of each end of the deck, on joists — not on the rim.',
        'These pass through the ledger and band joist into blocking inside the house, so plan access before the ceiling below is closed up.',
      ],
      reference: 'IRC R507.9.2',
    });
  } else {
    sections.push({
      title: 'Free-standing frame',
      lines: [
        'No ledger. The house side is carried by its own beam and posts, matching the outer beam.',
        'Free-standing decks require diagonal bracing in both directions to resist racking — knee braces at posts, or a braced bay.',
        'Keep the frame clear of the house wall so siding can drain and be maintained.',
      ],
      reference: 'DCA 6 Figure 5',
    });
  }

  // ── Footings and posts ────────────────────────────────────────────────────
  sections.push({
    title: 'Footings and posts',
    critical:
      'Footings must bear below the local frost line. A footing above frost depth lifts every winter and takes the frame with it.',
    lines: [
      `${bom.footings} footings, one under each post, at ${m.postSpacingFt}ft on centre along the beam line.`,
      'Depth: below the frost line for this jurisdiction — confirm with the building department, as it varies from 12" to over 48".',
      'Diameter and thickness follow the tributary load and the soil bearing value; the structural sheet sizes these.',
      `Posts: ${m.postSize} pressure-treated, rated for ground contact.`,
      'Set each post on a galvanised post base that holds the end grain at least 1" above concrete. A post cast into or sitting flat on concrete wicks water and rots from the bottom.',
      'Posts bear on the footing — they are never suspended from the beam by fasteners alone.',
    ],
    reference: 'IRC R403.1.4 · R507.3 · DCA 6 Table 1a',
  });
  fasteners.push({
    item: 'Galvanised post base with standoff (e.g. ABU/PBS)',
    qty: String(bom.footings),
    where: 'Post to footing — anchor bolt or cast-in',
  });

  // ── Beam ──────────────────────────────────────────────────────────────────
  sections.push({
    title: 'Beam',
    lines: [
      `Beam: ${bom.beam} pressure-treated, built up and fastened together as one member.`,
      'Laminate plies with two rows of 10d hot-dip galvanised nails at 16" on centre, staggered, or 1/2" through-bolts. Construction adhesive is not a substitute.',
      'The beam sits on top of the posts and is held by a post cap. Notching a post to hang the beam removes the wood carrying the load and is a common inspection failure.',
      `Splices, if any, must land over a post — never mid-span. Stagger splices between plies by at least ${Math.max(4, Math.round(m.postSpacingFt))}ft.`,
      m.cantileverFt > 0
        ? `Joists cantilever ${m.cantileverFt}ft past the beam. Cantilever must not exceed one quarter of the back-span (${(bom.joistSpanFt / 4).toFixed(1)}ft here).`
        : 'No cantilever — joists end at the beam.',
    ],
    reference: 'IRC R507.5 · DCA 6 Table 3a',
  });
  fasteners.push({
    item: 'Galvanised post cap (e.g. BCS/PCZ)',
    qty: String(bom.posts),
    where: 'Beam to post',
  });

  // ── Joists ────────────────────────────────────────────────────────────────
  sections.push({
    title: 'Joists',
    lines: [
      `${bom.joists} joists of ${bom.joistSize} pressure-treated at ${bom.joistSpacing}" on centre, spanning ${bom.joistSpanFt}ft from ledger to beam.`,
      'Crown up: sight each joist and install the natural bow upward.',
      'Hang each joist off the ledger with a galvanised joist hanger, filled with every nail hole using the hanger nails specified by the manufacturer. Deck screws and drywall screws are not hanger fasteners and will fail in shear.',
      'Blocking or bridging between joists at mid-span keeps them from rolling and stiffens the deck noticeably.',
      `Rim joist: ${m.joistSize} closing the outer ends, fastened into each joist end.`,
    ],
    reference: 'IRC R507.6 · DCA 6 Table 2',
  });
  fasteners.push({
    item: 'Galvanised joist hanger (e.g. LUS) + manufacturer hanger nails',
    qty: String(bom.joists + (m.ledgerAttached ? 0 : bom.joists)),
    where: 'Joist to ledger (and to beam where flush-framed)',
  });

  // ── Decking ───────────────────────────────────────────────────────────────
  sections.push({
    title: 'Decking',
    lines: [
      `${bom.deckingBoards} boards running ${m.deckingDirection === 'parallel' ? 'parallel to the house' : 'perpendicular to the house'}.`,
      'Two fasteners per board at every joist crossing. Leave a gap of roughly 1/8"–1/4" between boards for drainage and movement.',
      'Use fasteners rated for treated lumber — ACQ and copper-based treatments corrode ordinary steel quickly.',
      'Keep board ends over a joist, and stagger end joints between rows.',
    ],
    reference: 'IRC R507.7',
  });

  // ── Guards and stairs ─────────────────────────────────────────────────────
  if (m.guardrail) {
    sections.push({
      title: 'Guards',
      critical:
        'Guard posts are the second most common failure after ledgers. A post bolted only through the rim joist will lever out under load.',
      lines: [
        m.heightFt > 2.5
          ? `Required: the walking surface is ${m.heightFt}ft above grade, over the 30" threshold.`
          : `Deck is ${m.heightFt}ft above grade so a guard is not required by code, but is being installed.`,
        'Guard height 36" minimum from the deck surface, and it must resist a 200 lb concentrated load in any direction at the top.',
        'Balusters spaced so a 4" sphere cannot pass; 6" at the triangular opening beside stair treads.',
        'Bolt guard posts through the rim AND tie them back to a joist or blocking with a hold-down. Through-bolts, not lag screws into end grain.',
      ],
      reference: 'IRC R312 · DCA 6 Figures 28–31',
    });
  }
  if (m.stairs) {
    const riserIn = 7;
    const steps = Math.max(1, Math.round((m.heightFt * 12) / riserIn));
    sections.push({
      title: 'Stairs',
      lines: [
        `Approximately ${steps} risers at about ${(m.heightFt * 12 / steps).toFixed(2)}" each — all risers within 3/8" of one another, which is what an inspector measures.`,
        'Treads 10" minimum run. Stair width ' + m.stairWidthFt + 'ft.',
        'Stringers bear on their own footing or a solid landing pad, not on soil.',
        'A graspable handrail is required on at least one side where there are four or more risers, 34"–38" above the tread nosings.',
      ],
      reference: 'IRC R311.7 · R507.10',
    });
  }

  // ── Lumber schedule ───────────────────────────────────────────────────────
  const lumber: BuildSpec['lumber'] = [
    ...(m.ledgerAttached ? [{ item: 'Ledger', size: m.joistSize, qty: 1, note: `${m.widthFt}ft` }] : []),
    { item: 'Joists', size: bom.joistSize, qty: bom.joists, note: `${Math.ceil(m.depthFt)}ft each` },
    { item: 'Rim joist', size: m.joistSize, qty: 1, note: `${m.widthFt}ft` },
    { item: 'Beam plies', size: m.beamSize, qty: m.beamPlies, note: `${m.widthFt}ft each` },
    { item: 'Posts', size: m.postSize, qty: bom.posts, note: `cut to suit ${m.heightFt}ft deck height` },
    { item: 'Decking', size: '5/4x6 or 2x6', qty: bom.deckingBoards, note: `${m.deckingDirection === 'parallel' ? m.widthFt : m.depthFt}ft each` },
  ];

  // ── Where prescriptive tables stop ────────────────────────────────────────
  if (bom.joistSpanFt > 18) {
    engineerRequired.push(`Joist span ${bom.joistSpanFt}ft is beyond prescriptive deck tables.`);
  }
  if (m.postSpacingFt > 8) {
    engineerRequired.push(`Post spacing ${m.postSpacingFt}ft exceeds common beam span tables.`);
  }
  if (m.heightFt > 12) {
    engineerRequired.push(`Deck height ${m.heightFt}ft is outside DCA 6, which covers decks up to about 12ft.`);
  }
  if (m.cantileverFt > bom.joistSpanFt / 4) {
    engineerRequired.push('Cantilever exceeds one quarter of the joist back-span.');
  }

  return {
    sections,
    fasteners,
    lumber,
    engineerRequired,
    basis:
      'Derived from AWC DCA 6 (Prescriptive Residential Wood Deck Construction Guide) and IRC R507. Prescriptive guidance only — not an engineered design. Verify every fastener schedule, span and footing against the code edition your jurisdiction has actually adopted before building or submitting.',
  };
}
