/**
 * Which job the design workspace is currently on.
 *
 * The workspace is seven screens — designer, stair calculator, permits, scanner
 * and the rest — and until now only the deck designer knew which project was
 * open. Walking from the designer to the stair calculator lost the thread
 * entirely, and a stair calculation done against the wrong deck is worse than
 * no stair calculation, because it looks finished.
 *
 * WHY LOCALSTORAGE RATHER THAN A CONTEXT
 *
 * These screens are swapped by a page map, not nested under a shared parent, so
 * a provider would have to be threaded through the whole app to reach them.
 * localStorage needs nothing threaded anywhere, and it survives a reload — which
 * matters here, because a builder reloading the permits page mid-application
 * should not have to go back and reopen the deck to say which job it is for.
 *
 * WHAT IT DELIBERATELY DOES NOT HOLD
 *
 * Anything about the design itself. This is a label, not a second copy of the
 * model — a copy would drift, and then two screens would disagree about the deck
 * while both looked authoritative. The id is here so a screen can go and fetch
 * the real record when it needs one.
 */

const KEY = 'design.currentJob.v1';

/** Fired on this tab when the job changes; `storage` covers the other tabs. */
const EVENT = 'design:currentjob';

export interface CurrentJob {
  /** The saved design project, or null when it has never been saved. */
  id: string | null;
  name: string;
  address: string;
  /** The work request this design belongs to, by its readable title. */
  jobTitle: string;
  /**
   * The quote this design priced.
   *
   * Empty for now: a deck design carries no quote link yet, though the server
   * record has had a `quoteId` field all along. The slot is here so that
   * connecting the two later is a change in one writer rather than a change to
   * every screen that displays this.
   */
  quoteNumber: string;
}

export const EMPTY_JOB: CurrentJob = { id: null, name: '', address: '', jobTitle: '', quoteNumber: '' };

export function readCurrentJob(): CurrentJob | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    // A name is the least it can have and still be worth showing.
    return v && typeof v.name === 'string' ? { ...EMPTY_JOB, ...v } : null;
  } catch {
    return null;
  }
}

/** Publish the job, or clear it with null. Safe to call when nothing changed. */
export function setCurrentJob(job: CurrentJob | null): void {
  try {
    if (job && job.name.trim()) localStorage.setItem(KEY, JSON.stringify(job));
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode or quota. The indicator going quiet is not worth an error.
  }
  try { window.dispatchEvent(new CustomEvent(EVENT)); } catch { /* no window */ }
}

/** Subscribe to changes. Returns an unsubscribe. */
export function onCurrentJobChange(fn: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** One line describing the job, in the order that tells two jobs apart fastest. */
export function describeJob(job: CurrentJob): string {
  return [job.name, job.address, job.jobTitle, job.quoteNumber && `Quote ${job.quoteNumber}`]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' · ');
}
