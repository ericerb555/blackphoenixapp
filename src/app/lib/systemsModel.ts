/**
 * Devices and fixtures on the plan — what is there now, and what we want.
 *
 * WHAT THIS IS FOR, AND WHAT IT IS NOT
 *
 * It is a scope plan a licensed trade can price from. It is not engineering:
 * there are no load calculations, no panel schedules, no fixture units and no
 * Manual J. We say where things go and where the services already are; the
 * electrician says whether the panel can carry it.
 *
 * That distinction is the whole design. Producing a device layout is worth real
 * money to a sub — it is the difference between quoting tight and padding for
 * the unknown — and it carries none of the liability of designing the system.
 *
 * EXISTING MATTERS AS MUCH AS PROPOSED
 *
 * A sub who can see where the panel is, what circuits exist and where the stack
 * runs quotes what the job costs. One who cannot adds a number for the unknown,
 * and that number is always bigger than the truth. So the layer holds both
 * states and the count reports them separately.
 *
 * WHY THE PLACEMENT IS GENERIC
 *
 * A receptacle at a point in a room and a sofa at a point in a room are the same
 * shape of thing: a catalogue item, a position, a state. Building this for
 * electrical devices specifically would mean building it again for furniture,
 * and then having two systems that place things and disagree about how. So a
 * `Placement` knows nothing about electricity, and furniture will drop into it
 * later without touching this file.
 */

export type Discipline = 'electrical' | 'plumbing' | 'hvac' | 'low-voltage';

/** Anything that can sit at a point in a room. Furniture will use this too. */
export interface PlaceableItem {
  id: string;
  label: string;
  /** Which trade prices it. `furnishing` is priced by nobody — it is a product. */
  discipline: Discipline | 'furnishing';
  /** Two or three characters, for the plan. */
  symbol: string;
  /**
   * Whether it has to be in before the walls close.
   *
   * The single most expensive thing to forget. A television outlet missed
   * before the sheetrock is a cut-open wall; missed before the paint it is a
   * patch and a repaint.
   */
  roughIn: boolean;
  /** Mounting height above the finished floor, where there is a usual one. */
  heightIn?: number;
  note?: string;
}

export const CATALOGUE: PlaceableItem[] = [
  // ── electrical ──
  { id: 'receptacle', label: 'Receptacle', discipline: 'electrical', symbol: 'R', roughIn: true, heightIn: 15 },
  { id: 'receptacle-gfci', label: 'GFCI receptacle', discipline: 'electrical', symbol: 'GF', roughIn: true, heightIn: 15,
    note: 'Required within six feet of a sink, and in bathrooms, kitchens, garages and outside.' },
  { id: 'receptacle-counter', label: 'Counter receptacle', discipline: 'electrical', symbol: 'RC', roughIn: true, heightIn: 42 },
  { id: 'switch', label: 'Switch', discipline: 'electrical', symbol: 'S', roughIn: true, heightIn: 48 },
  { id: 'switch-3way', label: '3-way switch', discipline: 'electrical', symbol: 'S3', roughIn: true, heightIn: 48,
    note: 'Two of them, and a traveller between — say which pair goes together.' },
  { id: 'dimmer', label: 'Dimmer', discipline: 'electrical', symbol: 'SD', roughIn: true, heightIn: 48 },
  { id: 'light-ceiling', label: 'Ceiling light', discipline: 'electrical', symbol: 'L', roughIn: true },
  { id: 'light-recessed', label: 'Recessed light', discipline: 'electrical', symbol: 'RL', roughIn: true },
  { id: 'light-pendant', label: 'Pendant', discipline: 'electrical', symbol: 'P', roughIn: true },
  { id: 'light-sconce', label: 'Sconce', discipline: 'electrical', symbol: 'SC', roughIn: true, heightIn: 66 },
  { id: 'light-under-cab', label: 'Under-cabinet light', discipline: 'electrical', symbol: 'UC', roughIn: true },
  { id: 'circuit-dedicated', label: 'Dedicated circuit', discipline: 'electrical', symbol: 'DC', roughIn: true,
    note: 'Range, dishwasher, disposal, microwave, washer — each wants its own.' },
  { id: 'panel', label: 'Panel', discipline: 'electrical', symbol: 'PNL', roughIn: false,
    note: 'Photograph it open. Whether there are spare ways decides a great deal.' },
  { id: 'smoke-co', label: 'Smoke / CO detector', discipline: 'electrical', symbol: 'SD', roughIn: true,
    note: 'Interconnected and hard-wired on anything permitted.' },

  // ── plumbing ──
  { id: 'sink', label: 'Sink', discipline: 'plumbing', symbol: 'SK', roughIn: true },
  { id: 'toilet', label: 'Toilet', discipline: 'plumbing', symbol: 'WC', roughIn: true },
  { id: 'tub', label: 'Bath', discipline: 'plumbing', symbol: 'TB', roughIn: true },
  { id: 'shower', label: 'Shower', discipline: 'plumbing', symbol: 'SH', roughIn: true },
  { id: 'washer-box', label: 'Washer box', discipline: 'plumbing', symbol: 'WB', roughIn: true, heightIn: 42 },
  { id: 'water-heater', label: 'Water heater', discipline: 'plumbing', symbol: 'WH', roughIn: false },
  { id: 'shutoff', label: 'Shut-off', discipline: 'plumbing', symbol: 'SO', roughIn: true },
  { id: 'hose-bib', label: 'Hose bib', discipline: 'plumbing', symbol: 'HB', roughIn: true },
  { id: 'stack', label: 'Waste stack', discipline: 'plumbing', symbol: 'ST', roughIn: false,
    note: 'Where it runs decides what a relocated fixture costs.' },

  // ── hvac ──
  { id: 'supply', label: 'Supply register', discipline: 'hvac', symbol: 'SU', roughIn: true },
  { id: 'return', label: 'Return', discipline: 'hvac', symbol: 'RT', roughIn: true },
  { id: 'thermostat', label: 'Thermostat', discipline: 'hvac', symbol: 'T', roughIn: true, heightIn: 60 },
  { id: 'minisplit-head', label: 'Mini-split head', discipline: 'hvac', symbol: 'MS', roughIn: true },
  { id: 'condenser', label: 'Condenser', discipline: 'hvac', symbol: 'CU', roughIn: false },
  { id: 'air-handler', label: 'Air handler', discipline: 'hvac', symbol: 'AH', roughIn: false },
  { id: 'exhaust-fan', label: 'Extract fan', discipline: 'hvac', symbol: 'EF', roughIn: true,
    note: 'Ducted outside, not into the roof space.' },

  // ── low voltage ──
  { id: 'tv-outlet', label: 'TV outlet', discipline: 'low-voltage', symbol: 'TV', roughIn: true, heightIn: 60,
    note: 'Needs blocking in the framing and a receptacle behind it.' },
  { id: 'speaker-wall', label: 'In-wall speaker', discipline: 'low-voltage', symbol: 'SP', roughIn: true },
  { id: 'speaker-ceiling', label: 'In-ceiling speaker', discipline: 'low-voltage', symbol: 'SPC', roughIn: true },
  { id: 'data', label: 'Data point', discipline: 'low-voltage', symbol: 'D', roughIn: true, heightIn: 15 },
  { id: 'camera', label: 'Camera', discipline: 'low-voltage', symbol: 'CAM', roughIn: true },
  { id: 'doorbell', label: 'Doorbell', discipline: 'low-voltage', symbol: 'DB', roughIn: true },
];

export function itemById(id: string): PlaceableItem | undefined {
  return CATALOGUE.find(i => i.id === id);
}

export function itemsFor(discipline: Discipline | 'furnishing'): PlaceableItem[] {
  return CATALOGUE.filter(i => i.discipline === discipline);
}

/**
 * One thing, in one place.
 *
 * Knows nothing about what it is beyond a catalogue id — which is what lets a
 * sofa use this later without a second placement system.
 */
export interface Placement {
  id: string;
  itemId: string;
  /** Plan coordinates, in feet. */
  x: number;
  y: number;
  roomId?: string;
  state: 'existing' | 'proposed' | 'removed';
  /** Overrides the catalogue's usual mounting height. */
  heightIn?: number;
  note?: string;
}

export const DISCIPLINES: Array<{ id: Discipline; label: string; trade: string }> = [
  { id: 'electrical', label: 'Electrical', trade: 'electrical' },
  { id: 'plumbing', label: 'Plumbing', trade: 'plumbing' },
  { id: 'hvac', label: 'HVAC', trade: 'hvac' },
  { id: 'low-voltage', label: 'Low voltage and AV', trade: 'electrical' },
];

let seq = 0;
export function placeItem(itemId: string, x: number, y: number, state: Placement['state'] = 'proposed'): Placement {
  seq += 1;
  return { id: `PL-${Date.now().toString(36)}-${seq.toString(36)}`, itemId, x, y, state };
}

/* ── the count a sub prices from ──────────────────────────────────────── */

export interface CountRow {
  itemId: string;
  label: string;
  existing: number;
  proposed: number;
  removed: number;
  /** What actually gets installed: proposed only. */
  toInstall: number;
  roughIn: boolean;
  note?: string;
}

export interface DisciplineCount {
  discipline: Discipline;
  label: string;
  trade: string;
  rows: CountRow[];
  totalExisting: number;
  totalProposed: number;
  /** Devices needing to be in before the walls close. */
  roughInCount: number;
}

export function countByDiscipline(placements: Placement[]): DisciplineCount[] {
  const out: DisciplineCount[] = [];

  for (const d of DISCIPLINES) {
    const mine = placements.filter(p => itemById(p.itemId)?.discipline === d.id);
    if (!mine.length) continue;

    const byItem = new Map<string, CountRow>();
    for (const p of mine) {
      const item = itemById(p.itemId)!;
      const row = byItem.get(p.itemId) || {
        itemId: p.itemId, label: item.label,
        existing: 0, proposed: 0, removed: 0, toInstall: 0,
        roughIn: item.roughIn, note: item.note,
      };
      row[p.state] += 1;
      byItem.set(p.itemId, row);
    }
    for (const row of byItem.values()) row.toInstall = row.proposed;

    const rows = [...byItem.values()].sort((a, b) => a.label.localeCompare(b.label));
    out.push({
      discipline: d.id, label: d.label, trade: d.trade, rows,
      totalExisting: rows.reduce((n, r) => n + r.existing, 0),
      totalProposed: rows.reduce((n, r) => n + r.proposed, 0),
      roughInCount: rows.filter(r => r.roughIn).reduce((n, r) => n + r.proposed, 0),
    });
  }

  return out;
}

/* ── what a layout implies elsewhere ──────────────────────────────────── */

export interface SystemsFinding {
  severity: 'code' | 'sequence' | 'worth-checking';
  message: string;
}

/**
 * Read the layout for what it means to other trades.
 *
 * The sequence findings are the valuable ones. A television chosen while
 * picking finishes creates blocking in framing and a receptacle in electrical,
 * both before the sheetrock — a fact nobody remembers at the time and everybody
 * remembers afterwards, standing in front of a finished wall with a saw.
 */
export function readSystems(placements: Placement[]): SystemsFinding[] {
  const out: SystemsFinding[] = [];
  const proposed = placements.filter(p => p.state === 'proposed');
  const countOf = (id: string) => proposed.filter(p => p.itemId === id).length;

  const tvs = countOf('tv-outlet');
  if (tvs > 0) {
    out.push({
      severity: 'sequence',
      message: `${tvs} television outlet${tvs === 1 ? '' : 's'} — each needs blocking in the framing `
        + 'and a receptacle behind it, both before the sheetrock goes on. Missed now it is a '
        + 'cut-open wall later.',
    });
  }

  const speakers = countOf('speaker-wall') + countOf('speaker-ceiling');
  if (speakers > 0) {
    out.push({
      severity: 'sequence',
      message: `${speakers} speaker${speakers === 1 ? '' : 's'} — wire and back boxes go in with `
        + 'the rough, not after.',
    });
  }

  const wet = countOf('sink') + countOf('toilet') + countOf('tub') + countOf('shower');
  if (wet > 0 && countOf('receptacle-gfci') === 0) {
    out.push({
      severity: 'code',
      message: 'There is plumbing here and no GFCI receptacle. Anything within six feet of a '
        + 'sink has to be protected.',
    });
  }

  if ((countOf('shower') > 0 || countOf('tub') > 0) && countOf('exhaust-fan') === 0) {
    out.push({
      severity: 'code',
      message: 'A shower or bath with no extract fan. Ventilation is required, and it has to '
        + 'duct outside.',
    });
  }

  if (proposed.length > 0 && !placements.some(p => p.itemId === 'panel')) {
    out.push({
      severity: 'worth-checking',
      message: 'The panel is not marked. Where it is and whether it has spare ways decides more '
        + 'of the electrical price than anything else on this plan — photograph it open.',
    });
  }

  const dedicated = countOf('circuit-dedicated');
  if (dedicated === 0 && countOf('receptacle-counter') >= 2) {
    out.push({
      severity: 'worth-checking',
      message: 'Counter receptacles but no dedicated circuits. A range, dishwasher, disposal and '
        + 'microwave each want one.',
    });
  }

  return out;
}

/**
 * The scope lines a systems layout implies.
 *
 * One line per discipline for the rough, one for the trim-out, plus the
 * cross-trade consequences — the blocking that framing owes an AV layout. Bid
 * out by default, because these are licensed trades.
 */
export function systemsScopeLines(placements: Placement[]): Array<{
  phase: string; trade: string; description: string; qty: number; unit: string;
  basis: string; bidOut: boolean;
}> {
  const out: Array<{ phase: string; trade: string; description: string; qty: number; unit: string; basis: string; bidOut: boolean }> = [];
  const counts = countByDiscipline(placements);

  const ROUGH_PHASE: Record<Discipline, string> = {
    electrical: 'rough-electrical',
    plumbing: 'rough-plumbing',
    hvac: 'rough-hvac',
    'low-voltage': 'low-voltage',
  };

  for (const c of counts) {
    if (c.totalProposed <= 0) continue;
    out.push({
      phase: ROUGH_PHASE[c.discipline], trade: c.trade,
      description: `${c.label} rough — ${c.totalProposed} device${c.totalProposed === 1 ? '' : 's'}`,
      qty: c.totalProposed, unit: 'ea',
      basis: `${c.rows.map(r => `${r.proposed} × ${r.label.toLowerCase()}`).filter(s => !s.startsWith('0 ')).join(', ')}`,
      bidOut: true,
    });
    out.push({
      phase: 'fixtures', trade: c.trade,
      description: `${c.label} trim-out and fixtures`,
      qty: c.totalProposed, unit: 'ea',
      basis: 'devices and fixtures set after the finishes',
      bidOut: true,
    });
  }

  // The cross-trade one. This is the reason the scope is sequenced.
  const needsBlocking = placements.filter(
    p => p.state === 'proposed' && ['tv-outlet', 'speaker-wall'].includes(p.itemId),
  ).length;
  if (needsBlocking > 0) {
    out.push({
      phase: 'framing', trade: 'carpentry',
      description: `Blocking for ${needsBlocking} wall-mounted device${needsBlocking === 1 ? '' : 's'}`,
      qty: needsBlocking, unit: 'ea',
      basis: 'a television on plasterboard comes off the wall — and this has to be in before it closes',
      bidOut: false,
    });
  }

  return out;
}

/** One sentence on whether a sub could price this. */
export function systemsNote(placements: Placement[]): string {
  if (!placements.length) return 'Nothing marked yet.';
  const counts = countByDiscipline(placements);
  const existing = counts.reduce((n, c) => n + c.totalExisting, 0);
  const proposed = counts.reduce((n, c) => n + c.totalProposed, 0);
  if (existing === 0) {
    return `${proposed} proposed and nothing existing marked. A sub who cannot see what is `
      + 'already there prices the unknown, and that number is always bigger than the truth.';
  }
  return `${existing} existing, ${proposed} proposed, across ${counts.length} trade`
    + `${counts.length === 1 ? '' : 's'}.`;
}
