/**
 * The reels on the landing page.
 *
 * Eric: "make some reels for my company use my logo and do some kitchen and
 * bathroom remodels and the some trash removal. so when people land on my
 * landing page they see active reels they can be made up and we can change
 * them out later with real jobs."
 *
 * THESE ARE HIS REAL JOBS, NOT MADE UP
 *
 * He said they could be invented, and they did not need to be. There are 35
 * photographs of his own work already in the gallery store — professional
 * shots of a finished kitchen and a powder room, and phone photos from the
 * van of bathrooms at rough-in, tile going down and a shower wall finished.
 * Paired up they tell the story a reel wants to tell, and every frame is work
 * this company actually did.
 *
 * That matters beyond taste. Stock photographs of somebody else's kitchen,
 * captioned as ours and autoplaying on our own landing page, is a claim about
 * work we did not do. It is also the kind of thing a buyer's counsel asks
 * about. The hero background behind these is still generic stock at 20%
 * opacity — worth replacing for the same reason, and not part of this.
 *
 * TRASH REMOVAL HAS NO PHOTOGRAPHS
 *
 * There is not one haul-away, dumpster or clear-out picture in the gallery.
 * Rather than borrow a stock skip, that reel is built from type on the brand
 * — which reads as deliberate rather than as a gap — and `awaitingFootage()`
 * reports it so it is easy to find when the photos exist. Replacing it is
 * editing the `beats` array below and nothing else.
 *
 * SWAPPING ONE FOR A REAL VIDEO
 *
 * Set `videoUrl` on a reel and the player uses the file instead of the beats,
 * which stay as the fallback if it will not load. So a phone clip from a job
 * drops in without touching the component.
 */
/**
 * NO IMPORTS, DELIBERATELY.
 *
 * A beat names a FILE, not a URL, and the caller supplies the origin — see
 * `galleryUrl`. Reaching for `supabase/info` here would have been shorter
 * and would have tied this module to the browser config, which is why no
 * other tested library in this project does it. Keeping it out means the
 * timing and the content can be checked by `node --test` with no bundler,
 * and the project reference still lives in exactly one place.
 */

/** The bucket path the gallery writes to. */
const GALLERY_PATH = '/storage/v1/object/public/make-3eae23a6-gallery/website';

/** Full URL for a gallery file. `origin` comes from `SUPABASE_ORIGIN`. */
export function galleryUrl(origin: string, file: string): string {
  const base = String(origin || '').replace(/\/+$/, '');
  const name = String(file || '').replace(/^\/+/, '');
  if (!base || !name) return '';
  return `${base}${GALLERY_PATH}/${name}`;
}

/** The company mark, shown in the corner of every reel. */
export const REEL_LOGO = '/bpb-phoenix-logo.png';

export interface ReelBeat {
  /**
   * The photograph. Omitted for a type-only beat, which the player draws on
   * the brand instead — used where there is nothing honest to show yet.
   */
  image?: string;
  /** The line over the picture. Short: it is read in about three seconds. */
  caption: string;
  /** Seconds on screen. Defaults to `BEAT_SECONDS`. */
  seconds?: number;
}

export interface Showreel {
  id: string;
  /** The heading under the tile. */
  title: string;
  /** The small label over it. */
  kicker: string;
  /**
   * A real clip, when there is one. Takes precedence over `beats`; if it
   * fails to load the beats still play, so a dead URL degrades to the reel
   * that was there before rather than to a black rectangle.
   */
  videoUrl?: string | null;
  beats: ReelBeat[];
}

/** Seconds a beat holds when it does not say otherwise. */
export const BEAT_SECONDS = 3.2;
/** Seconds of crossfade between beats. Beats overlap; this is not extra time. */
export const CROSSFADE_SECONDS = 0.7;

export const SHOWREELS: Showreel[] = [
  {
    id: 'kitchens',
    kicker: 'Kitchen remodels',
    title: 'Grey shaker, quartz, tile to the ceiling',
    beats: [
      { image: `completed-project-01-0.png`, caption: 'Island seats five, and the dining room stayed open' },
      { image: `completed-project-06-5.png`, caption: 'Subway tile to the ceiling, black fixtures throughout' },
      { image: `completed-project-02-1.png`, caption: 'Arabesque behind the range, because it is what you look at' },
      { image: `completed-project-03-2.png`, caption: 'Sightline held from the range through to the window seat' },
      { image: `completed-project-05-4.png`, caption: 'Every run squared, levelled and scribed to the wall' },
    ],
  },
  {
    id: 'bathrooms',
    kicker: 'Bathroom remodels',
    title: 'Studs to finished, start to end',
    /**
     * Ordered as the job ran: rough-in, floor, niche, finished wall, and the
     * powder room done alongside it. A reel that opens on pink insulation and
     * closes on tile is worth more than five finished photographs, because
     * anybody can photograph a finished bathroom.
     */
    beats: [
      { image: `recent-project-07-18.jpg`, caption: 'Back to the studs — new supply, new waste' },
      { image: `recent-project-11-22.jpg`, caption: 'Floor set and spaced before a single wall tile' },
      { image: `recent-project-14-25.jpg`, caption: 'Niche framed into the wall, not stuck on after' },
      { image: `recent-project-18-29.jpg`, caption: 'Finished — and the grout lines line up', seconds: 4 },
      { image: `completed-project-08-7.png`, caption: 'Powder room done in the same trip' },
    ],
  },
  {
    id: 'trash-removal',
    kicker: 'Trash removal',
    title: 'We load it, we sweep up, it is gone',
    /**
     * Type on the brand, deliberately. There is no photograph of this work
     * yet and a stock picture of somebody else's skip is not a substitute.
     * `awaitingFootage()` finds this one; drop images in and it becomes an
     * ordinary reel with no other change.
     */
    beats: [
      { caption: 'Full house clear-outs' },
      { caption: 'Garages, basements, estates' },
      { caption: 'One crew, one trip, one price' },
      { caption: 'Quoted before we load a thing' },
      { caption: 'Black Phoenix Builds · Salem, NH', seconds: 4 },
    ],
  },
];

/** How long one pass of a reel takes. */
export function reelDuration(reel: Showreel | null | undefined): number {
  const beats = Array.isArray(reel?.beats) ? reel!.beats : [];
  return beats.reduce((total, beat) => {
    const seconds = Number(beat?.seconds);
    return total + (Number.isFinite(seconds) && seconds > 0 ? seconds : BEAT_SECONDS);
  }, 0);
}

/**
 * Which beat is on screen `elapsed` seconds in, wrapping forever.
 *
 * Time is the input rather than a counter the component increments, so a tab
 * that was backgrounded for a minute resumes at the right beat instead of
 * racing through the ones it missed.
 */
export function beatAt(reel: Showreel | null | undefined, elapsed: number): number {
  const beats = Array.isArray(reel?.beats) ? reel!.beats : [];
  if (beats.length === 0) return 0;

  const total = reelDuration(reel);
  if (!(total > 0)) return 0;

  // Negative or non-finite time means "the beginning" rather than NaN.
  const seconds = Number.isFinite(elapsed) && elapsed > 0 ? elapsed % total : 0;

  let running = 0;
  for (let i = 0; i < beats.length; i++) {
    const beatSeconds = Number(beats[i]?.seconds);
    running += Number.isFinite(beatSeconds) && beatSeconds > 0 ? beatSeconds : BEAT_SECONDS;
    if (seconds < running) return i;
  }
  // Only reachable on a floating-point edge exactly at the loop point.
  return beats.length - 1;
}

/**
 * Is this reel still waiting for real photographs?
 *
 * True when not one beat has an image, which is the state the trash removal
 * reel is in. Deliberately not "some beats have no image" — a type card
 * between photographs is a choice, a reel made entirely of them is a gap.
 */
export function awaitingFootage(reel: Showreel | null | undefined): boolean {
  const beats = Array.isArray(reel?.beats) ? reel!.beats : [];
  if (beats.length === 0) return true;
  return beats.every((beat) => !String(beat?.image || '').trim());
}

/** Reels fit to show. A reel with no beats and no video can only draw a hole. */
export function playableReels(reels: Showreel[] = SHOWREELS): Showreel[] {
  return (Array.isArray(reels) ? reels : []).filter(
    (reel) => reel && (reel.beats?.length > 0 || String(reel.videoUrl || '').trim()),
  );
}
