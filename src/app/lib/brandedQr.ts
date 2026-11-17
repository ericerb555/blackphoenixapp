/**
 * A QR code with the phoenix in the middle of it.
 *
 * Eric, 2026-11-17: *"can we make a qr code i can send for a link to the junk
 * removal pricer?"* then *"imbed our logo in to it if we can"*.
 *
 * WHY THIS DID NOT ALREADY EXIST
 *
 * `QRCodeGenerator.tsx` opens with "Branded QR codes for trucks, cards,
 * flyers, yard signs" and imports the company logo. The logo is drawn once,
 * 28px high, as decoration *beside* the preview. Every code that page has ever
 * produced is a plain black-and-white square. The claim was in the file header
 * and nowhere in the output.
 *
 * WHY A LOGO IN A QR CODE SCANS AT ALL
 *
 * Reed-Solomon error correction. At level `H` roughly 30% of the modules can
 * be unreadable and the payload still recovers, which is what makes covering
 * the centre survivable rather than reckless. Three rules keep it that way:
 *
 *   - `errorCorrectionLevel: 'H'`, always. At the default `M` (~15%) a logo
 *     this size is a coin toss, and the failure is the worst kind — it scans
 *     on the phone you tested with and not on a customer's.
 *   - The patch stays at `LOGO_FRACTION` of the width. 24% of the width is
 *     ~5.8% of the area, well inside the budget, and the rest of the budget is
 *     left for the real world: a crease, a thumb, poor light, a glossy sticker.
 *   - It goes in the CENTRE and nowhere else. The three big squares at the
 *     corners are the finder patterns a scanner uses to locate the code at all;
 *     they are not part of the error-correction budget and covering one does
 *     not degrade the read, it prevents it.
 *
 * WHY THE WHITE PLATE
 *
 * The logo is a dark phoenix. Dropped straight onto the code its silhouette
 * reads as modules, and a scanner trying to recover the covered region has to
 * work against plausible-looking noise rather than a clean hole. A solid plate
 * in the light colour makes the damage honest: the decoder sees "nothing here"
 * instead of "something that might be data".
 *
 * MOBILE MATTERS HERE
 *
 * Eric sends these by text and people scan them off a phone screen held in
 * front of another phone. That is the worst case for module size, which is why
 * the default width is 1024 rather than the 300 the preview uses — a small PNG
 * blown up by a messaging app is mush.
 */

import QRCode from 'qrcode';

/** Share of the QR's width covered by the logo plate. See the header. */
export const LOGO_FRACTION = 0.24;

/** Padding around the logo inside its plate, as a share of the plate. */
export const PLATE_PADDING = 0.14;

/** Corner rounding of the plate, as a share of the plate. */
export const PLATE_RADIUS = 0.18;

/**
 * The default mark. A real file in `public/`, which matters twice over: it is
 * same-origin, so drawing it does not taint the canvas and `toDataURL` keeps
 * working — and as of 2026-11-16 it exists, which the icons referenced here
 * before then did not.
 */
export const DEFAULT_LOGO = '/pwa-icon-192.png';

export interface BrandedQrOptions {
  /** Pixel width of the square PNG. Larger than it looks like it needs to be, on purpose. */
  width?: number;
  /** Module colour. */
  dark?: string;
  /** Background colour. The plate behind the logo uses this too. */
  light?: string;
  /** Quiet-zone width in modules. Below 2 some scanners refuse the code. */
  margin?: number;
  /** Same-origin image to place in the centre, or `null` for a plain code. */
  logo?: string | null;
}

/**
 * Where the logo plate sits, and how big it is.
 *
 * Pulled out of the drawing so it can be asserted without a canvas: the
 * geometry is the part that decides whether the code still scans, and it is
 * the part a later "make the logo bigger" would quietly break.
 */
export function plateGeometry(width: number, fraction: number = LOGO_FRACTION) {
  const plate = Math.round(width * fraction);
  const offset = Math.round((width - plate) / 2);
  const pad = Math.round(plate * PLATE_PADDING);
  return {
    plate,
    offset,
    radius: Math.round(plate * PLATE_RADIUS),
    logo: plate - pad * 2,
    logoOffset: offset + pad,
    /** Share of the total area the plate covers. Level H tolerates ~0.30. */
    areaShare: (plate * plate) / (width * width),
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`the logo at ${src} could not be loaded`));
    img.src = src;
  });
}

/**
 * A PNG data URL: the code, and the phoenix in the middle of it.
 *
 * Falls back to the plain code if the logo cannot be drawn. A QR without the
 * mark still gets somebody to the pricer; a thrown error gets them nothing,
 * and this is called from a button somebody is standing there waiting on.
 */
export async function brandedQrDataUrl(
  text: string,
  options: BrandedQrOptions = {},
): Promise<string> {
  const {
    width = 1024,
    dark = '#000000',
    light = '#ffffff',
    margin = 2,
    logo = DEFAULT_LOGO,
  } = options;

  if (!String(text || '').trim()) throw new Error('nothing to encode');

  const plain = await QRCode.toDataURL(text, {
    width,
    margin,
    color: { dark, light },
    // Never lower this. The logo's whole safety margin is here.
    errorCorrectionLevel: 'H',
  });
  if (!logo) return plain;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return plain;

    const code = await loadImage(plain);
    ctx.drawImage(code, 0, 0, width, width);

    const g = plateGeometry(width);
    ctx.fillStyle = light;
    roundedRect(ctx, g.offset, g.offset, g.plate, g.plate, g.radius);
    ctx.fill();

    const mark = await loadImage(logo);
    ctx.drawImage(mark, g.logoOffset, g.logoOffset, g.logo, g.logo);

    return canvas.toDataURL('image/png');
  } catch {
    return plain;
  }
}

/**
 * Hand the browser a PNG to save.
 *
 * A data URL on an `<a download>` rather than a blob: the file is at most a
 * few hundred KB, nothing has to be revoked afterwards, and the name is what
 * ends up in the share sheet when Eric sends it on.
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
