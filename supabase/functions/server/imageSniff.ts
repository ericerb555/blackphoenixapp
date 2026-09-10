/**
 * What a vendor-supplied file actually is, decided from its leading bytes.
 *
 * WHY NOT THE CONTENT-TYPE HEADER
 *
 * Because the header is the one part of the response its sender controls
 * completely. A misconfigured CMS serves a login page as `image/jpeg`; a hostile
 * one serves anything as anything. The bytes are the file.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * So it can be tested without a Supabase client, a storage bucket or a network.
 * It is the check standing between a vendor's URL and a public bucket our
 * customers load, which makes it the piece most worth testing and the piece
 * least able to afford a dependency.
 *
 * WHAT IS ALLOWED, AND THE ONE DELIBERATE OMISSION
 *
 * JPEG, PNG and WebP. **SVG is not an image for this purpose** — it is an XML
 * document that can carry script, and these files are served from a public
 * bucket to customers, so accepting one is stored cross-site scripting. GIF and
 * TIFF are left out for the duller reason that no supplier's product
 * photography needs them.
 */

export interface SniffedImage {
  mime: string;
  /** The extension the stored copy gets, so the bucket stays browsable. */
  ext: string;
}

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const b = bytes;
  // Twelve is the longest signature checked below (WebP's RIFF....WEBP).
  if (!b || b.length < 12) return null;

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 'P' 'N' 'G' CR LF SUB LF
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WebP: 'R' 'I' 'F' 'F' <4 byte size> 'W' 'E' 'B' 'P'
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}
