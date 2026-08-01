/**
 * PropertyRecordsPanel — shared "Public records, GIS & plot plan" surface.
 *
 * Reused by the landlord portal, the condo association portal, and the
 * owner-side document views. Given an address (and, once fetched, the parcel
 * facts + boundary geometry), it renders:
 *   - The verified parcel facts (zoning, acreage, assessed value, owner, APN)
 *   - An OpenStreetMap map centered on the parcel (no API key required)
 *   - The parcel boundary drawn as a scalable SVG plot-plan outline
 *
 * Dependency-free: the map is an <iframe> OSM embed and the plot plan is an
 * inline <svg> derived from the GeoJSON geometry.
 */
import { useState } from 'react';
import { MapPin, RefreshCw, Landmark, Ruler, Building2, DollarSign, FileText, ExternalLink, Loader2, Compass } from 'lucide-react';
import type { ParcelFacts, ParcelGeometry } from '../../lib/services/propertyRecordsService';

interface Props {
  address: string;
  parcel?: ParcelFacts | null;
  geometry?: ParcelGeometry | null;
  recordsUpdatedAt?: string;
  /** Called when the user clicks "Refresh from public records". */
  onRefresh?: () => Promise<void> | void;
  /** Whether the current user is allowed to trigger a refresh. */
  canRefresh?: boolean;
  /** Compact mode drops the fact grid down to the essentials. */
  compact?: boolean;
}

const money = (n?: number) =>
  typeof n === 'number' && !Number.isNaN(n) ? '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—';

// Flatten a GeoJSON Polygon / MultiPolygon into an array of rings ([[lon,lat],…]).
function extractRings(geometry?: ParcelGeometry | null): number[][][] {
  if (!geometry || !geometry.coordinates) return [];
  const rings: number[][][] = [];
  const coords = geometry.coordinates;
  if (geometry.type === 'Polygon') {
    for (const ring of coords) rings.push(ring as number[][]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of coords) for (const ring of poly) rings.push(ring as number[][]);
  }
  return rings.filter((r) => Array.isArray(r) && r.length >= 3);
}

function bounds(rings: number[][][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function PlotPlan({ geometry }: { geometry?: ParcelGeometry | null }) {
  const rings = extractRings(geometry);
  if (rings.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A] text-center">
        <div className="px-6">
          <Compass className="mx-auto mb-2 h-6 w-6 text-gray-600" />
          <p className="text-xs text-gray-500">No plot boundary on file yet. Refresh from public records to pull the parcel outline.</p>
        </div>
      </div>
    );
  }
  const b = bounds(rings);
  const W = 300, H = 240, PAD = 20;
  const spanX = Math.max(b.maxX - b.minX, 1e-9);
  const spanY = Math.max(b.maxY - b.minY, 1e-9);
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  // Center the drawing and flip Y (latitude increases upward).
  const drawnW = spanX * scale, drawnH = spanY * scale;
  const offX = PAD + (W - PAD * 2 - drawnW) / 2;
  const offY = PAD + (H - PAD * 2 - drawnH) / 2;
  const project = ([x, y]: number[]) => [offX + (x - b.minX) * scale, offY + (b.maxY - y) * scale];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]" role="img" aria-label="Parcel plot plan">
      <defs>
        <pattern id="plot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1A1A1A" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#plot-grid)" />
      {rings.map((ring, i) => {
        const pts = ring.map(project).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        return (
          <polygon
            key={i}
            points={pts}
            fill="rgba(16,185,129,0.14)"
            stroke="#10B981"
            strokeWidth={i === 0 ? 2 : 1.25}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

function OsmMap({ lat, lon }: { lat?: number; lon?: number }) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] bg-[#0A0A0A] text-center">
        <div className="px-6">
          <MapPin className="mx-auto mb-2 h-6 w-6 text-gray-600" />
          <p className="text-xs text-gray-500">No coordinates on file yet. Refresh from public records to locate this parcel on the map.</p>
        </div>
      </div>
    );
  }
  const d = 0.0025;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
  return (
    <div className="relative h-full min-h-[220px] overflow-hidden rounded-lg border border-[#2A2A2A]">
      <iframe title="Property location map" src={src} className="h-full w-full min-h-[220px]" loading="lazy" />
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur hover:bg-black/90"
      >
        <ExternalLink className="h-3 w-3" /> Larger map
      </a>
    </div>
  );
}

export function PropertyRecordsPanel({ address, parcel, geometry, recordsUpdatedAt, onRefresh, canRefresh = true, compact = false }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const hasData = !!(parcel && (parcel.parcelNumber || parcel.zoning || parcel.acreage || parcel.owner || parcel.lat));

  async function handleRefresh() {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }

  const facts: { label: string; value: string; icon: any }[] = parcel ? [
    { label: 'Owner of record', value: parcel.owner || '—', icon: Landmark },
    { label: 'Parcel / APN', value: parcel.parcelNumber || '—', icon: FileText },
    { label: 'Zoning', value: [parcel.zoning, parcel.zoningDescription].filter(Boolean).join(' · ') || '—', icon: Building2 },
    { label: 'Land use', value: parcel.landUse || '—', icon: Compass },
    { label: 'Lot size', value: parcel.acreage ? `${parcel.acreage} acres` : '—', icon: Ruler },
    { label: 'Building footprint', value: parcel.buildingSqft ? `${parcel.buildingSqft.toLocaleString()} sqft` : '—', icon: Ruler },
    { label: 'Year built', value: parcel.yearBuilt ? String(parcel.yearBuilt) : '—', icon: Building2 },
    { label: 'Assessed value', value: money(parcel.parcelValue), icon: DollarSign },
    { label: 'County', value: [parcel.county, parcel.state].filter(Boolean).join(', ') || '—', icon: MapPin },
  ] : [];
  const shownFacts = compact ? facts.filter((f) => ['Zoning', 'Lot size', 'Assessed value', 'Parcel / APN'].includes(f.label)) : facts;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-white">
            <MapPin className="h-4 w-4 text-emerald-400" /> Public records, GIS &amp; plot plan
          </h4>
          <p className="mt-0.5 text-xs text-gray-500">
            {hasData
              ? <>From {parcel?.sourceLabel || 'the official parcel record'}{recordsUpdatedAt ? ` · updated ${new Date(recordsUpdatedAt).toLocaleDateString()}` : ''}</>
              : <>Pull live parcel data &amp; the plot boundary for {address || 'this property'} from the official records.</>}
          </p>
        </div>
        {onRefresh && canRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing || !address}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {hasData ? 'Refresh from public records' : 'Pull from public records'}
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <OsmMap lat={parcel?.lat} lon={parcel?.lon} />
        <PlotPlan geometry={geometry} />
      </div>

      {hasData && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {shownFacts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="min-w-0">
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500"><Icon className="h-3 w-3" /> {f.label}</p>
                <p className="truncate text-sm font-medium text-white" title={f.value}>{f.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
