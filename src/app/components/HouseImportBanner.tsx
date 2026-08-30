/**
 * "The house has this — bring it in."
 *
 * Offered rather than applied automatically, and that is deliberate. A trade
 * panel usually already has rows in it, some of them typed by hand, and
 * silently replacing them the moment a wall is captured elsewhere would throw
 * away work without asking. So it says what it has, says what taking it would
 * do, and waits.
 *
 * It also states plainly that importing replaces rather than merges. A button
 * whose effect on existing rows is ambiguous gets pressed once and not again.
 */
import { Home, ArrowDownToLine } from 'lucide-react';
import type { HouseOffer } from '../lib/houseToTrades';

export default function HouseImportBanner({ offer, noun, onApply, replacing }: {
  offer: HouseOffer | null;
  /** What the rows are called here — "elevations", "openings", "rooms". */
  noun: string;
  onApply: () => void;
  /** How many rows are already here, so the warning can be honest. */
  replacing: number;
}) {
  if (!offer) return null;

  return (
    <div className="rounded-xl border border-[#ea580c]/40 bg-[#ea580c]/[0.07] p-3 mb-3">
      <div className="flex items-start gap-2">
        <Home className="w-4 h-4 text-[#ea580c] shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-200">
            The house has <span className="font-semibold text-white">{offer.summary}</span> captured.
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {replacing > 0
              ? `Bringing them in replaces the ${replacing} ${noun} here.`
              : `They come in as ${noun} you can then price and adjust.`}
            {' '}Measured values stay measured; anything read off a photo stays marked as such.
          </p>
        </div>
        <button onClick={onApply}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
          style={{ background: '#ea580c' }}>
          <ArrowDownToLine className="w-3.5 h-3.5" /> Use
        </button>
      </div>
    </div>
  );
}
