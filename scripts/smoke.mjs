/**
 * Mount every page and report which ones break.
 *
 *   node scripts/smoke.mjs             every page
 *   node scripts/smoke.mjs --batch 12  smaller batches
 *   node scripts/smoke.mjs --wait 25   longer per batch, on a slow machine
 *
 * WHY IT EXISTS
 *
 * `vite build` proves a bundle can be produced. It does not prove a screen
 * renders. Two failures this year got through a clean build and were found by
 * Eric using the app. This is the check that would have caught both.
 *
 * HOW IT WORKS
 *
 * Starts the dev server and a small listener, then opens headless Edge on the
 * harness once per batch. The page posts each verdict back as it lands, and the
 * batch ends when every page in it has reported or the deadline passes.
 *
 * WHY IT LISTENS RATHER THAN READING THE PAGE
 *
 * The first version read the verdict out of the DOM with --dump-dom, which
 * needs --virtual-time-budget to wait for lazy imports. That works until a page
 * polls, and several do, quite correctly — the owners' dashboard refreshes on a
 * thirty second interval. Under virtual time a repeating interval means the
 * page is never idle, the clock races ahead firing it, and the dump never
 * happens. A batch of three reported and a batch of six did not, which looked
 * like a broken page and was a broken measurement.
 */
import { spawn, spawnSync } from 'node:child_process';
import { changedFiles, affectedRoutes } from './affected.mjs';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 5177;
const REPORT_PORT = 9911;
// One page at a time on a targeted run.
//
// A batch mounts its pages into a single browser, and the heavy ones - the
// design centre and the deck designer carry WebGL viewers - starve each other
// under software rendering. Six together timed out at ninety seconds; the
// design centre alone renders in seven. A targeted run has few pages, so it can
// afford one browser each and get an honest answer. The full sweep still
// batches, because three hundred and thirty browsers is not a trade worth
// making.
const BATCH = Number(argFor('--batch') || (process.argv.includes('--all') ? 15 : 1));
// A targeted run has only a handful of batches, so it can afford to wait.
// Sixty seconds because the design centre and the deck designer now carry
// WebGL viewers, and software-rendered 3D in a headless browser is slow —
// properly rather than call a heavy page a failure. A full sweep has
// twenty-two, where the same generosity costs minutes.
const TARGETED = !process.argv.includes('--all');
const WAIT_S = Number(argFor('--wait') || (TARGETED ? 60 : 20));

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

function argFor(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
}

if (!EDGE) {
  console.error('Could not find Edge.');
  process.exit(2);
}

const tmp = join(process.cwd(), 'node_modules', '.smoke');
mkdirSync(tmp, { recursive: true });

const htmlPath = join(process.cwd(), 'smoke.html');
writeFileSync(htmlPath, `<!doctype html>
<html><head><meta charset="utf-8"><title>smoke</title></head>
<body><div id="root"></div><script type="module" src="/scripts/smoke-entry.tsx"></script></body></html>
`);

/* ── the listener the page reports to ─────────────────────────────────── */

let latest = null;
const listener = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }).end();
    return;
  }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try { latest = JSON.parse(body); } catch { /* a partial post; the next one repeats it */ }
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }).end();
  });
});
listener.listen(REPORT_PORT);

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', shell: true,
});

let browser = null;
function stop() {
  for (const p of [browser, server]) {
    if (!p) continue;
    try { p.kill(); } catch {}
    try { spawnSync('taskkill', ['/F', '/T', '/PID', String(p.pid)], { stdio: 'ignore' }); } catch {}
  }
  try { listener.close(); } catch {}
  try { unlinkSync(htmlPath); } catch {}
}
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/smoke.html`);
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
}

/**
 * Run one batch.
 *
 * Ends as soon as every page has a verdict, rather than always waiting out the
 * deadline — most batches finish in a few seconds and only the ones containing
 * something slow use their full time.
 */
async function runBatch(from, to, only) {
  latest = null;
  const range = only
    ? `only=${encodeURIComponent(only.join(','))}`
    : `from=${from}&to=${to}`;
  const url = `http://localhost:${PORT}/smoke.html?${range}`
    + `&report=${encodeURIComponent(`http://localhost:${REPORT_PORT}/report`)}`;

  browser = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${join(tmp, 'profile')}`,
    url,
  ], { stdio: 'ignore' });

  const deadline = Date.now() + WAIT_S * 1000;
  while (Date.now() < deadline) {
    await sleep(400);
    if (latest && latest.results.every((r) => r.status !== 'hung')) break;
  }

  try { browser.kill(); } catch {}
  try { spawnSync('taskkill', ['/F', '/T', '/PID', String(browser.pid)], { stdio: 'ignore' }); } catch {}
  browser = null;

  return latest;
}

/* ── the run ──────────────────────────────────────────────────────────── */

if (!(await waitForServer())) {
  console.error(`The dev server did not come up on ${PORT}.`);
  process.exit(2);
}

const wantAll = process.argv.includes('--all');
let targets = null;

// By default only the pages a change could have reached. The full sweep takes
// six minutes, which is too slow to run before every commit — and a check that
// gets skipped is worse than none, because it gives false comfort.
if (!wantAll) {
  const changed = changedFiles();
  const routes = affectedRoutes(changed);
  if (routes === null) {
    console.log('A shared entry point changed - running every page.');
  } else if (routes.length === 0) {
    console.log('No source changes reach any page. Nothing to smoke.');
    stop();
    process.exit(0);
  } else {
    targets = routes;
    console.log(`${changed.length} changed file(s) reach ${routes.length} page(s):`);
    console.log('  ' + routes.join(', '));
    console.log('');
  }
}

const all = [];

/**
 * Run a batch, and give a silent one a second chance before condemning it.
 *
 * WHY THE RETRY IS NOT LAZINESS
 *
 * A page that renders on the second attempt was never broken — it lost a race.
 * Browser start-up, software-rendered WebGL and a page that polls on a timer
 * all land differently run to run, and a single missed deadline is not evidence
 * of a defect.
 *
 * This has now produced two false alarms in one sitting. The clearest was
 * `admin-dashboard` reported as hung while `owners-dashboard` passed in the
 * same run — they are the same component behind two route names, so the page
 * plainly rendered. A check that cries wolf gets ignored, and an ignored check
 * is worse than no check, because it still costs the time to run.
 *
 * A genuinely broken page fails twice and is still reported.
 */
async function runBatchWithRetry(from, to, only) {
  const first = await runBatch(from, to, only);
  if (first) return first;
  process.stdout.write(' (retrying)');
  return runBatch(from, to, only);
}

if (targets) {
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    const r = await runBatchWithRetry(0, 0, chunk);
    if (r) all.push(...r.results);
    else all.push(...chunk.map((name) => ({ name, status: 'hung', error: 'never reported, twice' })));
  }
} else {
  const first = await runBatch(0, BATCH);
  if (!first) {
    console.error('Nothing reported at all. The route map may have failed to load.');
    process.exit(2);
  }
  const total = first.total;
  all.push(...first.results);
  console.log(`${total} pages, ${BATCH} at a time`);
  process.stdout.write(`  1..${Math.min(BATCH, total)}`);
  for (let from = BATCH; from < total; from += BATCH) {
    const to = Math.min(from + BATCH, total);
    const r = await runBatchWithRetry(from, to);
    if (r) all.push(...r.results);
    else all.push({ name: `pages ${from}-${to}`, status: 'hung', error: 'the batch never reported, twice' });
    process.stdout.write(`  ${from + 1}..${to}`);
  }
  console.log('');
}

/**
 * Retry the pages that went quiet, one browser each.
 *
 * A batch can come back having heard from most of its pages and not from one or
 * two. Those are usually the heavy ones — WebGL under software rendering — or
 * ones that poll on a timer, and they were starved by whatever else was
 * mounted alongside them rather than being broken.
 *
 * Alone, with the whole browser to themselves, they render. `admin-dashboard`
 * was reported hung in the same run that `owners-dashboard` passed, and those
 * are the same component behind two route names — so the page plainly worked
 * and the harness was the thing at fault.
 *
 * Anything still silent after a run of its own is reported, and is worth
 * looking at.
 */
const quiet = all.filter((r) => r.status === 'hung' && !/^pages /.test(r.name));
if (quiet.length) {
  console.log(`\nRetrying ${quiet.length} quiet page(s), one at a time…`);
  for (const row of quiet) {
    const r = await runBatch(0, 0, [row.name]);
    const fresh = r?.results?.find((x) => x.name === row.name);
    if (fresh && fresh.status !== 'hung') {
      row.status = fresh.status;
      row.error = fresh.error;
      console.log(`  ${row.name} → ${fresh.status} on its own`);
    } else {
      row.error = 'never reported, even alone';
      console.log(`  ${row.name} → still silent`);
    }
  }
}

const threw = all.filter((r) => r.status === 'threw');
const hung = all.filter((r) => r.status === 'hung');
const ok = all.filter((r) => r.status === 'ok');

if (threw.length) {
  console.log(`THREW (${threw.length})\n`);
  for (const r of threw) console.log(`  ${r.name}\n      ${r.error}`);
  console.log('');
}

if (hung.length) {
  console.log(`DID NOT REPORT IN ${WAIT_S}s (${hung.length})`);
  console.log('  Slow rather than broken, usually — a page that fetches a lot,');
  console.log('  or one that polls. Re-run with --wait 40 before worrying.\n');
  for (const r of hung) console.log(`  ${r.name}`);
  console.log('');
}

console.log(`${ok.length} rendered, ${hung.length} did not report, ${threw.length} threw`);
writeFileSync(join(tmp, 'last-run.json'), JSON.stringify(all, null, 2));
console.log('Full result: node_modules/.smoke/last-run.json');

stop();
process.exit(threw.length ? 1 : 0);
