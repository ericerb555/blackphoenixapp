/**
 * What Phoenix actually says out loud.
 *
 * Every character here is billed, and every one of them is heard. The cases
 * below are the ones that come out of the real answers: figures in bold,
 * bulleted lists of work requests, the occasional link, and the occasional
 * answer long enough to need cutting.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  speakableText, worthSpeaking, MAX_SPOKEN,
} from '../src/app/components/phoenix/speakableText.ts';

/* ── markdown that would be read aloud ───────────────────────────────── */

test('bold figures lose their asterisks, not their numbers', () => {
  // "asterisk asterisk eighteen thousand asterisk asterisk" is what the
  // engine says otherwise, and the number is the point of the sentence.
  assert.equal(speakableText('Four quotes out for **$18,000**.'),
    'Four quotes out for $18,000.');
  assert.equal(speakableText('_two_ invoices are *overdue*'),
    '_two_ invoices are overdue');
});

test('a bulleted list becomes sentences rather than one long clause', () => {
  const out = speakableText('Needs attention:\n- Two overdue invoices\n- One stale quote');
  assert.ok(!out.includes('-'), out);
  // The colon survives and introduces the list, rather than becoming
  // "needs attention, full stop" with a pause where the sentence runs on.
  assert.match(out, /Needs attention: Two overdue invoices\. One stale quote/);
});

test('a numbered list loses its numbering markers', () => {
  const out = speakableText('1. Chase the Smith job\n2. Send the quote');
  assert.ok(!out.includes('1.'), out);
  assert.match(out, /Chase the Smith job. Send the quote/);
});

test('headings and quote markers are silent', () => {
  assert.equal(speakableText('## Today\n> quoted line'), 'Today. quoted line');
});

/* ── the things that are genuinely unspeakable ───────────────────────── */

test('a URL becomes "a link" instead of thirty seconds of characters', () => {
  const out = speakableText('Open https://example.com/a/very/long/path?x=1 to see it.');
  assert.ok(!out.includes('http'), out);
  assert.match(out, /Open a link to see it\./);
});

test('a markdown link keeps its words and drops its target', () => {
  assert.equal(speakableText('See [the invoice](https://example.com/i/1) now.'),
    'See the invoice now.');
});

test('a fenced code block is summarised, not recited', () => {
  const out = speakableText('Here:\n```json\n{"a":1,"b":[2,3]}\n```\nThat is it.');
  assert.ok(!out.includes('{'), out);
  assert.match(out, /code block/);
});

test('inline code keeps its content but loses its backticks', () => {
  assert.equal(speakableText('The agent is `phoenix-voice` today.'),
    'The agent is phoenix-voice today.');
});

test('a table reads as a list rather than a row of pipes', () => {
  const out = speakableText('| Name | Owed |\n| --- | --- |\n| Smith | 400 |');
  assert.ok(!out.includes('|'), out);
  assert.match(out, /Smith/);
  assert.ok(!out.includes('---'), out);
});

/* ── length, which is cost ───────────────────────────────────────────── */

test('a long answer is cut at a sentence, not mid-word', () => {
  const long = ('The quote went out and the customer has not replied yet. ').repeat(60);
  const out = speakableText(long);
  assert.ok(out.length <= MAX_SPOKEN, `${out.length} characters`);
  assert.match(out, /\.$/, 'should end on a full stop');
});

test('a long answer with no sentence break still never cuts mid-word', () => {
  const out = speakableText('word '.repeat(600), { maxChars: 100 });
  assert.ok(out.length <= 100);
  assert.ok(out.endsWith('word'), `ended with "${out.slice(-12)}"`);
});

test('a short answer is left exactly alone', () => {
  assert.equal(speakableText('Nothing needs you today.'), 'Nothing needs you today.');
});

test('the cap matches what the server will accept', () => {
  // If this drifts above the route's MAX_SPEECH_CHARS the server silently
  // truncates instead, and the cut lands wherever it lands.
  assert.equal(MAX_SPOKEN, 1200);
});

/* ── not worth paying for ────────────────────────────────────────────── */

test('an empty or punctuation-only answer is not spoken', () => {
  for (const junk of ['', '   ', '\n\n', '---', '- ', null, undefined, '.']) {
    assert.equal(worthSpeaking(junk), false, JSON.stringify(junk));
  }
});

test('a real answer is worth speaking', () => {
  assert.equal(worthSpeaking('Two invoices are overdue.'), true);
  assert.equal(worthSpeaking('**$400**'), true);
});

test('no answer survives as leading punctuation', () => {
  // A list whose first line was a heading used to come out as ". Two
  // invoices", and the engine pauses awkwardly before the first word.
  const out = speakableText('\n\n- Two invoices are overdue');
  assert.ok(/^[A-Za-z0-9$]/.test(out), `started with "${out.slice(0, 8)}"`);
});
