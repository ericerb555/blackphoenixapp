/**
 * No third-party script on a page that handles credentials, money or admin.
 *
 * The audit that prompted this found the site already clean: no analytics tag,
 * no pixel, no chat widget, no tag manager anywhere. The pixel IDs on the
 * retargeting page are snippet *strings* shown for copy-paste, never injected.
 * The single remote script on the whole site is Stripe's, and it is reached
 * only through the lazily-loaded checkout chunk.
 *
 * So this file does not fix a breach. It makes the clean state enforceable,
 * because "nobody has added a pixel yet" is not a control — a policy that
 * refuses to load one is. The guarantee is in `vercel.json`: sensitive paths
 * get their own CSP whose `script-src` names no remote host at all, so a tag
 * added to those pages later does not run, it reports.
 *
 * WHY THE TWO RULES MUST NOT OVERLAP
 *
 * Vercel applies every header rule whose `source` matches. Two rules setting
 * the same header on one path leaves the winner up to precedence, and the
 * losing policy is the strict one exactly when it matters. The sources are
 * written as a positive list and its negation so overlap is impossible, and
 * the second test here is what keeps them that way.
 *
 * WHY THE HASHES ARE CHECKED AGAINST index.html
 *
 * `script-src` admits the two inline scripts by sha256. Edit either script by
 * a byte — a comment, an emoji in a log line — and the browser silently stops
 * running it. One of them unregisters stale service workers; the failure mode
 * is a customer pinned to a cached build with no error anywhere. The hash is
 * recomputed here from the real file rather than trusted.
 *
 * LINE ENDINGS ARE PART OF THE HASH
 *
 * The browser hashes the bytes it received, and what it receives is LF: Vite
 * emits LF no matter what the checkout holds. This checkout is CRLF, so the
 * hash of the working-tree bytes is NOT the hash in the policy — the two
 * scripts here differ by exactly that and nothing else. Anyone who recomputes
 * a hash from the file on a Windows machine and pastes it into `vercel.json`
 * ships a policy that blocks the very script it was meant to admit, and the
 * only symptom is a console message in a browser nobody is looking at. The
 * normalisation below is the whole reason this test is trustworthy; it is not
 * a convenience.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

const cspRules: HeaderRule[] = vercel.headers.filter((r: HeaderRule) =>
  r.headers.some((h) => h.key === 'Content-Security-Policy'));

const cspOf = (r: HeaderRule) =>
  r.headers.find((h) => h.key === 'Content-Security-Policy')!.value;

const directive = (csp: string, name: string) => {
  const m = csp.match(new RegExp(`(?:^|;)\\s*${name} ([^;]+)`));
  return m ? m[1].trim().split(/\s+/) : [];
};

/** The paths whose policy must name no remote script host. */
const SENSITIVE = [
  'login', 'sign-up', 'signup', 'forgot-password', 'reset-password',
  'account', 'my-account', 'my-orders', 'settings',
  'admin-dashboard', 'admin-advanced-dashboard', 'owners-dashboard',
  'admin-alerts', 'admin-portal',
];

const strictRule = cspRules.find((r) => r.source.startsWith('/(login'));
const globalRule = cspRules.find((r) => r.source.startsWith('/((?!login'));

test('both policies exist and nothing else sets a CSP', () => {
  assert.ok(strictRule, 'no sensitive-path CSP rule in vercel.json');
  assert.ok(globalRule, 'no global CSP rule in vercel.json');
  assert.equal(cspRules.length, 2, 'a third CSP rule would make precedence decide the winner');
});

test('every sensitive path is covered by the strict rule and excluded from the global one', () => {
  // Vercel sources are path-to-regexp; both of ours are plain regex bodies.
  const strictRe = new RegExp('^' + strictRule!.source + '$');
  const globalRe = new RegExp('^' + globalRule!.source + '$');
  for (const path of SENSITIVE) {
    assert.ok(strictRe.test('/' + path), `${path} is not covered by the strict policy`);
    assert.ok(!globalRe.test('/' + path), `${path} also matches the global policy; precedence decides`);
  }
});

test('an ordinary page still matches the global rule only', () => {
  const strictRe = new RegExp('^' + strictRule!.source + '$');
  const globalRe = new RegExp('^' + globalRule!.source + '$');
  for (const path of ['checkout', 'stripe-checkout', 'landing', 'directory']) {
    assert.ok(globalRe.test('/' + path), `${path} lost the global security headers`);
    assert.ok(!strictRe.test('/' + path), `${path} unexpectedly picked up the strict policy`);
  }
});

test('the sensitive policy allows no remote script origin', () => {
  const sources = directive(cspOf(strictRule!), 'script-src');
  assert.ok(sources.length > 0, 'sensitive policy has no script-src at all');
  for (const s of sources) {
    const allowed = s === "'self'" || s.startsWith("'sha256-");
    assert.ok(allowed, `sensitive script-src admits ${s}; only 'self' and inline hashes may appear`);
  }
  // The unsafe keywords defeat the hashes rather than adding to them.
  for (const banned of ["'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", '*', 'data:', 'blob:']) {
    assert.ok(!sources.includes(banned), `sensitive script-src contains ${banned}`);
  }
});

test('the sensitive policy embeds no third-party frame or form target', () => {
  const csp = cspOf(strictRule!);
  for (const name of ['frame-src', 'form-action', 'object-src', 'base-uri']) {
    for (const s of directive(csp, name)) {
      const remote = s.startsWith('http') || s === '*';
      assert.ok(!remote, `sensitive ${name} admits ${s}`);
    }
  }
});

test('the sensitive policy keeps every directive the global one sets', () => {
  // Dropping a directive here would quietly widen the sensitive pages to
  // default-src, which is the opposite of the point.
  const names = (csp: string) =>
    csp.split(';').map((d) => d.trim().split(/\s+/)[0]).filter(Boolean).sort();
  assert.deepEqual(names(cspOf(strictRule!)), names(cspOf(globalRule!)));
});

test('sensitive pages keep the other security headers', () => {
  const required = [
    'Strict-Transport-Security', 'X-Content-Type-Options',
    'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy',
  ];
  for (const key of required) {
    const strict = strictRule!.headers.find((h) => h.key === key);
    const global = globalRule!.headers.find((h) => h.key === key);
    assert.ok(strict, `sensitive pages lost ${key}`);
    assert.equal(strict!.value, global!.value, `${key} drifted between the two rules`);
  }
});

test('index.html loads no remote script', () => {
  const remote = [...indexHtml.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((src) => /^(https?:)?\/\//.test(src));
  assert.deepEqual(remote, [], `index.html loads remote script(s): ${remote.join(', ')}`);
});

test('every inline script in index.html is admitted by both policies', () => {
  const inline = [...indexHtml.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1].replace(/\r\n/g, '\n')); // the browser is served LF; see the header comment
  assert.ok(inline.length > 0, 'no inline scripts found; the extraction regex is wrong');

  for (const rule of [strictRule!, globalRule!]) {
    const sources = directive(cspOf(rule), 'script-src');
    for (const body of inline) {
      const hash = "'sha256-" + createHash('sha256').update(body, 'utf8').digest('base64') + "'";
      assert.ok(
        sources.includes(hash),
        `an inline script in index.html is not in ${rule.source.slice(0, 24)}… script-src.\n`
        + `Add ${hash} (first line: ${body.trim().split('\n')[0].slice(0, 60)})`,
      );
    }
  }
});
