/**
 * Fetching a URL somebody else chose.
 *
 * WHY THIS EXISTS
 *
 * M-4 in tasks/security-audit-2026-10-16.md. `rehostImage` in
 * content-studio.tsx took a URL straight out of the request body and called
 * `fetch` on it from inside the edge function, with a size cap and a
 * content-type check but no restriction on *where* it pointed. That is a
 * server-side request forgery: the caller picks the address, our server makes
 * the request, and the response is written into our storage bucket.
 *
 * Supabase Edge runs on Deno Deploy, which has no instance-metadata service to
 * steal, so this is not the classic cloud-credential SSRF and the finding was
 * ranked Medium rather than Critical. What it still buys an attacker is a
 * request issued from our network with our egress identity, and a way to plant
 * chosen bytes in our bucket.
 *
 * WHAT IS CHECKED, AND WHY EACH ONE
 *
 *   https only          `http:` is plaintext, and `file:`, `data:` and `blob:`
 *                       have no business being fetched server-side at all.
 *   no userinfo         `https://user:pass@host/` smuggles credentials and
 *                       reads as a different host to a careless eye.
 *   no private targets  loopback, RFC1918, link-local, CGNAT, and the names
 *                       that resolve to them. 169.254.169.254 is the cloud
 *                       metadata address everywhere and is refused by name as
 *                       well as by range.
 *   redirects by hand   THE PART THAT MATTERS MOST. Every check above is
 *                       worthless against a public host that answers 302 to
 *                       http://169.254.169.254/ — `fetch` follows that quite
 *                       happily and only the final response is visible to the
 *                       caller. So redirects are followed manually and every
 *                       hop is re-validated, with a hop limit so a redirect
 *                       loop cannot hang the function.
 *
 * WHAT IS DELIBERATELY NOT CHECKED
 *
 * DNS is not resolved before connecting, so a hostname that resolves to a
 * private address still passes — the classic DNS-rebinding gap. Deno Deploy
 * does not reliably offer `Deno.resolveDns`, and `fetch` gives no hook to pin
 * the resolved address, so closing it properly is not available here. It is
 * recorded rather than hidden: the honest description of this module is that
 * it stops the easy version and raises the cost of the hard one.
 *
 * The real fix for the one caller that matters is `allowHosts` — an allowlist
 * of supplier CDNs makes the whole class moot. The default-deny range checks
 * are the backstop for callers that cannot practically enumerate their hosts.
 */

/** Hostnames that must never be fetched, whatever they resolve to. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/**
 * Address ranges that are not on the public internet.
 *
 * Matched against the hostname only when it is an IP literal. A name is
 * checked against BLOCKED_HOSTNAMES and the suffix rules instead.
 */
function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255)) return true; // malformed → refuse
  if (a === 0) return true;                        // "this network"
  if (a === 10) return true;                       // RFC1918
  if (a === 127) return true;                      // loopback
  if (a === 169 && b === 254) return true;         // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true;         // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true;                       // multicast and reserved
  return false;
}

/**
 * Expand an IPv6 address to its eight 16-bit groups, or null if unparseable.
 *
 * Needed because the textual form cannot be pattern-matched reliably: `::`
 * stands for any number of zero groups, and an IPv4-mapped address may be
 * written either way round.
 */
function expandIPv6(raw: string): number[] | null {
  let h = raw.replace(/^\[|\]$/g, '').toLowerCase();
  if (!h.includes(':')) return null;

  // A trailing dotted quad (::ffff:1.2.3.4) becomes two hex groups.
  const dotted = h.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) {
    const o = dotted[2].split('.').map(Number);
    if (o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    h = `${dotted[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }

  const halves = h.split('::');
  if (halves.length > 2) return null;
  const parse = (s: string) => (s ? s.split(':').filter((x) => x !== '') : []);
  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 1 && head.length !== 8) return null;
  if (fill < 0) return null;

  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...tail]
    .map((g) => parseInt(g, 16));
  if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) return null;
  return groups;
}

function isPrivateIPv6(host: string): boolean {
  const g = expandIPv6(host);
  if (!g) return true; // unparseable where an address was expected → refuse

  // Loopback ::1 and unspecified ::
  if (g.slice(0, 7).every((x) => x === 0) && (g[7] === 1 || g[7] === 0)) return true;

  /**
   * IPv4-mapped (::ffff:0:0/96), and the reason this is not a regex.
   *
   * `new URL()` normalises `::ffff:169.254.169.254` to `::ffff:a9fe:a9fe`, so
   * the dotted form this originally matched on NEVER reaches us — the cloud
   * metadata address sailed straight through wearing hex. Caught by the test
   * written for exactly that bypass. Decode the low 32 bits instead and run
   * the real IPv4 rules over them.
   */
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isPrivateIPv4(v4);
  }

  const first = g[0];
  if ((first & 0xffc0) === 0xfe80) return true;  // fe80::/10 link-local
  if ((first & 0xfe00) === 0xfc00) return true;  // fc00::/7 unique local
  return false;
}

export interface SafeFetchOptions {
  /** Only these hostnames may be fetched. Strongly preferred where the set is knowable. */
  allowHosts?: string[];
  /** Redirect hops to follow. Default 3. */
  maxRedirects?: number;
  /** Abort after this many ms. Default 10000. */
  timeoutMs?: number;
}

/** Why a URL was refused, or null when it is acceptable. */
export function describeUnsafeUrl(raw: string, allowHosts?: string[]): string | null {
  let u: URL;
  try { u = new URL(raw); } catch { return 'not a valid URL'; }

  if (u.protocol !== 'https:') return `scheme ${u.protocol} is not allowed (https only)`;
  if (u.username || u.password) return 'URL carries credentials';

  const host = u.hostname.toLowerCase();
  if (!host) return 'no hostname';

  if (allowHosts?.length) {
    const ok = allowHosts.some((h) => {
      const allowed = h.toLowerCase();
      return host === allowed || host.endsWith(`.${allowed}`);
    });
    if (!ok) return `host ${host} is not on the allowlist`;
  }

  if (BLOCKED_HOSTNAMES.has(host)) return `host ${host} is not routable`;
  if (host.endsWith('.local') || host.endsWith('.internal')) return `host ${host} is not routable`;
  if (isPrivateIPv4(host)) return `host ${host} is a private address`;
  if (host.includes(':') && isPrivateIPv6(host)) return `host ${host} is a private address`;

  return null;
}

/**
 * `fetch` for a URL the caller chose.
 *
 * Throws rather than returning a sentinel, so a caller cannot forget to check:
 * the failure is loud at the call site and the existing try/catch handles it.
 */
export async function safeFetch(raw: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { allowHosts, maxRedirects = 3, timeoutMs = 10000 } = options;

  let target = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const reason = describeUnsafeUrl(target, allowHosts);
    if (reason) throw new Error(`Refusing to fetch: ${reason}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      // Manual, so each hop is re-validated. See the note at the top.
      res = await fetch(target, { redirect: 'manual', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status < 300 || res.status > 399) return res;

    const location = res.headers.get('location');
    if (!location) return res;
    // Relative redirects resolve against the hop we just made.
    target = new URL(location, target).toString();
  }

  throw new Error(`Refusing to fetch: more than ${maxRedirects} redirects`);
}
