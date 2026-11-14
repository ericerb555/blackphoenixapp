/**
 * Text into HTML, for every template this server builds.
 *
 * Eric, 2026-11-14: "sanitize every user input before it enters any template
 * at all strip the html escape special characters", and "render user content
 * as plain text, never as raw html".
 *
 * WHY THIS FILE EXISTS RATHER THAN A THIRD LOCAL COPY
 *
 * There were two: one in `exchangeClaimRoutes.tsx` and one in
 * `onCallPaging.tsx`, both correct, both private to their file. So every new
 * template either imported nothing and escaped nothing, or grew a third copy.
 * `fulfillment.tsx` took the first path — a shopper's own `customerName` went
 * into an order email unescaped, which means a name of
 * `<a href="https://evil">click</a>` arrives as a live link.
 *
 * ORDER MATTERS AND IS THE CLASSIC BUG
 *
 * Ampersand first. Escaping it after the angle brackets would re-escape the
 * entities this function just produced — `&lt;` becomes `&amp;lt;` and the
 * customer reads the escape codes instead of their own name.
 *
 * WHAT THIS IS NOT
 *
 * Not a sanitiser. It does not "clean" markup, it removes the ability of a
 * string to BE markup. That is the right tool for a name, an address, a note,
 * a tracking number — which is nearly everything. Where real markup has to
 * survive, the answer is an allowlist parser, not a cleverer escape; see
 * `src/app/lib/sanitizeHtml.ts` for that case.
 */

/** Text that must never become markup. The default for every interpolation. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The same, for a value landing inside an attribute.
 *
 * Backtick and equals as well: both can delimit an attribute during a
 * parser's error recovery, so `a=b onclick=evil()` in an unquoted attribute
 * becomes two attributes rather than one value.
 */
export function escapeAttr(value: unknown): string {
  return escapeHtml(value)
    .replace(/`/g, "&#96;")
    .replace(/=/g, "&#61;");
}

/**
 * Text into HTML, keeping the line breaks a person typed.
 *
 * A customer's note loses its shape entirely when newlines are dropped, and
 * the usual fix — interpolating it raw so the breaks "work" — is the bug this
 * module exists to prevent. Escape everything, then add back only `<br>`.
 */
export function escapeHtmlWithBreaks(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}
