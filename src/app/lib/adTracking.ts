/**
 * Ad serving and event reporting.
 *
 * Ads used to be read from `localStorage` and nothing anywhere recorded an
 * impression or a click, which is why the advertiser portal's numbers were
 * literals. This is the piece that makes them real.
 *
 * TWO THINGS MATTER HERE, AND BOTH ARE ABOUT NOT OVER-COUNTING.
 *
 * A marquee re-renders constantly — on scroll, on tab change, on any parent
 * state change — and it is mounted on nineteen surfaces. Counting every render
 * as a fresh impression would inflate the number an advertiser is *billed* on,
 * which is worse than not counting at all: it is over-charging.
 *
 * So an impression is recorded at most once per creative per page session, and
 * events are batched rather than sent one request at a time.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/advertising`;

export interface ServedAd {
  id: string;
  campaignId: string | null;
  title: string;
  content: string;
  linkUrl: string;
  imageUrl: string;
}

/** Fetch the ads currently running for a placement. */
export async function fetchAds(placement = 'marquee', limit = 12): Promise<ServedAd[]> {
  try {
    const res = await fetch(`${API}/serve?placement=${encodeURIComponent(placement)}&limit=${limit}`, {
      headers: await authedHeadersOrAnon(publicAnonKey),
    });
    const json = await res.json().catch(() => ({}));
    return Array.isArray(json?.ads) ? json.ads : [];
  } catch {
    // A failed ad fetch must never break the page it sits on.
    return [];
  }
}

// Creatives already counted this page session, so a re-render is not a new view.
const seenImpressions = new Set<string>();
let queue: Array<{ creativeId: string; kind: 'impression' | 'click' }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  const events = queue;
  queue = [];
  if (!events.length) return;
  try {
    await fetch(`${API}/events`, {
      method: 'POST',
      headers: await authedHeadersOrAnon(publicAnonKey),
      body: JSON.stringify({ events }),
      // Lets a click that navigates away still deliver its event.
      keepalive: true,
    });
  } catch {
    /* Losing a count is acceptable; breaking the page is not. */
  }
}

function enqueue(creativeId: string, kind: 'impression' | 'click') {
  if (!creativeId) return;
  queue.push({ creativeId, kind });
  // A click is worth sending promptly — the user may be navigating away.
  if (kind === 'click') { void flush(); return; }
  if (!flushTimer) flushTimer = setTimeout(flush, 2000);
}

/** Record that a creative was actually shown. Idempotent per page session. */
export function recordImpression(creativeId: string) {
  if (!creativeId || seenImpressions.has(creativeId)) return;
  seenImpressions.add(creativeId);
  enqueue(creativeId, 'impression');
}

/** Record a click. Not deduplicated — two clicks are two clicks. */
export function recordClick(creativeId: string) {
  enqueue(creativeId, 'click');
}

// Anything still queued when the tab goes away is worth one last attempt.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}
