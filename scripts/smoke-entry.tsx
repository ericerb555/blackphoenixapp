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
import { AuthProvider } from '../src/app/contexts/AuthContext';
import { CompanyContextProvider } from '../src/app/contexts/CompanyContext';
import { ActiveCompanyProvider } from '../src/app/contexts/ActiveCompanyContext';
import { UserProvider } from '../src/app/lib/user-context';
import { ThemeProvider } from '../src/app/components/ThemeManager';

interface Result {
  name: string;
  status: 'ok' | 'threw' | 'hung';
  error?: string;
}

const params = new URLSearchParams(location.search);
const from = Number(params.get('from') || 0);
const to = Number(params.get('to') || 20);

// Sorted so a batch means the same thing between runs. An unstable order makes
// "batch 7 failed" impossible to reproduce.
const names = Object.keys(pageMap).sort();
const slice = names.slice(from, to);

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
    <div data-page={name}>
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
        <Slot key={name} name={name} Cmp={(pageMap as any)[name]} />
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
