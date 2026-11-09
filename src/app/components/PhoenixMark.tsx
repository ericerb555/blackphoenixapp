/**
 * The company mark, on black, and visible.
 *
 * THE PROBLEM THIS SOLVES
 *
 * BPB_phoenix_full_color_logo.png is a BLACK phoenix with a hairline orange
 * outline, on transparency. Every surface in this application is near-black.
 * Dropped straight onto one the bird disappears and leaves a thread — which
 * is exactly what shipped on 2026-11-08 and got reported as "I do not see
 * the phoenix avatar". It was rendering perfectly; it was black on black.
 *
 * A white tile fixed the visibility and was wrong: a bright chip on a dark
 * command centre, and not the brand.
 *
 * SO THE MARK IS MASKED, NOT DRAWN
 *
 * The PNG's alpha channel becomes a CSS mask and the fill behind it is brand
 * orange. Every pixel of the silhouette is the logo's own — the wing shapes,
 * the feather gaps, the flame tail, the proportions — nothing is redrawn or
 * approximated. What is lost is the two-tone: the black body and the orange
 * outline merge into one orange form, the way any brand mark does when it is
 * set in a single colour.
 *
 * WHY NOT A FILTER
 *
 * `filter: invert()` would make the bird white AND turn its orange outline
 * cyan. Hue-rotate drifts the brand colour by a few degrees in every
 * browser. A mask is exact, and the colour is specified rather than derived.
 */
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';

export type MarkTone = 'brand' | 'light' | 'mono';

interface PhoenixMarkProps {
  /** Tailwind size for the mark itself, e.g. "h-11 w-11". */
  className?: string;
  /** Padding between the mark and the edge of its tile. */
  pad?: string;
  /** Circle for round buttons, rounded square to sit beside the crown tile. */
  round?: boolean;
  /**
   * brand — orange on black, the default and the one that belongs here.
   * light — the original full-colour artwork on a pale tile, for light grounds.
   * mono  — white on black, for places that must not carry an accent colour.
   */
  tone?: MarkTone;
  /** A ring around the tile. Off by default; buttons add their own. */
  ring?: boolean;
  alt?: string;
}

const FILL: Record<Exclude<MarkTone, 'light'>, string> = {
  brand: 'linear-gradient(145deg, #fdba74 0%, #fb923c 28%, #ea580c 68%, #c2410c 100%)',
  mono: 'linear-gradient(145deg, #ffffff 0%, #d4d4d4 100%)',
};

export default function PhoenixMark({
  className = 'h-11 w-11',
  pad = 'p-1.5',
  round = true,
  tone = 'brand',
  ring = false,
  alt = '',
}: PhoenixMarkProps) {
  const shape = round ? 'rounded-full' : 'rounded-xl';
  const ringCls = ring ? 'ring-1 ring-orange-500/40' : '';

  // The original artwork, for the pale surfaces where it was designed to sit.
  if (tone === 'light') {
    return (
      <span
        className={`inline-flex items-center justify-center ${pad} ${shape} ${ringCls} bg-gradient-to-br from-white to-[#F3F4F6] shadow-inner shadow-black/10`}
      >
        <img src={phoenixLogo} alt={alt} className={`${className} object-contain`} />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center ${pad} ${shape} ${ringCls} bg-[#0A0A0A]`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
    >
      <span
        aria-hidden="true"
        className={`${className} block`}
        style={{
          background: FILL[tone],
          // Both spellings: Safari still wants the prefix, and without it
          // the element renders as a solid orange rectangle — a far worse
          // failure than the one this replaced.
          WebkitMaskImage: `url(${phoenixLogo})`,
          maskImage: `url(${phoenixLogo})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          filter: tone === 'brand' ? 'drop-shadow(0 0 6px rgba(234,88,12,0.45))' : undefined,
        }}
      />
    </span>
  );
}
