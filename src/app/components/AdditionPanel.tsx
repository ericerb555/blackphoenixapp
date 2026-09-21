/**
 * What an addition actually means, once it has been drawn.
 *
 * WHY THIS IS NOT A SECOND FLOOR PLAN EDITOR
 *
 * The plan is drawn on the Capture stage, with the photographs, and that is the
 * right place for it: capture is where you record what is there, and an
 * addition is the one case where part of "what is there" does not exist yet.
 * Moving it here would have given the app two editors writing to one plan,
 * which is exactly how two descriptions of one building start to disagree.
 *
 * So this panel does the other half. It reads the plan and says what follows
 * from it: how much floor is being added, how much new outside wall that
 * creates, which walls are coming out and whether anybody has established what
 * they are holding up.
 *
 * WHY THE WALLS GO INTO THE HOUSE RATHER THAN INTO SIDING
 *
 * Because every trade already reads elevations off the house. An addition's
 * walls arriving as elevations are picked up by siding, by the opening
 * schedule, by structures and by hardscape without a line of new code in any of
 * them. Sending them to siding directly would have meant four more bridges and
 * the certainty that one would be forgotten.
 *
 * It is a button rather than something automatic. Drawing a proposed room is
 * thinking out loud; adding its walls to the house is saying the addition is
 * real enough to quote.
 */
import { useState } from 'react';
import {
  Blocks, AlertTriangle, ShieldQuestion, Ruler, ArrowRight, Check, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type FloorPlan, planTotals, additionExteriorWalls, additionExteriorTotals,
} from '../lib/floorPlanModel';
import type { House } from '../lib/houseModel';
import { upsertView } from '../lib/houseModel';
import { elevationsFromAddition } from '../lib/houseToTrades';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

export default function AdditionPanel({
  plan,
  house,
  onHouse,
  onGoToCapture,
}: {
  plan: FloorPlan;
  house: House;
  onHouse: (house: House) => void;
  /** Send them to where the plan is actually drawn. */
  onGoToCapture?: () => void;
}) {
  const [added, setAdded] = useState(false);

  const totals = planTotals(plan);
  const runs = additionExteriorWalls(plan);
  const wall = additionExteriorTotals(plan);

  const nothingDrawn = totals.roomCount === 0;
  const noAddition = !nothingDrawn && totals.proposedSqFt === 0 && totals.wallsRemoved === 0;

  const addWalls = () => {
    const views = elevationsFromAddition(plan);
    if (!views.length) return;
    let next = house;
    for (const v of views) next = upsertView(next, v);
    onHouse(next);
    setAdded(true);
    toast.success(
      `${views.length} wall${views.length === 1 ? '' : 's'} added to the house — `
      + 'siding and the window schedule can see them now.',
    );
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <Blocks className="h-4 w-4 text-[#ea580c]" /> Additions & layout
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          The plan itself is drawn on <span className="font-semibold text-gray-400">Capture</span>,
          with the photographs — an addition is the one case where part of what is there
          does not exist yet. This is what follows from it.
        </p>

        {nothingDrawn ? (
          <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-center">
            <p className="text-sm text-gray-400">Nothing drawn yet.</p>
            {onGoToCapture && (
              <button
                onClick={onGoToCapture}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
              >
                <ArrowRight className="h-3.5 w-3.5" /> Go and draw the plan
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Existing" value={`${totals.existingSqFt} sq ft`} />
              <Stat label="Proposed" value={`${totals.proposedSqFt} sq ft`} accent />
              <Stat label="Finished" value={`${totals.finishedSqFt} sq ft`} />
            </div>

            {noAddition && (
              <p className="mt-3 text-xs text-gray-500">
                Every room on the plan is marked existing and no wall is marked to come
                out, so nothing here is being added or changed yet. Mark a room as proposed
                on Capture to design an addition.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── What the footprint puts on the outside ─────────────────────── */}
      {runs.length > 0 && (
        <div className={card}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
            <Ruler className="h-4 w-4 text-[#ea580c]" /> New outside wall
          </h3>
          <p className="mb-3 text-xs text-gray-500">
            Worked out from the footprint rather than drawn again — every side of a
            proposed room that is not up against another room is, by definition, outside.
            Sides that are only partly covered count only the exposed part.
          </p>

          <div className="space-y-1.5">
            {runs.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2">
                <span className="text-sm text-gray-200">
                  {r.roomName} <span className="text-gray-500">— {r.side} side</span>
                </span>
                <span className="text-xs text-gray-400">
                  {r.lengthFt}ft × {r.ceilingFt}ft
                  <span className={`ml-2 text-[10px] font-semibold ${
                    r.source === 'measured' ? 'text-emerald-400'
                      : r.source === 'photos' ? 'text-sky-400' : 'text-amber-500/90'
                  }`}>
                    {r.source === 'measured' ? 'measured' : r.source === 'photos' ? 'from photos' : 'estimated'}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-sm font-semibold text-white">
            {wall.runFt}ft of new wall, {wall.areaSqFt} sq ft of face.
          </p>

          {added ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-400">
              <Check className="h-3.5 w-3.5" /> Added to the house
            </p>
          ) : (
            <button
              onClick={addWalls}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
            >
              <ArrowRight className="h-3.5 w-3.5" /> Add these to the house
            </button>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-600">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            They become elevations on the house, which is what siding, the window
            schedule and the structures tool all read. No windows or doors are placed —
            nobody has said where they go yet, and inventing them would put units on a
            schedule that nobody specified.
          </p>
        </div>
      )}

      {/* ── The expensive question ──────────────────────────────────────── */}
      {totals.wallsRemoved > 0 && (
        <div className={card}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
            <ShieldQuestion className="h-4 w-4 text-[#ea580c]" /> Walls coming out
          </h3>
          <p className="text-sm text-gray-300">
            {totals.wallsRemoved} wall{totals.wallsRemoved === 1 ? '' : 's'} marked
            for removal.
          </p>

          {totals.removedBearing > 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totals.removedBearing} known to be carrying load
              </p>
              <p className="mt-1 text-xs text-amber-200/80">
                Each one needs temporary shoring, a sized beam, posts carried down and
                usually a new footing under each post. That is a structural job, not a
                demolition one.
              </p>
            </div>
          )}

          {/* The single most valuable warning this panel gives. A price quoted
              over an unanswered bearing question is off by thousands in one
              direction or the other. */}
          {totals.removedUnknown > 0 && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totals.removedUnknown} with the bearing question unanswered
              </p>
              <p className="mt-1 text-xs text-red-200/80">
                This cannot be priced honestly yet. A non-bearing partition is demolition
                and patching; a bearing wall is shoring, a beam, posts and footings — the
                gap is thousands of dollars. It is answered on site by somebody who opens
                the ceiling and looks at which way the joists run, not from a drawing and
                not from a photograph.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${accent ? 'text-[#ea580c]' : 'text-white'}`}>{value}</p>
    </div>
  );
}
