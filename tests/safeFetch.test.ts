/**
 * Which URLs the server will fetch when somebody else chose them.
 *
 * `rehostImage` takes a URL out of a request body and fetches it from inside
 * the edge function (M-4, tasks/security-audit-2026-10-16.md). The guard in
 * front of it is pure predicate logic over strings, which is exactly the kind
 * of code that looks obviously correct and has a hole in it — an off-by-one in
 * a range, a scheme nobody thought of, an IPv4 address wearing an IPv6 coat.
 *
 * So every refusal is asserted rather than assumed, and so is every
 * acceptance: a guard that blocks the supplier CDNs the feature exists to
 * fetch is a broken feature, and that failure would show up as "the reel has
 * no pictures" rather than as anything resembling a security problem.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeUnsafeUrl } from '../supabase/functions/server/safeFetch.ts';

const refused = (url: string, allow?: string[]) => {
  const why = describeUnsafeUrl(url, allow);
  assert.ok(why, `expected ${url} to be refused, but it was allowed`);
  return why;
};
const allowed = (url: string, allow?: string[]) => {
  const why = describeUnsafeUrl(url, allow);
  assert.equal(why, null, `expected ${url} to be allowed, but: ${why}`);
};

/* ── the real traffic must still get through ─────────────────────────────── */

test('the supplier and stock CDNs this feature exists to fetch are allowed', () => {
  allowed('https://files.cdn-files-a.com/product/123.jpg');
  allowed('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1400');
  allowed('https://plzsvzwwcdopnawtiwzm.supabase.co/storage/v1/object/sign/x.png');
});

/* ── scheme ──────────────────────────────────────────────────────────────── */

test('only https is fetched', () => {
  refused('http://example.com/a.jpg');
  refused('file:///etc/passwd');
  refused('data:image/png;base64,AAAA');
  refused('blob:https://example.com/abc');
  refused('ftp://example.com/a.jpg');
  // Not a URL at all.
  refused('javascript:alert(1)');
  refused('not a url');
  refused('');
});

/* ── credentials in the URL ──────────────────────────────────────────────── */

test('a URL carrying credentials is refused', () => {
  refused('https://user:pass@example.com/a.jpg');
  refused('https://user@example.com/a.jpg');
});

/* ── private address space ───────────────────────────────────────────────── */

test('loopback and private ranges are refused', () => {
  refused('https://127.0.0.1/a.jpg');
  refused('https://127.1.2.3/a.jpg');
  refused('https://10.0.0.5/a.jpg');
  refused('https://192.168.1.1/a.jpg');
  refused('https://0.0.0.0/a.jpg');
  refused('https://localhost/a.jpg');
});

test('the whole 172.16/12 block is refused, and only that block', () => {
  // The boundaries are the bug people actually ship.
  refused('https://172.16.0.1/a.jpg');
  refused('https://172.31.255.254/a.jpg');
  refused('https://172.24.1.1/a.jpg');
  // Just outside, and genuinely public.
  allowed('https://172.15.0.1/a.jpg');
  allowed('https://172.32.0.1/a.jpg');
});

test('cloud metadata is refused by address and by name', () => {
  refused('https://169.254.169.254/latest/meta-data/');
  refused('https://169.254.1.1/a.jpg');
  refused('https://metadata.google.internal/computeMetadata/v1/');
  refused('https://metadata/a.jpg');
});

test('CGNAT and multicast are refused', () => {
  refused('https://100.64.0.1/a.jpg');
  refused('https://100.127.255.255/a.jpg');
  refused('https://224.0.0.1/a.jpg');
  refused('https://255.255.255.255/a.jpg');
  // 100.0–63 and 100.128+ are ordinary public space.
  allowed('https://100.63.0.1/a.jpg');
  allowed('https://100.128.0.1/a.jpg');
});

test('internal-looking hostnames are refused', () => {
  refused('https://printer.local/a.jpg');
  refused('https://db.internal/a.jpg');
});

/* ── IPv6, including addresses wearing an IPv4 coat ──────────────────────── */

test('private IPv6 is refused', () => {
  refused('https://[::1]/a.jpg');
  refused('https://[fe80::1]/a.jpg');
  refused('https://[fd00::1]/a.jpg');
  refused('https://[fc00::1]/a.jpg');
});

test('an IPv4-mapped IPv6 address does not smuggle a private target through', () => {
  // The bypass worth having a test for: ::ffff:169.254.169.254 is the metadata
  // service written so that an IPv4 range check never sees it.
  refused('https://[::ffff:169.254.169.254]/latest/meta-data/');
  refused('https://[::ffff:127.0.0.1]/a.jpg');
  refused('https://[::ffff:10.0.0.1]/a.jpg');
});

/* ── malformed octets ────────────────────────────────────────────────────── */

test('an out-of-range octet is refused rather than waved through', () => {
  // 999.1.1.1 is not a valid address; the safe reading of nonsense is "no".
  refused('https://999.1.1.1/a.jpg');
});

/* ── the allowlist, which is the real answer where hosts are knowable ────── */

test('an allowlist refuses everything not on it', () => {
  const allow = ['files.cdn-files-a.com', 'images.unsplash.com'];
  allowed('https://files.cdn-files-a.com/a.jpg', allow);
  allowed('https://images.unsplash.com/a.jpg', allow);
  refused('https://evil.example.com/a.jpg', allow);
});

test('an allowlist matches subdomains but not lookalike suffixes', () => {
  const allow = ['cdn-files-a.com'];
  allowed('https://files.cdn-files-a.com/a.jpg', allow);
  allowed('https://cdn-files-a.com/a.jpg', allow);
  // The attack this guards: registering "evilcdn-files-a.com" and relying on
  // a naive endsWith to accept it.
  refused('https://evilcdn-files-a.com/a.jpg', allow);
});

test('the allowlist does not override the private-address refusal', () => {
  // Somebody allowlisting a host that resolves somewhere internal should still
  // be refused when they write the address out longhand.
  refused('https://127.0.0.1/a.jpg', ['127.0.0.1']);
});
