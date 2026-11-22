/**
 * The final payment makes the schedule total the contract, by itself.
 *
 * Eric, 2026-11-21: "the final payent should make sure they all total amount
 * it should do this automatically".
 *
 * THIS REVERSES AN EARLIER DECISION, and the earlier one was not wrong — it
 * was answering a narrower question. The gap used to be OFFERED rather than
 * closed ("Put the difference on the last payment"), reasoning that a
 * schedule mid-edit is legitimately out by whatever has not been allocated
 * yet, and snapping it straight would move money the moment somebody typed.
 *
 * What that missed is where the gap actually comes from: not typing, but the
 * quote moving under a schedule agreed weeks earlier. A line is added, the
 * contract total rises, the draws stay put. The worked example is a live
 * quote — four hand-typed draws of 15,000 / 20,000 / 10,000 / 8,039.42
 * against a contract of 55,822.60, short by 2,783.18 and ready to send.
 *
 * A schedule that does not total the contract is never the right thing to
 * STORE, whatever it is between keystrokes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  withBalancedFinal, scheduleTotal, buildPaymentSchedule, type Draw,
} from '../src/app/lib/paymentSchedule.ts';

/** Michael's schedule, exactly as production stored it. */
const SHORT: Draw[] = [
  { id: 'd1', type: 'deposit', phase: null, label: 'Deposit — 30%', amount: 15000, trigger: 'On acceptance of the quote', status: 'pending' },
  { id: 'd2', type: 'phase', phase: 'Back Porch Rebuild', label: 'Back Porch Rebuild', amount: 20000, trigger: 'On completion of back porch rebuild', status: 'pending' },
  { id: 'd3', type: 'phase', phase: 'Fence Installation', label: 'Fence Installation', amount: 10000, trigger: 'On completion of fence installation', status: 'pending' },
  { id: 'd4', type: 'balance', phase: null, label: 'Final', amount: 8039.42, trigger: 'On completion', status: 'pending' },
];
const CONTRACT = 55822.60;

test('THE REAL SHORTFALL CLOSES, onto the final payment', () => {
  const out = withBalancedFinal(SHORT, CONTRACT);
  assert.equal(out.moved, 2783.18);
  assert.equal(out.onto?.id, 'd4');
  assert.equal(out.draws[3].amount, 10822.60);
  assert.equal(scheduleTotal(out.draws), CONTRACT);
});

test('and the payments above it are untouched', () => {
  // The deposit and the milestone draws are amounts somebody agreed against
  // named triggers. Moving those changes what is billed when.
  const out = withBalancedFinal(SHORT, CONTRACT);
  assert.deepEqual(out.draws.slice(0, 3), SHORT.slice(0, 3));
});

test('an overfull schedule gives money back from the final payment', () => {
  const over = SHORT.map((d) => (d.id === 'd4' ? { ...d, amount: 20000 } : d));
  const out = withBalancedFinal(over, CONTRACT);
  assert.ok(out.moved < 0, 'it must come off, not go on');
  assert.equal(scheduleTotal(out.draws), CONTRACT);
});

test('a schedule that already totals the contract is left alone', () => {
  const exact = buildPaymentSchedule({
    phases: [{ title: 'A', subtotal: 100 }, { title: 'B', subtotal: 300 }],
    total: CONTRACT,
    depositRate: 0.3,
  });
  const out = withBalancedFinal(exact, CONTRACT);
  assert.equal(out.moved, 0);
  assert.equal(out.onto, null);
  assert.deepEqual(out.draws, exact, 'the same array contents, nothing rewritten');
});

test('IT REFUSES TO WRITE A NEGATIVE PAYMENT', () => {
  // The other draws add up to more than the job. That is a mistake to show,
  // not one to hide behind a minus sign — the banner says what the gap is.
  const silly = SHORT.map((d) => (d.id === 'd2' ? { ...d, amount: 90000 } : d));
  const out = withBalancedFinal(silly, CONTRACT);
  assert.equal(out.moved, 0, 'nothing moved');
  assert.deepEqual(out.draws, silly, 'and the schedule is stored as typed');
});

test('it leaves an already-invoiced draw alone, and balances onto the last OPEN one', () => {
  // Rewriting a billed draw would contradict a real invoice in the world.
  const partlyBilled = SHORT.map((d) => (d.id === 'd4' ? { ...d, status: 'invoiced' as const } : d));
  const out = withBalancedFinal(partlyBilled, CONTRACT);
  assert.equal(out.onto?.id, 'd3', 'the last payment not yet invoiced carries it');
  assert.equal(out.draws[3].amount, 8039.42, 'the invoiced draw is untouched');
  assert.equal(scheduleTotal(out.draws), CONTRACT);
});

test('with every draw billed it changes nothing', () => {
  const allBilled = SHORT.map((d) => ({ ...d, status: 'paid' as const }));
  const out = withBalancedFinal(allBilled, CONTRACT);
  assert.equal(out.moved, 0);
  assert.deepEqual(out.draws, allBilled);
});

test('a cent is a gap worth closing — that is the whole point', () => {
  const thirds: Draw[] = ['a', 'b', 'c'].map((id, i) => ({
    id, type: 'phase', phase: null, label: `Payment ${i + 1}`,
    amount: 33.33, trigger: '', status: 'pending',
  }));
  const out = withBalancedFinal(thirds, 100);
  assert.equal(scheduleTotal(out.draws), 100);
  assert.equal(out.draws[2].amount, 33.34);
});

/* ── the editor applies it on every write ───────────────────────────────── */

const EDITOR = 'src/app/components/QuoteToContractEditor.tsx';
const editor = readFileSync(EDITOR, 'utf8');

test('EVERY PATH THAT STORES A SCHEDULE GOES THROUGH IT', () => {
  // add, remove, reorder, type an amount, type a percentage, regenerate —
  // all of them call commitSchedule, so balancing there covers the lot.
  const commit = editor.slice(editor.indexOf('const commitSchedule = async'));
  const body = commit.slice(0, commit.indexOf('\n  };'));
  assert.match(body, /withBalancedFinal\(draws, contractTotal\)/);
  assert.ok(
    body.indexOf('withBalancedFinal') < body.indexOf('persistQuotePatch'),
    'it must balance before it saves, not after',
  );
  assert.match(body, /paymentSchedule: balanced\.draws/, 'and store the balanced list');
});

test('automatic is not silent — the move is named in the toast', () => {
  const commit = editor.slice(editor.indexOf('const commitSchedule = async'));
  const body = commit.slice(0, commit.indexOf('\n  };'));
  assert.match(body, /balanced\.moved !== 0/);
  assert.match(body, /so the schedule totals the contract/);
});

test('a schedule stored short before today is fixed when the quote is opened', () => {
  // Balancing on write does nothing for the ones already saved, and waiting
  // for somebody to edit a draw is the "remember to press the button" this
  // was meant to remove.
  assert.match(editor, /const autoBalanced = useRef<string \| null>\(null\)/);
  assert.match(editor, /if \(balanced\.moved === 0\) \{ autoBalanced\.current = mark; return; \}/,
    'a schedule that already adds up must not be rewritten');
  assert.match(editor, /const mark = `\$\{quoteId\}:\$\{contractTotal\}`/,
    'at most once per quote and total, or a save that re-renders saves again');
  assert.match(editor, /if \(editMode \|\| !quoteId/, 'edit mode belongs to the quote’s own Save');
});

test('the balancing row is computed, not typed', () => {
  // Leaving it editable means typing a figure and watching it spring back,
  // which reads as a broken input rather than as a rule.
  assert.match(editor, /readOnly=\{draw\.id === balancingDrawId\}/);
  assert.match(editor, /open\.length > 1 \? open\[open\.length - 1\]\.id : null/,
    'a single open payment stays typeable, or it could never be set');
});
