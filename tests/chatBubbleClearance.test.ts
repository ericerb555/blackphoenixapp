/**
 * The live-chat bubble is lifted only where there is something to clear.
 *
 * Eric reported this three times: *"please fix the overlapping in the feild
 * boxes them selfs within the sign ups of the junk removal pricing app"*,
 * then after each fix, *"still overlapping on the mobile device."*
 *
 * TWO REAL CAUSES WERE FIXED AND NEITHER WAS IT
 *
 * `pl-*` computing to 0px on inputs, and `space-y-*`/`mb-*` flattened on
 * labels — both genuine, both verified in the shipped CSS, both kept. The
 * symptom did not move, because both were diagnosed by READING the
 * stylesheet, and nothing in the stylesheet is wrong.
 *
 * THE THIRD CAUSE, FOUND BY RENDERING THE PAGE
 *
 * `--chat-lift: 4rem` was set on bare `:root` inside the phone media block.
 * Its own comment says it exists so the bubble "clears a fixed bottom nav
 * instead of sitting on top of it" — and exactly one screen in the app has
 * such a bar, `UnifiedDashboardMobile`. On every other phone page the lift
 * does not avoid a collision, it causes one: it takes a bubble that would
 * have sat harmlessly in the corner and raises it 84px into the content.
 *
 * Measured on /sign-up at 390x844, with the page in a 390px frame so the
 * phone media query actually matched:
 *
 *     bubble (fixed, z-9998)      306,704  56x56
 *     label "Confirm Password"     13,697  356x20   covered
 *     input  type=password         13,725  356x52   covered
 *     button show/hide            337,740  20x20    covered ENTIRELY
 *
 * `elementFromPoint` at the bubble's centre returns the bubble, so the
 * show/hide toggle is not merely hidden behind it — it cannot be tapped.
 *
 * At 1410px the form is centred and the bubble misses it, which is why every
 * check that could not reach a real 390px viewport reported the page as fine.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/* ── the lift is scoped, not global ──────────────────────────────────────── */

test('the chat lift is not set on every phone page', () => {
  const css = read('src/styles/globals.css');

  assert.match(
    css, /:root\.has-bottom-nav\s*\{[^}]*--chat-lift:\s*4rem/,
    'the lift is no longer scoped to the screen that has a bottom bar',
  );
  assert.doesNotMatch(
    css, /:root\s*\{[^}]*--chat-lift:/,
    'the lift is back on bare :root, so it applies to pages with no bar to clear '
    + 'and pushes the bubble onto their form fields',
  );
});

/**
 * The landing hero's clearance lives in the same media block and must stay
 * on bare `:root`. Scoping it by accident would drop 76px of clearance on
 * every page that is not the mobile dashboard, and the hero title would run
 * back under the fixed Sign In button — trading one overlap for another.
 */
test('the hero clearance is still unconditional', () => {
  const css = read('src/styles/globals.css');
  assert.match(
    css, /:root\s*\{[^}]*--hero-top-clearance:\s*76px/,
    'the hero clearance got scoped along with the chat lift',
  );
});

/* ── and the one screen that has a bar says so ───────────────────────────── */

test('the mobile dashboard declares its bottom bar, and withdraws it', () => {
  const code = read('src/app/pages/UnifiedDashboardMobile.tsx');

  assert.match(code, /classList\.add\('has-bottom-nav'\)/, 'nothing turns the lift on any more');
  assert.match(
    code, /return \(\) => .*classList\.remove\('has-bottom-nav'\)/,
    'the class is never removed, so the bubble stays lifted after leaving this screen '
    + 'and climbs into the next page it finds',
  );
  /*
   * It has to be on the documentElement. The widget is mounted by App and is
   * not a descendant of this screen, so a custom property set on our own
   * container would never be inherited by it.
   */
  assert.match(code, /document\.documentElement/, 'the class is not on the element the widget inherits from');
});

test('the screen that declares the bar really has one', () => {
  const code = read('src/app/pages/UnifiedDashboardMobile.tsx');
  assert.match(
    code, /className="fixed bottom-0[^"]*z-50/,
    'this screen no longer has a fixed bottom bar, so the lift it turns on clears nothing',
  );
});

/**
 * And no other screen has grown one without saying so.
 *
 * A second fixed bottom bar would be covered by the bubble exactly as the
 * first one was, and the failure is invisible: the widget is z-9998 and a bar
 * is z-50, so the widget simply wins.
 */
test('no other screen has a fixed bottom bar that nothing lifts the bubble for', async () => {
  const { globSync } = await import('node:fs');
  const files = globSync('src/app/**/*.tsx', { cwd: root });

  const offenders: string[] = [];
  for (const file of files) {
    const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    if (!/className="fixed bottom-0[^"]*z-50/.test(code)) continue;
    if (/has-bottom-nav/.test(code)) continue;
    offenders.push(file);
  }

  assert.deepEqual(
    offenders, [],
    'these screens have a fixed bottom bar and do not add `has-bottom-nav`, '
    + 'so the chat bubble will sit on top of it',
  );
});
