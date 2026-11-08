/**
 * Finding a music bed you are allowed to post.
 *
 * Eric: "what can we connect to give us more options of music thats free?"
 *
 * WHAT WAS CHECKED, AND WHAT SURVIVED
 *
 *   Openverse      no API key, CORS `*`, filters by licence.      USED
 *   Freesound      reachable through Openverse, CORS `*`.         USED
 *   Wikimedia      reachable through Openverse, CORS `*`.         USED
 *   Pixabay        /api/audio/ exists but needs a free key, and
 *                  its licence allows commercial use with NO
 *                  attribution — the best of the lot, one key away. READY
 *   Free Music Archive   API answers 404. Dead.                   DROPPED
 *   ccMixter       does not resolve.                              DROPPED
 *   Jamendo        real catalogue, free client id, but commercial
 *                  use wants their paid licensing.                DROPPED
 *
 * THE LICENCE IS THE POINT, NOT THE SEARCH
 *
 * "Free" means three different things and only one of them is safe on a
 * commercial post. Free to listen is not free to use. CC-BY is free to use
 * AND REQUIRES CREDIT — a reel posted without it is a licence breach, not a
 * discourtesy. CC0 asks for nothing.
 *
 * So every result carries its licence and, when one is required, the exact
 * credit line to paste into the caption. Returning a URL without that would
 * be handing somebody a legal obligation they do not know they have, on the
 * public feed of a business that is being prepared for sale.
 *
 * ON WHAT OPENVERSE ACTUALLY HOLDS
 *
 * Mostly Freesound, which is a SOUND library — field recordings, one-shots,
 * "John Deere tractor.wav". There is real music in there and the filters
 * below bias hard towards it, but this is not a production music catalogue
 * and should not be sold as one. That is what the Pixabay key buys.
 */

export type MusicLicence = 'cc0' | 'by' | 'by-sa' | 'other';

export interface FreeTrack {
  id: string;
  title: string;
  creator: string;
  /** Direct audio, CORS-enabled, decodable in the browser. */
  url: string;
  /** Seconds. Openverse reports milliseconds; normalised here. */
  duration: number;
  licence: MusicLicence;
  licenceLabel: string;
  provider: string;
  /** Where a human can check the licence for themselves. */
  detailUrl: string;
  /** Empty when none is required. Paste into the caption when it is not. */
  attribution: string;
}

/** Openverse, which needs no key. */
const OPENVERSE = 'https://api.openverse.org/v1/audio/';

/**
 * Licences worth offering.
 *
 * CC0 and CC-BY only. Deliberately NOT `by-sa`: share-alike asks that the
 * work you make from it carries the same licence, and nobody wants to argue
 * about whether that infects a promotional reel. `nd` is excluded for the
 * obvious reason — a bed cut to length and ducked is a derivative.
 */
export const OFFERED_LICENCES = 'cc0,by';

export function buildSearchUrl(query: string, limit = 12): string {
  const q = String(query || '').trim() || 'instrumental background';
  const params = new URLSearchParams({
    q,
    license: OFFERED_LICENCES,
    page_size: String(Math.min(Math.max(1, limit), 40)),
    // Sound effects are the bulk of Openverse audio and the enemy of a bed.
    categories: 'music',
  });
  return `${OPENVERSE}?${params.toString()}`;
}

function licenceOf(raw: unknown): { licence: MusicLicence; label: string } {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'cc0' || value === 'pdm') return { licence: 'cc0', label: 'CC0 — no credit needed' };
  if (value === 'by') return { licence: 'by', label: 'CC BY — credit required' };
  if (value === 'by-sa') return { licence: 'by-sa', label: 'CC BY-SA' };
  return { licence: 'other', label: value ? value.toUpperCase() : 'Unknown' };
}

/**
 * The credit line, when one is owed.
 *
 * Openverse supplies a ready-made `attribution` string and it is the right
 * one to use — it names the work, the creator and the licence version, which
 * is what the licence actually asks for. Built by hand only when it is
 * missing, and never fabricated for CC0, where asking for credit that is not
 * owed trains people to ignore the field that matters.
 */
export function attributionFor(item: any, licence: MusicLicence): string {
  if (licence === 'cc0') return '';
  const ready = String(item?.attribution || '').trim();
  if (ready) return ready;

  const title = String(item?.title || 'Untitled').trim();
  const creator = String(item?.creator || 'Unknown artist').trim();
  const label = String(item?.license || '').toUpperCase();
  const version = String(item?.license_version || '').trim();
  return `"${title}" by ${creator} is licensed under CC ${label} ${version}`.trim();
}

/** Milliseconds from Openverse; seconds everywhere in this app. */
function durationSeconds(raw: unknown): number {
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  // Anything over an hour is a unit mix-up rather than a long track.
  return ms > 3_600_000 ? 0 : Math.round(ms / 100) / 10;
}

/**
 * Turn one Openverse record into something this app can use, or nothing.
 *
 * Returns null rather than a half-populated track. A row in a picker that
 * cannot actually play is worse than a shorter list.
 */
export function normaliseTrack(item: any): FreeTrack | null {
  const url = String(item?.url || '').trim();
  if (!/^https:\/\//i.test(url)) return null;

  const { licence, label } = licenceOf(item?.license);
  // Only the two we offer. A `by-sa` slipping through the API filter is
  // still a licence nobody wants to reason about on a commercial post.
  if (licence !== 'cc0' && licence !== 'by') return null;

  return {
    id: String(item?.id || url),
    title: String(item?.title || 'Untitled').trim(),
    creator: String(item?.creator || '').trim(),
    url,
    duration: durationSeconds(item?.duration),
    licence,
    licenceLabel: label,
    provider: String(item?.provider || '').trim(),
    detailUrl: String(item?.foreign_landing_url || item?.detail_url || '').trim(),
    attribution: attributionFor(item, licence),
  };
}

/**
 * Usable tracks, best first.
 *
 * CC0 is ranked above CC-BY because it costs the user nothing afterwards,
 * and anything too short to be a bed is dropped — a four-second one-shot
 * looped under a thirty-second reel is a drill, not music.
 */
export function usableTracks(results: any[], minSeconds = 15): FreeTrack[] {
  return (Array.isArray(results) ? results : [])
    .map(normaliseTrack)
    .filter((t): t is FreeTrack => !!t && (t.duration === 0 || t.duration >= minSeconds))
    .sort((a, b) => (a.licence === b.licence ? 0 : a.licence === 'cc0' ? -1 : 1));
}

/** Every credit line a finished reel owes, ready to paste under the post. */
export function creditsFor(tracks: FreeTrack[]): string {
  return (Array.isArray(tracks) ? tracks : [])
    .map((t) => t?.attribution)
    .filter(Boolean)
    .join('\n');
}
