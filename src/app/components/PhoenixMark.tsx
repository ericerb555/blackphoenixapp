/**
 * The company mark, on a ground it can actually be seen against.
 *
 * WHY THIS EXISTS AT ALL
 *
 * BPB_phoenix_full_color_logo.png is a BLACK phoenix with a thin orange
 * outline, on transparency. Every surface in this application is near-black.
 * Placed directly on one, the bird vanishes and leaves a hairline — which is
 * exactly what shipped on 2026-11-08 and what Eric reported as "I do not see
 * the phoenix avatar". It was rendering perfectly; it was just black on black.
 *
 * So the mark always travels with a light tile. Four call sites had the same
 * bug independently, which is the argument for one component rather than four
 * copies of a background colour.
 *
 * WHY NOT INVERT IT
 *
 * `filter: invert()` would make the bird white — and turn the orange outline
 * cyan. The brief is explicit about preserving the brand colours, and a
 * cyan-edged phoenix is not the logo. A light ground keeps every pixel of the
 * original exactly as drawn.
 */
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';

interface PhoenixMarkProps {
  /** Tailwind size for the image itself, e.g. "h-11 w-11". */
  className?: string;
  /** Padding between the mark and the edge of its tile. */
  pad?: string;
  /** Circle for buttons, rounded square to sit beside the crown tile. */
  round?: boolean;
  /** Decorative by default; the parent button carries the label. */
  alt?: string;
}

export default function PhoenixMark({
  className = 'h-11 w-11',
  pad = 'p-1.5',
  round = true,
  alt = '',
}: PhoenixMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${pad} ${
        round ? 'rounded-full' : 'rounded-xl'
      } bg-gradient-to-br from-white to-[#F3F4F6] shadow-inner shadow-black/10`}
    >
      <img src={phoenixLogo} alt={alt} className={`${className} object-contain`} />
    </span>
  );
}
