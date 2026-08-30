/**
 * Floor coverings as a customer sees them, not as they are bought.
 *
 * `flooringModel.ts` knows what a covering costs and how much of it to order.
 * This knows what it looks like, in the words an image model needs and the
 * words a homeowner uses. They are kept apart because they change for different
 * reasons — a price moves every season, an oak floor does not.
 *
 * Every finish here maps to a real material in the takeoff, so a customer who
 * picks one has picked something that can be priced and ordered. A visualiser
 * offering a floor the estimate cannot produce would be a picture that sells a
 * job nobody can quote.
 */

import type { FloorMaterial } from './flooringModel';

export interface FloorFinish {
  id: string;
  /** What to call it in front of a customer. */
  label: string;
  /** The material it is, for pricing and ordering. */
  material: FloorMaterial;
  /** One line on who it suits, for the caption under the picture. */
  pitch: string;
  /** How it should be described to an image model. */
  appearance: string;
}

export const FLOOR_FINISHES: FloorFinish[] = [
  {
    id: 'oak-natural',
    label: 'Natural oak',
    material: 'hardwood-engineered',
    pitch: 'Warm and light. The safe one — it suits almost any furniture.',
    appearance: 'natural white oak planks about 7 inches wide, light honey brown, visible straight grain, matte finish',
  },
  {
    id: 'oak-grey',
    label: 'Grey oak',
    material: 'lvp',
    pitch: 'Cooler and more modern. Hides dust better than a dark floor.',
    appearance: 'grey-washed oak-look planks about 7 inches wide, soft cool grey with subtle brown undertone, low sheen',
  },
  {
    id: 'walnut-dark',
    label: 'Dark walnut',
    material: 'hardwood-engineered',
    pitch: 'Rich and formal. Shows every footprint, so best away from a back door.',
    appearance: 'dark walnut planks about 5 inches wide, deep chocolate brown, fine grain, satin sheen',
  },
  {
    id: 'hickory-rustic',
    label: 'Rustic hickory',
    material: 'hardwood-solid',
    pitch: 'Lots of colour variation, so it forgives wear and pets.',
    appearance: 'rustic hickory planks about 6 inches wide, strong colour variation from cream to dark brown, knots and character marks, matte',
  },
  {
    id: 'tile-porcelain-grey',
    label: 'Grey porcelain tile',
    material: 'tile',
    pitch: 'For a kitchen or a bathroom. Hard wearing and waterproof.',
    appearance: 'large format grey porcelain floor tiles 12 by 24 inches laid straight, soft concrete look, narrow grey grout lines, low sheen',
  },
  {
    id: 'carpet-neutral',
    label: 'Soft neutral carpet',
    material: 'carpet',
    pitch: 'Warm and quiet underfoot. Best in bedrooms.',
    appearance: 'plush neutral beige carpet, soft even pile, no pattern',
  },
];

/**
 * How to describe a floor swap to an image model.
 *
 * WHAT THIS IS FIGHTING
 *
 * A floor is the surface the camera looks across at a shallow angle, which
 * makes it the hardest thing in a photograph to replace convincingly. The two
 * failures that give it away are plank direction — planks should run away from
 * the camera and usually along the room's length, not across the frame — and
 * scale, because a model left to itself draws planks far too wide near the
 * camera and far too narrow at the back.
 *
 * The other risk is collateral change: an image model asked to alter a room
 * will happily restyle the cabinets too. So the instruction to hold everything
 * else still is stated first and stated hard, and the things most likely to
 * drift are named individually rather than covered by "the rest of the room".
 */
export function floorRenderPrompt(finish: FloorFinish, note?: string): string {
  return [
    `Photorealistic interior visualisation. This is a photograph of a real room.`,
    `Keep the room exactly as it is: the same camera position and lens, the same walls,`,
    `the same cabinets, doors, trim, skirting, furniture, windows and window light, the same`,
    `daylight and the same shadows. Do not restyle, move, add or remove anything.`,
    ``,
    `Replace ONLY the floor covering with ${finish.appearance}.`,
    ``,
    `The floor must sit correctly in the photograph:`,
    `· planks run away from the camera, along the length of the room, never across the frame`,
    `· perspective matches the walls exactly, converging to the same vanishing point`,
    `· the boards get narrower with distance at the same rate the room does`,
    `· contact shadows stay where furniture, cabinets and skirting meet the floor`,
    `· reflections and sheen match the existing light in the room`,
    ``,
    note ? `· ${note}` : ``,
    `Change nothing above the skirting board. No people, no text, no watermark.`,
  ].filter(Boolean).join('\n');
}
