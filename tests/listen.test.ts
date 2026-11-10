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
  threshold, isRepeat, remember, IDLE_RESET_MS, SPEECH_OVER_FLOOR, WARMUP_MS,
  FLOOR_MAX, REPEAT_WINDOW_MS,
} from '../src/app/components/phoenix/listen.ts';

/** Run a script of [rms, ms] pairs through the state machine. */
function run(script: [number, number][]) {
  let s = freshListen();
  for (const [rms, ms] of script) s = advance(s, rms, ms);
  return s;
}

const LOUD = SILENCE_RMS * 4;
const QUIET = SILENCE_RMS / 3;

/**
 * A clip begins in a pause. Always, in practice.
 *
 * The microphone opens before anybody has pressed talk and spoken, and a
 * following clip can only begin once SILENCE_MS of quiet has ended the one
 * before it. The detector relies on that: it spends WARMUP_MS measuring the
 * room instead of judging it, and a script that opens mid-shout is testing a
 * situation the recorder does not produce.
 */
const PAUSE: [number, number] = [QUIET, WARMUP_MS + 100];

/**
 * Speech, with its syllables.
 *
 * A flat line at speaking volume is a TONE, and this detector deliberately
 * refuses to call a tone speech — that is the whole mechanism by which a fan
 * stops being mistaken for a person. So the earlier scripts, which held one
 * level steady for a second and called it a sentence, were describing a
 * sound nobody makes. Real speech dips toward the room between syllables
 * several times a second, and those dips are what keep the floor low.
 */
function said(totalMs: number): [number, number][] {
  const out: [number, number][] = [];
  for (let t = 0; t < totalMs; t += 230) out.push([LOUD, 160], [QUIET, 70]);
  return out;
}

/* ── waiting ─────────────────────────────────────────────────────────── */

test('silence alone is never sent, however long', () => {
  // An empty room must not post a second of nothing to a paid endpoint
  // every second, forever. It is discarded rather than held: see
  // IDLE_RESET_MS, which recycles the recorder instead of letting it carry
  // thirty seconds of nothing around.
  const s = run([[QUIET, 10_000]]);
  assert.equal(decide(s), 'discard');
  assert.equal(s.spoke, false);
});

test('a quiet moment before you speak is not given up on', () => {
  const s = run([[QUIET, IDLE_RESET_MS - 500]]);
  assert.equal(decide(s), 'keep-waiting');
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
  const s = run([PAUSE, ...said(1200), [QUIET, SILENCE_MS]]);
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
  const s = run([PAUSE, ...said(MAX_UTTERANCE_MS + 500)]);
  assert.ok(s.elapsedMs >= MAX_UTTERANCE_MS);
  assert.equal(decide(s), 'send');
});

/* ── discarding ──────────────────────────────────────────────────────── */

test('a cough is discarded, not transcribed', () => {
  const s = run([PAUSE, [LOUD, MIN_SPEECH_MS - 100], [QUIET, SILENCE_MS]]);
  assert.equal(s.spoke, true, 'it was heard');
  assert.equal(decide(s), 'discard', 'and still not worth paying for');
});

test('a long clip of pure silence is discarded, not sent', () => {
  // The expensive mistake: overrun fires, nothing was said, and we pay to
  // transcribe thirty seconds of room tone.
  const s = run([[QUIET, MAX_UTTERANCE_MS + 10]]);
  assert.equal(decide(s), 'discard');
});

test('the threshold is a floor, not a midpoint', () => {
  // Exactly at the threshold counts as speech; just under it does not. Both
  // measured after a pause, because during the warm-up nothing counts as
  // speech at all — see PAUSE.
  const quietRoom = run([PAUSE]);
  assert.equal(threshold(quietRoom), SILENCE_RMS, 'a quiet room leaves the absolute floor in charge');
  assert.equal(advance(quietRoom, SILENCE_RMS, 100).spoke, true);
  assert.equal(advance(quietRoom, SILENCE_RMS - 0.0001, 100).spoke, false);
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

/* ── the room, as opposed to you ──────────────────────────────────────── */

/**
 * These are the tests for the bug that cost money. Automatic gain control
 * amplifies a quiet room toward speech level, the old fixed threshold sat
 * below the result, and the detector believed somebody had been talking for
 * thirty seconds — twice in one session, each time sending a clip of noise
 * to a paid transcriber which answered with an invented sentence.
 */

test('a noisy room is not speech, however long it goes on', () => {
  // Steadily above the absolute floor, which is exactly what AGC produces.
  const room = SILENCE_RMS * 1.6;
  const s = run([[room, 30_000]]);
  assert.equal(s.spoke, false, 'room tone must never read as somebody talking');
  assert.equal(decide(s), 'discard');
});

test('speech in that same noisy room is still heard', () => {
  const room = SILENCE_RMS * 1.6;
  let s = freshListen();
  // Long enough for the floor to have settled on the room.
  s = advance(s, room, 20_000);
  // A voice sits well above the room it is spoken in.
  s = advance(s, room * SPEECH_OVER_FLOOR * 1.5, 1200);
  assert.equal(s.spoke, true);
  s = advance(s, room, SILENCE_MS);
  assert.equal(decide(s), 'send');
});

test('the floor follows the room down quickly, so the gate re-arms', () => {
  let s = freshListen();
  s = advance(s, SILENCE_RMS * 3, 20_000);   // a noisy spell raises it
  const raised = s.floor;
  s = advance(s, 0.0005, 600);               // then the room goes quiet
  assert.ok(s.floor < raised / 2, 'a room that falls silent is believed at once');
});

test('the floor never rises so far that a voice cannot clear it', () => {
  // A genuinely loud room. Deaf is the worse failure: see FLOOR_MAX.
  const s = run([[0.4, 60_000]]);
  assert.ok(s.floor <= 0.4);
  assert.equal(threshold(s), Math.max(SILENCE_RMS, FLOOR_MAX * SPEECH_OVER_FLOOR));
});

test('a frame-dropping machine reaches the same conclusion', () => {
  // One coarse step against many fine ones. The exponentials are expressed
  // in dt for exactly this reason.
  const coarse = run([[SILENCE_RMS * 1.6, 2000]]);
  let fine = freshListen();
  for (let i = 0; i < 125; i++) fine = advance(fine, SILENCE_RMS * 1.6, 16);
  assert.ok(Math.abs(coarse.floor - fine.floor) < 0.0005);
  assert.equal(coarse.spoke, fine.spoke);
});

test('a level of NaN is silence, not a crash', () => {
  const s = run([[Number.NaN, 500]]);
  assert.equal(s.spoke, false);
  assert.equal(s.quietMs, 500);
});

/* ── the same sentence, again ─────────────────────────────────────────── */

test('the same invented sentence is only ever asked once', () => {
  const said = 'Thank you for watching, and we will see you next time.';
  let last = remember(said, 1_000);
  assert.equal(isRepeat(said, last, 5_000), true);
  // Punctuation and casing must not defeat it: the transcriber varies both.
  assert.equal(isRepeat('thank you for watching and we will see you NEXT time', last, 6_000), true);
});

test('the window slides, so a loop never gets through', () => {
  let last = remember('hello there', 0);
  // Every four seconds, for five minutes. None of them may pass.
  for (let t = 4_000; t < 300_000; t += 4_000) {
    assert.equal(isRepeat('hello there', last, t), true, `let through at ${t}ms`);
    last = remember('hello there', t);
  }
});

test('saying the same thing again later is a real question', () => {
  // People repeat themselves, usually because it did not work the first time.
  const last = remember('open the invoices', 0);
  assert.equal(isRepeat('open the invoices', last, REPEAT_WINDOW_MS + 1), false);
});

test('a different question is never a repeat', () => {
  const last = remember('open the invoices', 0);
  assert.equal(isRepeat('open the quotes', last, 1_000), false);
  assert.equal(isRepeat('', last, 1_000), false);
  assert.equal(isRepeat('anything', null, 1_000), false);
});
