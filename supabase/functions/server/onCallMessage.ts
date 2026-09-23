/**
 * onCallMessage — the number to dial and the words to say.
 *
 * Pure, because both fail in ways nobody sees until the night they matter. A
 * number Twilio will not accept is a 400 per message at three in the morning,
 * after the emergency has already happened; a page that does not say the trade
 * and the address is one somebody has to ring back about before they can even
 * decide to get out of bed.
 */

/**
 * A number Twilio will accept, or nothing.
 *
 * Twilio wants E.164. A number typed as "(603) 555-0101" is exactly what
 * somebody enters on the setup screen, and sending it unmodified gets a 400 per
 * message — at three in the morning, after the emergency has already happened.
 * Ten digits are assumed to be North American, which is where this company
 * works; anything else is passed through and Twilio decides.
 */
export function e164(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s.replace(/[^\d+]/g, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

/**
 * What the person reads on their phone.
 *
 * Short, because it arrives on a lock screen. The trade and the address come
 * first: those are what decide whether somebody gets out of bed and what they
 * put in the van.
 */
export function pageText(call: any): string {
  const parts = [
    `EMERGENCY${call?.trade ? ` — ${call.trade}` : ""}`,
    call?.siteAddress || "",
    call?.title || "",
  ].filter(Boolean);
  return `${parts.join(": ").slice(0, 280)}`;
}

/** What the phone call says, twice, slowly. */
export function pageSpeech(call: any): string {
  const trade = call?.trade ? `, ${call.trade}` : "";
  const where = call?.siteAddress ? `, at ${call.siteAddress}` : "";
  return `This is an emergency call from Black Phoenix${trade}${where}. `
    + `Please check your messages and respond.`;
}
