/**
 * Build the digital products we sell.
 *
 *     node scripts/digital-products/build.mjs            every product
 *     node scripts/digital-products/build.mjs calc-reserve   just one
 *
 * Output goes to `dist/digital-products/<id>/`, which is deliberately NOT the
 * place a buyer downloads from. Rendering and publishing are separate steps so
 * a document can be looked at before it is attached to a product anybody can
 * buy — the whole reason the catalogue had nothing behind it for weeks is that
 * listings were published on the assumption the artefacts existed.
 *
 * Each product module exports `meta` and an async `build()` returning
 * `[{ name, mime, buffer }]`. Nothing here knows what any product contains.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'dist', 'digital-products');

/** Every product with a builder written. Add an id here as it is authored. */
const PRODUCTS = [
  'calc-reserve',
  'calc-roi',
  'calc-rental-pricing',
  'calc-ev-roi',
  'maint-nh-winter',
  'maint-annual-planner',
  'tmpl-inspection',
  'tmpl-vendor-contract',
  'tmpl-board-meeting',
  'eb-capital-planning',
  'eb-condo-board',
  'bundle-condo-complete',
  'eb-landlord-ops',
  'bundle-pm-pro',
  'eb-homeowner-guide',
  'eb-diy-repair',
];

function human(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function buildOne(id) {
  const mod = await import(`./products/${id}.mjs`);
  if (typeof mod.build !== 'function') throw new Error(`${id} exports no build()`);
  const files = await mod.build();
  const dir = join(OUT, id);
  await mkdir(dir, { recursive: true });
  const written = [];
  for (const file of files) {
    const path = join(dir, file.name);
    await writeFile(path, file.buffer);
    written.push({ name: file.name, bytes: file.buffer.length });
  }
  return { id, title: mod.meta?.title || id, written };
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : PRODUCTS;

let failed = 0;
for (const id of ids) {
  try {
    const result = await buildOne(id);
    for (const f of result.written) {
      console.log(`  ok   ${id.padEnd(16)} ${f.name}  ${human(f.bytes)}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${id.padEnd(16)} ${error?.message || error}`);
  }
}

console.log(`\n${ids.length - failed} of ${ids.length} built into dist/digital-products/`);
if (failed) process.exitCode = 1;
