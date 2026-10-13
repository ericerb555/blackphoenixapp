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

/**
 * The modal targets, read out of the fixtures file rather than listed twice.
 *
 * A second copy of this list would go stale the first time somebody added a
 * modal and did not know there were two places to add it.
 */
const MODAL_TARGETS = (() => {
  try {
    const src = readFileSync(new URL('./smokeModals.tsx', import.meta.url), 'utf8');
    return [...src.matchAll(/'(modal:[a-z0-9-]+)':/g)].map((m) => m[1]);
  } catch {
    return [];
  }
})();
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Both ports are overridable, because this harness is a SHARED resource.
 *
 * Eric runs several Claude sessions against this repository at once, and they
 * all run `npm run smoke` before committing. Two runs cannot both hold 9911, so
 * the second dies with `EADDRINUSE` and that session cannot verify its work —
 * which has happened repeatedly, six times in one afternoon, each time leaving
 * a change typechecked but never mounted. Killing the other session's process
 * is not an option: it may be mid-run on somebody else's commit.
 *
 * So:  SMOKE_PORT=5178 SMOKE_REPORT_PORT=9912 npm run smoke
 *
 * Defaults are unchanged, so nothing that already works changes behaviour.
 */
const PORT = Number(process.env.SMOKE_PORT) || 5177;
const REPORT_PORT = Number(process.env.SMOKE_REPORT_PORT) || 9911;

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

/**
 * The browser profile has to be per-run too, and this was the other half of
 * the ports bug above.
 *
 * Moving the ports let two runs start. They then both spawned Edge with
 * `--user-data-dir=<tmp>/profile`, and **Edge cannot open one profile twice**:
 * the second instance exits immediately, posts nothing, and the run reports
 * "Nothing reported at all. The route map may have failed to load."
 *
 * That message sends you a long way in the wrong direction. The route map was
 * fine — every module transformed with a 200, and the harness page worked
 * perfectly when opened by hand against a different profile. Three commits went
 * in with smoke unrun before the cause was found, each saying so in its message
 * rather than claiming a pass, which is the only reason it was not worse.
 *
 * Keyed on the report port because that is already what distinguishes
 * concurrent runs: give your run its own port and it gets its own profile,
 * without having to know that profiles were ever a problem.
 */
const profileDir = join(tmp, `profile-${REPORT_PORT}`);

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
/**
 * A busy report port is a message, not a stack trace.
 *
 * `listen` emits `error` asynchronously, and with nothing listening for it Node
 * rethrows as an unhandled event — so a second concurrent run died with
 * fourteen lines of `events.js` internals and the word EADDRINUSE buried in
 * them. Correct, and useless: the person reading it has to work out that
 * another run owns the port and that `SMOKE_REPORT_PORT` exists.
 */
listener.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`\nThe report port ${REPORT_PORT} is already in use.`);
    console.error('Another smoke run is probably in progress — they cannot share it.');
    console.error('Run yours on different ports:');
    console.error(`  SMOKE_PORT=${PORT + 1} SMOKE_REPORT_PORT=${REPORT_PORT + 1} npm run smoke\n`);
    process.exit(3);
  }
  console.error(`The report listener failed: ${err?.message || err}`);
  process.exit(3);
});
listener.listen(REPORT_PORT);

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', shell: true,
});

/**
 * Notice when vite dies instead of waiting out the clock for it.
 *
 * `--strictPort` makes vite exit rather than quietly move to another port, which
 * is right — but nothing watched for that exit, so `waitForServer` spent its
 * full sixty seconds polling a port that would never answer, and then reported
 * "the dev server did not come up" without saying why.
 *
 * This is the failure that cost the most. A vite process orphaned on 2 October
 * held 5177, and every smoke run in this checkout appeared to HANG for eleven
 * days — including runs from sessions that had nothing to do with it. A hang
 * reads as "this is slow, wait longer"; an error reads as "fix this". The whole
 * eleven days is the difference between those two.
 */
let serverDied = null;
server.on('exit', (code) => {
  if (code === 0) return;
  serverDied = `vite exited with code ${code} — port ${PORT} is most likely already in use.`;
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
    // Stop the moment vite is known dead. Polling on for another fifty seconds
    // cannot change the answer, and the wait is what made this look like a hang.
    if (serverDied) return false;
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
async function runBatch(from, to, only, waitS = WAIT_S) {
  latest = null;
  const range = only
    ? `only=${encodeURIComponent(only.join(','))}`
    : `from=${from}&to=${to}`;
  const url = `http://localhost:${PORT}/smoke.html?${range}`
    + `&report=${encodeURIComponent(`http://localhost:${REPORT_PORT}/report`)}`;

  browser = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${profileDir}`,
    url,
  ], { stdio: 'ignore' });

  const deadline = Date.now() + waitS * 1000;
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
  if (serverDied) {
    console.error(`\n${serverDied}`);
    console.error('Another smoke run, or a vite left behind by an earlier one, is holding it.');
    console.error('Run yours on different ports:');
    console.error(`  SMOKE_PORT=${PORT + 1} SMOKE_REPORT_PORT=${REPORT_PORT + 1} npm run smoke\n`);
  } else {
    console.error(`The dev server did not come up on ${PORT} within 60s, and vite did not exit either.`);
  }
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
    /**
     * No page was affected, but the modals still are.
     *
     * A change to a modal, or to this harness, reaches no page by the import
     * walker’s reckoning — pages import modals, not the other way round. Exiting
     * here would mean the one kind of target that cannot be reached by the
     * walker is also the one never checked, which is how the gap this whole
     * change closes came to exist.
     */
    if (MODAL_TARGETS.length > 0) {
      targets = MODAL_TARGETS;
      console.log(`No page is affected. Running ${MODAL_TARGETS.length} modals.`);
      console.log('');
    } else {
      console.log('No source changes reach any page. Nothing to smoke.');
      stop();
      process.exit(0);
    }
  } else {
    /**
     * The modal targets always run alongside whatever pages were affected.
     *
     * The import walker answers "which PAGES could this change have reached",
     * and a modal is not a page — so a change to one selected its host page and
     * then never opened the thing that changed. There are only a handful of
     * them and they mount in milliseconds, so running them every time is
     * cheaper than teaching the walker a second kind of target and being wrong
     * about it quietly.
     */
    targets = [...routes, ...MODAL_TARGETS];
    console.log(`${changed.length} changed file(s) reach ${routes.length} page(s):`);
    console.log('  ' + routes.join(', '));
    console.log(`  plus ${MODAL_TARGETS.length} modals, which always run`);
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
async function runBatchWithRetry(from, to, only, waitS = WAIT_S) {
  const first = await runBatch(from, to, only, waitS);
  if (first) return first;
  process.stdout.write(' (retrying)');
  return runBatch(from, to, only, waitS);
}

/**
 * A page tried on its own gets the generous deadline, whatever the mode.
 *
 * There was one global `WAIT_S` — sixty seconds for a targeted run, twenty for
 * a full sweep — and `runBatch` used it for everything, including the retries
 * that exist precisely to give a starved page a fair hearing. So in a full
 * sweep a heavy page was retried alone and still allowed only twenty seconds,
 * and was then recorded as "never reported, EVEN ALONE" — a verdict that reads
 * as "this page is broken" and was nothing of the kind.
 *
 * Twenty-one pages were labelled that way in one run on 2026-10-13, minutes
 * after the identical code reported all three hundred and sixty-five fine. The
 * difference was machine load, and the label did not survive it.
 *
 * Sixty is the figure the harness already argues for a lone page: the design
 * centre renders in seven on its own and starved at ninety in a batch of six.
 * By the time this pass runs there are only a handful of pages left, so the
 * generosity costs seconds and buys a verdict worth printing.
 */
const LONE_WAIT_S = Math.max(WAIT_S, 60);

/**
 * A batch that never reports is split in half, not written off.
 *
 * WHAT WAS WRONG
 *
 * A silent batch became a single row — `pages 60-75, hung` — and the
 * single-page retry pass below skips those rows on purpose (`!/^pages /`). So
 * fifteen pages went unexamined and unmentioned: a sweep would say "270
 * rendered, 13 did not report" when the app has 362 pages, and the missing
 * ninety were simply absent from the arithmetic. Nobody could tell whether
 * those pages were broken or never tried.
 *
 * It mattered because the batch deadline for a full sweep is twenty seconds for
 * fifteen pages, and the heavy ones — the design centre and the deck designer
 * carry WebGL viewers that render in software here — starve each other. So a
 * batch containing two of them times out through no fault of any page in it,
 * and on 2026-10-13 that produced three separate red sweeps that each had to be
 * disproved by hand before anything could be committed. A check that cries wolf
 * trains you to commit through red, which is worse than having no check.
 *
 * WHY BY INDEX AND NOT BY NAME
 *
 * The route map lives in the browser; the Node side only learns a page's name
 * when a batch reports one. A batch that said nothing has no names to retry, so
 * the only handle left is the index range — which is enough. Halving reaches a
 * single page in four steps for a batch of fifteen, and a single page gets the
 * whole browser, which is exactly the condition under which the starved ones
 * render.
 *
 * The extra browser launches are paid only on failure. A clean sweep does
 * exactly what it did before.
 */
async function runRangeSplitting(from, to, depth = 0) {
  // A single page gets the generous deadline — see LONE_WAIT_S. Splitting down
  // to one page and then still allowing it only twenty seconds would reproduce
  // the starvation this function exists to rule out.
  const r = await runBatchWithRetry(from, to, undefined, to - from <= 1 ? LONE_WAIT_S : WAIT_S);
  if (r) return r.results;

  // One page, and still silent after two attempts with a browser to itself.
  // That is a real finding rather than starvation, and it is reported as one.
  if (to - from <= 1) {
    return [{
      name: `page ${from}`,
      status: 'hung',
      error: 'never reported, even alone (identified by index — it never named itself)',
    }];
  }

  const mid = from + Math.floor((to - from) / 2);
  process.stdout.write(` (splitting ${from}-${to})`);
  return [
    ...await runRangeSplitting(from, mid, depth + 1),
    ...await runRangeSplitting(mid, to, depth + 1),
  ];
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
    // Not split, because the total page count comes from the first batch and
    // there is nothing to iterate without it. The message names both causes
    // rather than asserting the likelier one: it reads as a diagnosis, and
    // "the route map failed" sent somebody a long way in the wrong direction
    // when the real cause was a shared browser profile.
    console.error('Nothing reported at all from the first batch.');
    console.error('Either the route map failed to load, or the batch was starved — try');
    console.error(`  npm run smoke -- --all --batch 5 --wait 45`);
    process.exit(2);
  }
  const total = first.total;
  all.push(...first.results);
  console.log(`${total} pages, ${BATCH} at a time`);
  process.stdout.write(`  1..${Math.min(BATCH, total)}`);
  for (let from = BATCH; from < total; from += BATCH) {
    const to = Math.min(from + BATCH, total);
    all.push(...await runRangeSplitting(from, to));
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
    const r = await runBatch(0, 0, [row.name], LONE_WAIT_S);
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
