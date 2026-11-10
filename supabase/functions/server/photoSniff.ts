/**
 * What a job-site photograph actually is, decided from its leading bytes.
 *
 * WHY THIS EXISTS SEPARATELY FROM `imageSniff.ts`
 *
 * `imageSniff.ts` is shared by company logos, Exchange logos and vendor product
 * images, and its own comment ties its narrowness to that purpose: "GIF and
 * TIFF are left out for the duller reason that no supplier's product
 * photography needs them." Entirely true of a supplier's catalogue. Not true of
 * a phone held up to a half-demolished bathroom, which produces **HEIC** on
 * every iPhone sold since 2017.
 *
 * Widening the shared module would quietly change what five other routes accept
 * into public buckets. So this wraps it: `sniffImage` first for the three it
 * knows, then the formats a camera roll actually adds.
 *
 * WHY IT IS ITS OWN FILE, for the same reason `imageSniff.ts` is
 *
 * So it can be tested without a Supabase client, a storage bucket or a network.
 * `quoteAttachments.ts` imports `npm:hono` and the Supabase client, so nothing
 * inside it can be reached from the Node test runner. This check is the one
 * standing between a phone and a stored file, which makes it the piece most
 * worth testing and the piece least able to afford a dependency.
 *
 * WHAT IT IS FIXING, RECORDED BECAUSE IT SHIPPED BROKEN ONCE
 *
 * The first version of the quote attachments route gated on the DECLARED
 * content type and then sniffed. Eric pressed the button on his phone and
 * nothing attached, twice over:
 *
 *  1. An iOS library photo arrives as `image/heic`, which was not on the
 *     allowlist, so every upload from the device the feature exists for was
 *     answered 400 before its bytes were read.
 *
 *  2. The allowlist admitted `image/gif`, `image/bmp` and `image/tiff`, which
 *     were then handed to a sniffer that knows only JPEG, PNG and WebP — so
 *     they failed a second check reporting "not a readable image", which was a
 *     refusal and a lie. An allowlist that disagrees with its own validator is
 *     worse than no allowlist, because it reads as permission.
 *
 * Hence: one function, the bytes decide, and the set it admits is exactly the
 * set it can verify.
 */
import { sniffImage } from './imageSniff.ts';

export interface SniffedPhoto {
  mime: string;
  /** The extension the stored copy gets, so the bucket stays browsable. */
  ext: string;
}

/**
 * HEIC/HEIF brands that mean "a still image", and the ones that mean "an image
 * sequence". Both are accepted — an iPhone burst or a Live Photo still is one —
 * and both store as `.heic`.
 *
 * `avif` is deliberately absent. It is the same container with a different
 * codec, nothing in this flow produces one, and an unrecognised brand should
 * fail closed rather than be stored under a type that may not decode.
 */
const HEIC_STILL = new Set(['heic', 'heix', 'heim', 'heis', 'mif1']);
const HEIC_SEQUENCE = new Set(['hevc', 'hevx', 'hevm', 'hevs', 'msf1']);

export function sniffPhoto(b: Uint8Array | null | undefined): SniffedPhoto | null {
  // JPEG, PNG and WebP, from the shared module that five other routes rely on.
  const known = b ? sniffImage(b) : null;
  if (known) return known;

  // Twelve is the longest run inspected below (HEIC's ftyp box plus brand).
  if (!b || b.length < 12) return null;

  // GIF: 'G' 'I' 'F' '8' then '7' or '9' then 'a'
  if (
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  /**
   * HEIC / HEIF — ISO base media format:
   *
   *     00 00 00 ?? 66 74 79 70 <brand>
   *                 f  t  y  p
   *
   * The box length is the first four bytes and varies by encoder, so matching
   * starts at offset 4 rather than 0. The brand at offset 8 says which flavour.
   */
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]).toLowerCase();
    if (HEIC_STILL.has(brand)) return { mime: 'image/heic', ext: 'heic' };
    if (HEIC_SEQUENCE.has(brand)) return { mime: 'image/heif', ext: 'heic' };
  }

  return null;
}
