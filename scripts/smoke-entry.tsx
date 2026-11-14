/**
 * The page the smoke test loads. Not part of the app.
 *
 * WHY THIS EXISTS
 *
 * `vite build` proves a bundle can be produced. It does not prove a single
 * screen renders. Two failures this year got through a clean build and were
 * found by Eric using the app — a variable read before it was declared, and a
 * component using `useEffect` without importing it — because esbuild strips
 * types without reading them and never runs anything.
 *
 * So this mounts every page in the route map and reports which ones throw.
 *
 * HOW IT SURVIVES A CRASH
 *
 * Each page is wrapped in its own error boundary. Without that the first page
 * to throw takes the whole batch with it, and the run reports one failure
 * instead of the twelve that are actually there.
 *
 * WHY IT REPORTS OVER HTTP RATHER THAN INTO THE PAGE
 *
 * The first version wrote its verdict into the DOM and the runner read it back
 * with --dump-dom, which requires --virtual-time-budget to wait for the lazy
 * imports. That works until a page polls. Several of them do, quite correctly:
 * the owners' dashboard refreshes on a thirty second interval. Under virtual
 * time a repeating interval means the page is never idle, so the clock races
 * ahead firing it and the dump never happens. A batch of three reported; a
 * batch of six did not, and the culprit looked like a broken page when it was
 * a broken measurement.
 *
 * So the page posts each verdict to the runner as it lands. Real time, no
 * virtual clock, and a page that polls forever is no longer a problem — its
 * neighbours have already reported.
 */
import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { pageMap } from '../src/app/routes';
import { modalMap } from './smokeModals';
import { AuthProvider } from '../src/app/contexts/AuthContext';
import { CompanyContextProvider } from '../src/app/contexts/CompanyContext';
import { ActiveCompanyProvider } from '../src/app/contexts/ActiveCompanyContext';
import { UserProvider } from '../src/app/lib/user-context';
import { ThemeProvider } from '../src/app/components/ThemeManager';

/*
 * THE APPLICATION'S STYLESHEET. `main.tsx` imports this and this harness did
 * not, which mattered the moment the harness started measuring layout.
 *
 * Without it every page mounts unstyled: Tailwind is absent, so `w-full` does
 * nothing and an image renders at its natural 1200px; the reset in globals.css
 * is absent, so is every breakpoint, and an `<input>` reports Chrome's UA
 * default of 13.3333px. A first --mobile sweep "found" 145 pages with fields
 * under 16px and 358 pages bleeding past the viewport. Every one was an
 * artifact of this missing line.
 *
 * It did not matter for the original job — a component throws or it does not,
 * whether or not it is styled — which is why it went unnoticed. It is fatal
 * for a layout audit, and this file's own note says why: a test that reports
 * its own missing scaffolding as broken code is worse than no test.
 */
import '../src/styles/index.css';

interface Result {
  name: string;
  status: 'ok' | 'threw' | 'hung';
  error?: string;
  /** Phone-width findings, present only on a `--mobile` sweep. See measure(). */
  mobile?: MobileFindings;
}

interface MobileFindings {
  /** Widest point of the page's own subtree, against a 390px viewport. */
  widest: number;
  /** Elements sticking out past the right edge, outside any sideways scroller. */
  bleed: number;
  /** The worst offender, named, so the finding is actionable without a rerun. */
  bleedWorst?: string;
  /** Form fields under 16px — every one of these zooms iOS Safari on focus. */
  tinyFields: number;
  /** A field that does it, named. */
  tinyFieldWorst?: string;
  /** Buttons and links under 40px in either axis. */
  smallTargets: number;
}

/**
 * What a page looks like on a phone.
 *
 * MEASURED PER PAGE, NOT PER DOCUMENT, and that is the whole reason this lives
 * here rather than in the runner. A batch mounts fifteen pages stacked into one
 * document, so `document.scrollWidth` is the widest of fifteen pages and tells
 * you nothing about any of them. Every measurement below is scoped to the
 * page's own `[data-page]` subtree.
 *
 * WHAT IT DELIBERATELY DOES NOT MEASURE. Overlap between FIXED elements and
 * content. Fixed positioning is relative to the viewport, so in a stacked batch
 * every page's floating widgets pile into the same corner and would report
 * overlaps that no real visitor could ever see. Fixed-element overlap needs one
 * page per document, which is what the browser sweep is for.
 *
 * So this answers "does this page FIT and do its controls WORK at 390px",
 * which is the half that can be answered honestly for all 376 pages at once.
 */
function measure(root: HTMLElement): MobileFindings {
  const vw = 390;
  let widest = 0;
  let bleed = 0;
  let bleedWorst: string | undefined;
  let worstRight = 0;

  const rootLeft = root.getBoundingClientRect().left;

  for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    /*
     * FIXED ELEMENTS ARE SKIPPED, and the measurements are why.
     *
     * A fixed element is positioned against the VIEWPORT, not against this
     * page's container. Headless Edge refuses to give us a 390px viewport —
     * `--window-size=390,844` clamps to 472 — so every fixed element lands at
     * viewport-relative coordinates that have nothing to do with a phone:
     *
     *   div.fixed.top-4.right-4        reported 456 = 472 - 16  (right-4)
     *   button.fixed.bottom-6.right-6  reported 448 = 472 - 24  (right-6)
     *   div.fixed.inset-0              reported 472 = the viewport itself
     *
     * All three are arithmetic on a viewport we did not ask for, not defects.
     * On top of that, a batch stacks fifteen pages into one document, so every
     * page's fixed widgets coexist in the same corner and could not be judged
     * here even with the right viewport.
     *
     * So fixed positioning is out of scope for this sweep, and deliberately:
     * it needs one page per document at a real phone viewport, which is a
     * browser session, not this harness. What remains measured is flow
     * content against its own 390px container, which is the question this
     * harness CAN answer honestly for all 376 pages.
     *
     * AND THAT APPLIES TO THEIR DESCENDANTS TOO. Skipping only the fixed
     * element itself left the artifact one level down: the Sign In button
     * INSIDE `div.fixed.top-4.right-4` reported 456, and modal panels inside
     * `fixed inset-0` reported exactly 472 — the viewport, again. A child
     * measures against whatever its fixed ancestor was given, so the whole
     * subtree is out of scope, not just its root.
     */
    let fixedAncestor: HTMLElement | null = el;
    let viewportAnchored = false;
    while (fixedAncestor) {
      if (getComputedStyle(fixedAncestor).position === 'fixed') { viewportAnchored = true; break; }
      fixedAncestor = fixedAncestor.parentElement;
    }
    if (viewportAnchored) continue;

    /*
     * A TRANSFORMED ELEMENT IS MEASURED BY ITS LAYOUT BOX, NOT ITS RECT.
     *
     * `getBoundingClientRect` includes transforms, and this runs two frames
     * after mount — nowhere near the end of a 0.6s entry animation. Six
     * landing pages reported a button at exactly 420px, which is 390 + 30,
     * and the button is a `motion.button` with `initial={{ x: 30 }}` sliding
     * to `x: 0`. Caught in flight. It settles at 390 and was never a defect.
     *
     * `offsetWidth` ignores transforms, so for anything mid-animation the
     * question becomes "is this box wider than the screen" rather than "where
     * is it right now". That still catches an element genuinely too wide, and
     * stops reporting one that is merely in motion.
     */
    const transformed = getComputedStyle(el).transform !== 'none';
    if (transformed) {
      if (el.offsetWidth > vw + 1) {
        bleed++;
        if (el.offsetWidth > worstRight) {
          worstRight = el.offsetWidth;
          bleedWorst = `${el.tagName.toLowerCase()} is ${el.offsetWidth}px wide (transformed)`;
        }
      }
      continue;
    }

    const right = r.right - rootLeft;
    if (right > widest) widest = right;
    if (right <= vw + 1) continue;

    /*
     * CONTAINED, AND THAT MEANS CLIPPED AS WELL AS SCROLLED.
     *
     * The first version checked only `auto` and `scroll`, and stopped walking
     * at the page root. It reported 348 of 350 pages as bleeding, every one
     * led by the same `div.flex.items-center.gap-4` at 5814px — which is the
     * advertising marquee: a list duplicated so it can scroll forever, held
     * inside an ancestor with `overflow: hidden`. Working exactly as designed.
     *
     * `hidden` and `clip` contain just as firmly as `auto` and `scroll`. An
     * element cannot drag the page sideways if ANY ancestor refuses to show
     * what spills out of it, so all four count — and the walk goes past the
     * page root, because the clipping ancestor is often the shell the page is
     * mounted into.
     *
     * BUT IT STOPS BELOW `body`, and that is the whole difference between a
     * useful report and a blank one. `globals.css` sets
     * `html, body { overflow-x: clip }` under 640px as a safety net, so if the
     * walk reaches that far EVERY element on EVERY page looks contained — a
     * second version of this reported "nothing bleeds" across all 350 pages,
     * which was as wrong as the 348 before it.
     *
     * That net is not containment, it is damage control: it stops the page
     * scrolling sideways by HIDING what spills, so the content is cut off
     * instead of reachable. Something only `body` contains is still a defect,
     * and this is the check that has to find it.
     */
    let p: HTMLElement | null = el.parentElement;
    let contained = false;
    while (p && p !== document.body && p !== document.documentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { contained = true; break; }
      p = p.parentElement;
    }
    if (contained) continue;

    bleed++;
    if (right > worstRight) {
      worstRight = right;
      bleedWorst = `${el.tagName.toLowerCase()}${
        el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
          : ''
      } reaches ${Math.round(right)}px`;
    }
  }

  let tinyFields = 0;
  let tinyFieldWorst: string | undefined;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('input,select,textarea'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (!(size < 16)) continue;
    tinyFields++;
    if (!tinyFieldWorst) {
      const ph = (el as HTMLInputElement).placeholder || el.getAttribute('name') || '';
      tinyFieldWorst = `${el.tagName.toLowerCase()}${ph ? ` "${ph.slice(0, 30)}"` : ''} at ${size}px`;
    }
  }

  let smallTargets = 0;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('button,a,[role="button"]'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 40 || r.width < 40) smallTargets++;
  }

  return { widest: Math.round(widest), bleed, bleedWorst, tinyFields, tinyFieldWorst, smallTargets };
}

const params = new URLSearchParams(location.search);
const from = Number(params.get('from') || 0);
const to = Number(params.get('to') || 20);

// Sorted so a batch means the same thing between runs. An unstable order makes
// "batch 7 failed" impossible to reproduce.
/**
 * Pages and modals together.
 *
 * A modal is not a page — it renders only when somebody presses a button, so
 * nothing here ever rendered one. That gap let a crash reach production on
 * 2026-09-27: a discount panel in the invoice modal read a function above the
 * line declaring it and threw on every render. Typecheck allowed it (temporal
 * dead zone is a runtime rule) and this harness never opened the modal, so
 * both checks passed and a person found it.
 *
 * They are one list rather than two runs because everything downstream —
 * batching, the error boundary, the verdict — already works per name and does
 * not care what kind of thing it mounted.
 */
const targets: Record<string, any> = { ...pageMap, ...modalMap };
const names = Object.keys(targets).sort();

/**
 * Either an explicit list of pages, or a slice of all of them.
 *
 * The list is how a pre-commit run stays fast: the runner works out which pages
 * could reach the files that changed and names only those, so a typical change
 * mounts two or three rather than three hundred and thirty.
 */
const only = (params.get('only') || '').split(',').map(s => s.trim()).filter(Boolean);
const slice = only.length
  ? only.filter(nm => nm in targets)
  : names.slice(from, to);

const verdicts = new Map<string, Result>();

/**
 * Rewrite the report.
 *
 * Anything in this batch without a verdict yet is reported as `hung` rather
 * than omitted. A page still loading when the browser gave up is a real
 * finding — it is the one that stopped the others finishing — and leaving it
 * out would hide exactly the page worth looking at.
 */
const REPORT_TO = params.get('report') || '';
/** Set by `npm run smoke -- --mobile`; turns on the phone-width measurements. */
const MOBILE = params.get('mobile') === '1';

function publish() {
  const results: Result[] = slice.map(
    (name) => verdicts.get(name) || { name, status: 'hung' },
  );
  const payload = JSON.stringify({ total: names.length, from, to, results });

  // Into the page as well, so the harness can be opened by hand and read.
  let out = document.getElementById('smoke-results');
  if (!out) {
    out = document.createElement('pre');
    out.id = 'smoke-results';
    document.body.appendChild(out);
  }
  out.textContent = payload;

  // And back to the runner. text/plain keeps this a simple request, so no
  // preflight is needed and the runner can stay a plain HTTP listener.
  if (REPORT_TO) {
    fetch(REPORT_TO, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    }).catch(() => { /* the next verdict will carry the same picture */ });
  }
}

class Catcher extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    verdicts.set(this.props.name, {
      name: this.props.name,
      status: 'threw',
      // The message alone. A stack from a dev-server bundle is mostly noise,
      // and the errors worth acting on name their own file and line.
      error: String(error?.message || error).slice(0, 300),
    });
    publish();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Records that this page got as far as committing without throwing. */
function Landed({ name }: { name: string }) {
  useEffect(() => {
    if (!verdicts.has(name)) verdicts.set(name, { name, status: 'ok' });

    /*
     * Measured one frame late, and on purpose.
     *
     * This effect runs on commit, before the browser has laid anything out, so
     * every rect would read 0 and every page would look perfect. One rAF puts
     * the measurement after layout. A second one is cheap insurance against a
     * page that sizes itself in its own effect — several here do, the canvas
     * and map pages especially.
     */
    if (MOBILE) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const root = document.querySelector<HTMLElement>(`[data-page="${CSS.escape(name)}"]`);
        if (!root) return;
        const v = verdicts.get(name);
        if (v) verdicts.set(name, { ...v, mobile: measure(root) });
        publish();
      }));
    }

    publish();
  });
  return null;
}

/**
 * One page, mounted in isolation.
 *
 * `Suspense` is required rather than optional: every entry in the route map is
 * a `lazy()` import, so mounting one starts a dynamic import. A module that
 * throws while loading surfaces as a rejected promise, which the boundary
 * catches — exactly the failure this is hunting.
 */
function Slot({ name, Cmp }: { name: string; Cmp: any }) {
  return (
    /*
     * On a --mobile run the container is pinned to exactly 390px.
     *
     * A batch stacks fifteen pages into ONE document, so without this the body
     * is as wide as the widest page in the batch and every `w-full` element in
     * every OTHER page inherits that width. A run without the pin reported the
     * same ~460px "bleed" on dozens of unrelated pages, with a different
     * selector each time — the signature of contamination rather than a defect,
     * because a real layout bug does not land on the same number everywhere.
     *
     * Pinned, `w-full` resolves to 390 the way it would on a phone, and only
     * content that genuinely cannot fit sticks out. overflow stays visible on
     * purpose: this container must not become the clipping ancestor that hides
     * the very thing being measured.
     */
    <div
      data-page={name}
      style={MOBILE ? { width: 390, overflow: 'visible' } : undefined}
    >
      <Catcher name={name}>
        <Suspense fallback={null}>
          <Cmp />
          <Landed name={name} />
        </Suspense>
      </Catcher>
    </div>
  );
}

function Harness() {
  useEffect(() => { publish(); }, []);
  return (
    <>
      {slice.map((name) => (
        <Slot key={name} name={name} Cmp={targets[name]} />
      ))}
    </>
  );
}

/**
 * The same providers App wraps everything in.
 *
 * Without them seventy-six pages "failed" on a first run with "useAuth must be
 * used within an AuthProvider" — a fault in the harness, not the app. A test
 * that reports its own missing scaffolding as broken code is worse than no
 * test, because somebody spends a morning chasing it.
 */
createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AuthProvider>
      <UserProvider>
        <CompanyContextProvider>
          <ActiveCompanyProvider>
            <Harness />
          </ActiveCompanyProvider>
        </CompanyContextProvider>
      </UserProvider>
    </AuthProvider>
  </ThemeProvider>,
);
