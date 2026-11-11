/**
 * What you are actually approving.
 *
 * THE QUEUE SHOWED ONE LINE, AND THE LINE WAS WRITTEN BY THE MODEL.
 *
 * Every proposal arrived as a summary the assistant composed about itself,
 * with the parameters — the real content — carried to the browser and never
 * rendered. For "mark three alerts as read" that was survivable. It stops
 * being survivable the moment the queue holds an email to a customer, an
 * invoice for four thousand dollars, or a price on a quote: approving a
 * message you cannot read is not consent to send it, and a summary is not
 * evidence of what the parameters say.
 *
 * So this turns the parameters into something a person can read before they
 * tap, and it is deliberately boring: labels, text, and the numbers spelled
 * out.
 *
 * NOTHING HERE IS EVER RENDERED AS HTML. An email body is model-authored
 * markup; injecting it to make the preview pretty would run whatever it
 * contains inside the console of the person approving it. It is shown as
 * text, which is also the honest thing to show — the words are what is being
 * approved, not the styling.
 */

export interface DetailLine {
  label: string;
  value: string;
  /** Long enough to want its own block rather than a single line. */
  block: boolean;
}

/** Keys worth reading as prose rather than as a value. */
const PROSE_KEYS = new Set(['html', 'body', 'note', 'message', 'description', 'text', 'summary']);

/** Keys that are never worth showing to a person deciding. */
const NOISE_KEYS = new Set(['idempotencyKey', 'requestId', 'traceId']);

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

/**
 * HTML as the recipient will read it, near enough.
 *
 * Block tags become line breaks so a paragraph does not run into the next
 * one, every other tag goes, and the handful of entities that actually appear
 * in these templates are decoded. It is not a renderer and does not try to
 * be: it exists so somebody can check the name, the number and the tone
 * before a message leaves the company.
 */
export function plainText(html: unknown): string {
  let s = String(html ?? '');
  if (!s) return '';
  // Script and style content is not text the recipient reads, and showing it
  // would bury the message in markup.
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote)>/gi, '\n');
  s = s.replace(/<li\b[^>]*>/gi, '• ');
  s = s.replace(/<[^>]+>/g, '');
  for (const [entity, char] of Object.entries(ENTITIES)) s = s.split(entity).join(char);
  s = s.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Three blank lines in a row is template padding, not emphasis.
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** 'leadEmail' → 'Lead email'. The keys are camelCase and people are not. */
export function labelFor(key: string): string {
  const spaced = String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The parameters of a proposal, as lines a person can read.
 *
 * Order is the order the action's own parameters arrived in, which is the
 * order its handler documents them — not alphabetical, which would separate
 * a quantity from its price.
 */
export function detailLines(params: unknown): DetailLine[] {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return [];
  const out: DetailLine[] = [];

  for (const [key, raw] of Object.entries(params as Record<string, unknown>)) {
    if (NOISE_KEYS.has(key)) continue;
    if (raw === null || raw === undefined || raw === '') continue;

    if (PROSE_KEYS.has(key)) {
      const text = plainText(raw);
      if (text) out.push({ label: labelFor(key), value: text, block: true });
      continue;
    }

    if (Array.isArray(raw)) {
      // Line items are the case that matters: a list of objects, each of
      // which is a thing being charged for. One per line, so the arithmetic
      // can be checked by eye.
      const rows = raw.map((item) => (
        item && typeof item === 'object'
          ? Object.entries(item as Record<string, unknown>)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${labelFor(k)}: ${String(v)}`)
            .join('  ·  ')
          : String(item)
      ));
      out.push({ label: `${labelFor(key)} (${raw.length})`, value: rows.join('\n'), block: raw.length > 1 });
      continue;
    }

    if (typeof raw === 'object') {
      const rows = Object.entries(raw as Record<string, unknown>)
        .map(([k, v]) => `${labelFor(k)}: ${String(v)}`);
      out.push({ label: labelFor(key), value: rows.join('\n'), block: rows.length > 1 });
      continue;
    }

    const text = String(raw);
    out.push({ label: labelFor(key), value: text, block: text.length > 90 });
  }

  return out;
}
