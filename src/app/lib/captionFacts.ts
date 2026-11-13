/**
 * Checking a written caption against the facts it was given.
 *
 * WHY A CHECK AND NOT JUST AN INSTRUCTION
 *
 * `BeforeAfterCreator` tells the writer, in the prompt, to invent nothing: no
 * customer quotes, no timescales, no prices, no awards. That is the right
 * thing to ask for and it is only a request. Nothing read the answer.
 *
 * Four times in two days a prompt instruction on this platform turned out not
 * to be a control. The blueprint reader was told "return ONLY the JSON object"
 * and answered in prose, then later wrote `"width": 11 * 12` into a numeric
 * field. The floor-plan reader was told to be precise and guessed the building
 * size three different ways. And a route returned an invented 1,500 sq ft
 * house under `success: true` because nothing checked what came back.
 *
 * `tasks/phoenix-ai-audit.md` already drew the conclusion from the Exchange
 * assistant, which drops any listing id the model did not retrieve:
 * "constraining the output is worth more than sanitising the input". This is
 * that, for copy.
 *
 * WHAT MAKES IT CHECKABLE
 *
 * The ground truth is sitting right there. The user types what the job was,
 * and the writer is told to use only that — so anything specific in the
 * caption that is NOT in those facts was made up. No model is needed to see
 * it, and the test is exact rather than a list of banned words.
 *
 * WHAT IS DELIBERATELY NOT CHECKED
 *
 * Materials. The brief tells the writer to describe the change visible between
 * the two photographs, and a photograph of a kitchen plainly shows cabinets —
 * so flagging "cabinets" would punish the writer for doing as it was told.
 * Nothing here can tell a material read off the picture from one invented, and
 * a check that fires on correct work is a check somebody deletes.
 */

export type CaptionFault = 'number' | 'quote' | 'claim' | 'reaction';

export interface CaptionFinding {
  kind: CaptionFault;
  /** The offending text, for showing the user what was struck out. */
  found: string;
  /** One line, written to be read by the person who typed the facts. */
  why: string;
}

/**
 * Units that turn a spelled number into a measurement.
 *
 * Deliberately the things a caption could lie about and a customer could act
 * on: how long it took, how big it was, how much of it there was. Not an
 * exhaustive noun list — anything missed simply falls back to being unchecked,
 * which is where every spelled number sat before this existed.
 */
const UNITS = "(?:weeks?|days?|months?|years?|hours?|minutes?|weekends?|"
  + "feet|foot|ft|inch(?:es)?|yards?|metres?|meters?|square ?(?:feet|foot|ft)|"
  + "sq ?ft|bed(?:room)?s?|bath(?:room)?s?|rooms?|storeys?|stories|floors?|"
  + "coats?|cabinets?|windows?|doors?|units?|jobs?|homes?|houses?|projects?|"
  + "dollars?|thousand|k)";

/** Words for numbers, so "two weeks" is caught as surely as "2 weeks". */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100, thousand: 1000,
};

/**
 * Every number a piece of text asserts.
 *
 * Hashtags are stripped first. `#Kitchen2026` is a label rather than a claim,
 * and treating the year in one as an invented figure would fire on ordinary
 * posts — the quickest way to get a check like this switched off.
 */
export function numbersIn(text: string): Set<number> {
  const cleaned = String(text || '')
    .replace(/#[\w-]+/g, ' ')          // hashtags are labels, not assertions
    .replace(/https?:\/\/\S+/g, ' ')   // nor are urls
    .toLowerCase();

  const found = new Set<number>();

  // Digits, with thousands separators and currency stripped.
  for (const raw of cleaned.match(/\d[\d,]*(?:\.\d+)?/g) || []) {
    const n = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(n)) found.add(n);
  }

  /*
   * Words only when they are measuring something.
   *
   * "Two weeks" is a claim about the job. "Two very different mornings" is a
   * turn of phrase, and flagging it would strike out a perfectly honest
   * caption — which is how a check like this gets switched off. So a spelled
   * number counts only when a unit follows it within a word or two, which is
   * what separates a measurement from a figure of speech. Digits above are
   * treated as claims unconditionally, because nobody writes "$15,000" or
   * "2 weeks" rhetorically.
   */
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b(?:\\s+\\w+){0,2}\\s+${UNITS}`).test(cleaned)) found.add(value);
  }

  return found;
}

/**
 * Claims the brief rules out, each only a fault when the facts do not say it.
 *
 * "Licensed and insured" is a perfectly good line when it is true — the rule
 * is not that it may never appear, it is that the writer may not be the one to
 * decide it. Typing it into the facts is how it becomes sayable, which is
 * exactly what the screen beside the box promises.
 */
const CLAIM_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\baward[\s-]?winning\b|\bawards?\b/, label: 'an award' },
  { re: /\b\d+[\s-]?star\b|\bfive[\s-]?star\b|\brated\b|\breviews?\b/, label: 'a rating or reviews' },
  { re: /\bguarantee[ds]?\b|\bwarrant(?:y|ies|ied)\b/, label: 'a guarantee' },
  { re: /\blicen[sc]ed\b|\binsured\b|\bcertified\b|\baccredited\b/, label: 'a credential' },
  { re: /\byears? (?:of )?(?:experience|in business)\b|\bsince \d{4}\b/, label: 'years in business' },
  { re: /\bnumber one\b|\b#1\b|\bbest in\b|\bvoted\b|\btrusted by\b/, label: 'a ranking' },
];

/** A customer's feelings, which nobody reported to us. */
const REACTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bthrilled\b|\bdelighted\b|\becstatic\b|\boverjoyed\b/, label: 'a reaction' },
  { re: /\bcould ?n.?t be happier\b|\bover the moon\b|\bblown away\b/, label: 'a reaction' },
  { re: /\bthey (?:loved|love|adored)\b|\bclient (?:loved|loves)\b|\bcustomer (?:loved|loves)\b/, label: 'a reaction' },
  { re: /\brav(?:ed|ing|es)\b|\btestimonial\b/, label: 'a testimonial' },
];

const norm = (s: unknown) => String(s || '').toLowerCase();

/**
 * Everything in this caption that the facts do not support.
 *
 * An empty list means it is safe to show. It does NOT mean the caption is
 * true — only that it asserts nothing specific beyond what it was given,
 * which is the promise the screen actually makes.
 */
export function screenCaption(caption: string, facts: string): CaptionFinding[] {
  const text = String(caption || '');
  if (!text.trim()) return [];
  const factText = norm(facts);
  const lower = norm(text);
  const findings: CaptionFinding[] = [];

  // 1. Numbers. The strongest rule, because it needs no vocabulary: a figure
  //    that is not in the facts came from nowhere.
  const known = numbersIn(factText);
  for (const n of numbersIn(text)) {
    if (!known.has(n)) {
      findings.push({
        kind: 'number',
        found: String(n),
        why: `"${n}" is not in what you wrote about the job. Prices, timescales and `
          + 'sizes have to come from you.',
      });
    }
  }

  // 2. Quoted speech. No quotes were supplied, so any sentence in quotation
  //    marks is a testimonial the writer composed. Five words or more: a
  //    testimonial is a sentence, where a short quoted phrase is usually the
  //    brief being repeated back — "open it up" is not somebody's review.
  for (const m of text.match(/[“"]([^”"]{3,200})[”"]/g) || []) {
    const inner = m.slice(1, -1).trim();
    if (inner.split(/\s+/).length >= 5 && !factText.includes(norm(inner))) {
      findings.push({
        kind: 'quote',
        found: inner.length > 60 ? `${inner.slice(0, 60)}…` : inner,
        why: 'That is a quote from somebody. No one said it — nothing you typed contains it.',
      });
    }
  }

  // 3 & 4. Claims and reactions, each excused when the facts already say it.
  for (const { re, label } of CLAIM_PATTERNS) {
    const hit = lower.match(re);
    if (hit && !re.test(factText)) {
      findings.push({
        kind: 'claim',
        found: hit[0],
        why: `That claims ${label}. Add it to the job notes if it is true and it can be said.`,
      });
    }
  }
  for (const { re, label } of REACTION_PATTERNS) {
    const hit = lower.match(re);
    if (hit && !re.test(factText)) {
      findings.push({
        kind: 'reaction',
        found: hit[0],
        why: `That reports ${label} from a customer. Nobody told us how they felt.`,
      });
    }
  }

  return findings;
}

/** Convenience for a caller holding title, body and hashtags separately. */
export function screenChannel(
  channel: { title?: string; body?: string; hashtags?: string[] } | null | undefined,
  facts: string,
): CaptionFinding[] {
  const parts = [channel?.title, channel?.body, (channel?.hashtags || []).join(' ')];
  const seen = new Set<string>();
  const out: CaptionFinding[] = [];
  for (const part of parts) {
    for (const f of screenCaption(String(part || ''), facts)) {
      const key = `${f.kind}:${f.found}`;
      if (seen.has(key)) continue;      // the same invention in title and body is one fault
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

/** One line naming what was struck out, for a toast. */
export function describeFindings(findings: readonly CaptionFinding[]): string {
  if (!findings.length) return '';
  const bits = findings.slice(0, 3).map((f) => `"${f.found}"`).join(', ');
  const more = findings.length > 3 ? ` and ${findings.length - 3} more` : '';
  return `${bits}${more} — not in what you wrote, so it was not shown.`;
}
