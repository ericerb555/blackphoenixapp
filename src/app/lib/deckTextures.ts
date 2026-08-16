/**
 * Textures for the 3D view, drawn in the browser rather than downloaded.
 *
 * The renderer cannot fetch anything at runtime. That is not a preference — it
 * is the lesson from two bugs already in this project: drei's Text component
 * fetched a font and rendered a framing plan with no labels when it failed, and
 * Environment preset="park" fetches an HDRI, which is why the 3D view has been
 * lit by nothing but two directional lights and looked like moulded plastic.
 *
 * So every surface here is generated on a canvas at startup and cached. Wood
 * gets real grain and knots, siding gets courses and a shadow line under each
 * lap, grass gets clumps rather than a flat green. None of it can fail to load,
 * and all of it costs a few milliseconds once.
 *
 * Textures are cached by their arguments because a THREE.CanvasTexture uploads
 * to the GPU on first use; regenerating one per render would rebuild the atlas
 * every time a slider moved.
 */
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

/** Deterministic noise, so a given board looks the same between renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas available for texture generation.');
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, repeat: [number, number]): THREE.Texture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `rgb(${r},${g},${b})`;
}

/**
 * Sawn lumber. Grain runs horizontally across the canvas, which lines up with
 * the long axis of a board once the texture is repeated along it.
 */
export function woodTexture(base: string, seed = 1, knots = true): THREE.Texture {
  const key = `wood:${base}:${seed}:${knots}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 512;
  const [c, ctx] = canvas(S);
  const rand = rng(seed * 7919);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  // Broad tonal banding — the difference between heartwood and sapwood, which
  // is what stops a board reading as a single flat colour from across a yard.
  for (let i = 0; i < 26; i++) {
    const y = rand() * S;
    const h = 6 + rand() * 30;
    ctx.fillStyle = shade(base, (rand() - 0.5) * 0.22);
    ctx.fillRect(0, y, S, h);
  }

  // Grain lines. Each wanders slightly so they are not parallel rules.
  for (let i = 0; i < 190; i++) {
    const y0 = rand() * S;
    ctx.strokeStyle = shade(base, -0.10 - rand() * 0.30);
    ctx.globalAlpha = 0.25 + rand() * 0.45;
    ctx.lineWidth = 0.5 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    let y = y0;
    for (let x = 0; x <= S; x += 24) {
      y += (rand() - 0.5) * 3.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (knots) {
    for (let i = 0; i < 3; i++) {
      const kx = rand() * S;
      const ky = rand() * S;
      const kr = 5 + rand() * 12;
      for (let r = kr; r > 0; r -= 1.6) {
        ctx.strokeStyle = shade(base, -0.18 - (r / kr) * 0.22);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(kx, ky, r, r * 0.62, rand() * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  const tex = finish(c, [1, 1]);
  cache.set(key, tex);
  return tex;
}

/**
 * A roughness map derived from grain, so light catches the surface unevenly.
 * Without one, every board reflects identically and the deck reads as plastic
 * no matter how good the colour is.
 */
export function woodRoughness(seed = 1): THREE.Texture {
  const key = `woodrough:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 256;
  const [c, ctx] = canvas(S);
  const rand = rng(seed * 104729);

  ctx.fillStyle = '#b4b4b4';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 150; i++) {
    const y0 = rand() * S;
    ctx.strokeStyle = rand() > 0.5 ? '#d8d8d8' : '#8e8e8e';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.6 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    let y = y0;
    for (let x = 0; x <= S; x += 16) {
      y += (rand() - 0.5) * 2.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Mown lawn — clumped rather than flat, with a faint mowing stripe. */
export function grassTexture(): THREE.Texture {
  const key = 'grass';
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 512;
  const [c, ctx] = canvas(S);
  const rand = rng(20260816);

  ctx.fillStyle = '#5c7043';
  ctx.fillRect(0, 0, S, S);

  // Clumps first, so individual blades sit on top of tonal variation.
  for (let i = 0; i < 900; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 6 + rand() * 26;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(110,133,74,0.5)' : 'rgba(72,90,52,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 5000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctx.strokeStyle = rand() > 0.45 ? 'rgba(126,150,84,0.65)' : 'rgba(64,82,46,0.65)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 4, y - 2 - rand() * 5);
    ctx.stroke();
  }

  const tex = finish(c, [1, 1]);
  cache.set(key, tex);
  return tex;
}

/**
 * Lap siding. The shadow line under each course is the whole point — it is what
 * makes a wall read as siding rather than as a painted box.
 */
export function sidingTexture(color = '#d9d3c7', exposureIn = 6): THREE.Texture {
  const key = `siding:${color}:${exposureIn}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 512;
  const [c, ctx] = canvas(S);
  const rand = rng(31337);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);

  // Eight courses per tile, so the tile repeats cleanly up a wall.
  const courses = 8;
  const h = S / courses;
  for (let i = 0; i < courses; i++) {
    const y = i * h;
    // Each course is very slightly its own tone, as real siding weathers.
    ctx.fillStyle = shade(color, (rand() - 0.5) * 0.05);
    ctx.fillRect(0, y, S, h);
    // The lap shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, y + h - 3, S, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(0, y, S, 1.5);
  }

  const tex = finish(c, [1, 1]);
  cache.set(key, tex);
  return tex;
}

/** Poured concrete for footings and pads. */
export function concreteTexture(): THREE.Texture {
  const key = 'concrete';
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 256;
  const [c, ctx] = canvas(S);
  const rand = rng(4242);

  ctx.fillStyle = '#9c9a94';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
  }

  const tex = finish(c, [1, 1]);
  cache.set(key, tex);
  return tex;
}

/** Asphalt shingles, for the bit of roof that gives the wall a top edge. */
export function shingleTexture(color = '#4a4a4a'): THREE.Texture {
  const key = `shingle:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 512;
  const [c, ctx] = canvas(S);
  const rand = rng(9091);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);

  const rows = 10;
  const h = S / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * h;
    const offset = (r % 2) * (S / 16);
    for (let x = -S / 16; x < S; x += S / 8) {
      ctx.fillStyle = shade(color, (rand() - 0.5) * 0.24);
      ctx.fillRect(x + offset, y, S / 8 - 2, h - 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y + h - 2.5, S, 2.5);
  }

  const tex = finish(c, [1, 1]);
  cache.set(key, tex);
  return tex;
}
