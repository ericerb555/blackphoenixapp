/**
 * No client-side authority check may decide who you are, and none may fail
 * open.
 *
 * WHAT THIS IS GUARDING, WITH THE DATE
 *
 * Until 2026-11-17 `roleUtils.getCurrentUserRole()` ended:
 *
 *     return storedRole || 'admin'; // Default to admin for development
 *
 * Nothing in `src/` ever wrote `user_role`, so that fallback was the only
 * path and it returned `admin` to every visitor. `isAdminOrHigher()` built on
 * it gated the admin UI on the Command Center, Projects and the mobile
 * dashboard — and `App.tsx` deliberately lets anyone open the Command Center
 * on the stated understanding that non-elevated users see a limited version.
 * That limited version never happened.
 *
 * WHY A TEST AND NOT JUST THE FIX
 *
 * Because the fix is a deletion, and deletions come back. "Default to admin
 * for development" is a comment somebody writes in good faith at four in the
 * afternoon, and nothing about the running app looks wrong afterwards — the
 * server still refuses the data, so the only symptom is an admin UI appearing
 * for people who should not see it, which nobody reports as a bug.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rankOf, roleMeets } from '../src/app/lib/utils/roleUtils.ts';

const root = join(import.meta.dirname, '..');

/**
 * Comments stripped before any of this is matched — and the first version of
 * this file is why.
 *
 * `roleUtils.ts` explains what it used to do by quoting the offending line
 * verbatim, including `|| 'admin'`. The assertion below found that quotation
 * and failed the fix for containing a description of the bug it had just
 * removed. A checker fooled by a comment about the thing it checks fails on
 * correct code, and code that fails for being correct gets the checker
 * deleted.
 *
 * The comments are the most valuable thing in these files. The test works
 * around them rather than asking anyone to write less.
 */
function codeOf(relative: string): string {
  return readFileSync(join(root, relative), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const source = codeOf('src/app/lib/utils/roleUtils.ts');

/**
 * The structural assertion, and the one that matters most.
 *
 * A module that cannot find out who you are cannot be wrong about it. Every
 * behavioural test below is secondary to this.
 */
test('the role helpers cannot read the browser at all', () => {
  assert.doesNotMatch(source, /localStorage/, 'roleUtils reads localStorage again');
  assert.doesNotMatch(source, /sessionStorage|document\.cookie/, 'roleUtils reads browser storage again');
});

test('no helper here decides the current user', () => {
  for (const banned of ['getCurrentUserRole', 'setCurrentUserRole', 'isAdminOrHigher', 'isManagerOrHigher']) {
    assert.doesNotMatch(
      source,
      new RegExp(`export (function|const) ${banned}\\b`),
      `${banned} is back — it answered "who is the user?" from the browser, which is where the bug lived`,
    );
  }
});

/**
 * The exact string that caused it. Kept as its own assertion because it is
 * the one a future edit would reintroduce verbatim.
 */
test('nothing in here defaults to a privileged role', () => {
  assert.doesNotMatch(source, /\|\|\s*['"](admin|owner|master_admin|manager)['"]/,
    'a privileged role is being used as a fallback value');
});

test('an unknown role outranks nothing', () => {
  assert.equal(rankOf('president-of-everything'), 0);
  assert.equal(rankOf(''), 0);
  assert.equal(rankOf(null), 0);
  assert.equal(rankOf(undefined), 0);
  // Below even the lowest named role, deliberately: a typo must not be a tier.
  assert.ok(rankOf('nonsense') < rankOf('guest'));
});

test('the hierarchy holds in both directions', () => {
  assert.equal(roleMeets('owner', 'admin'), true);
  assert.equal(roleMeets('admin', 'admin'), true);
  assert.equal(roleMeets('manager', 'admin'), false);
  assert.equal(roleMeets('customer', 'guest'), true);
  assert.equal(roleMeets('guest', 'customer'), false);
});

test('a role is recognised however it is spelled', () => {
  assert.equal(roleMeets('Owner', 'admin'), true);
  assert.equal(roleMeets('MASTER ADMIN', 'admin'), false, 'master_admin is not in this ladder; it must not be guessed at');
  assert.equal(rankOf('  admin  '.trim()), rankOf('admin'));
});

test('an absent role never meets a requirement', () => {
  for (const role of [null, undefined, '', '   ']) {
    assert.equal(roleMeets(role as any, 'guest'), false, `${JSON.stringify(role)} must not meet even guest`);
  }
});

/**
 * The call sites, checked at the source.
 *
 * Unit-testing the helpers proves the helpers are safe. It does not prove
 * anybody uses them — and the original bug was entirely in the using.
 */
test('the pages that gate admin UI take it from the auth context', () => {
  for (const page of [
    'src/app/pages/UnifiedDashboard.tsx',
    'src/app/pages/ProjectsNew.tsx',
    'src/app/pages/UnifiedDashboardMobile.tsx',
  ]) {
    const text = codeOf(page);
    assert.match(text, /useAuth\(\)/, `${page} no longer asks the auth context who the user is`);
    assert.doesNotMatch(text, /isAdminOrHigher/, `${page} is back on the browser-derived role check`);
  }
});
