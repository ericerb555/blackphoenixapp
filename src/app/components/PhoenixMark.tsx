/**
 * The company mark, unaltered, visible on black.
 *
 * THREE ATTEMPTS, AND WHY THIS IS THE ONE
 *
 * BPB_phoenix_full_color_logo.png is a BLACK phoenix with a hairline orange
 * outline, on transparency. Every surface in this application is near-black,
 * so the first version put it straight on one and the bird vanished.
 *
 * The second put it on a white tile. Visible, and wrong — a bright chip on
 * a dark command centre, and not the brand.
 *
 * The third used the PNG's alpha as a CSS mask with an orange fill. On
 * Eric's browser the mask did not apply, and a mask-image that fails to
 * load does not fail safe: the element renders UNMASKED, which is a solid
 * orange block. Worse than either thing it replaced, and exactly the
 * failure the comment in that version warned about without preventing.
 *
 * SO: NO MASK, NO TILE, NO RECOLOURING. THE ARTWORK, AND A GLOW.
 *
 * `drop-shadow` is computed from the alpha channel, so the halo traces the
 * real silhouette — every feather, the flame tail, the gaps between the
 * wing fingers. The black body then reads as a shape cut out of light
 * rather than as a hole in the page, and not one pixel of the logo is
 * altered to achieve it.
 *
 * It also degrades honestly. If `filter` were unsupported the result is
 * the original artwork with no glow — dim, but still the logo. A mask that
 * fails gives you a rectangle.
 */
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo.png';

interface PhoenixMarkProps {
  /** Tailwind size for the mark, e.g. "h-11 w-11". */
  className?: string;
  /** How strongly the halo burns. 0 turns it off. */
  glow?: number;
  alt?: string;
  /**
   * Kept for the call sites that pass them. Both are now no-ops: there is
   * no tile to pad and no tile to round. Left in place rather than
   * removed so this change is one file, not five.
   */
  pad?: string;
  round?: boolean;
}

export default function PhoenixMark({
  className = 'h-11 w-11',
  glow = 1,
  alt = '',
}: PhoenixMarkProps) {
  /*
   * Two shadows, not one. A tight bright ring separates the mark from the
   * background; a wide soft one gives it the ember bloom. A single shadow
   * has to choose between looking like a sticker and looking like fog.
   */
  const halo = glow > 0
    ? `drop-shadow(0 0 2px rgba(234,88,12,${0.95 * glow})) `
      + `drop-shadow(0 0 7px rgba(234,88,12,${0.62 * glow})) `
      + `drop-shadow(0 0 18px rgba(234,88,12,${0.32 * glow}))`
    : undefined;

  return (
    <img
      src={phoenixLogo}
      alt={alt}
      className={`${className} object-contain`}
      style={{ filter: halo }}
    />
  );
}
