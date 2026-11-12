/**
 * Reading a model reply that is supposed to be JSON.
 *
 * Split out of ai-floorplan.tsx with no Hono import, because that file
 * cannot be loaded by node --test and this is the part worth covering: it
 * decides whether a reading happened at all, and it used to get that wrong
 * in a way that blamed the wrong thing.
 */
/**
 * How long a reading may be.
 *
 * Was 4096, which a detailed sheet overran — nine rooms, seven walls and two
 * dozen elements is a long object, and the reply came back cut off about one
 * run in six. Output tokens are billed as produced, not as allowed, so a
 * higher ceiling costs nothing on the replies that already fit and rescues
 * the ones that did not. gpt-4.1-mini will carry well beyond this.
 *
 * It is a ceiling, not a guarantee: readJsonReply still has to handle a reply
 * that hits it, because a bigger number only moves the sheet size at which
 * truncation starts.
 */
export const MAX_READING_TOKENS = 12000;

/**
 * Reading a JSON reply, and knowing when there wasn't one.
 *
 * THE BUG THIS REPLACES
 *
 * All three readers did `analysisText.match(/\{[\s\S]*\}/)` and parsed the
 * hit. That is greedy: it runs from the first brace to the LAST one anywhere
 * in the reply. On a complete answer it works. On an answer cut off at
 * `max_tokens` it finds some inner brace that happens to be the last
 * character, hands over a fragment, and the failure surfaces as "Failed to
 * parse AI analysis" over text that visibly starts as valid JSON — which is
 * where a reader stops believing the error message. Reproduced on 2026-11-12,
 * one run in six against a floor plan detailed enough to fill the reply.
 *
 * Truncation is now DETECTED rather than inferred from a parse failure.
 * OpenAI says so in `finish_reason`, and a cut-off reply is a different
 * problem from an unparseable one: the first is "the drawing had more in it
 * than one reply can carry", which a person can act on, and the second is "the
 * model answered with something else".
 *
 * The scan is brace-counting rather than a regular expression, so it stops at
 * the close of the FIRST complete object and tolerates a model that adds a
 * sentence afterwards. Quoted strings are tracked, because a brace inside a
 * room label would otherwise throw the count off.
 */
export function readJsonReply(aiResponse: any): {
  data: any | null;
  truncated: boolean;
  text: string;
} {
  const choice = aiResponse?.choices?.[0] || {};
  const message = choice.message || {};
  // `refusal` as well as `content`: a model that declines in JSON mode leaves
  // content null, and losing its sentence makes a stated refusal look blank.
  const text = String(message.content || message.refusal || '');
  const truncated = choice.finish_reason === 'length';

  const direct = (candidate: string): any | null => {
    try { return JSON.parse(candidate); } catch { return null; }
  };

  const trimmed = text.trim();
  if (!trimmed) return { data: null, truncated, text };

  // The common case once JSON is asked for: the whole reply is the object.
  const whole = direct(trimmed);
  if (whole && typeof whole === 'object') return { data: whole, truncated, text };

  // A fenced block, which some replies still wrap around it.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const inner = direct(fenced[1].trim());
    if (inner && typeof inner === 'object') return { data: inner, truncated, text };
  }

  // The first complete object, by counting braces outside of strings.
  const start = trimmed.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const found = direct(trimmed.slice(start, i + 1));
          if (found && typeof found === 'object') return { data: found, truncated, text };
          break;
        }
      }
    }
    // Never closed: the reply stopped mid-object. That IS truncation, whatever
    // finish_reason said, so it is reported as such rather than as bad JSON.
    if (depth > 0) return { data: null, truncated: true, text };
  }

  return { data: null, truncated, text };
}

/** What to tell a caller whose reading did not come back. */
export function unreadableReply(truncated: boolean): string {
  return truncated
    ? 'That drawing has more detail in it than one reading can carry, so the answer '
      + 'came back cut off and nothing has been measured. Try a single sheet, or a '
      + 'tighter crop of the part you need.'
    : 'That drawing could not be read. Nothing was measured, so no figures are '
      + 'being returned.';
}
