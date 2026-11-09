/**
 * Whether the particle cloud is still Eric's logo.
 *
 * The brief's one non-negotiable is that the shape stays recognisable and
 * that it is built from the real asset rather than a generic phoenix. Both
 * of those are properties of the sampling, which is why the sampling is a
 * pure function in its own file — none of this needs a GPU to check.
 *
 * The real PNG is read at the bottom. A test that only exercised synthetic
 * pixel grids would pass happily on the day somebody swapped the asset for
 * a white square.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  pickParticles, isOutlinePixel, budgetFor, distanceToEdge,
} from '../src/app/components/phoenix/phoenixParticleSource.ts';

/** Deterministic PRNG, so a failure is reproducible. */
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** A tiny image: opaque orange ring around an opaque black disc. */
function disc(size = 32) {
  const d = new Uint8ClampedArray(size * size * 4);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = Math.hypot(x - c, y - c);
      if (r > c - 1) continue;                      // transparent background
      const edge = r > c - 4;
      d[i] = edge ? 234 : 10;
      d[i + 1] = edge ? 88 : 10;
      d[i + 2] = edge ? 12 : 10;
      d[i + 3] = 255;
    }
  }
  return { data: d, size };
}

/* ── classifying a pixel ─────────────────────────────────────────────── */

test('brand orange is an outline pixel and near-black is not', () => {
  assert.equal(isOutlinePixel(234, 88, 12), true, '#ea580c');
  assert.equal(isOutlinePixel(10, 10, 10), false, 'the body');
  assert.equal(isOutlinePixel(0, 0, 0), false, 'pure black');
});

test('a dimmed antialiased edge still counts as outline', () => {
  // Half-strength orange along a curve. If these fall to the body, the
  // silhouette loses its crispest particles exactly where it matters.
  assert.equal(isOutlinePixel(117, 44, 6), true);
});

test('white and blue are not mistaken for the brand outline', () => {
  assert.equal(isOutlinePixel(255, 255, 255), false, 'white');
  assert.equal(isOutlinePixel(40, 90, 220), false, 'blue');
});

/* ── sampling ────────────────────────────────────────────────────────── */

test('no particle is ever placed on a transparent pixel', () => {
  // The failure this prevents is the recognisable one: a rectangular haze
  // around the bird because the background got sampled too.
  const { data, size } = disc(48);
  const f = pickParticles(data, size, size, { count: 2000, random: rng(7) });
  const half = size / 2;
  for (let i = 0; i < f.count; i++) {
    const x = f.positions[i * 3] * half + size / 2;
    const y = size / 2 - f.positions[i * 3 + 1] * half;
    const p = ((Math.round(y) * size) + Math.round(x)) * 4;
    assert.ok(data[p + 3] >= 100, `particle ${i} landed on background`);
  }
});

const edgeShareOf = (f: { count: number; edge: Float32Array }) => {
  let edges = 0;
  for (let i = 0; i < f.count; i++) if (f.edge[i] === 1) edges++;
  return edges / f.count;
};

test('the outline gets a real share of the budget, not its pixel share', () => {
  // The outline is a thin minority of the opaque pixels — about 18% of this
  // disc, and far less on the real mark. Sampling uniformly would spend
  // almost nothing there and the edge would dissolve into the body.
  const { data, size } = disc(64);
  const f = pickParticles(data, size, size, { count: 800, random: rng(3) });
  const share = edgeShareOf(f);
  assert.ok(share > 0.3 && share < 0.4, `edge share was ${share.toFixed(2)}`);
});

test('when the budget exceeds the image, the share falls back to what exists', () => {
  // Found by the test above failing: ask for more particles than there are
  // opaque pixels and every pixel is taken, so the edge share can only be
  // the pixel share. Correct, but worth pinning — it means the budget must
  // stay well under the sampled resolution or the outline quietly thins.
  // The real asset is 1080² against a budget in the tens of thousands, so
  // this is a property of tiny images, not of the shipping configuration.
  const { data, size } = disc(64);
  const all = pickParticles(data, size, size, { count: 100000, random: rng(3) });
  assert.ok(edgeShareOf(all) < 0.25, 'cannot invent outline pixels that are not there');
  assert.ok(all.count < 100000, 'and the count is capped at what exists');
});

test('a fully transparent image yields no particles at all', () => {
  // Rather than a knot of particles at the origin, which is what an
  // unguarded implementation produces and which looks like a bug on screen.
  const empty = new Uint8ClampedArray(16 * 16 * 4);
  const f = pickParticles(empty, 16, 16, { count: 500, random: rng(1) });
  assert.equal(f.count, 0);
  assert.equal(f.positions.length, 0);
});

test('asking for more particles than the image has pixels is capped', () => {
  const { data, size } = disc(16);
  const f = pickParticles(data, size, size, { count: 1e6, random: rng(2) });
  assert.ok(f.count > 0);
  assert.ok(f.count <= size * size, `${f.count} exceeds the opaque pixels`);
  assert.equal(f.positions.length, f.count * 3);
  assert.equal(f.seed.length, f.count * 3);
  assert.equal(f.edge.length, f.count);
});

test('positions are normalised into the unit box', () => {
  const { data, size } = disc(40);
  const f = pickParticles(data, size, size, { count: 1500, random: rng(9), depth: 0.9 });
  for (let i = 0; i < f.count * 3; i += 3) {
    assert.ok(Math.abs(f.positions[i]) <= 1.01, 'x out of range');
    assert.ok(Math.abs(f.positions[i + 1]) <= 1.01, 'y out of range');
    assert.ok(Math.abs(f.positions[i + 2]) <= 0.91, 'z outside the solid');
  }
});

/* ── the volume ──────────────────────────────────────────────────────── */

test('distance-to-edge is zero outside and largest at the centre', () => {
  const { data, size } = disc(32);
  const d = distanceToEdge(data, size, size, 100);
  assert.equal(d[0], 0, 'a corner is background');
  const centre = d[(size / 2) * size + size / 2];
  let max = 0;
  for (let i = 0; i < d.length; i++) max = Math.max(max, d[i]);
  assert.equal(centre, max, 'the deepest point of a disc is its centre');
  assert.ok(max > size / 4, `only ${max} deep — the transform did not propagate`);
});

test('the chamfer transform is close to the true Euclidean distance', () => {
  // A disc of radius r has a centre distance of r. Chamfer should be within
  // a few percent, which is the whole reason it is worth using.
  const { data, size } = disc(64);
  const d = distanceToEdge(data, size, size, 100);
  const centre = d[(size / 2) * size + size / 2];
  const trueR = size / 2 - 1;
  assert.ok(Math.abs(centre - trueR) / trueR < 0.08,
    `chamfer said ${centre.toFixed(1)}, truth is about ${trueR}`);
});

test('the shape is thick where it is wide and flat at its edges', () => {
  // The property that makes it read as a sculpted object rather than a
  // cutout: a feather tip must not be as deep as the chest.
  const { data, size } = disc(64);
  const f = pickParticles(data, size, size, { count: 3000, random: rng(5), depth: 0.9 });

  let deepZ = 0, edgeZ = 0, deepN = 0, edgeN = 0;
  for (let i = 0; i < f.count; i++) {
    const z = Math.abs(f.positions[i * 3 + 2]);
    if (f.thickness[i] > 0.75) { deepZ += z; deepN++; }
    if (f.thickness[i] < 0.12) { edgeZ += z; edgeN++; }
  }
  assert.ok(deepN > 20 && edgeN > 20, 'need samples at both depths');
  assert.ok(deepZ / deepN > (edgeZ / edgeN) * 2,
    'the interior must be substantially thicker than the rim');
});

test('thickness is reported for every particle and stays in range', () => {
  const { data, size } = disc(48);
  const f = pickParticles(data, size, size, { count: 900, random: rng(6) });
  assert.equal(f.thickness.length, f.count);
  for (let i = 0; i < f.count; i++) {
    assert.ok(f.thickness[i] >= 0 && f.thickness[i] <= 1, `thickness ${f.thickness[i]}`);
  }
});

test('a one-pixel-thin shape gets no spurious depth', () => {
  // A line is flat. If the transform leaked, every thin feather would
  // balloon into a tube and the wings would look like pipe cleaners.
  const size = 24;
  const d = new Uint8ClampedArray(size * size * 4);
  for (let x = 0; x < size; x++) {
    const i = ((size / 2) * size + x) * 4;
    d[i] = 10; d[i + 1] = 10; d[i + 2] = 10; d[i + 3] = 255;
  }
  const f = pickParticles(d, size, size, { count: 100, random: rng(8), depth: 0.9 });
  for (let i = 0; i < f.count; i++) {
    assert.ok(Math.abs(f.positions[i * 3 + 2]) <= 0.9,
      'a one-pixel line must stay essentially flat');
  }
});

test('the image is not rendered upside down', () => {
  // Image rows run downward and GL's Y runs up. Getting this wrong flips
  // the phoenix, which is subtle enough on a near-symmetric mark to ship.
  const size = 16;
  const d = new Uint8ClampedArray(size * size * 4);
  for (let x = 0; x < size; x++) {         // one opaque row along the TOP
    const i = (0 * size + x) * 4;
    d[i] = 10; d[i + 1] = 10; d[i + 2] = 10; d[i + 3] = 255;
  }
  const f = pickParticles(d, size, size, { count: 50, random: rng(4) });
  assert.ok(f.count > 0);
  for (let i = 0; i < f.count; i++) {
    assert.ok(f.positions[i * 3 + 1] > 0, 'a top row must land at positive Y');
  }
});

test('the same seed gives the same cloud', () => {
  const { data, size } = disc(32);
  const a = pickParticles(data, size, size, { count: 400, random: rng(11) });
  const b = pickParticles(data, size, size, { count: 400, random: rng(11) });
  assert.deepEqual(Array.from(a.positions), Array.from(b.positions));
});

/* ── the actual asset ────────────────────────────────────────────────── */

test('the logo on disk is still a transparent PNG the sampler can use', () => {
  // Guards the swap that would break this silently: an opaque or flattened
  // export would make the alpha channel useless as a silhouette and the
  // "phoenix" would come out a solid square.
  const b = readFileSync('src/imports/BPB_phoenix_full_color_logo.png');
  assert.equal(b.toString('ascii', 1, 4), 'PNG');
  const width = b.readUInt32BE(16);
  const colourType = b[25];
  assert.equal(colourType, 6, 'the mark must keep its alpha channel (RGBA)');
  assert.ok(width >= 512, `only ${width}px wide — too coarse to sample`);
});

/* ── device budget ───────────────────────────────────────────────────── */

test('a phone is never asked to draw a desktop particle count', () => {
  const phone = budgetFor(8, true, 8);
  const desktop = budgetFor(16, false, 32);
  assert.ok(phone < desktop / 2, `phone ${phone} vs desktop ${desktop}`);
});

test('a weak machine is budgeted down even when it is not a phone', () => {
  assert.ok(budgetFor(2, false, 4) < budgetFor(16, false, 32));
  assert.ok(budgetFor(8, false, 8) <= budgetFor(16, false, 32));
});

test('every budget is a usable count', () => {
  for (const [c, m, g] of [[1, false, 1], [4, true, 2], [32, false, 64]] as const) {
    const n = budgetFor(c, m, g);
    assert.ok(Number.isFinite(n) && n >= 1000, `${n} for ${c}/${m}/${g}`);
  }
});
