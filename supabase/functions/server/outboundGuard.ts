/**
 * Fetching a URL somebody outside the company chose.
 *
 * WHY THIS EXISTS
 *
 * A vendor registers their catalogue endpoint and our server goes and fetches
 * it. That is a request made *by us*, from inside our network, to an address a
 * stranger picked — which is the whole of server-side request forgery. Without a
 * guard, a vendor can point their "catalogue endpoint" at:
 *
 *   http://169.254.169.254/latest/meta-data/    cloud instance credentials
 *   http://127.0.0.1:8000/                      anything listening locally
 *   http://10.0.0.5/admin                       the private network
 *   http://[::1]/                               the same, over IPv6
 *
 * and read the response through our own catalogue preview. The endpoint field
 * is the attack; the fetch is just the delivery.
 *
 * WHAT IT DOES, AND WHAT IT HONESTLY CANNOT
 *
 * Everything checkable without a network is checked here and tested: the
 * scheme, credentials smuggled into the URL, the port, and every private,
 * loopback, link-local, carrier-grade-NAT and metadata range in both IPv4 and
 * IPv6 when the host is a literal address.
 *
 * A *hostname* is the hard case, because `evil.com` can resolve to 127.0.0.1
 * and only DNS knows. `resolveHost` attempts a lookup when the runtime allows
 * one and applies the same address rules to the answer. Where the runtime does
 * not permit DNS, that step is skipped — and the caller is told, rather than
 * being left to assume a check happened that did not.
 *
 * REDIRECTS ARE NOT FOLLOWED BLINDLY
 *
 * A public URL that answers `302 Location: http://169.254.169.254/` defeats any
 * check made only on the original address. `safeFetch` follows redirects by hand
 * and re-validates every hop.
 */

export interface UrlVerdict {
  ok: boolean;
  /** Why it was refused, phrased for the vendor who typed it. */
  reason?: string;
  url?: URL;
}

/** Only these. `file:`, `gopher:`, `ftp:` and friends are not catalogue feeds. */
const ALLOWED_PROTOCOLS = new Set(['https:']);

/**
 * Ports we will talk to. Restricting this is not paranoia: the interesting
 * targets on a private network are almost all on other ports, and a real
 * supplier API is on 443.
 */
const ALLOWED_PORTS = new Set(['', '443']);

/** Hostnames that mean "here" or "the metadata service" without any DNS. */
const BLOCKED_HOSTNAMES = new Set([
  'localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback',
  'metadata', 'metadata.google.internal', 'metadata.goog',
  'instance-data', 'instance-data.ec2.internal',
]);

/** Parse an IPv4 literal into four octets, or null if it is not one. */
function ipv4Octets(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n >= 0 && n <= 255) ? parts : null;
}

/**
 * Is this IPv4 address one we must never fetch from?
 *
 * The ranges, and why each is here:
 *   0.0.0.0/8        "this network" — resolves to local on many stacks
 *   10/8, 172.16/12, 192.168/16   private networks
 *   127/8            loopback
 *   169.254/16       link-local, and 169.254.169.254 is the metadata service
 *   100.64/10        carrier-grade NAT, routable inside many hosting networks
 *   192.0.0/24, 192.0.2/24, 198.18/15, 198.51.100/24, 203.0.113/24  special use
 *   224/4 and up     multicast, broadcast and reserved
 */
export function isBlockedIpv4(host: string): boolean {
  const o = ipv4Octets(host);
  if (!o) return false;
  const [a, b] = o;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

/**
 * Is this IPv6 address one we must never fetch from?
 *
 * Includes the IPv4-mapped form, because `::ffff:127.0.0.1` is loopback wearing
 * a different hat and a check that only reads IPv6 prefixes would wave it
 * through.
 */
export function isBlockedIpv6(raw: string): boolean {
  const host = raw.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (!host.includes(':')) return false;
  if (host === '::1' || host === '::') return true;

  /**
   * IPv4-mapped addresses, in both spellings.
   *
   * `::ffff:127.0.0.1` is loopback wearing a different hat, and a check that
   * only reads IPv6 prefixes waves it through. The catch found in testing: the
   * URL parser **normalises the dotted form to hex**, so
   * `https://[::ffff:127.0.0.1]/` arrives as `[::ffff:7f00:1]` and a
   * dotted-quad regex never matches it. Both forms are handled, and the hex one
   * is the form that actually turns up.
   */
  const dotted = /(?:^|:)(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
  if (dotted) return isBlockedIpv4(dotted[1]);

  const hex = /(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    const quad = [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
    return isBlockedIpv4(quad);
  }

  // fc00::/7 unique local, fe80::/10 link local, ff00::/8 multicast.
  if (/^f[cd]/.test(host)) return true;
  if (/^fe[89ab]/.test(host)) return true;
  if (/^ff/.test(host)) return true;
  return false;
}

/** Either family. */
export function isBlockedAddress(host: string): boolean {
  return isBlockedIpv4(host) || isBlockedIpv6(host);
}

/**
 * Everything that can be decided about a URL without touching the network.
 */
export function inspectUrl(raw: string): UrlVerdict {
  let url: URL;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    return { ok: false, reason: 'That is not a valid URL.' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: 'The endpoint must be an https:// address.' };
  }
  // Credentials in the URL get sent by us to whoever answers, and they end up in
  // logs. If a feed needs auth it goes in a header.
  if (url.username || url.password) {
    return { ok: false, reason: 'Put credentials in the API key field, not in the URL.' };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: 'The endpoint must be on the standard https port.' };
  }

  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, reason: 'That URL has no host.' };
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: 'That address points back at our own server.' };
  }
  if (host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    return { ok: false, reason: 'That address points inside a private network.' };
  }
  if (isBlockedAddress(host)) {
    return { ok: false, reason: 'That address is a private or internal one.' };
  }

  return { ok: true, url };
}

/**
 * The same rules applied to whatever a hostname resolves to.
 *
 * Returns `{ checked: false }` where the runtime will not do DNS for us, so the
 * caller can say so instead of implying a check that never ran.
 */
export async function resolveVerdict(hostname: string): Promise<{ checked: boolean; blocked: boolean }> {
  const resolver = (globalThis as any).Deno?.resolveDns;
  if (typeof resolver !== 'function') return { checked: false, blocked: false };
  try {
    const [v4, v6] = await Promise.all([
      resolver(hostname, 'A').catch(() => [] as string[]),
      resolver(hostname, 'AAAA').catch(() => [] as string[]),
    ]);
    const all = [...(v4 || []), ...(v6 || [])];
    if (!all.length) return { checked: true, blocked: false };
    return { checked: true, blocked: all.some((ip: string) => isBlockedAddress(ip)) };
  } catch {
    return { checked: false, blocked: false };
  }
}

export interface SafeFetchResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
  /** False when DNS could not be checked, so the caller can be honest about it. */
  dnsChecked?: boolean;
}

/** Bytes we will read from a vendor before giving up. A feed, not a filesystem. */
export const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 20_000;

/**
 * Fetch a vendor-supplied URL, revalidating on every redirect.
 *
 * The redirect loop is the reason this is not three lines: a URL that passes
 * every check and then answers `302 Location: http://169.254.169.254/` would
 * otherwise walk straight past the guard, because the browser-style automatic
 * redirect never asks again.
 */
export async function safeFetch(
  raw: string,
  init: { headers?: Record<string, string>; method?: string; body?: string } = {},
): Promise<SafeFetchResult> {
  let target = raw;
  let dnsChecked = true;
  const method = (init.method || 'GET').toUpperCase();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = inspectUrl(target);
    if (!verdict.ok || !verdict.url) return { ok: false, error: verdict.reason };

    const dns = await resolveVerdict(verdict.url.hostname);
    if (dns.checked && dns.blocked) {
      return { ok: false, error: 'That hostname resolves to a private address.' };
    }
    if (!dns.checked) dnsChecked = false;

    let res: Response;
    const timer = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    try {
      res = await fetch(verdict.url.toString(), {
        method,
        headers: { Accept: 'application/json', ...(init.headers || {}) },
        body: method === 'GET' || method === 'HEAD' ? undefined : init.body,
        redirect: 'manual',
        signal: timer,
      });
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Could not reach that endpoint.', dnsChecked };
    }

    if (res.status >= 300 && res.status < 400) {
      /**
       * A redirect is followed on a read and refused on a write.
       *
       * Following one on a POST means re-sending the body to wherever the first
       * host pointed — so a vendor whose order endpoint redirects would have our
       * purchase order, with its prices and quantities, delivered to a third
       * address of their choosing. Reading a catalogue from a redirect is
       * harmless; sending an order to one is handing over data.
       */
      if (method !== 'GET' && method !== 'HEAD') {
        return {
          ok: false,
          error: 'That endpoint redirected. An order endpoint must accept the request directly.',
          dnsChecked,
        };
      }
      const location = res.headers.get('location');
      if (!location) return { ok: false, error: 'That endpoint redirected to nowhere.', dnsChecked };
      // Relative redirects are resolved against the hop we are on, then checked
      // from the top like any other address.
      target = new URL(location, verdict.url).toString();
      continue;
    }

    // Read with a ceiling rather than trusting content-length, which a hostile
    // server can understate.
    const reader = res.body?.getReader();
    if (!reader) return { ok: res.ok, status: res.status, body: '', dnsChecked };
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, error: 'That feed is larger than 8MB.', status: res.status, dnsChecked };
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { merged.set(c, at); at += c.byteLength; }

    return { ok: res.ok, status: res.status, body: new TextDecoder().decode(merged), dnsChecked };
  }

  return { ok: false, error: 'That endpoint redirected too many times.', dnsChecked };
}
