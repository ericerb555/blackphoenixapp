/**
 * A few different looks to put in front of a customer.
 *
 * WHY EVERY LOOK IS A REAL DECK
 *
 * The point of showing three images is that the customer picks one. So each
 * look here is a patch to the actual `DeckModel` — decking, railing, size,
 * height, stairs — and choosing it updates the model, which means the 3D view,
 * the drawings and the quote all follow. A picture that cannot become a deck is
 * worse than no picture: it is a promise made in a meeting that the estimate
 * then quietly contradicts.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * Shape. `DeckModel` is one rectangle — `widthFt` by `depthFt` — and the whole
 * structural engine, the takeoff and the permit drawings are built on that. An
 * L-shape, a wrap-around or a second level cannot be represented, so rendering
 * one would produce an image nothing downstream could price or draw. That is a
 * change to the model and everything under it, not a variation on a render.
 *
 * Which side the stairs come off is the same story: the model has
 * `stairs` and `stairWidthFt`, but no notion of where they land.
 */

import type { DeckModel } from './deckModel';
import { deckingFinish, railFinish } from './deckFinishes';

export interface DeckLook {
  id: string;
  /** What to call it in front of a customer. */
  name: string;
  /** One line on who this one is for. */
  pitch: string;
  /** Everything that differs from the current deck. Real model fields only. */
  patch: Partial<DeckModel>;
}

/**
 * The three that get offered by default: a value option, the middle of the
 * road, and something to reach for. That spread is deliberate — three points on
 * a price ladder sells better than three variations of the same thing, because
 * it gives the customer a decision to make rather than a preference to have.
 */
export const DEFAULT_LOOKS: DeckLook[] = [
  {
    id: 'value',
    name: 'The straightforward one',
    pitch: 'Treated pine and wood rail. The least money for a deck that does the job.',
    patch: {
      deckingFinish: 'pt-cedartone',
      railFinish: 'wood-all',
      deckingDirection: 'parallel',
    },
  },
  {
    id: 'popular',
    name: 'The one most people pick',
    pitch: 'Composite boards, nothing to sand or seal, with thin black rail that gets out of the way.',
    patch: {
      deckingFinish: 'comp-saddle',
      railFinish: 'black-alum',
      deckingDirection: 'parallel',
    },
  },
  {
    id: 'premium',
    name: 'The one to look at',
    pitch: 'Dark composite and cable rail, so the view carries straight through the guard.',
    patch: {
      deckingFinish: 'comp-walnut',
      railFinish: 'cable',
      deckingDirection: 'perpendicular',
    },
  },
];

/** The deck that a look actually describes, ready to price or to render. */
export function applyLook(model: DeckModel, look: DeckLook): DeckModel {
  return { ...model, ...look.patch };
}

/**
 * The look in the words an image model needs.
 *
 * Built from the finish tables rather than written by hand, so a look can never
 * be rendered in a colour the 3D view and the quote do not also use.
 */
export function lookAppearance(model: DeckModel): { decking: string; railing: string } {
  const d = deckingFinish(model.deckingFinish);
  const r = railFinish(model.railFinish);

  const infill =
    r.infill === 'cable' ? 'horizontal stainless cable infill with thin sightlines'
    : r.infill === 'glass' ? 'clear tempered glass panels'
    : 'evenly spaced balusters';

  // Some labels already end in "rail" — "cable rail railing" is not a phrase.
  const railWord = /rail$/i.test(r.label) ? '' : ' railing';

  return {
    decking: `${d.label.toLowerCase()} ${d.family.toLowerCase()} decking (${d.hex})`,
    railing: `${r.label.toLowerCase()}${railWord} (${r.frameHex}) with ${infill}`,
  };
}

/** How a look is labelled under its image, for the customer to read. */
export function lookCaption(model: DeckModel): string {
  const d = deckingFinish(model.deckingFinish);
  const r = railFinish(model.railFinish);
  return `${d.label} ${d.family.toLowerCase()} · ${r.label} · ${model.widthFt}′ × ${model.depthFt}′`;
}
