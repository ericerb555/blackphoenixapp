/**
 * When Phoenix decides you have stopped talking.
 *
 * These rules were previously the browser's business, and the browser was
 * the problem: SpeechRecognition is absent in Firefox, disabled in Brave,
 * gated behind API keys in unbranded Chromium, and its failure mode
 * everywhere is to stop instantly and say nothing. Four rounds of "it
 * cannot hear me" went by without one of them explaining itself.
 *
 * Owning the rules means they can be tested. Every number in here is a
 * judgement that will be wrong for somebody, and the alternative to
 * pinning them is tuning by talking at a browser and guessing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advance, decide, freshListen, worthAsking, pickAudioMimeType,
  AUDIO_CANDIDATES, SILENCE_RMS, SILENCE_MS, MIN_SPEECH_MS, MAX_UTTERANCE_MS,
} from '../src/app/components/phoenix/listen.ts';

/** Run a script of [rms, ms] pairs through the state machine. */
function run(script: [number, number][]) {
  let s = freshListen();
  for (const [rms, ms] of script) s = advance(s, rms, ms);
  return s;
}

const LOUD = SILENCE_RMS * 4;
const QUIET = SILENCE_RMS / 3;

/* ── waiting ─────────────────────────────────────────────────────────── */

test('silence alone never ends a clip, however long', () => {
  // An empty room must not post a second of nothing to a paid endpoint
  // every second, forever.
  const s = run([[QUIET, 10_000]]);
  assert.equal(decide(s), 'keep-waiting');
  assert.equal(s.spoke, false);
});

test('speech still in progress keeps waiting', () => {
  const s = run([[LOUD, 800], [QUIET, 300]]);
  assert.equal(decide(s), 'keep-waiting');
});

test('a pause shorter than the threshold is thinking, not finishing', () => {
  // People stop mid-sentence. Cutting them off there is how you get half
  // a question asked.
  const s = run([[LOUD, 900], [QUIET, SILENCE_MS - 100]]);
  assert.equal(decide(s), 'keep-waiting');
});

/* ── sending ─────────────────────────────────────────────────────────── */

test('speech then a real pause is a finished question', () => {
  const s = run([[LOUD, 1200], [QUIET, SILENCE_MS]]);
  assert.equal(decide(s), 'send');
});

test('speech resuming resets the pause', () => {
  // "What needs my attention … today" is one question, not two.
  const s = run([
    [LOUD, 600], [QUIET, SILENCE_MS - 200], [LOUD, 400], [QUIET, 200],
  ]);
  assert.equal(decide(s), 'keep-waiting');
  assert.equal(s.quietMs, 200, 'the pause should have restarted');
});

test('a clip that runs too long is sent rather than held forever', () => {
  const s = run([[LOUD, MAX_UTTERANCE_MS + 10]]);
  assert.equal(decide(s), 'send');
});

/* ── discarding ──────────────────────────────────────────────────────── */

test('a cough is discarded, not transcribed', () => {
  const s = run([[LOUD, MIN_SPEECH_MS - 100], [QUIET, SILENCE_MS]]);
  assert.equal(decide(s), 'discard');
});

test('a long clip of pure silence is discarded, not sent', () => {
  // The expensive mistake: overrun fires, nothing was said, and we pay to
  // transcribe thirty seconds of room tone.
  const s = run([[QUIET, MAX_UTTERANCE_MS + 10]]);
  assert.equal(decide(s), 'discard');
});

test('the threshold is a floor, not a midpoint', () => {
  // Exactly at the threshold counts as speech; room tone should sit well
  // below it rather than flickering across it.
  const at = advance(freshListen(), SILENCE_RMS, 100);
  assert.equal(at.spoke, true);
  const under = advance(freshListen(), SILENCE_RMS - 0.0001, 100);
  assert.equal(under.spoke, false);
});

/* ── what comes back ─────────────────────────────────────────────────── */

test('the politeness a transcriber invents from silence is not a question', () => {
  // Whisper-family models hallucinate these on near-silence, and they
  // arrive looking exactly like something a person said.
  for (const junk of ['Thank you.', 'you', 'Bye.', '...', 'um', 'Okay', 'yeah']) {
    assert.equal(worthAsking(junk), false, junk);
  }
});

test('a real question survives', () => {
  for (const good of ['what needs my attention', 'show me the invoices', 'invoices']) {
    assert.equal(worthAsking(good), true, good);
  }
});

test('one short word is not a question, one long one is', () => {
  assert.equal(worthAsking('no'), false);
  assert.equal(worthAsking('quotes'), true);
});

test('empty and malformed transcripts are refused', () => {
  for (const bad of ['', '   ', null, undefined, 0]) {
    assert.equal(worthAsking(bad as any), false, JSON.stringify(bad));
  }
});

/* ── the recording format ────────────────────────────────────────────── */

test('opus is preferred when the browser supports it', () => {
  assert.equal(pickAudioMimeType(() => true), AUDIO_CANDIDATES[0]);
});

test('Safari, which records mp4 and nothing else, gets mp4', () => {
  // It would otherwise be handed a webm type it cannot record, and
  // MediaRecorder throws on construction.
  const safari = (t: string) => t.startsWith('audio/mp4');
  assert.equal(pickAudioMimeType(safari), 'audio/mp4');
});

test('a browser supporting none of them yields null, not a guess', () => {
  assert.equal(pickAudioMimeType(() => false), null);
});

test('no oracle at all yields null rather than a default', () => {
  assert.equal(pickAudioMimeType(null), null);
  assert.equal(pickAudioMimeType(undefined), null);
  assert.equal(pickAudioMimeType('nonsense' as any), null);
});

test('an oracle that throws is treated as a no', () => {
  assert.equal(pickAudioMimeType(() => { throw new Error('nope'); }), null);
});

test('whatever is returned is one of the candidates', () => {
  const picked = pickAudioMimeType((t) => t.includes('ogg'));
  assert.ok(picked && (AUDIO_CANDIDATES as readonly string[]).includes(picked));
});
