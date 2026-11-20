/**
 * Anyone can try the junk pricer, without making an account first.
 *
 * Eric, in `anonPricer.ts`: *"Some Should not have to login to use the junk
 * remaval picer until they decied to create an account and get 5 percent
 * off.. anyone can try the pricer."*
 *
 * THE SERVER ALLOWED IT. THE SITE HAD NO WAY IN.
 *
 * `trash-estimator` names three kinds of caller — signed in, a texted link,
 * and "nobody — allowed, and counted per address per day". `anonPricer.ts`
 * exists solely to make that third one affordable, and argues at length about
 * why an IP ceiling cannot run through `aiSpend`. `TrashEstimatePanel` sends
 * `authedHeadersOrAnon` for the same reason: *"Anybody may price a job, so
 * this never throws for want of a session."*
 *
 * And the one entry point — the Junk Removal button on the landing page —
 * sent anybody without a session to `sign-up?next=trash-estimate`. So the
 * single requirement the anonymous path was built for was the one thing a
 * visitor could not do.
 *
 * It was found by trying to use the site as a new customer. Nothing in the
 * code looked wrong: every piece was correct and one wire was missing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const stripComments = (code: string) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('the junk button sends a signed-out visitor to the pricer, not to sign-up', () => {
  const code = stripComments(read('src/app/pages/DirectoryLandingPage.tsx'));

  assert.match(
    code, /signedIn \? 'customer-portal-app\?tab=trash-estimate' : 'junk-pricer'/,
    'the button is back to demanding an account before anybody can get a price',
  );
  assert.doesNotMatch(
    code, /'sign-up\?next=trash-estimate'/,
    "the sign-up detour is back, and it is the thing `anonPricer.ts` was written to avoid",
  );
});

test('the pricer route exists and is reachable without a session', () => {
  const routes = stripComments(read('src/app/routes.tsx'));
  assert.match(routes, /"junk-pricer":\s*JunkPricer/, 'the route is gone');
  assert.match(routes, /JunkPricer = lazy\(/, 'the page is no longer imported');

  const app = stripComments(read('src/app/App.tsx'));
  assert.match(
    app, /'junk-pricer'/,
    'the route is no longer public, so the auth guard will bounce a visitor '
    + 'to login — which is the same dead end by a different door',
  );
});

/**
 * The page must render the SAME panel the portal and the texted link use.
 *
 * A second implementation is how the two drift apart, and this one has drifted
 * before: Eric asked for exactly one junk pricer.
 */
test('the pricer page renders the shared panel', () => {
  const code = read('src/app/pages/JunkPricer.tsx');
  assert.match(code, /import TrashEstimatePanel from/, 'it no longer uses the shared panel');
  assert.match(code, /<TrashEstimatePanel/);
  assert.doesNotMatch(
    stripComments(code), /linkToken=/,
    'this entry has no token by definition — passing one would make it a link page',
  );
});

/**
 * And the account button has to go somewhere.
 *
 * `onNavigate` is not optional in practice: the panel's 5%-off button calls
 * `onNavigate?.('signup')`, so rendering the panel without one makes that
 * button look live, do nothing, and report nothing. That shipped once already
 * on the texted-link page.
 */
test('the account offer is wired up', () => {
  const code = stripComments(read('src/app/pages/JunkPricer.tsx'));
  assert.match(code, /onNavigate=\{/, 'the panel is rendered without onNavigate, so the 5% button is a no-op');
});
