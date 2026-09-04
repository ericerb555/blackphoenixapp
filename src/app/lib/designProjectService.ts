/**
 * Design Project Service
 * Talks to the server-side design-projects API (KV-backed, versioned) so floor
 * plans persist across devices and keep a history. localStorage remains the fast
 * local cache/offline fallback; this layer syncs it to the backend.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from './supabase';
import type { UserContext } from './userStorageManager';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/**
 * The namespace deck designs live in.
 *
 * Every screen that reads or writes a deck has to agree on this string, and
 * when they disagree the failure is silent: the server defaults an unknown
 * owner to 'shared', so the write succeeds, the read succeeds, and they simply
 * happen in different places. Nothing errors and the list is just empty.
 *
 * That has already happened twice. The deck designer sent `ownerKey=` on its
 * GETs where the server reads `owner`, so it listed from 'shared' while saving
 * to 'decks'. And the pipeline referred to a DESIGN_OWNER_KEY that was never
 * defined anywhere, which threw before either call was made. Exporting the one
 * constant is what stops a third variation of the same bug.
 */
export const DESIGN_OWNER_KEY = 'decks';

/**
 * The namespace *this* person's designs live in.
 *
 * 'decks' is a shared namespace, and the server only lets staff into it — a
 * customer sending it is refused on save with "That is not yours to save to."
 * and gets an empty list on read. That was missed when the customer portal tab
 * was built: a customer could open the design centre, draw, and then discover
 * nothing would save.
 *
 * So staff keep 'decks', which is where every existing design already lives and
 * where the pipeline expects to find them, and everybody else gets a key of
 * their own. The shape is not free: the server accepts a non-staff key only if
 * it ends with that user's id and is longer than it, which is what stops one
 * customer naming another's namespace.
 *
 * Resolved per call rather than held in a constant, because it depends on who
 * is signed in and that is not known when the module loads.
 */
let ownerKeyCache: string | null = null;
// Cleared when the signed-in person changes, so signing out of a staff account
// and into a customer one does not leave the customer writing to 'decks'.
supabase.auth.onAuthStateChange(() => { ownerKeyCache = null; });

export async function ownerKeyForCurrentUser(): Promise<string> {
  if (ownerKeyCache) return ownerKeyCache;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return DESIGN_OWNER_KEY;
  const role = String(
    user.app_metadata?.role || user.app_metadata?.accountType || '',
  ).toLowerCase().replace(/-/g, '_');
  // Read from app_metadata only. user_metadata is writable by the account it
  // belongs to, so trusting it would let anybody put themselves in the shared
  // staff namespace by editing their own profile.
  const staff = new Set([
    'owner', 'admin', 'master_admin', 'super_admin', 'superadmin',
    'staff', 'employee', 'project_manager', 'estimator', 'office', 'management',
  ]);
  ownerKeyCache = staff.has(role) ? DESIGN_OWNER_KEY : `cust-${user.id}`;
  return ownerKeyCache;
}

/**
 * The signed-in person's token, not the anon key.
 *
 * This sent the anon key and nothing else, which was survivable only because
 * the design routes had no authorisation at all — and they had none, so anyone
 * holding that key could list, open, overwrite or delete every saved design.
 * Now that the server checks, a key identifying nobody would fail every call.
 *
 * Falls back to the anon key rather than throwing, so a signed-out caller gets
 * a clean 401 from the server instead of an exception here.
 */
async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

/** Stable per-user namespace matching userStorageManager's prefix scheme. */
export function ownerKeyFor(ctx: UserContext): string {
  return `${ctx.userType}_${ctx.userId}`;
}

export interface DesignProjectSummary {
  id: string;
  name: string;
  ownerKey: string;
  quoteId: string | null;
  version: number;
  floorCount: number;
  elementCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VersionMeta {
  versionId: string;
  version: number;
  note?: string;
  createdAt: string;
}

export interface SaveProjectInput {
  id?: string;
  name: string;
  ownerKey: string;
  floors?: any;
  elements?: any;
  layers?: any;
  quoteId?: string | null;
  note?: string;
}

/** Create or upsert a project; the server snapshots a new version each save. */
export async function saveDesignProject(input: SaveProjectInput): Promise<{ project: any; versionId: string }> {
  const res = await fetch(`${SERVER}/design-projects`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to save design project: ${data.error || res.status}`);
  }
  return { project: data.project, versionId: data.versionId };
}

/** List a user's projects (summaries only, no heavy element payloads). */
export async function listDesignProjects(ownerKey: string): Promise<DesignProjectSummary[]> {
  const res = await fetch(`${SERVER}/design-projects?owner=${encodeURIComponent(ownerKey)}`, {
    headers: await headers(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to list design projects: ${data.error || res.status}`);
  }
  return data.projects || [];
}

/** Fetch a full project plus its version history metadata. */
export async function getDesignProject(
  ownerKey: string,
  id: string,
): Promise<{ project: any; versions: VersionMeta[] }> {
  const res = await fetch(`${SERVER}/design-projects/${encodeURIComponent(id)}?owner=${encodeURIComponent(ownerKey)}`, {
    headers: await headers(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to get design project: ${data.error || res.status}`);
  }
  return { project: data.project, versions: data.versions || [] };
}

/** Fetch a specific snapshot's data. */
export async function getDesignProjectVersion(id: string, versionId: string): Promise<any> {
  const res = await fetch(
    `${SERVER}/design-projects/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    { headers: await headers() },
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to get version: ${data.error || res.status}`);
  }
  return data.version;
}

/** Restore a prior version as the current project (creates a new version). */
export async function restoreDesignProjectVersion(
  id: string,
  ownerKey: string,
  versionId: string,
): Promise<any> {
  const res = await fetch(`${SERVER}/design-projects/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ ownerKey, versionId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to restore version: ${data.error || res.status}`);
  }
  return data.project;
}

/** Delete a project and all of its versions. */
export async function deleteDesignProject(ownerKey: string, id: string): Promise<void> {
  const res = await fetch(`${SERVER}/design-projects/${encodeURIComponent(id)}?owner=${encodeURIComponent(ownerKey)}`, {
    method: 'DELETE',
    headers: await headers(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to delete design project: ${data.error || res.status}`);
  }
}
