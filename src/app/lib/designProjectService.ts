/**
 * Design Project Service
 * Talks to the server-side design-projects API (KV-backed, versioned) so floor
 * plans persist across devices and keep a history. localStorage remains the fast
 * local cache/offline fallback; this layer syncs it to the backend.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { UserContext } from './userStorageManager';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
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
    headers: headers(),
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
    headers: headers(),
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
    headers: headers(),
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
    { headers: headers() },
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
    headers: headers(),
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
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Failed to delete design project: ${data.error || res.status}`);
  }
}
