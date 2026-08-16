/**
 * Load and footing sizing.
 *
 * WHERE THE NUMBERS COME FROM, AND WHERE THEY DO NOT
 *
 * The arithmetic here is deterministic and checkable: tributary area, load,
 * required bearing area, diameter. None of it is inferred.
 *
 * The three site values that drive it — ground snow load, frost depth and soil
 * bearing capacity — are NOT inferred either. They are published by the
 * authority having jurisdiction, they vary between neighbouring towns, and a
 * plausible-looking guess is worse than an empty field because it will be
 * believed. They are inputs.
 *
 * Basis is IRC R301.5 (live loads), IRC Table R401.4.1 (presumptive soil
 * bearing) and AWC DCA 6. This is prescriptive sizing, not an engineered
 * design, and it reports when a deck falls outside what prescriptive tables
 * cover instead of extending them.
 */
import type { DeckModel } from './deckModel';
import { takeoff } from './deckModel';

/** IRC Table R401.4.1 — presumptive load-bearing values, pounds per square foot. */
export const SOIL_CLASSES = [
  { id: 'unknown', label: 'Unknown / not tested', psf: 1500, note: 'IRC default when no soil investigation exists.' },
  { id: 'clay', label: 'Clay, sandy clay, silty clay, clayey silt', psf: 1500 },
  { id: 'sand', label: 'Sand, silty sand, clayey sand, silty gravel', psf: 2000 },
  { id: 'gravel', label: 'Gravel or sandy gravel', psf: 3000 },
  { id: 'sedimentary', label: 'Sedimentary or foliated rock', psf: 4000 },
  { id: 'bedrock', label: 'Crystalline bedrock', psf: 12000 },
] as const;

export type SoilId = typeof SOIL_CLASSES[number]['id'];

export interface SiteLoads {
  /** Ground snow load, psf — from the building department. */
  groundSnowPsf: number;
  /** Frost depth, inches — from the building department. */
  frostDepthIn: number;
  soil: SoilId;
  /** Set once the operator confirms these came from the AHJ rather than a default. */
  verified: boolean;
}

export const DEFAULT_SITE_LOADS: SiteLoads = {
  groundSnowPsf: 0,
  frostDepthIn: 0,
  soil: 'unknown',
  verified: false,
};

export interface StructuralResult {
  designLivePsf: number;
  deadLoadPsf: number;
  totalLoadPsf: number;
  snowGoverns: boolean;

  tributaryAreaSqFt: number;
  postLoadLbs: number;

  soilPsf: number;
  requiredFootingAreaSqFt: number;
  roundFootingDiameterIn: number;
  squareFootingSideIn: number;
  frostDepthIn: number;

  /** Blocking problems — the design must change or an engineer must sign it. */
  failures: string[];
  /** Things to check that do not stop the design. */
  cautions: string[];
  /** True when every input needed for a real answer is present. */
  computable: boolean;
  missing: string[];
}

const DEAD_LOAD_PSF = 10;
const BASE_LIVE_PSF = 40; // IRC R301.5 — residential deck live load.
/** DCA 6 span tables assume 40 live + 10 dead. Above this they no longer apply. */
const PRESCRIPTIVE_TOTAL_PSF = 50;

export function computeStructural(m: DeckModel, site: SiteLoads): StructuralResult {
  const bom = takeoff(m);
  const missing: string[] = [];
  if (!(site.groundSnowPsf > 0)) missing.push('Ground snow load');
  if (!(site.frostDepthIn > 0)) missing.push('Frost depth');

  const soil = SOIL_CLASSES.find(s => s.id === site.soil) || SOIL_CLASSES[0];

  // A deck is designed for the greater of its live load or the snow on it —
  // people and snow are not assumed to arrive together.
  const designLive = Math.max(BASE_LIVE_PSF, site.groundSnowPsf || 0);
  const snowGoverns = (site.groundSnowPsf || 0) > BASE_LIVE_PSF;
  const total = designLive + DEAD_LOAD_PSF;

  // Each post carries half the beam span either side, and the joist load from
  // half the back-span plus the whole cantilever.
  const tributary = m.postSpacingFt * (bom.joistSpanFt / 2 + m.cantileverFt);
  const postLoad = tributary * total;

  const requiredArea = postLoad / soil.psf;
  const roundDia = 2 * Math.sqrt(requiredArea / Math.PI) * 12;
  const squareSide = Math.sqrt(requiredArea) * 12;

  const failures: string[] = [];
  const cautions: string[] = [];

  if (total > PRESCRIPTIVE_TOTAL_PSF) {
    failures.push(
      `Design load is ${total} psf. DCA 6 span tables assume ${PRESCRIPTIVE_TOTAL_PSF} psf, so the joist and beam spans in this design are no longer covered by prescriptive tables and must be re-checked by an engineer.`,
    );
  }
  if (bom.joistSpanFt > 18) {
    failures.push(`Joist span ${bom.joistSpanFt}ft is beyond prescriptive tables.`);
  }
  if (site.soil === 'unknown') {
    cautions.push(
      'Soil is set to the IRC default of 1500 psf. A soil investigation often supports a smaller footing; the building department may also require one.',
    );
  }
  if (!site.verified) {
    cautions.push(
      'Snow load and frost depth have not been confirmed against the building department. Both vary between neighbouring towns.',
    );
  }
  if (roundDia > 36) {
    cautions.push(
      `A ${Math.ceil(roundDia)}in footing is large for a residential deck — check the post spacing, since closer posts reduce the footing quickly.`,
    );
  }
  if (site.frostDepthIn > 0 && site.frostDepthIn < 12) {
    cautions.push('A frost depth under 12in is unusual outside warm climates — worth re-checking.');
  }

  return {
    designLivePsf: designLive,
    deadLoadPsf: DEAD_LOAD_PSF,
    totalLoadPsf: total,
    snowGoverns,
    tributaryAreaSqFt: Math.round(tributary * 10) / 10,
    postLoadLbs: Math.round(postLoad),
    soilPsf: soil.psf,
    requiredFootingAreaSqFt: Math.round(requiredArea * 100) / 100,
    // Round up to the next inch: nobody digs a 14.3in hole, and rounding down
    // would make the footing smaller than the calculation requires.
    roundFootingDiameterIn: Math.ceil(roundDia),
    squareFootingSideIn: Math.ceil(squareSide),
    frostDepthIn: site.frostDepthIn,
    failures,
    cautions,
    computable: missing.length === 0,
    missing,
  };
}

/** The sizes concrete forms actually come in, so the answer is buildable. */
export const STANDARD_TUBE_SIZES_IN = [8, 10, 12, 16, 18, 20, 24];

export function nextStandardTube(diameterIn: number): number | null {
  for (const s of STANDARD_TUBE_SIZES_IN) if (s >= diameterIn) return s;
  return null;
}
