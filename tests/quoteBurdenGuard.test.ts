/**
 * A quote is never repriced against a burden we do not know.
 *
 * Eric, 2026-11-19, asked whether the quote editor was working correctly.
 * This was the answer that was no.
 *
 * THE DEFECT, WITH THE MONEY
 *
 * The editor resolves the labour burden with `burdenFor(quote, companyBurden
 * ?? null)`. `companyBurden` is loaded asynchronously and is `undefined`
 * until it arrives — which it never does when there is no session, and never
 * does when the request fails. `burdenOf(null)` then answers a rate of zero,
 * `source: "unset"`, and the labour is priced at the bare wage.
 *
 * On Jason's quote, `qt-1794354942724`:
 *
 *     wages                      6,917.50
 *     burden at 35%              2,421.13
 *     materials                  2,943.20
 *     additional costs             550.00
 *     direct cost               12,831.83
 *     profit 2.5% + contingency 1.5%   513.28
 *     total                     13,345.11
 *
 * One recalculation in that window drops him to 9,860.70 — $3,484.41 gone,
 * silently, with nothing failing and the editor saving the result. The code's
 * own comment above that line already said this must not happen:
 * *"recomputing without them would price the labour bare and knock the burden
 * off a quote that was generated with it"*. The guard was never written.
 *
 * WHY `undefined` AND `null` HAD TO BE SPLIT
 *
 * The loader did `setCompanyBurden(config?.burden)`, so a company with no
 * burden configured and a company whose settings had not arrived were the
 * same value. There was no way to write this guard until those two were told
 * apart.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  burdenFor, burdenOf, burdenOnSubtotal, hasBurdenOverride,
} from '../supabase/functions/server/laborBurden.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The editor's guard, as it is written in `QuoteToContractEditor`.
 *
 * Duplicated here rather than imported because it closes over component
 * state. The call-site test at the bottom is what keeps the two honest.
 */
const burdenIsKnown = (quote: any, companyBurden: unknown): boolean =>
  hasBurdenOverride(quote?.laborBurdenPercent) || companyBurden !== undefined;

/* ── what the unknown case would have cost ───────────────────────────────── */

test('an unknown burden prices labour bare, which is the whole problem', () => {
  const wages = 6917.5;
  const settings = { burdenPercent: 0.35 };

  const known = burdenOnSubtotal(wages, burdenFor({}, settings));
  const unknown = burdenOnSubtotal(wages, burdenFor({}, undefined as any ?? null));

  assert.equal(r2(known), 2421.13, "Jason's burden, from the company rate");
  assert.equal(unknown, 0, 'and nothing at all when the settings have not loaded');
  assert.equal(r2(known - unknown), 2421.13, 'the gap a silent recalculation would open');
});

test('an unloaded burden is indistinguishable from none, so it must be refused', () => {
  // Both answer a rate of zero. Only the guard can tell them apart.
  assert.equal(burdenOf(null).rate, 0);
  assert.equal(burdenOf(undefined).rate, 0);
  assert.equal(burdenOf(null).configured, false);
  assert.equal(burdenOf({ burdenPercent: 0 }).configured, false, 'a configured zero also reads as unset');
});

/* ── the guard ───────────────────────────────────────────────────────────── */

test('not known while the company settings are still undefined', () => {
  assert.equal(burdenIsKnown({}, undefined), false);
  assert.equal(burdenIsKnown({ laborSubtotal: 6917.5 }, undefined), false);
});

test('known once they have loaded, including loaded-and-empty', () => {
  assert.equal(burdenIsKnown({}, { burdenPercent: 0.35 }), true);
  assert.equal(
    burdenIsKnown({}, null), true,
    'null means we asked and there is none — that is an answer, and recalculating on it is correct',
  );
});

/**
 * A quote carrying its own rate never consults the company, so it is never
 * blocked. This matters: blocking more than necessary would stop the editor
 * working for quotes that were never at risk.
 */
test('a quote with its own rate is never blocked', () => {
  assert.equal(burdenIsKnown({ laborBurdenPercent: 0.35 }, undefined), true);
  assert.equal(
    burdenIsKnown({ laborBurdenPercent: 0 }, undefined), true,
    'a deliberate zero on the quote is a decision, and burdenFor honours it',
  );
  // And the resolution really does ignore the company in that case.
  const burden = burdenFor({ laborBurdenPercent: 0.35 }, null);
  assert.equal(burden.rate, 0.35);
  assert.equal(burden.source, 'quote');
});

test('an empty or absent rate on the quote is not an override', () => {
  for (const value of [undefined, null, '']) {
    assert.equal(hasBurdenOverride(value), false, `${JSON.stringify(value)} should not count`);
    assert.equal(burdenIsKnown({ laborBurdenPercent: value }, undefined), false);
  }
});

/* ── the call sites, at the source ───────────────────────────────────────── */

/**
 * The guard being right proves nothing about whether the editor applies it,
 * and the defect was an unwritten guard beneath a comment describing it.
 */
test('the editor refuses to recalculate or save on an unknown burden', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const code = readFileSync(
    join(import.meta.dirname, '..', 'src/app/components/QuoteToContractEditor.tsx'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  assert.match(code, /const burdenIsKnown\s*=/, 'the guard is gone');
  assert.match(
    code, /if \(!burdenIsKnown\(quote\)\)[\s\S]{0,400}?return null;/,
    'recalculateTotals no longer refuses — it will price the labour bare again',
  );
  assert.match(
    code, /if \(!burdenIsKnown\(editedQuote\)\)/,
    'the save no longer refuses, so edited lines can be stored under a stale total',
  );
  /*
   * The loader must keep the two states apart. `?? null` is what makes
   * "loaded with nothing configured" distinguishable from "not loaded", and
   * without it the guard above can never pass for such a company.
   */
  assert.match(
    code, /setCompanyBurden\(\(config as any\)\?\.burden \?\? null\)/,
    'the loader is back to storing undefined for a company with no burden set',
  );
});
