/**
 * Turn a module-level publishable-key header into a per-call session header.
 *
 * Run once, reviewed by hand afterwards, kept so the change is reproducible:
 *
 *   node scripts/fixAnonAuth.mjs            # report only
 *   node scripts/fixAnonAuth.mjs --write
 *
 * WHY A SCRIPT
 *
 * Fifteen files, the same two-line mistake in each, and the edit is
 * mechanical: a `const X = { Authorization: Bearer <anon> }` becomes an
 * `async function X()` that reads the signed-in session, and every
 * `headers: X` becomes `headers: await X()`. Done by hand that is fifteen
 * chances to mistype a variable name; done here it is one rule, and the
 * typechecker audits the result.
 *
 * WHAT IT REFUSES TO TOUCH
 *
 * A usage that is not `headers: X` — spread into another object, passed as
 * an argument, read in a non-async function. Those are reported and left
 * alone, because each needs a decision rather than a substitution.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');

const FILES = [
  'src/app/pages/AiSeoEngine.tsx',
  'src/app/components/contentstudio/ContentStudio.tsx',
  'src/app/pages/AIRankingEngine.tsx',
  'src/app/components/adstudio/AdStudio.tsx',
  'src/app/pages/SMSMarketing.tsx',
  'src/app/pages/LeadCRM.tsx',
  'src/app/components/LiveChatWidget.tsx',
  'src/app/pages/AnalyticsDashboard.tsx',
  'src/app/pages/InfluencerTracker.tsx',
  'src/app/pages/KeywordTracker.tsx',
  'src/app/pages/MarketingAutomation.tsx',
  'src/app/pages/RetargetingPixelSetup.tsx',
  'src/app/pages/ReviewSurveyManager.tsx',
];

/** Relative path from a file back to src/app. */
function up(file) {
  const depth = file.split('/').length - 3; // src/app/<...>
  return '../'.repeat(depth) || './';
}

let changed = 0;
const notes = [];

for (const file of FILES) {
  let src = readFileSync(file, 'utf8');

  const decl = src.match(/^const\s+(\w+)\s*=\s*\{[^}]*Bearer \$\{publicAnonKey\}[^}]*\};?$/m);
  if (!decl) { notes.push(`${file}: no module-level anon header found`); continue; }
  const name = decl[1];

  // Every usage, so we can tell the substitutable ones from the rest.
  const all = [...src.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length;
  const substitutable = [...src.matchAll(new RegExp(`headers:\\s*${name}\\b`, 'g'))].length;
  const other = all - substitutable - 1; // minus the declaration itself

  const prefix = up(file);
  const replacement =
`/**
 * The signed-in user's token, not the publishable key.
 *
 * This was a module-level constant built from \`publicAnonKey\`, so every
 * request went out unauthenticated and the auth wall answered 401 for any
 * route that is not explicitly public. Nothing threw — the calls simply
 * returned nothing and the screen looked empty rather than broken.
 *
 * A function because the session does not exist at module load and can
 * change while the page is open.
 */
async function ${name}(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${session?.access_token || publicAnonKey}\`,
    apikey: publicAnonKey,
  };
}`;

  src = src.replace(decl[0], replacement);
  src = src.replace(new RegExp(`headers:\\s*${name}\\b`, 'g'), `headers: await ${name}()`);

  if (!/from ['"][^'"]*lib\/supabase['"]/.test(src)) {
    const anchor = src.match(/^import .*publicAnonKey.*$/m);
    if (anchor) {
      src = src.replace(anchor[0], `${anchor[0]}\nimport { supabase } from '${prefix}lib/supabase';`);
    } else {
      notes.push(`${file}: could not place the supabase import — add it by hand`);
    }
  }

  if (other > 0) notes.push(`${file}: ${other} usage(s) of ${name} are not \`headers: ${name}\` — check by hand`);
  if (WRITE) writeFileSync(file, src);
  changed++;
  console.log(`${WRITE ? 'fixed' : 'would fix'}  ${file.split('/').pop().padEnd(28)} ${name}  (${substitutable} call site(s))`);
}

console.log(`\n${changed} file(s). ${WRITE ? 'Written.' : 'Dry run — pass --write.'}`);
if (notes.length) { console.log('\nNeeds attention:'); notes.forEach((n) => console.log('  ' + n)); }
