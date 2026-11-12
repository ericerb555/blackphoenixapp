/**
 * A second look at the rooms the first read could not measure.
 *
 * WHY A SECOND PASS EXISTS AT ALL
 *
 * Measured on 2026-11-11 against two house-design sheets that print their own
 * floor area. The whole-sheet read is good at the big picture — gross area
 * within a percent, perimeter 128 against a true 129, large rooms exact — and
 * unreliable on small ones. A bathroom printed 7'9" x 7' came back 7 x 3. A
 * laundry printed 8'6" x 7'6" came back 6 x 8.
 *
 * The failures are all the same shape: small rooms carry small lettering, and
 * by the time a whole sheet has been scaled down to what the vision model
 * actually looks at, that lettering is a few pixels tall. It is not a
 * reasoning failure and no amount of prompt instruction fixes it — the
 * information is not in the pixels any more.
 *
 * So the fix is pixels: cut the sheet into overlapping tiles and read each at
 * its native resolution, which gives roughly twice the detail per inch of
 * drawing for a 2x2 grid.
 *
 * WHY TILES AND NOT A CROP PER ROOM
 *
 * The first pass returns an x/y for each room, but as a fraction of the
 * BUILDING ENVELOPE, and nothing tells us where that envelope sits inside the
 * image — these sheets carry title blocks, elevations and in one case a
 * painting of the house. Cropping per room would mean trusting the model's
 * spatial estimate twice over and cutting the wrong rectangle whenever it was
 * off. Tiles depend on no estimate at all.
 *
 * They OVERLAP, because a dimension label sitting on a tile boundary would
 * otherwise be sliced in half and read as neither.
 *
 * WHY THE BROWSER DOES THE CUTTING
 *
 * The edge function has no image decoder — `image-upload.tsx` sniffs bytes and
 * nothing more — so cropping server-side would mean adding a decoder and
 * decoding multi-megapixel JPEGs inside an edge runtime. The browser already
 * holds the file and has a canvas. The server reads; the client cuts.
 */

/** A rectangle in image pixels. */
export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * How much neighbouring tiles share.
 *
 * A dimension label is small but not tiny relative to the sheet; a tenth of
 * the image on each seam is comfortably more than one label's width, so no
 * label can fall entirely in the gap between two reads.
 */
export const TILE_OVERLAP = 0.1;

/**
 * The sheet cut into a 2x2 grid of overlapping tiles.
 *
 * Two by two rather than three by three because each tile is a vision call's
 * worth of image: nine tiles is nine times the cost for detail that only
 * matters where the lettering is smallest. Four is the point where small rooms
 * become legible without the read costing more than the job it is quoting.
 */
export function tileRegions(width: number, height: number): Tile[] {
  if (!(width > 0) || !(height > 0)) return [];

  const tw = Math.round(width * (0.5 + TILE_OVERLAP / 2));
  const th = Math.round(height * (0.5 + TILE_OVERLAP / 2));
  // Right and bottom tiles are anchored to the far edge rather than measured
  // from the middle, so rounding can never leave a strip of the sheet in no
  // tile at all.
  const xs = [0, width - tw];
  const ys = [0, height - th];

  const tiles: Tile[] = [];
  for (const y of ys) {
    for (const x of xs) {
      tiles.push({ x: Math.max(0, x), y: Math.max(0, y), width: tw, height: th });
    }
  }
  return tiles;
}

/** One room's dimensions as read from a tile. */
export interface Reading {
  name: string;
  lengthFt: number | null;
  widthFt: number | null;
}

export interface RoomLike {
  name?: string;
  squareFootage?: number | null;
  dimensions?: { length?: number | null; width?: number | null; height?: number | null } | null;
  [key: string]: unknown;
}

/**
 * Names compare loosely, because the two passes word them differently.
 *
 * "Bath Rm" on the sheet and "Bathroom" from the whole-sheet read are the same
 * room, and so are "Bed Rm 1" and "bedroom1" — which is why room/rm is removed
 * wherever it appears rather than only at the end: a trailing number otherwise
 * blocks the match on exactly the rooms most likely to be numbered.
 *
 * It will also take the "rm" out of the middle of a word, turning "formal"
 * into "foal". That is harmless here because both sides get the same
 * treatment, and the alternative — matching room names by hand — is a longer
 * list of special cases than this is worth.
 */
function normalise(name: unknown): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/rooms?|rms?/g, '');
}

/**
 * Rooms small enough that the first pass is not to be trusted on them.
 *
 * Every room the whole-sheet read got materially wrong was under this, and
 * every room it got exactly right was over it. It is a threshold drawn round
 * measurements rather than a guess: bathroom 54, laundry 64, vestibule 27 all
 * failed; lounge 255, bedroom 168, kitchen 120 were exact.
 */
export const SMALL_ROOM_SQFT = 90;

/** Which rooms are worth spending a second read on. */
export function roomsNeedingSecondPass(rooms: readonly RoomLike[]): string[] {
  return rooms
    .filter((room) => {
      const sf = room?.squareFootage;
      if (sf === null || sf === undefined) return true;      // never measured
      const n = Number(sf);
      return !Number.isFinite(n) || n <= 0 || n < SMALL_ROOM_SQFT;
    })
    .map((room) => String(room?.name ?? '').trim())
    .filter(Boolean);
}

export interface MergeOutcome {
  rooms: RoomLike[];
  /** What the second pass actually changed, so the reading stays auditable. */
  changed: Array<{ name: string; from: number | null; to: number }>;
}

/**
 * Fold tile readings back into the first pass.
 *
 * Deliberately conservative. A second reading only wins where the first had
 * nothing or had something this module already distrusts — a large room the
 * whole-sheet pass measured exactly is not overwritten because a tile
 * disagreed, since on the evidence the whole-sheet figure is the better one
 * for those. The area is recomputed from the dimensions rather than taken on
 * trust, the same rule the server applies, because a model that reports
 * 11 x 8.5 and calls it 88 has been observed doing exactly that.
 */
export function mergeReadings(
  rooms: readonly RoomLike[], readings: readonly Reading[],
): MergeOutcome {
  const byName = new Map<string, Reading>();
  for (const r of readings) {
    const key = normalise(r?.name);
    if (key) byName.set(key, r);
  }

  const changed: MergeOutcome['changed'] = [];
  const merged = rooms.map((room) => {
    const existing = room?.squareFootage;
    // `Number(null)` is 0, not NaN, so null has to be excluded before the
    // finite check — otherwise an unmeasured room is recorded as having been
    // "0 sq ft before", which reads as a measurement that was taken.
    const existingNum = (existing === null || existing === undefined
      || !Number.isFinite(Number(existing)))
      ? null
      : Number(existing);
    const distrusted = existingNum === null || existingNum <= 0 || existingNum < SMALL_ROOM_SQFT;
    if (!distrusted) return room;

    const hit = byName.get(normalise(room?.name));
    const l = Number(hit?.lengthFt);
    const w = Number(hit?.widthFt);
    if (!hit || !Number.isFinite(l) || !Number.isFinite(w) || l <= 0 || w <= 0) return room;

    const area = Math.round(l * w * 10) / 10;
    changed.push({ name: String(room?.name ?? ''), from: existingNum, to: area });
    return {
      ...room,
      squareFootage: area,
      dimensions: { ...(room?.dimensions || {}), length: l, width: w },
      measuredBy: 'second-pass',
    } as RoomLike;
  });

  return { rooms: merged, changed };
}

/**
 * Cut a sheet into its tiles, at native resolution.
 *
 * Browser only — it needs a canvas. The geometry it relies on is in
 * `tileRegions`, which is pure and tested; this is the drawing.
 *
 * JPEG at 0.95 rather than PNG: a tile of a scanned drawing is photographic,
 * and a lossless copy of it is several times the bytes for detail the model
 * will not see. The quality is high enough that dimension lettering survives,
 * which is the only thing these tiles exist to carry.
 */
export async function cutTiles(dataUrl: string): Promise<string[]> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const out: string[] = [];
  for (const t of tileRegions(img.naturalWidth || img.width, img.naturalHeight || img.height)) {
    const canvas = document.createElement('canvas');
    canvas.width = t.width;
    canvas.height = t.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(img, t.x, t.y, t.width, t.height, 0, 0, t.width, t.height);
    out.push(canvas.toDataURL('image/jpeg', 0.95));
  }
  return out;
}

/**
 * The whole second pass: decide, cut, read, merge.
 *
 * Returns the analysis unchanged — and says so — whenever there is nothing
 * worth re-reading or the read fails. A second pass that cannot run must leave
 * the first one exactly as it was rather than degrading it, because the first
 * pass is already a usable answer.
 *
 * ONE SHEET ONLY. A reading that came off page three cannot be matched to a
 * tile cut from page one, and guessing which sheet a room came from would
 * reintroduce precisely the invented-number problem this is here to reduce.
 */
export async function runSecondPass(
  analysis: any,
  sheets: readonly string[],
  post: (path: string, body: unknown) => Promise<any>,
): Promise<{ analysis: any; ran: boolean; changed: MergeOutcome['changed']; reason?: string }> {
  const rooms: RoomLike[] = Array.isArray(analysis?.rooms) ? analysis.rooms : [];
  const wanted = roomsNeedingSecondPass(rooms);

  if (!wanted.length) return { analysis, ran: false, changed: [], reason: 'nothing small or unmeasured' };
  if (sheets.length !== 1) return { analysis, ran: false, changed: [], reason: 'more than one sheet' };

  try {
    const tiles = await cutTiles(sheets[0]);
    if (!tiles.length) return { analysis, ran: false, changed: [], reason: 'sheet had no size' };

    const data = await post('/ai/measure-rooms', { tiles, rooms: wanted });
    const readings: Reading[] = Array.isArray(data?.readings) ? data.readings : [];
    if (!readings.length) return { analysis, ran: true, changed: [], reason: 'nothing legible on the tiles' };

    const merged = mergeReadings(rooms, readings);
    return {
      analysis: { ...analysis, rooms: merged.rooms, secondPass: { changed: merged.changed.length } },
      ran: true,
      changed: merged.changed,
    };
  } catch {
    // The first pass stands. A failed second look is not worth a failed read.
    return { analysis, ran: false, changed: [], reason: 'the second read failed' };
  }
}
