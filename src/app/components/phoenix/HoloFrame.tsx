/**
 * The chrome. Corner brackets rather than boxes.
 *
 * WHY BRACKETS AND NOT BORDERS
 *
 * A full rectangle reads as a card — a thing sitting on a page. Four corner
 * marks read as a frame drawn *over* something, which is the whole illusion:
 * the interface is a layer of light on top of the dark, not a stack of
 * panels. It is the single cheapest move in this entire visual language and
 * it does more than any amount of glow.
 *
 * THE LABEL IS MONOSPACE, UPPERCASE AND TINY ON PURPOSE
 *
 * Interfaces like this read as technical because their type is subordinate:
 * small, letter-spaced, all caps, and never competing with the content. The
 * moment a heading is large and friendly the whole thing turns into a
 * dashboard.
 */
import type { ReactNode } from 'react';

export interface HoloFrameProps {
  label?: string;
  /** Right-aligned readout in the header strip — a count, a cost, a state. */
  readout?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Rose instead of orange, for anything that wants attention. */
  alert?: boolean;
  /** Drop the brackets — for a frame inside another frame. */
  bare?: boolean;
}

export default function HoloFrame({
  label, readout, children, className = '', alert, bare,
}: HoloFrameProps) {
  const line = alert ? 'border-rose-500/50' : 'border-orange-500/40';
  const text = alert ? 'text-rose-300/80' : 'text-orange-400/70';

  return (
    <div className={`relative ${className}`}>
      {!bare && (
        <>
          {/*
            Pointer-events-none throughout. These are decoration sitting on
            top of real controls, and a bracket that swallowed a click on
            the button beneath it would be a genuinely maddening bug.
          */}
          <span className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${line}`} />
          <span className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t ${line}`} />
          <span className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l ${line}`} />
          <span className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${line}`} />
        </>
      )}

      {(label || readout) && (
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          {label && (
            <span className={`font-mono text-[9px] uppercase tracking-[0.22em] ${text}`}>
              {label}
            </span>
          )}
          {readout && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">
              {readout}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * The background: almost nothing.
 *
 * The first version had a grid, scanlines, a radial tint and a vignette.
 * Four effects, each defensible on its own, which together produced
 * texture competing with the one thing on the screen that is supposed to
 * glow. Eric's verdict was the correct one — it did not look good.
 *
 * What is left is a vertical falloff so the top of the frame is not the
 * same flat black as the bottom, and nothing else. The Phoenix supplies
 * its own light; a backdrop that also glows is two light sources fighting,
 * and the bird loses because it is made of two-pixel dots.
 *
 * ALERT IS THE ONE EXCEPTION, and it is deliberately subtle: a faint
 * rose wash at the edges, nowhere near the centre. Something is wrong
 * should change the room's temperature, not put a warning sign on it.
 */
export function HoloBackdrop({ alert }: { alert?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #070707 0%, #040404 45%, #000000 100%)',
        }}
      />
      {alert && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(244,63,94,0.10) 100%)',
          }}
        />
      )}
    </div>
  );
}

/**
 * A status dot that says what it means without colour alone.
 *
 * Colour-blind users are a large fraction of any trade workforce, and a
 * red/green dot is the classic way to tell them nothing at all. The label
 * beside it carries the meaning; the colour only reinforces it.
 */
export function StatusDot({ tone }: { tone: 'live' | 'warn' | 'bad' | 'idle' }) {
  const c = tone === 'bad' ? 'bg-rose-400'
    : tone === 'warn' ? 'bg-amber-400'
      : tone === 'live' ? 'bg-emerald-400'
        : 'bg-gray-600';
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {tone === 'live' && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${c} opacity-60 motion-reduce:hidden`} />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${c}`} />
    </span>
  );
}
