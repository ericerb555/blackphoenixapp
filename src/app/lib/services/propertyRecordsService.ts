/**
 * propertyRecordsService — thin client for the public parcel-records API.
 *
 * Backed by the Regrid parcel database on the edge function:
 *   POST /property-records/lookup             (address → parcel facts + geometry)
 *   POST /landlord/properties/:id/enrich      (fill blanks + persist on a property)
 *
 * The parcel `geometry` is raw GeoJSON (Polygon / MultiPolygon) used to draw the
 * plot-plan outline. `lat`/`lon` position the OpenStreetMap view.
 */
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface ParcelFacts {
  parcelNumber?: string;
  owner?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  zoning?: string;
  zoningDescription?: string;
  zoningType?: string;
  landUse?: string;
  acreage?: number;
  buildingSqft?: number;
  yearBuilt?: string | number;
  landValue?: number;
  improvementValue?: number;
  parcelValue?: number;
  lat?: number;
  lon?: number;
  source?: string;
  sourceLabel?: string;
  fetchedAt?: string;
}

export interface ParcelGeometry {
  type: string;
  coordinates: any;
}

export interface ParcelLookupResult {
  parcel: ParcelFacts;
  geometry: ParcelGeometry | null;
}

/**
 * Look up an address in the public parcel database. `accessToken` is optional —
 * pass a session token when available; otherwise the anon key is used.
 */
export async function lookupParcel(address: string, accessToken?: string): Promise<ParcelLookupResult> {
  const res = await fetch(`${SERVER}/property-records/lookup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken || publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || `Parcel lookup failed (${res.status}).`);
  }
  return { parcel: payload.parcel, geometry: payload.geometry ?? null };
}

/**
 * Refresh a landlord property from public records (fills blank fields and stores
 * the parcel + geometry on the property). Requires the landlord's session token.
 */
export async function enrichLandlordProperty(
  propertyId: string,
  accessToken: string,
): Promise<{ property: any; parcel: ParcelFacts }> {
  const res = await fetch(`${SERVER}/landlord/properties/${encodeURIComponent(propertyId)}/enrich`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken || publicAnonKey}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || `Could not refresh property records (${res.status}).`);
  }
  return { property: payload.property, parcel: payload.parcel };
}
