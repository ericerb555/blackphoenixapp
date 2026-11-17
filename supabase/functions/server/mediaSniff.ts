/**
 * What an uploaded media file actually is, decided from its leading bytes.
 *
 * WHY THIS EXISTS, WITH THE DATE
 *
 * Found 2026-11-17, auditing the two uploaders in this server. They did
 * opposite things.
 *
 * `image-upload.tsx` reads the bytes and refuses a file whose content
 * disagrees with its label, and says why in its own words: *"has to genuinely
 * look like one, so a script cannot arrive wearing the label."*
 *
 * `media-library.tsx` checked only `file.type` — the string the client sends —
 * against an allow list, and then stored the object with
 * `contentType: file.type`. So the bytes were never examined, and whatever the
 * uploader claimed became the header the file was served back with. The allow
 * list included `image/svg+xml`, which is an XML document that can carry
 * script.
 *
 * The good pattern already existed, documented, one file away. This is it,
 * extended to cover video so the media library can use it too.
 *
 * WHY NOT JUST IMPORT `imageSniff`
 *
 * It is deliberately images-only and deliberately narrow — JPEG, PNG, WebP —
 * because it guards a PUBLIC bucket of vendor product photography. Widening
 * it to carry video signatures for a different caller would make one module
 * answer two questions with two different risk profiles. This wraps it
 * instead: images are still its answer, and video is handled here.
 *
 * SVG IS STILL REFUSED, AND THAT IS A DECISION
 *
 * `imageSniff` refuses it for a public bucket. The media library's bucket is
 * private, so the argument is weaker — but it is not absent: the stored
 * content type is honoured when a signed URL is opened, so an SVG with script
 * runs in the storage origin, and the moment anything proxies that storage
 * through our own domain it is same-origin. `vercel.json` already proxies a
 * third-party site under `/design`, so that is not hypothetical here.
 *
 * Nobody has asked to upload an SVG to the media library. If somebody does,
 * the answer is to sanitise it on the way in or serve it as an attachment —
 * not to trust the label.
 *
 * WHAT IS NOT CLAIMED
 *
 * A signature check proves the first few bytes are right. It does not prove
 * the rest of the file is a valid image or safe to decode — that is the image
 * decoder's problem and always was. What it does prove is that a file cannot
 * arrive wearing a label its contents do not support, which is the specific
 * hole being closed.
 */
import { sniffImage } from './imageSniff.ts';

export interface SniffedMedia {
  mime: string;
  ext: string;
  kind: 'image' | 'video';
}

const starts = (b: Uint8Array, sig: number[], at = 0): boolean =>
  b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);

const ascii = (b: Uint8Array, s: string, at = 0): boolean =>
  starts(b, [...s].map((c) => c.charCodeAt(0)), at);

/**
 * Video, by signature.
 *
 * MP4 and MOV share the ISO base media format: bytes 4–7 are `ftyp`, and the
 * brand that follows says which. `qt  ` is QuickTime; everything else in
 * common use is served correctly as MP4, so an unknown brand is treated as
 * MP4 rather than refused — the container is the same and the risk does not
 * come from the brand.
 *
 * WebM and MKV are both EBML (`1A 45 DF A3`) and genuinely indistinguishable
 * this early. WebM is the one browsers play, so that is what it is called.
 */
function sniffVideo(b: Uint8Array): SniffedMedia | null {
  if (ascii(b, 'ftyp', 4)) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return brand.startsWith('qt')
      ? { mime: 'video/quicktime', ext: 'mov', kind: 'video' }
      : { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
  }
  if (starts(b, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  }
  // RIFF....AVI␠
  if (ascii(b, 'RIFF') && ascii(b, 'AVI', 8)) {
    return { mime: 'video/x-msvideo', ext: 'avi', kind: 'video' };
  }
  if (ascii(b, 'FLV')) {
    return { mime: 'video/x-flv', ext: 'flv', kind: 'video' };
  }
  return null;
}

/** Signatures `imageSniff` leaves out, which the media library did accept. */
function sniffExtraImage(b: Uint8Array): SniffedMedia | null {
  if (ascii(b, 'GIF8')) return { mime: 'image/gif', ext: 'gif', kind: 'image' };
  if (ascii(b, 'BM')) return { mime: 'image/bmp', ext: 'bmp', kind: 'image' };
  // TIFF, little- and big-endian.
  if (starts(b, [0x49, 0x49, 0x2a, 0x00]) || starts(b, [0x4d, 0x4d, 0x00, 0x2a])) {
    return { mime: 'image/tiff', ext: 'tiff', kind: 'image' };
  }
  return null;
}

/**
 * What this file is, or `null` if it is not something we store.
 *
 * The CLAIMED type is deliberately not a parameter. `image-upload` takes one
 * because it has an SVG path that needs it; here there is no such path, so
 * there is nothing the claim could be used for except to be trusted.
 */
export function sniffMedia(bytes: Uint8Array): SniffedMedia | null {
  const image = sniffImage(bytes);
  if (image) return { mime: image.mime, ext: image.ext, kind: 'image' };
  return sniffExtraImage(bytes) ?? sniffVideo(bytes);
}
