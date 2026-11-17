/**
 * Saved QR codes, and what goes out when one is sent.
 *
 * Eric: "where is the qr codes where can i find them? can i email and sms them
 * from the app?" — then, on the text: "send the destination url in the text."
 *
 * TWO THINGS WERE WRONG, AND THE FIRST WAS INVISIBLE
 *
 * `QRCodeGenerator.tsx` has always posted its codes to `/qr-codes` and read
 * them back from there, with a comment saying they are "durable and feed
 * Revenue Analytics". No such route existed. The save is
 * `.catch(console.error)` and the load sits in a try/catch, so both failed
 * silently and every code lived in one browser's `localStorage` under
 * `bp_qr_codes`. RevenueAnalytics reads the same missing route and gets
 * nothing. That is why this module exists at all: sending a code requires the
 * server to have it.
 *
 * WHY THE TEXT CARRIES THE DESTINATION AND NOT THE IMAGE
 *
 * Eric's call, and it is the right one. A QR code is a way to get a URL into a
 * phone that cannot type it — a camera pointed at a poster. Texting somebody a
 * PICTURE of a QR code asks them to scan their own screen with their own
 * phone, which is a puzzle rather than a link. So the SMS carries the
 * destination itself and the QR image stays where it is useful: in an email,
 * attached, ready to be dropped onto a flyer or a truck door.
 *
 * WHY THERE IS A SIZE CAP
 *
 * A code is stored as a `dataUrl`, which is the PNG inline. This codebase
 * already has `stripBase64` to keep exactly that out of records, because a
 * data URI on a stored object is how one row becomes a megabyte. A branded QR
 * PNG is a few kilobytes; anything far past that is not a QR code, and is
 * refused rather than filed.
 */

/** Where the company's codes live. One list, shared by the office. */
export const QR_CODES_KEY = "qr_codes:default";

/** More than this and somebody is looping, not designing. */
export const MAX_SAVED_CODES = 60;

/**
 * A QR PNG that needs more than this is not a QR PNG.
 *
 * 256 KB against a typical 2–8 KB. Generous enough for a large, high-contrast
 * render with a logo; nowhere near enough to be a photograph somebody pasted
 * into the wrong field.
 */
export const MAX_DATA_URL_BYTES = 256 * 1024;

export interface QRCode {
  id: string;
  label: string;
  /** Where scanning it takes you. The thing a text message should carry. */
  url: string;
  dataUrl: string;
  fgColor?: string;
  bgColor?: string;
  createdAt?: string;
}

/** A `data:image/...;base64,` URI and nothing else. */
export function isImageDataUrl(value: unknown): boolean {
  return /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(
    String(value || "").trim(),
  );
}

/**
 * An http(s) destination, or nothing.
 *
 * Checked because the destination is what goes into a text message under this
 * company's name. A `javascript:` or `data:` URL in that position is a link we
 * sent a customer, and the fact that it was typed into our own admin screen is
 * not a reason to pass it along.
 */
export function isSendableUrl(value: unknown): boolean {
  const s = String(value || "").trim();
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    const u = new URL(s);
    return Boolean(u.hostname) && !u.hostname.includes(" ");
  } catch {
    return false;
  }
}

/**
 * What may be stored. Anything unusable is dropped rather than refused.
 *
 * Dropping rather than refusing because this arrives as the whole list on
 * every save: one malformed entry must not cost somebody the other fifty-nine
 * codes they have built up.
 */
export function sanitizeCodes(input: unknown): QRCode[] {
  const list = Array.isArray(input) ? input : [];
  const out: QRCode[] = [];

  for (const raw of list) {
    const id = String((raw as any)?.id || "").trim();
    const url = String((raw as any)?.url || "").trim();
    const dataUrl = String((raw as any)?.dataUrl || "").trim();
    if (!id || !isSendableUrl(url) || !isImageDataUrl(dataUrl)) continue;
    if (dataUrl.length > MAX_DATA_URL_BYTES) continue;

    out.push({
      id,
      label: String((raw as any)?.label || "Untitled").slice(0, 120),
      url,
      dataUrl,
      fgColor: String((raw as any)?.fgColor || "").slice(0, 32) || undefined,
      bgColor: String((raw as any)?.bgColor || "").slice(0, 32) || undefined,
      createdAt: String((raw as any)?.createdAt || "") || undefined,
    });
    if (out.length >= MAX_SAVED_CODES) break;
  }
  return out;
}

/**
 * The text message. The destination, and nothing that needs scanning.
 *
 * Short on purpose: a carrier splits past 160 characters and a split marketing
 * text reads as spam. The label is included because "here is that link" with
 * no idea which link is a message people delete.
 */
export function smsTextFor(code: QRCode, companyName = "Black Phoenix Builds"): string {
  const label = String(code.label || "").trim();
  const lead = label && label.toLowerCase() !== "untitled"
    ? `${companyName}: ${label}`
    : `${companyName}`;
  return `${lead}\n${code.url}`;
}

/** Subject line for the email that carries the printable code. */
export function emailSubjectFor(code: QRCode, companyName = "Black Phoenix Builds"): string {
  const label = String(code.label || "").trim();
  return label && label.toLowerCase() !== "untitled"
    ? `${companyName} QR code: ${label}`
    : `${companyName} QR code`;
}

/** A filename somebody can find again in their downloads folder. */
export function attachmentNameFor(code: QRCode): string {
  const safe = String(code.label || "qr-code").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `BP-QR-${safe || "code"}.png`;
}

/**
 * The email body.
 *
 * Carries the image AND the destination, because the two are useful to
 * different people: whoever is printing it needs the PNG, and whoever is
 * checking it points at the right place needs to see the URL without scanning
 * anything.
 *
 * The URL is interpolated into an href and as text. It has already been
 * through `isSendableUrl`, which is what keeps a `javascript:` destination out
 * of a link this company sends.
 */
export function emailHtmlFor(code: QRCode, companyName = "Black Phoenix Builds"): string {
  const label = String(code.label || "QR code");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px">
  <h2 style="margin:0 0 4px">${esc(label)}</h2>
  <p style="margin:0 0 16px;color:#555">A QR code from ${esc(companyName)}, attached as a PNG for printing.</p>
  <p style="margin:0 0 16px"><img src="${esc(code.dataUrl)}" alt="${esc(label)} QR code" width="220" height="220" style="display:block;border:1px solid #eee;border-radius:8px" /></p>
  <p style="margin:0 0 8px;color:#555">It points to:</p>
  <p style="margin:0 0 20px"><a href="${esc(code.url)}" style="color:#ea580c;font-weight:600">${esc(code.url)}</a></p>
  <p style="margin:0;color:#888;font-size:12px">Print it on a flyer, a card, a sign or the truck. Scanning it opens the link above.</p>
</div>`;
}
