/**
 * The trades the design centre covers, and how to say them to a homeowner.
 *
 * WHY THIS MOVED OUT OF THE DESIGNER
 *
 * The list used to live inside `DeckDesigner.tsx`, which was fine while the
 * designer was the only thing that needed it. The customer walkthrough needs
 * the same list, and a second copy of it is a list that drifts — one gains
 * roofing, the other does not, and a customer is offered a section that opens
 * empty. One list, two readers.
 *
 * WHY THERE ARE TWO LISTS HERE AND NOT ONE
 *
 * `TRADES` is what the designer's own tab strip shows: the internal names, in
 * the order staff think about them. `PROJECT_KINDS` is what a customer picks
 * from, and it is deliberately not the same shape. A homeowner does not think
 * "openings", they think "new windows"; they do not think "structures", they
 * think "a covered porch". And two of the things they most often want — an
 * addition, and moving walls around — are not trades at all. They are the floor
 * plan, which lives on the capture stage and is reached by landing there.
 *
 * So each customer-facing entry names the trade it opens and the stage it opens
 * on, and the designer is told both in the URL. Nothing here duplicates what
 * the designer does; it only decides where somebody arrives.
 */
import {
  Hammer, Warehouse, Layers3, Home, DoorOpen, ChefHat, Bath, Layers, Triangle,
  Blocks, LayoutGrid,
} from 'lucide-react';

export type TradeId =
  | 'deck' | 'structures' | 'hardscape' | 'siding' | 'openings'
  | 'kitchen' | 'bathroom' | 'flooring' | 'roofing';

/**
 * `built: false` means the tab is shown and says it is not ready. That is the
 * designer's own convention and it stays — a rail that lists a tool which then
 * does nothing is worse than one that admits what it is.
 */
export const TRADES: Array<{ id: TradeId; label: string; icon: any; built: boolean }> = [
  { id: 'deck', label: 'Decks', icon: Hammer, built: true },
  { id: 'structures', label: 'Structures', icon: Warehouse, built: true },
  { id: 'hardscape', label: 'Hardscape', icon: Layers3, built: true },
  { id: 'siding', label: 'Siding', icon: Home, built: true },
  { id: 'openings', label: 'Doors & windows', icon: DoorOpen, built: true },
  { id: 'kitchen', label: 'Kitchens', icon: ChefHat, built: true },
  { id: 'bathroom', label: 'Bathrooms', icon: Bath, built: true },
  { id: 'flooring', label: 'Flooring', icon: Layers, built: true },
  { id: 'roofing', label: 'Roofing', icon: Triangle, built: false },
];

/** Which stage of the designer a project of this kind starts on. */
export type Stage = 'capture' | 'design' | 'scope' | 'price' | 'documents';

export interface ProjectKind {
  id: string;
  /** What the customer sees. Written the way somebody describes it on the phone. */
  label: string;
  blurb: string;
  icon: any;
  /** Which trade section of the designer this opens. */
  trade: TradeId;
  /**
   * Where it lands. Most work starts on Design; anything that changes the
   * footprint or the room layout starts on Capture, because that is where the
   * floor plan editor lives and there is nothing to design until it is drawn.
   */
  stage: Stage;
  /** Whether photographs of the inside are part of this job. */
  interior: boolean;
}

/**
 * Roofing is absent on purpose: `TRADES` marks it unbuilt, and offering a
 * homeowner a section that opens empty is how a good tool gets a reputation for
 * being broken. It appears here the day it is built.
 */
export const PROJECT_KINDS: ProjectKind[] = [
  {
    id: 'deck', label: 'A deck or porch', icon: Hammer,
    blurb: 'New deck, replacing an old one, or adding steps and rails.',
    trade: 'deck', stage: 'design', interior: false,
  },
  {
    id: 'addition', label: 'An addition', icon: Blocks,
    blurb: 'More space added onto the house. Starts by drawing what is there now.',
    trade: 'deck', stage: 'capture', interior: true,
  },
  {
    id: 'kitchen', label: 'A new kitchen', icon: ChefHat,
    blurb: 'Cabinets, worktops and where everything goes.',
    trade: 'kitchen', stage: 'design', interior: true,
  },
  {
    id: 'bathroom', label: 'A bathroom remodel', icon: Bath,
    blurb: 'Tub, shower, vanity and the layout around them.',
    trade: 'bathroom', stage: 'design', interior: true,
  },
  {
    id: 'layout', label: 'Changing the layout', icon: LayoutGrid,
    blurb: 'Taking a wall out, opening rooms up, moving things around.',
    trade: 'deck', stage: 'capture', interior: true,
  },
  {
    id: 'siding', label: 'New siding', icon: Home,
    blurb: 'Re-siding the house, or part of it.',
    trade: 'siding', stage: 'design', interior: false,
  },
  {
    id: 'openings', label: 'Windows or doors', icon: DoorOpen,
    blurb: 'Replacing them, or putting one where there is not one now.',
    trade: 'openings', stage: 'design', interior: false,
  },
  {
    id: 'flooring', label: 'New flooring', icon: Layers,
    blurb: 'One room or the whole floor.',
    trade: 'flooring', stage: 'design', interior: true,
  },
  {
    id: 'structures', label: 'A covered structure', icon: Warehouse,
    blurb: 'Pavilion, carport, pergola, porch roof or gazebo.',
    trade: 'structures', stage: 'design', interior: false,
  },
  {
    id: 'hardscape', label: 'Patio or walkway', icon: Layers3,
    blurb: 'Pavers, stone, steps and retaining walls.',
    trade: 'hardscape', stage: 'design', interior: false,
  },
];

export function projectKind(id: string): ProjectKind | undefined {
  return PROJECT_KINDS.find(k => k.id === id);
}
