/**
 * C1 is empty, and these are the last nine.
 *
 * The audit's C1 bucket — "the whole handler is a message, nothing happens" —
 * held 35 handlers. Nine closed on 2026-11-19, eleven on 2026-11-21, four
 * more, five more, and these nine finish it.
 *
 *   AIDiagnosticsCenter (6)   'AI systems refreshed'            refreshed nothing
 *                             'Opening system settings...'      no settings screen
 *                             'Checking for updates...'         nothing to check
 *                             'Downloading component registry'  no registry
 *                             'Viewing details for <system>'    no details shown
 *                             'Opening changelog...'            no changelog
 *   AssetLibrary (2)          'Upload asset to <category>'      no picker
 *                             'Preview <asset>'                 no preview
 *   BrandIdentity (1)         'Upload <logo>'                   no picker
 *   CalendarScheduleView (2)  'Create event on <day> at <time>' no modal
 *                             'Edit event'                      no editor
 *   MobileHubControlPanel (2) 'Preview opened in new window'    nothing opened
 *                             "You'll be notified when..."      no waitlist
 *   ProductAdCreatorClient    printed directions                did not navigate
 *   EnterpriseContentCenter   'Distribution coming soon'        a TODO
 *
 * The split is the same one as every earlier pass: wire it where something
 * real exists, switch it off with the reason where nothing does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');
const diagnostics = read('src/app/components/AIDiagnosticsCenter.tsx');
const assets = read('src/app/components/branding/AssetLibrary.tsx');
const brand = read('src/app/components/branding/BrandIdentity.tsx');
const calendar = read('src/app/components/CalendarScheduleView.tsx');
const scheduling = read('src/app/pages/MasterScheduling.tsx');
const mobileHub = read('src/app/components/MobileHubControlPanel.tsx');
const adCreator = read('src/app/components/ProductAdCreatorClient.tsx');
const contentCenter = read('src/app/pages/EnterpriseContentCenter.tsx');

/** Lines of code (not comments) containing a phrase. */
function liveLines(src: string, phrase: string): string[] {
  return src.split('\n').filter((line) =>
    line.includes(phrase) && !/^\s*(\*|\/\/|\/\*)/.test(line));
}

/* ── the diagnostics centre ─────────────────────────────────────────────── */

test('REFRESH ON A MONITORING SCREEN ACTUALLY RE-READS', () => {
  // The one kind of screen whose entire job is to be current.
  assert.match(diagnostics, /const refreshSystems = async/);
  assert.match(diagnostics, /await loadLedger\(\)/, 'it must call the same loader the mount uses');
  assert.match(diagnostics, /onClick=\{refreshSystems\}/);
  assert.deepEqual(liveLines(diagnostics, "toast.success('AI systems refreshed')"), []);
});

test('and the mount and the button share one loader, so they cannot drift', () => {
  assert.equal((diagnostics.match(/const loadLedger = async/g) || []).length, 1);
  assert.match(diagnostics, /void loadLedger\(\(\) => cancelled\)/,
    'the effect must pass its own cancellation');
});

test('a failed refresh is reported as a failure', () => {
  assert.match(diagnostics, /toast\.error\(error\?\.message \|\| 'Could not refresh AI activity\.'\)/);
  assert.match(diagnostics, /throw err;/, 'the loader must rethrow so the button can tell');
});

test('Details goes to the details, which already existed', () => {
  assert.match(diagnostics, /onClick=\{\(\) => \{ setSelectedSystem\(system\.id\); setActiveTab\('systems'\); \}\}/);
  // The phrase stays in the comment that explains what it used to do.
  assert.deepEqual(liveLines(diagnostics, 'toast.info(`Viewing details for'), []);
});

test('THE FOUR ABOUT VERSIONS ARE OFF, because agents have no versions', () => {
  // `updateAvailable`, `version` and `latestVersion` have no source — see the
  // comment on MappedSystem in lib/aiActivity.ts. An agent is a function in
  // this codebase, and the mock that invented "2.1.0 → 2.3.0" was removed.
  for (const gone of [
    "toast.info('Checking for updates...')",
    "toast.info('Downloading component registry...')",
    "toast.info('Opening changelog...')",
    "toast.info('Opening system settings...')",
  ]) {
    assert.deepEqual(liveLines(diagnostics, gone), [], gone);
  }
  assert.match(diagnostics, /they do not carry versions, so there is nothing to check against/);
});

/* ── the branding uploads ───────────────────────────────────────────────── */

test('BOTH UPLOAD BUTTONS OPEN A FILE PICKER AND UPLOAD', () => {
  for (const [name, src] of [['assets', assets], ['logos', brand]] as const) {
    assert.match(src, /uploadImageFile\(/, `${name}: must use the shared uploader`);
    assert.match(src, /type="file"/, `${name}: must have a picker`);
    assert.match(src, /accept="image\/\*"/, `${name}: and it must accept the phone camera roll`);
    assert.match(src, /fileInput\.current\?\.click\(\)/, `${name}: the button must open it`);
    assert.match(src, /toast\.error/, `${name}: a failed upload must say so`);
  }
});

test('the uploaded URL is stored where the model already had room for it', () => {
  assert.match(assets, /categories: settings\.categories\.map\(/, 'the asset joins its category');
  assert.match(assets, /uploadedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(brand, /logos: settings\.logos\.map\(\(l\) => \(l\.id === slotId \? \{ \.\.\.l, url \} : l\)\)/);
});

test('the input is cleared after each attempt', () => {
  // Otherwise picking the same file twice in a row fires no change event, and
  // a retry after a failed upload does nothing at all.
  for (const [name, src] of [['assets', assets], ['logos', brand]] as const) {
    assert.match(src, /if \(fileInput\.current\) fileInput\.current\.value = ''/, name);
  }
});

test('Preview opens the asset, and says so when there is no file', () => {
  assert.match(assets, /window\.open\(asset\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(assets, /That asset has no file behind it yet/);
  assert.deepEqual(liveLines(assets, 'toast.info(`Preview'), []);
});

/* ── the calendar ───────────────────────────────────────────────────────── */

test('THE CALENDAR NO LONGER INVENTS A WEEK', () => {
  // Five hardcoded events — "Team Stand-up", 456 Elm Drive — rendered inside
  // the real scheduling page, ten months stale, with an Edit button on them.
  // The header comment names them, so what is asserted is that no code
  // declares or reads them any more.
  assert.deepEqual(liveLines(calendar, 'DEFAULT_EVENTS'), [], 'the sample events must be gone');
  assert.deepEqual(liveLines(calendar, 'Team Stand-up'), [], 'including by name');
  assert.deepEqual(liveLines(calendar, '456 Elm Drive'), []);
  assert.match(calendar, /const events = providedEvents \?\? loadedEvents \?\? \[\]/,
    'no fallback to samples');
});

test('Master Scheduling hands it the real diary', () => {
  assert.match(scheduling, /<CalendarScheduleView embedded=\{true\} events=\{calendarEvents\} \/>/);
  assert.match(scheduling, /const calendarEvents: CalendarEvent\[\] = useMemo/);
  // An appointment-backed job is marked as one, so the two tabs agree.
  assert.match(scheduling, /category: job\.appointmentId \? 'appointments' : 'work'/);
});

test('a job with no readable time still appears, rather than being dropped', () => {
  // A booking missing from the calendar is worse than one at the wrong hour.
  assert.match(scheduling, /let hour = stamp \? Number\(stamp\[1\]\) : 8/);
  assert.match(scheduling, /if \(!Number\.isFinite\(hour\) \|\| hour < 0 \|\| hour > 23\) hour = 8/);
});

test('the standalone route reads the shared ledger and shows a failure', () => {
  assert.match(calendar, /schedule\/appointments/, 'the same ledger the booking flow writes');
  assert.match(calendar, /if \(providedEvents\) return;/, 'and only when nobody passed events');
  assert.match(calendar, /setLoadError/);
  assert.match(calendar, /\{loadError && \(/, 'a failed load must be rendered, not swallowed');
});

test('the three write controls say where appointments are changed', () => {
  assert.deepEqual(liveLines(calendar, "toast.success('Event deleted')"), []);
  assert.deepEqual(liveLines(calendar, 'Event creation modal would open'), []);
  assert.deepEqual(liveLines(calendar, "toast.info('Edit event')"), []);
  assert.match(calendar, /manageHint/);
  assert.match(calendar, /is not done on this screen/);
});

/* ── the rest ───────────────────────────────────────────────────────────── */

test('THE PORTAL BUILDER STOPS CLAIMING IT SAVED', () => {
  // `portals` is a hardcoded array down to "1,245 users", and nothing on the
  // screen reads or writes the server.
  assert.deepEqual(liveLines(mobileHub, "toast.success('Portal configuration saved successfully!')"), []);
  assert.match(mobileHub, /Not saved — the portal builder has no store behind it yet/);
  assert.match(mobileHub, /Example data — the portal builder has no store behind it yet/,
    'and the screen must say the portals are examples');
  assert.deepEqual(liveLines(mobileHub, "toast.info('Preview opened in new window')"), []);
  assert.deepEqual(liveLines(mobileHub, "You\\'ll be notified when AI Studio launches!"), []);
});

test('the video-editor pointer navigates instead of reciting directions', () => {
  assert.match(adCreator, /__navigateApp\('enterprise-content-center'\)/);
  // And the route it names has to exist, or this is bucket B instead.
  assert.match(read('src/app/routes.tsx'), /"enterprise-content-center":/);
});

test('Distribute is off until distribution exists', () => {
  assert.deepEqual(liveLines(contentCenter, "toast.info('Distribution functionality coming soon')"), []);
  assert.match(contentCenter, /Distributing to channels has not been built yet/);
  assert.ok(!/TODO: Implement share\/distribute/.test(contentCenter), 'the TODO went with it');
});
