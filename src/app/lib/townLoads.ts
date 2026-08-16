/**
 * The load case for the town a deck is being built in.
 *
 * `deckStructural` states, deliberately, that ground snow load and frost depth
 * are never inferred — a plausible-looking guess is worse than an empty field
 * because it will be believed. This does not weaken that. Reading a figure that
 * somebody entered off the building department's own table is a lookup, not an
 * inference, and it arrives carrying the note saying where it came from.
 *
 * What it does not do is mark the loads verified. `SiteLoads.verified` means an
 * operator confirmed these came from the authority having jurisdiction, and only
 * an operator can say that. So a town record fills the fields and leaves the tick
 * box alone; until it is ticked the permit packet keeps printing NOT SUPPLIED,
 * which is the honest state of a number nobody has checked yet.
 */
import { supabase } from './supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface TownLoadCase {
  townId: string;
  townName: string;
  state: string;
  /** Zero where the town record has not established it. */
  groundSnowPsf: number;
  frostDepthIn: number;
  codeEdition: string;
  /** Free text saying where the figures came from. Empty if never recorded. */
  loadSource: string;
  loadsUpdatedAt: string;
}

/** Mirrors the id the server mints, so a town can be found without listing ids. */
function townId(name: string, state: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${state.trim().toLowerCase().slice(0, 2)}`;
}

/** True when a record carries at least one figure worth offering. */
export function hasUsableLoads(t: TownLoadCase | null): boolean {
  return !!t && (t.groundSnowPsf > 0 || t.frostDepthIn > 0 || !!t.codeEdition);
}

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

/**
 * Look up what a town enforces. Null when there is no record, which is the
 * normal state for a town nobody has filed in yet and is not an error.
 */
export async function lookupTownLoads(
  name: string, state: string, signal?: AbortSignal,
): Promise<TownLoadCase | null> {
  if (!name.trim() || state.trim().length < 2) return null;
  const want = townId(name, state);
  try {
    const res = await fetch(`${SERVER}/town-permits/towns`, { headers: await headers(), signal });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const towns: any[] = Array.isArray(data?.towns) ? data.towns : [];
    const hit = towns.find(t => String(t?.id) === want);
    if (!hit) return null;
    return {
      townId: String(hit.id),
      townName: String(hit.name || name),
      state: String(hit.state || state).toUpperCase(),
      groundSnowPsf: Number(hit.groundSnowPsf) || 0,
      frostDepthIn: Number(hit.frostDepthIn) || 0,
      codeEdition: String(hit.codeEdition || ''),
      loadSource: String(hit.loadSource || ''),
      loadsUpdatedAt: String(hit.loadsUpdatedAt || ''),
    };
  } catch {
    // An unreachable server means the operator types the loads in by hand, the
    // way they did before this existed. It is not worth an error toast.
    return null;
  }
}
