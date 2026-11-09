/**
 * Turning an answer into something worth hearing.
 *
 * Phoenix writes for a screen: bullet lists, bold figures, the occasional
 * URL, the occasional table. Fed to a speech engine verbatim that becomes
 * "asterisk asterisk eighteen thousand asterisk asterisk", and a URL read
 * character by character takes longer than the sentence around it.
 *
 * This is also the cost boundary. Speech bills per character, so anything
 * removed here is money not spent, and the cap is what stops a long answer
 * turning into a forty-second monologue nobody listens to the end of.
 *
 * Pure, so `node --test` can hold it to the cases that actually come up.
 */

/** The server refuses more than this. Trimmed here so we choose where. */
export const MAX_SPOKEN = 1200;

/**
 * A URL is unspeakable. "h-t-t-p-s-colon-slash-slash" is thirty seconds of
 * nothing, and the listener can see the link on screen anyway.
 */
const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;

export interface SpeakableOptions {
  maxChars?: number;
}

export function speakableText(input: unknown, opts: SpeakableOptions = {}): string {
  const max = Math.max(1, opts.maxChars ?? MAX_SPOKEN);
  let t = String(input ?? '');

  // Fenced code first, whole. Reading a block of JSON aloud is worse than
  // saying nothing about it.
  t = t.replace(/```[\s\S]*?```/g, ' code block ');
  t = t.replace(/`([^`]+)`/g, '$1');

  t = t.replace(URL_RE, 'a link');

  // Headings and quote markers carry no sound.
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  t = t.replace(/^\s{0,3}>\s?/gm, '');

  // Bullets become sentences. Without the full stop the engine runs the
  // list together into one long breathless clause.
  t = t.replace(/^\s*[-*•]\s+/gm, '');
  t = t.replace(/^\s*\d+[.)]\s+/gm, '');

  // Emphasis markers, but not a lone asterisk inside a word like 4*3.
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*\n]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');

  // Markdown links: keep the words, drop the target.
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  /*
   * Table pipes. HORIZONTAL whitespace only — a plain \s also matches the
   * newline, which merged every row into a single line before the
   * separator-row cleanup below could ever see it, and "---" got read out.
   */
  t = t.replace(/[^\S\n]*\|[^\S\n]*/g, ', ');
  t = t.replace(/^[\s,:-]*$/gm, '');

  // A line break is a sentence boundary to a reader and silence to an
  // engine, so make it explicit before the whitespace collapse eats it.
  t = t.replace(/\n{2,}/g, '. ');
  t = t.replace(/\n/g, '. ');

  t = t.replace(/\s+/g, ' ').trim();
  // The substitutions above can leave ". ." runs where a bullet followed a
  // blank line.
  t = t.replace(/(\s*\.\s*){2,}/g, '. ').replace(/,\s*\./g, '.').trim();
  // A line ending in a colon already introduces what follows. The full stop
  // added above turns it into "needs attention, full stop" with an awkward
  // pause exactly where the sentence was meant to run on.
  t = t.replace(/:\s*\.\s*/g, ': ');
  t = t.replace(/^[.,\s]+/, '').trim();

  if (t.length <= max) return t;

  /*
   * Cut at a sentence if there is one in the last third, otherwise at a
   * word. Stopping mid-word sounds like the connection dropped; stopping
   * mid-sentence at least sounds like a pause.
   */
  const head = t.slice(0, max);
  const lastStop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (lastStop > max * 0.6) return head.slice(0, lastStop + 1).trim();
  const lastSpace = head.lastIndexOf(' ');
  return (lastSpace > 0 ? head.slice(0, lastSpace) : head).trim();
}

/** Whether there is anything worth sending to a paid endpoint. */
export function worthSpeaking(input: unknown): boolean {
  const t = speakableText(input);
  // One or two characters is punctuation left over from a stripped list,
  // and it would still be billed and still interrupt whatever is playing.
  return t.length > 2;
}
