/**
 * Decking and railing finishes.
 *
 * This is the table a customer picks from at the kitchen table, so it is
 * organised the way that conversation actually goes: material family first
 * (what it costs and how long it lasts), colour second (what it looks like).
 *
 * The numbers attached to each entry are not decoration — they are what makes
 * the 3D view tell the truth about a finish. PVC is nearly grainless and picks
 * up a sheen; a composite is flatter and more uniform than any board sawn from
 * a tree; oiled ipe is dark, tight-grained and glossy; pressure-treated pine is
 * blotchy and dead matte. Rendering all of them as "brown, roughness 0.78" is
 * how a render ends up flattering one product and misrepresenting another, and
 * the customer notices on delivery day rather than in the showroom.
 *
 * Colour names here are descriptive rather than any manufacturer's SKU. The
 * board that actually gets ordered comes off the supplier's card — this is for
 * showing the customer what a family of colours does to their house.
 */

export interface DeckingFinish {
  id: string;
  label: string;
  family: 'Pressure-treated' | 'Cedar' | 'Composite' | 'PVC' | 'Hardwood';
  /** Base colour of the board. */
  hex: string;
  /** 0 glossy, 1 dead matte. */
  roughness: number;
  /** How strongly the grain reads, 0 none to 1 heavy. */
  grain: number;
  /** How much board-to-board colour variation, 0 uniform to 1 wild. */
  variation: number;
  note: string;
}

export const DECKING_FINISHES: DeckingFinish[] = [
  {
    id: 'pt-natural', label: 'Natural', family: 'Pressure-treated',
    hex: '#a9906a', roughness: 0.94, grain: 0.9, variation: 0.9,
    note: 'The cheapest way to build. Goes silver-grey within a season unless it is sealed.',
  },
  {
    id: 'pt-cedartone', label: 'Cedar tone', family: 'Pressure-treated',
    hex: '#a06b41', roughness: 0.92, grain: 0.9, variation: 0.8,
    note: 'Treated pine with the brown tint mixed in. Same board, warmer out of the gate.',
  },
  {
    id: 'cedar', label: 'Western red cedar', family: 'Cedar',
    hex: '#a55c37', roughness: 0.86, grain: 1, variation: 0.7,
    note: 'Soft, warm and light. Naturally rot resistant, but it dents and needs oiling.',
  },
  {
    id: 'ipe', label: 'Ipe, oiled', family: 'Hardwood',
    hex: '#5c3b26', roughness: 0.5, grain: 0.55, variation: 0.5,
    note: 'The premium option. Dense enough to blunt blades and to last decades.',
  },
  {
    id: 'comp-grey', label: 'Weathered grey', family: 'Composite',
    hex: '#8e8c86', roughness: 0.82, grain: 0.45, variation: 0.25,
    note: 'The most forgiving colour on a north-facing deck. Hides pollen and dust.',
  },
  {
    id: 'comp-driftwood', label: 'Coastal driftwood', family: 'Composite',
    hex: '#a29584', roughness: 0.82, grain: 0.5, variation: 0.3,
    note: 'Grey with a warm cast. Reads lighter than it looks on a small sample.',
  },
  {
    id: 'comp-saddle', label: 'Saddle', family: 'Composite',
    hex: '#7d5638', roughness: 0.8, grain: 0.5, variation: 0.3,
    note: 'The default mid-brown. Works against almost any siding colour.',
  },
  {
    id: 'comp-chestnut', label: 'Warm chestnut', family: 'Composite',
    hex: '#8c5c37', roughness: 0.8, grain: 0.55, variation: 0.35,
    note: 'Redder than saddle. Strong against grey or white siding.',
  },
  {
    id: 'comp-walnut', label: 'Dark walnut', family: 'Composite',
    hex: '#4d382c', roughness: 0.78, grain: 0.45, variation: 0.25,
    note: 'Rich and formal. Runs hot underfoot in full afternoon sun.',
  },
  {
    id: 'comp-slate', label: 'Slate', family: 'Composite',
    hex: '#4f5356', roughness: 0.8, grain: 0.35, variation: 0.2,
    note: 'Modern and cool. Shows footprints and gets very hot in direct sun.',
  },
  {
    id: 'pvc-sand', label: 'Sand', family: 'PVC',
    hex: '#d6c9ae', roughness: 0.62, grain: 0.25, variation: 0.15,
    note: 'Stays coolest underfoot of anything here. No wood in it at all, so nothing to rot.',
  },
  {
    id: 'pvc-white', label: 'Arctic white', family: 'PVC',
    hex: '#e4e0d6', roughness: 0.55, grain: 0.2, variation: 0.12,
    note: 'Bright and coastal. Shows dirt, but washes off completely.',
  },
];

/** How the space between the rails is filled. Real geometry, not a colour. */
export type RailInfill = 'baluster' | 'cable' | 'glass';

export interface RailFinish {
  id: string;
  label: string;
  infill: RailInfill;
  /** Posts and the top and bottom rails. */
  frameHex: string;
  frameRoughness: number;
  frameMetalness: number;
  /** Balusters, cables or glass. */
  infillHex: string;
  infillRoughness: number;
  infillMetalness: number;
  /** Glass needs to be see-through; nothing else does. */
  infillOpacity: number;
  /** The graspable handrail on the stairs. */
  handHex: string;
  note: string;
}

export const RAIL_FINISHES: RailFinish[] = [
  {
    id: 'wood-black', label: 'Wood frame, black balusters', infill: 'baluster',
    frameHex: '#8a6f4a', frameRoughness: 0.82, frameMetalness: 0,
    infillHex: '#26292c', infillRoughness: 0.42, infillMetalness: 0.75, infillOpacity: 1,
    handHex: '#8a6f4a',
    note: 'The common one. Wood posts and top rail with powder-coated metal between.',
  },
  {
    id: 'wood-all', label: 'All wood', infill: 'baluster',
    frameHex: '#8a6f4a', frameRoughness: 0.86, frameMetalness: 0,
    infillHex: '#96794f', infillRoughness: 0.88, infillMetalness: 0, infillOpacity: 1,
    handHex: '#8a6f4a',
    note: 'Cheapest to build and to repair. Needs sealing on the same cycle as the deck.',
  },
  {
    id: 'white-vinyl', label: 'White vinyl', infill: 'baluster',
    frameHex: '#f0eee8', frameRoughness: 0.62, frameMetalness: 0,
    infillHex: '#f0eee8', infillRoughness: 0.62, infillMetalness: 0, infillOpacity: 1,
    handHex: '#f0eee8',
    note: 'Never needs painting. Reads traditional, and it is bright against dark decking.',
  },
  {
    id: 'black-alum', label: 'Black aluminium', infill: 'baluster',
    frameHex: '#232629', frameRoughness: 0.4, frameMetalness: 0.8,
    infillHex: '#232629', infillRoughness: 0.4, infillMetalness: 0.8, infillOpacity: 1,
    handHex: '#232629',
    note: 'Thin sightlines, nothing to maintain. Disappears against a view.',
  },
  {
    id: 'bronze-alum', label: 'Bronze aluminium', infill: 'baluster',
    frameHex: '#4a3b2e', frameRoughness: 0.42, frameMetalness: 0.78,
    infillHex: '#4a3b2e', infillRoughness: 0.42, infillMetalness: 0.78, infillOpacity: 1,
    handHex: '#4a3b2e',
    note: 'Warmer than black. Sits well with brown and cedar-toned decking.',
  },
  {
    id: 'cable', label: 'Cable rail', infill: 'cable',
    frameHex: '#2b2e31', frameRoughness: 0.38, frameMetalness: 0.8,
    infillHex: '#b9bcc0', infillRoughness: 0.25, infillMetalness: 0.95, infillOpacity: 1,
    handHex: '#2b2e31',
    note: 'Nearly invisible from inside. Cables need re-tensioning, and posts take real load.',
  },
  {
    id: 'glass', label: 'Glass panel', infill: 'glass',
    frameHex: '#26292c', frameRoughness: 0.4, frameMetalness: 0.8,
    infillHex: '#bcd6e2', infillRoughness: 0.05, infillMetalness: 0.2, infillOpacity: 0.34,
    handHex: '#26292c',
    note: 'The clearest view and the most cleaning. Wind load makes the posts heavier.',
  },
];

export const DEFAULT_DECKING_FINISH = 'comp-saddle';
export const DEFAULT_RAIL_FINISH = 'wood-black';

export function deckingFinish(id: string): DeckingFinish {
  return DECKING_FINISHES.find(f => f.id === id)
    || DECKING_FINISHES.find(f => f.id === DEFAULT_DECKING_FINISH)!;
}

export function railFinish(id: string): RailFinish {
  return RAIL_FINISHES.find(f => f.id === id)
    || RAIL_FINISHES.find(f => f.id === DEFAULT_RAIL_FINISH)!;
}

/** One line describing the chosen finishes, for the render prompt and the spec. */
export function finishSummary(deckingId: string, railId: string): string {
  const d = deckingFinish(deckingId);
  const r = railFinish(railId);
  return `${d.family} decking in ${d.label}, with ${r.label.toLowerCase()} railing`;
}
