/**
 * ConnectionDetails — the drawn details, at scale, with fasteners called out.
 *
 * A framing plan shows where the members go. It does not show how they are held
 * together, and that is what fails: a ledger lagged into siding instead of the
 * rim board, a guard post bolted through a rim joist with no block behind it, a
 * post sitting flat on concrete and rotting from the bottom. Those are the three
 * that show up in deck collapse reports, and none of them is visible on a plan.
 *
 * So these are sections, drawn to scale from the same model as everything else.
 * Member depths come from the actual lumber sizes and the ledger fastener
 * spacing comes from the DCA 6 table for this joist span, which means a detail
 * cannot quietly disagree with the plan next to it.
 *
 * Drawn in SVG rather than canvas because these get printed and looked at
 * closely — an examiner reads the callouts, and a raster detail at print
 * resolution is unreadable.
 */
import { useMemo } from 'react';
import { Printer, Wrench, AlertTriangle } from 'lucide-react';
import { LUMBER_ACTUAL, takeoff, type DeckModel } from '../lib/deckModel';

/** Inches to SVG units. Details are drawn at 8 units per inch. */
const U = 8;

interface Props { model: DeckModel }

/**
 * Ledger fastener spacing, DCA 6 Table 5, for 1/2in lags or bolts into a
 * solid-sawn rim. Returns null past the table, where an engineer is required.
 */
function ledgerSpacingIn(joistSpanFt: number): number | null {
  const table: [number, number][] = [
    [6, 30], [8, 23], [10, 18], [12, 15], [14, 13], [16, 11], [18, 10],
  ];
  for (const [span, spacing] of table) if (joistSpanFt <= span) return spacing;
  return null;
}

export default function ConnectionDetails({ model }: Props) {
  const bom = useMemo(() => takeoff(model), [model]);
  const joist = LUMBER_ACTUAL[model.joistSize];
  const post = LUMBER_ACTUAL[model.postSize];
  const beam = LUMBER_ACTUAL[model.beamSize];
  const spacing = ledgerSpacingIn(bom.joistSpanFt);

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-5 print:bg-white print:border-0"
      id="connection-details">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #connection-details, #connection-details * { visibility: visible; }
          #connection-details { position:absolute; left:0; top:0; width:100%;
                                background:#fff !important; color:#000 !important; }
          #connection-details .no-print { display:none !important; }
          #connection-details .detail { break-inside: avoid; page-break-inside: avoid; }
          #connection-details .ink { color:#000 !important; }
          #connection-details .panel { border-color:#666 !important; background:#fff !important; }
        }
      `}</style>

      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-bold text-white ink flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#ea580c]" /> Connection details
          </h2>
          <p className="text-sm text-gray-400 ink mt-0.5">
            Drawn to scale from this design. Fastener spacing follows the span, so these cannot
            disagree with the framing plan.
          </p>
        </div>
        <button onClick={() => window.print()}
          className="no-print flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {!spacing && (
        <div className="rounded-xl p-3 my-3 flex items-start gap-2"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-200 ink">
            A {bom.joistSpanFt}ft joist span is past DCA 6 Table 5, so no prescriptive ledger
            fastener spacing exists for it. The ledger detail below shows the arrangement, but the
            spacing has to come from an engineer.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Detail
          tag="1" title="Ledger to house"
          note={spacing
            ? `${model.joistSize} ledger, ½in lag screws or through-bolts staggered in two rows at ${spacing}in on centre for a ${bom.joistSpanFt}ft joist span. DCA 6 Table 5.`
            : `${model.joistSize} ledger. Fastener spacing by engineer — span exceeds the table.`}
          warn="Fasteners must land in the house rim board, not in siding or sheathing alone. Siding is cut back and flashing goes over the ledger and up behind the house wrap.">
          <LedgerDetail joistH={joist.h} spacingIn={spacing} />
        </Detail>

        <Detail
          tag="2" title="Post to beam"
          note={`${model.postSize} post to (${model.beamPlies}) ${model.beamSize} beam. Two ½in through-bolts with washers both faces, or a rated post cap.`}
          warn="The beam bears on top of the post. Bolts hold it in place — they are not what carries the load, and a beam hung off the side of a post on fasteners alone is a failure.">
          <PostBeamDetail postW={post.w} beamH={beam.h} plies={model.beamPlies} />
        </Detail>

        <Detail
          tag="3" title="Post to footing"
          note={`${model.postSize} post on a standoff base, ½in drop-in anchor drilled into the cured footing. Footing size and depth per the load calculation sheet.`}
          warn="The standoff keeps end grain up off the concrete. A post set flat on a footing wicks water and rots from the bottom, where nobody looks.">
          <PostFootingDetail postW={post.w} />
        </Detail>

        <Detail
          tag="4" title="Blocking over the beam"
          note={`${model.joistSize} solid blocking between joists over the beam, at ${model.joistSpacing}in on centre. Three 16d toenails each end, or a rated clip.`}
          warn="Without it the joists roll over on the beam under load. This is also what ties the joists together so they act as one surface.">
          <BlockingDetail joistH={joist.h} />
        </Detail>

        <Detail
          tag="5" title="Guard post"
          note="4x4 guard post, full section top to bottom, through-bolted to the rim with two ½in bolts, solid blocking behind it, and a rated tension tie down to the joist. The decking is notched around the post — the post is never notched."
          warn="A guard post bolted to a rim joist with nothing behind it is holding on by the rim in weak-axis bending. It is the most common railing failure and the easiest to prevent.">
          <GuardPostDetail joistH={joist.h} />
        </Detail>

        <Detail
          tag="6" title="Stair stringer to deck"
          note="Cut stringers hung off the rim on a rated stringer connector, or on a ledger board with hangers. Landing at least 36in in the direction of travel, top and bottom."
          warn="Notched stringers lose most of their depth at the cuts. What is left below the cut is what carries the flight — keep at least 5in of solid stringer.">
          <StairStringerDetail joistH={joist.h} />
        </Detail>
      </div>

      <p className="text-xs text-gray-500 ink mt-4">
        Details per AWC DCA 6 and IRC R507. Connector product names are omitted deliberately —
        specify any connector rated for the load and approved for use with pressure-treated lumber.
        All fasteners and connectors in contact with treated lumber to be hot-dip galvanised or
        stainless; do not mix stainless fasteners with galvanised connectors.
      </p>
    </div>
  );
}

function Detail({ tag, title, note, warn, children }: {
  tag: string; title: string; note: string; warn: string; children: any;
}) {
  return (
    <div className="detail rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 panel">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="w-5 h-5 rounded-md bg-[#ea580c] text-white text-xs font-bold grid place-items-center shrink-0">
          {tag}
        </span>
        <h3 className="text-sm font-bold text-white ink">{title}</h3>
      </div>
      <div className="bg-white rounded-lg p-2 mb-2">{children}</div>
      <p className="text-xs text-gray-300 ink mb-1.5">{note}</p>
      <p className="text-xs text-yellow-400 ink flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {warn}
      </p>
    </div>
  );
}

/* ---------- the drawings ---------- */

const LINE = '#111';
const HATCH = '#9a9a9a';
const CALL = '#c2410c';

function Callout({ x, y, text, anchor = 'start' }: {
  x: number; y: number; text: string; anchor?: 'start' | 'end' | 'middle';
}) {
  return (
    <text x={x} y={y} fontSize="9" fill={CALL} fontWeight="600" textAnchor={anchor}
      fontFamily="ui-sans-serif, system-ui, sans-serif">{text}</text>
  );
}

function Leader({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={CALL} strokeWidth="0.8" />;
}

/** Wood shown in section gets an X, which is the drafting convention. */
function WoodSection({ x, y, w, h, fill = '#e8dcc8' }: {
  x: number; y: number; w: number; h: number; fill?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={LINE} strokeWidth="1.1" />
      <line x1={x} y1={y} x2={x + w} y2={y + h} stroke={LINE} strokeWidth="0.5" opacity="0.55" />
      <line x1={x + w} y1={y} x2={x} y2={y + h} stroke={LINE} strokeWidth="0.5" opacity="0.55" />
    </g>
  );
}

function LedgerDetail({ joistH, spacingIn }: { joistH: number; spacingIn: number | null }) {
  const h = joistH * U;
  return (
    <svg viewBox="0 0 300 190" className="w-full" role="img"
      aria-label="Section through the ledger connection at the house wall">
      {/* House framing */}
      <rect x="18" y="10" width="14" height="170" fill="#f2f2f2" stroke={LINE} strokeWidth="1" />
      <Callout x={4} y={26} text="Stud" />
      <rect x="32" y="10" width="8" height="170" fill="#ddd" stroke={LINE} strokeWidth="1" />
      <Callout x={4} y={40} text="Sheathing" />

      {/* Rim board — what the fasteners must land in */}
      <WoodSection x={32} y={62} w={8} h={h + 18} fill="#e0d2b8" />
      <Leader x1={44} y1={70} x2={92} y2={52} />
      <Callout x={94} y={51} text="House rim board — fasteners land HERE" />

      {/* Ledger */}
      <WoodSection x={40} y={62} w={22} h={h} />
      <Callout x={44} y={62 + h + 14} text="Ledger" />

      {/* Bolts, staggered in two rows */}
      {[0.3, 0.7].map((f, i) => (
        <g key={i}>
          <line x1={26} y1={62 + h * f} x2={70} y2={62 + h * f} stroke={LINE} strokeWidth="2.4" />
          <circle cx={68} cy={62 + h * f} r="2.6" fill={LINE} />
        </g>
      ))}
      <Leader x1={70} y1={62 + h * 0.3} x2={150} y2={78} />
      <Callout x={152} y={77}
        text={spacingIn ? `½in lag or bolt, 2 rows @ ${spacingIn}in o.c.` : '½in fasteners — spacing by engineer'} />

      {/* Deck joist on a hanger */}
      <WoodSection x={62} y={62} w={90} h={h} />
      <Callout x={96} y={62 + h + 14} text="Deck joist" />

      {/* Flashing, drawn last so it reads as lapping over what it protects.
          Three legs and they all matter: up the sheathing behind the wrap, flat
          across the top of the ledger, then down the outer face to a drip that
          turns away from the building. The first version floated clear of the
          ledger, ran down the joist rather than the ledger, and finished with a
          leg turned back toward the house — a drip edge pointing at the wall
          delivers the water to the one place the flashing exists to keep it
          out of. */}
      <path d={`M 40 32 L 40 62 L 62 62 L 62 78 L 68 83`}
        fill="none" stroke="#3b82f6" strokeWidth="2" />
      <Leader x1={40} y1={44} x2={128} y2={30} />
      <Callout x={130} y={29} text="Flashing up behind the wrap, over" />
      <Callout x={130} y={40} text="the ledger, drip turned outward" />

      <path d={`M 62 62 L 62 ${62 + h} L 78 ${62 + h} L 78 ${62 + h + 5} L 60 ${62 + h + 5}`}
        fill="none" stroke="#6b7280" strokeWidth="2.4" />
      <Leader x1={70} y1={62 + h + 5} x2={150} y2={62 + h + 30} />
      <Callout x={152} y={62 + h + 31} text="Joist hanger, every joist" />

      <text x="150" y="182" fontSize="8" fill="#666" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif">
        Section — siding cut back at the ledger, not fastened through it
      </text>
    </svg>
  );
}

function PostBeamDetail({ postW, beamH, plies }: { postW: number; beamH: number; plies: number }) {
  const pw = postW * U;
  const bh = beamH * U;
  const bw = plies * 1.5 * U;
  const cx = 150;
  return (
    <svg viewBox="0 0 300 190" className="w-full" role="img"
      aria-label="Section through the post to beam connection">
      {/* Beam sitting on top of the post */}
      <WoodSection x={cx - bw / 2 - 26} y={30} w={bw + 52} h={bh} />
      <Leader x1={cx + bw / 2 + 26} y1={40} x2={236} y2={24} />
      <Callout x={238} y={23} text={`(${plies}) ply beam`} anchor="end" />

      {/* Post under it */}
      <WoodSection x={cx - pw / 2} y={30 + bh} w={pw} h={110 - bh} />
      <Callout x={cx - pw / 2 - 6} y={140} text="Post" anchor="end" />

      {/* Through bolts */}
      {[0.3, 0.68].map((f, i) => (
        <g key={i}>
          <line x1={cx - pw / 2 - 12} y1={30 + bh * f} x2={cx + pw / 2 + 12} y2={30 + bh * f}
            stroke={LINE} strokeWidth="2.4" />
          <circle cx={cx - pw / 2 - 12} cy={30 + bh * f} r="2.6" fill={LINE} />
          <circle cx={cx + pw / 2 + 12} cy={30 + bh * f} r="2.6" fill={LINE} />
        </g>
      ))}
      <Leader x1={cx - pw / 2 - 12} y1={30 + bh * 0.3} x2={56} y2={22} />
      <Callout x={12} y={21} text="2 × ½in through-bolts," />
      <Callout x={12} y={32} text="washers both faces" />

      {/* The bearing line, which is the point of the detail */}
      <line x1={cx - pw / 2 - 30} y1={30 + bh} x2={cx + pw / 2 + 30} y2={30 + bh}
        stroke="#16a34a" strokeWidth="2.4" />
      <Leader x1={cx + pw / 2 + 30} y1={30 + bh} x2={244} y2={104} />
      <Callout x={246} y={103} text="Beam BEARS on post" anchor="end" />

      <text x="150" y="176" fontSize="8" fill="#666" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif">
        Bolts locate the beam. Bearing carries it.
      </text>
    </svg>
  );
}

function PostFootingDetail({ postW }: { postW: number }) {
  const pw = postW * U;
  const cx = 150;
  return (
    <svg viewBox="0 0 300 190" className="w-full" role="img"
      aria-label="Section through the post base and footing">
      <WoodSection x={cx - pw / 2} y={12} w={pw} h={76} />
      <Callout x={cx - pw / 2 - 6} y={40} text="Post" anchor="end" />

      {/* Standoff base */}
      <path d={`M ${cx - pw / 2 - 4} 88 L ${cx - pw / 2 - 4} 100 L ${cx + pw / 2 + 4} 100 L ${cx + pw / 2 + 4} 88`}
        fill="none" stroke="#6b7280" strokeWidth="2.6" />
      <rect x={cx - 16} y={100} width="32" height="5" fill="#6b7280" />
      <Leader x1={cx + pw / 2 + 4} y1={94} x2={226} y2={70} />
      <Callout x={228} y={69} text="Standoff base — 1in air gap" anchor="end" />

      {/* Grade line */}
      <line x1="10" y1="112" x2="290" y2="112" stroke="#6b7280" strokeWidth="1" strokeDasharray="4 3" />
      <Callout x={12} y={109} text="Finished grade" />

      {/* Footing */}
      <rect x={cx - 46} y={105} width="92" height="72" fill="#d6d3ce" stroke={LINE} strokeWidth="1.1" />
      <g opacity="0.5">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <circle key={i} cx={cx - 36 + i * 14} cy={125 + (i % 3) * 16} r="2.5" fill="#8a8580" />
        ))}
      </g>
      <Leader x1={cx + 46} y1={150} x2={232} y2={160} />
      <Callout x={234} y={159} text="Footing per calc sheet" anchor="end" />

      {/* Anchor.
          A drop-in, not a J-bolt. The difference is not the part but the
          sequence: a cast-in bolt has to be placed while the concrete is wet,
          which means the post location must be right before the pour. A drop-in
          is set in a hole drilled in cured concrete, so the footing goes in
          first and the base is located afterwards off the framing as built. */}
      <rect x={cx - 5} y={105} width="10" height="20" fill="#b9b5b0" stroke={LINE} strokeWidth="1" />
      <line x1={cx} y1={96} x2={cx} y2={122} stroke={LINE} strokeWidth="2.6" />
      <path d={`M ${cx - 5} 121 L ${cx - 8} 125 M ${cx + 5} 121 L ${cx + 8} 125`}
        stroke={LINE} strokeWidth="1.4" fill="none" />
      <Leader x1={cx - 5} y1={115} x2={98} y2={144} />
      <Callout x={10} y={147} text="½in drop-in anchor" />
      <Callout x={10} y={158} text="in cured concrete" />

      <text x="150" y="186" fontSize="8" fill="#666" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif">
        Bottom of footing below the frost line — see calculation sheet
      </text>
    </svg>
  );
}

function BlockingDetail({ joistH }: { joistH: number }) {
  const h = joistH * U;
  return (
    <svg viewBox="0 0 300 190" className="w-full" role="img"
      aria-label="Blocking between joists over the beam">
      {/* Beam below, seen in elevation */}
      <rect x="14" y={40 + h} width="272" height="26" fill="#dccbb0" stroke={LINE} strokeWidth="1.1" />
      <Callout x={20} y={40 + h + 18} text="Beam below" />

      {/* Joists in section, blocking between */}
      {[0, 1, 2].map(i => (
        <WoodSection key={i} x={40 + i * 90} y={40} w={12} h={h} />
      ))}
      {[0, 1].map(i => (
        <rect key={i} x={52 + i * 90} y={40} width="78" height={h}
          fill="#eee3cd" stroke={LINE} strokeWidth="1.1" />
      ))}
      <Leader x1={90} y1={40 + h / 2} x2={110} y2={22} />
      <Callout x={112} y={21} text="Solid blocking, same depth as joists" />
      <Leader x1={46} y1={40 + h} x2={30} y2={30} />
      <Callout x={16} y={26} text="Joists" />

      {/* Toenails */}
      {[0, 1].map(i => (
        <g key={i}>
          <line x1={54 + i * 90} y1={48} x2={62 + i * 90} y2={56} stroke={LINE} strokeWidth="1.6" />
          <line x1={54 + i * 90} y1={40 + h - 14} x2={62 + i * 90} y2={40 + h - 6} stroke={LINE} strokeWidth="1.6" />
          <line x1={128 + i * 90} y1={48} x2={120 + i * 90} y2={56} stroke={LINE} strokeWidth="1.6" />
        </g>
      ))}
      <Leader x1={62} y1={56} x2={150} y2={40 + h + 44} />
      <Callout x={152} y={40 + h + 45} text="3 × 16d toenails each end, or a rated clip" />

      <text x="150" y="182" fontSize="8" fill="#666" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif">
        Also required at mid-span on long joists — IRC R502.7.1
      </text>
    </svg>
  );
}

/**
 * Guard post at the rim.
 *
 * The post is one full-section 4x4 running from the top of the guard down past
 * the decking to the bottom of the rim, and it is never notched. A 4x4 is 3.5in
 * square; a notch deep enough to sit it over the rim takes out most of the
 * section at exactly the height the 200lb load levers against. Where the post
 * crosses the decking it is the decking that gets cut around the post, never
 * the other way round.
 *
 * The first version drew the post stopping dead at deck level with the rim joist
 * occupying the same space, which reads as a notched post — and left the
 * through-bolts running through empty air where the post should have been.
 */
function GuardPostDetail({ joistH }: { joistH: number }) {
  const h = joistH * U;
  const deckY = 70;                 // top of the decking
  const memberY = deckY + 8;        // top of the framing, under the decking
  const rimX = 106, rimW = 12;      // 1.5in rim, seen in section
  const postX = rimX + rimW;        // bolted to the inside face of the rim
  const postW = 28;                 // 3.5in
  const blockX = postX + postW, blockW = 60;
  const joistX = blockX + blockW;
  const postBot = memberY + h;
  const boltY = (f: number) => memberY + h * f;
  // Held off the footer note, which a 2x12 rim would otherwise run into.
  const tieY = Math.min(postBot + 22, 180);
  const tieTextY = Math.min(tieY + 7, 184);

  return (
    <svg viewBox="0 0 300 200" className="w-full" role="img"
      aria-label="Guard post connection: a full-section 4x4 through-bolted to the rim with solid blocking behind it, the decking notched around the post">
      {/* Decking, in two pieces because the post runs through it */}
      <rect x={postX - 20} y={deckY} width={20} height="8" fill="#e8dcc8" stroke={LINE} strokeWidth="1" />
      <rect x={postX + postW} y={deckY} width={280 - postX - postW} height="8"
        fill="#e8dcc8" stroke={LINE} strokeWidth="1" />
      <Callout x={24} y={68} text="Decking" />

      {/* Rim joist in section */}
      <WoodSection x={rimX} y={memberY} w={rimW} h={h} />
      <Leader x1={rimX} y1={memberY + h / 2} x2={56} y2={memberY + h / 2 + 19} />
      <Callout x={4} y={memberY + h / 2 + 21} text="Rim joist" />

      {/* THE BLOCK — the thing that is usually missing */}
      <rect x={blockX} y={memberY} width={blockW} height={h} fill="#f5e6c8" stroke={LINE} strokeWidth="1.4" />
      <Leader x1={blockX + 30} y1={memberY + h / 2} x2={230} y2={92} />
      <Callout x={296} y={91} text="SOLID BLOCKING" anchor="end" />
      <Callout x={296} y={102} text="behind every post" anchor="end" />

      {/* Joist beyond */}
      <WoodSection x={joistX} y={memberY} w={12} h={h} />

      {/* The post: one piece, top to bottom, drawn over everything it passes */}
      <WoodSection x={postX} y={8} w={postW} h={postBot - 8} />
      <Leader x1={postX + postW} y1={24} x2={206} y2={18} />
      <Callout x={208} y={17} text="4x4 guard post" />
      <Leader x1={postX + postW} y1={46} x2={160} y2={42} />
      <Callout x={296} y={40} text="Full section — never notched" anchor="end" />
      <Leader x1={postX + postW} y1={deckY + 4} x2={153} y2={64} />
      <Callout x={296} y={62} text="Decking notched around the post" anchor="end" />

      {/* Through bolts — post, then rim, with the head outboard */}
      {[0.28, 0.72].map((f, i) => (
        <g key={i}>
          <line x1={rimX - 12} y1={boltY(f)} x2={postX + postW + 6} y2={boltY(f)}
            stroke={LINE} strokeWidth="2.4" />
          <circle cx={rimX - 12} cy={boltY(f)} r="2.6" fill={LINE} />
        </g>
      ))}
      <Leader x1={rimX - 12} y1={boltY(0.28)} x2={66} y2={boltY(0.28) - 10} />
      <Callout x={4} y={boltY(0.28) - 14} text="2 × ½in through-bolts" />

      {/* Tension tie down to the joist */}
      <path d={`M ${postX + 8} ${postBot} L ${postX + 8} ${tieY} L ${postX + 38} ${tieY}`}
        fill="none" stroke="#6b7280" strokeWidth="2.6" />
      <Leader x1={postX + 38} y1={tieY} x2={216} y2={tieTextY - 6} />
      <Callout x={296} y={tieTextY} text="Rated tension tie" anchor="end" />

      <text x="150" y="194" fontSize="8" fill="#666" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif">
        A guard must resist 200 lbs in any direction at the top — IRC R301.5
      </text>
    </svg>
  );
}

/**
 * Stair stringer at the deck.
 *
 * Drawn from the actual rise and run rather than as a rotated board. The first
 * version rotated a rectangle and cut the notches into it, which rotated the
 * notches too — so the treads came out sloping and the risers leaning, when
 * level treads and plumb risers are the entire point of a cut stringer.
 *
 * The sawtooth is therefore built in world coordinates: out one tread, down one
 * riser, repeat. The underside is that same rake line dropped by the throat, so
 * the throat reads as the constant depth it actually is — and the throat is what
 * decides whether the flight carries, since a notched stringer has only the wood
 * below the cuts doing any work.
 *
 * The bottom is a level seat cut, not a continuation of the rake. A raking
 * underside carried through to the pad lands the board on a point, which is both
 * wrong to build and wrong to look at; the seat cut is the face that bears. The
 * last riser is also cut short by one tread thickness — the drop — which is the
 * same `bottomRiserCutIn` the stair calculator reports, and without it the first
 * step up off the pad comes out a tread thicker than every other step.
 */
function StairStringerDetail({ joistH }: { joistH: number }) {
  const s = 4.2;                    // px per inch, sized so three steps fit
  const tread = 11 * s;
  const riser = 7 * s;
  const throat = 7 * s;             // measured vertically, as drawn
  const drop = 1 * s;               // one tread thickness
  const x0 = 92;
  const y0 = 44;
  const steps = 3;

  // Top edge: level tread, plumb riser, repeated. The last riser is cut short by
  // one tread thickness — the drop — because the bottom step has a tread on top
  // of it and pad underneath, so cutting it full height makes that first step up
  // off the pad taller than the rest of the flight.
  const top: string[] = [`${x0},${y0}`];
  for (let i = 0; i < steps; i++) {
    const x = x0 + (i + 1) * tread;
    const y = y0 + i * riser;
    top.push(`${x},${y}`);
    top.push(`${x},${y + (i === steps - 1 ? riser - drop : riser)}`);
  }
  const toeX = x0 + steps * tread;
  const padY = y0 + steps * riser - drop;   // top of the landing pad

  // Underside: the rake line dropped by the throat. Dropping a line vertically
  // leaves it parallel, so the board keeps an even depth the whole way down.
  //
  // At the bottom that rake has to stop and turn level, or the board lands on
  // the pad on a point. So the last cut is a level seat cut, run back up-slope
  // from the toe to where the level line meets the underside — that face is what
  // bears on the pad, and it is what the plumb bottom riser is measured off.
  const seatX = x0 + (padY - (y0 + throat)) * (tread / riser);
  const poly = [...top, `${seatX},${padY}`, `${x0},${y0 + throat}`].join(' ');

  // Where the throat is dimensioned — mid-flight, clear of the notches.
  const dimX = x0 + tread * 1.5;
  const dimTop = y0 + (dimX - x0) * (riser / tread);
  const rimH = joistH * s;

  return (
    <svg viewBox="0 0 300 200" className="w-full" role="img"
      aria-label="Stair stringer connection to the deck rim, showing level tread and plumb riser cuts and the level seat cut bearing on the landing pad">
      {/* Decking and the rim the stringer hangs off */}
      <rect x="18" y={y0 - 8} width={x0 - 18} height="8" fill="#e8dcc8" stroke={LINE} strokeWidth="1" />
      <WoodSection x={x0 - 12} y={y0} w={12} h={rimH} />
      <Callout x={20} y={y0 - 12} text="Deck" />
      <Leader x1={x0 - 12} y1={y0 + rimH * 0.75} x2={44} y2={y0 + rimH + 26} />
      <Callout x={14} y={y0 + rimH + 27} text="Rim joist" />

      {/* The stringer itself */}
      <polygon points={poly} fill="#eee3cd" stroke={LINE} strokeWidth="1.3" />

      {/* The rake line through the notch corners, which the throat is measured
          from. Dashed because it is a reference, not an edge. */}
      <line x1={x0} y1={y0} x2={toeX} y2={y0 + steps * riser}
        stroke={LINE} strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6" />

      {/* Throat dimension */}
      <line x1={dimX} y1={dimTop} x2={dimX} y2={dimTop + throat} stroke={CALL} strokeWidth="1" />
      <line x1={dimX - 4} y1={dimTop} x2={dimX + 4} y2={dimTop} stroke={CALL} strokeWidth="1" />
      <line x1={dimX - 4} y1={dimTop + throat} x2={dimX + 4} y2={dimTop + throat} stroke={CALL} strokeWidth="1" />
      <Leader x1={dimX} y1={dimTop + throat / 2} x2={dimX - 46} y2={dimTop + throat + 34} />
      <Callout x={4} y={dimTop + throat + 35} text="Throat — keep 5in min" />

      {/* What makes it a stringer rather than a sloping board */}
      <Leader x1={x0 + tread * 0.5} y1={y0} x2={x0 + tread * 0.9} y2={y0 - 20} />
      <Callout x={x0 + tread * 0.95} y={y0 - 21} text="Level tread cut" />
      <Leader x1={x0 + tread} y1={y0 + riser * 0.5} x2={x0 + tread + 30} y2={y0 + riser * 0.5 - 6} />
      <Callout x={x0 + tread + 33} y={y0 + riser * 0.5 - 7} text="Plumb riser cut" />

      {/* Hung off the rim on a rated connector */}
      <path d={`M ${x0} ${y0} L ${x0} ${y0 + throat} L ${x0 + 16} ${y0 + throat + 10}`}
        fill="none" stroke="#6b7280" strokeWidth="2.6" />
      <Leader x1={x0 + 6} y1={y0 + throat + 6} x2={x0 - 34} y2={y0 + throat + 52} />
      <Callout x={4} y={y0 + throat + 53} text="Rated stringer connector" />

      {/* Bottom bearing: the seat cut sits flat on the pad for its whole length */}
      <rect x={seatX - 16} y={padY} width={toeX - seatX + 46} height="9"
        fill="#d6d3ce" stroke={LINE} strokeWidth="1" />
      <Leader x1={toeX + 30} y1={padY} x2={272} y2={padY - 9} />
      <Callout x={296} y={padY - 12} text="Landing pad" anchor="end" />

      <Leader x1={seatX + 18} y1={padY} x2={150} y2={padY + 40} />
      <Callout x={4} y={padY + 41} text="Level seat cut bears on the pad" />

      <Leader x1={toeX} y1={padY - (riser - drop) / 2} x2={toeX + 20} y2={padY - 62} />
      <Callout x={296} y={padY - 63} text="Drop = 1 tread thickness" anchor="end" />

      <text x="150" y="194" fontSize="8" fill="#666" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif">
        Stringers bear on a pad or footing, never on soil
      </text>
    </svg>
  );
}
