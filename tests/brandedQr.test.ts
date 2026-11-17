/**
 * The logo in the middle of a QR code must stay inside the error-correction
 * budget.
 *
 * Reed-Solomon at level `H` recovers a payload with roughly 30% of the modules
 * unreadable, and that tolerance is the only reason covering the centre works
 * at all. The geometry is therefore a correctness property, not a style
 * choice — and the way it breaks is the worst kind of breakage: a code that
 * scans on the phone it was tested with and fails on a customer's, in a
 * basement, in bad light, through a crease.
 *
 * Nothing about that failure reaches us. The customer shrugs and does not
 * call. So the numbers are pinned here, where a later "make the logo a bit
 * bigger" has to argue with an assertion instead of a screenshot.
 *
 * Only the geometry is tested. Drawing needs a canvas; the sizing does not,
 * and the sizing is the part that decides whether the code works.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  plateGeometry, LOGO_FRACTION, PLATE_PADDING, DEFAULT_LOGO,
} from '../src/app/lib/brandedQr.ts';

/** What level H tolerates. The plate must stay well under it. */
const H_TOLERANCE = 0.30;

test('the plate stays well inside what level H can recover', () => {
  for (const width of [300, 512, 1024, 2048]) {
    const g = plateGeometry(width);
    assert.ok(
      g.areaShare < H_TOLERANCE / 2,
      `at ${width}px the plate covers ${(g.areaShare * 100).toFixed(1)}% of the code; `
        + 'half of the 30% budget is the ceiling, so the rest is left for creases, '
        + 'thumbs and bad light',
    );
  }
});

test('the plate is centred, so it never touches a finder pattern', () => {
  for (const width of [300, 512, 1024]) {
    const g = plateGeometry(width);
    const leftGap = g.offset;
    const rightGap = width - (g.offset + g.plate);
    assert.ok(Math.abs(leftGap - rightGap) <= 1, `at ${width}px the plate is off-centre`);
    /*
     * The three corner squares are what a scanner uses to FIND the code. They
     * are not covered by the error-correction budget: clipping one does not
     * degrade the read, it prevents it. A finder pattern is 7 modules of a
     * code at least 21 across, so it occupies the outer third at worst.
     */
    assert.ok(
      g.offset > width / 3,
      `at ${width}px the plate starts at ${g.offset}px, inside the corner third where `
        + 'the finder patterns live',
    );
  }
});

test('the logo sits inside its plate with padding on every side', () => {
  const g = plateGeometry(1024);
  assert.ok(g.logo < g.plate, 'the logo is not smaller than the plate behind it');
  assert.ok(g.logoOffset > g.offset, 'the logo starts before its plate does');
  assert.equal(
    g.logoOffset + g.logo + (g.logoOffset - g.offset),
    g.offset + g.plate,
    'the padding is not equal on both sides',
  );
  const padShare = (g.logoOffset - g.offset) / g.plate;
  assert.ok(padShare >= PLATE_PADDING - 0.01, 'the padding has shrunk below its constant');
});

test('the geometry scales with the code rather than being fixed pixels', () => {
  const small = plateGeometry(300);
  const large = plateGeometry(1200);
  assert.ok(large.plate > small.plate, 'the plate did not grow with the code');
  assert.ok(
    Math.abs(small.areaShare - large.areaShare) < 0.001,
    'the share of the code covered changes with size; it must not',
  );
});

test('a bigger fraction is still bounded, so a future tweak cannot go silently wrong', () => {
  // Documents the edge: even at 30% of the WIDTH the area share stays modest,
  // which is why width — not area — is the knob worth reasoning about.
  const g = plateGeometry(1024, 0.30);
  assert.ok(g.areaShare < H_TOLERANCE, 'a 30% width plate should still be under the budget');
  // And the shipped default is deliberately smaller than that edge.
  assert.ok(LOGO_FRACTION < 0.30, 'the default fraction has crept up to the edge of the budget');
});

/**
 * Same-origin matters twice: a cross-origin image taints the canvas and
 * `toDataURL` throws, and until 2026-11-16 the icon paths this app referenced
 * did not exist at all — they answered 200 with HTML.
 */
test('the default mark is a same-origin path, not a remote URL', () => {
  assert.ok(DEFAULT_LOGO.startsWith('/'), 'the default logo must be a same-origin path');
  assert.doesNotMatch(DEFAULT_LOGO, /^https?:/, 'a remote logo taints the canvas and breaks toDataURL');
});
