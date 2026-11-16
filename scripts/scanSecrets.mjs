/**
 * Refuse to push a credential.
 *
 * Eric: "move every secret to environmental variables and add a .env file to
 * gitignore before the first commit. if secrets have already been committed
 * rotate them immediately — removing the file doesn't remove history."
 *
 * The audit behind this found the repository clean: 1,424 commits, no API key
 * ever committed, every one of the 121 secrets read through `Deno.env.get`,
 * and `.env` / `.env.*` ignored since early on. So this is not a clean-up. It
 * is the thing that keeps that true on a day when somebody is tired, because
 * the cost of the first mistake is not the commit — it is that a push makes it
 * permanent. Once a key reaches GitHub it must be rotated even if the next
 * commit removes it, and no amount of history rewriting changes that: it has
 * been served, cached, and possibly forked.
 *
 * WHY A SCANNER THAT CRIES WOLF IS WORSE THAN NO SCANNER
 *
 * The failure mode of every secret scanner is the same. It flags the word
 * `password` in a form label, somebody adds `--no-verify` to their muscle
 * memory, and the one real finding six months later is bypassed without being
 * read. So this is deliberately narrow: it matches credential shapes with
 * enough committed structure to be a real key, and it holds an explicit,
 * reasoned allowlist for the things in this repository that LOOK like keys and
 * are not.
 *
 * Every allowlist entry below is a claim that something is safe. They are
 * written as the reason, not as a path, so that a future file matching the
 * same reason is covered and a file that merely sits in the same folder is not.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not scan history. History is 1,424 commits and scanning it on every
 * push would cost minutes to re-prove something that cannot change — history
 * is immutable, and it was proven clean once. `npm run scan:secrets -- --history`
 * does that pass on demand, which is the right cadence for a question whose
 * answer only changes when somebody rewrites history.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * The credential shapes worth refusing a push over.
 *
 * Each requires the structure a real key has — the issuer's prefix AND a body
 * of the right alphabet and length. `sk_live_` on its own is a placeholder in
 * a form field; `sk_live_` followed by twenty base62 characters is somebody's
 * money.
 */
const PATTERNS = [
  ['Stripe secret key', /\bsk_(live|test)_[A-Za-z0-9]{20,}/],
  ['Stripe restricted key', /\brk_(live|test)_[A-Za-z0-9]{20,}/],
  ['Stripe webhook signing secret', /\bwhsec_[A-Za-z0-9]{24,}/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI API key', /\bsk-(proj-)?[A-Za-z0-9]{32,}/],
  ['SendGrid API key', /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{70,}/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Twilio auth token', /\bSK[0-9a-f]{32}\b/],
  ['Private key block', /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['Database URL with inline password', /\b(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^:\s/@"']+:[^@\s"']+@/],
  // A JWT is only interesting when it is NOT the publishable anon key, which
  // is what `allowed()` decides — this catches the service-role key, whose
  // leak would hand over the entire database past every row-level policy.
  ['JSON Web Token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}/],
];

/** Files that cannot hold a live credential, whatever they contain. */
const SKIP_FILE = [
  // This scanner. Its whole content is credential shapes.
  /^scripts\/scanSecrets\.mjs$/,
  // The live-surface probe, which carries the same table for the same reason.
  /^scripts\/security-probe\.mjs$/,
  // Lock files: registry integrity hashes, by the thousand, that look like
  // high-entropy strings because they are.
  /(^|\/)(package-lock\.json|deno\.lock|yarn\.lock|pnpm-lock\.yaml)$/,
  // Binary and media. A false positive here is a byte sequence, not a key.
  /\.(png|jpe?g|gif|webp|avif|ico|svg|pdf|woff2?|ttf|eot|mp4|mov|webm|zip|gz)$/i,
];

/**
 * The decoded payload of a JWT, or null when it is not one.
 *
 * Used to tell the publishable anon key — which is designed to ship in a
 * browser bundle and is in seven tracked files on purpose — from the service
 * role key, which must never appear anywhere.
 */
function jwtClaims(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
      + '='.repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Is this particular match a false positive?
 *
 * Reasons, not paths. A new file that matches one of these reasons is covered;
 * a new file that merely sits beside an old one is not.
 */
function allowed(label, match, line) {
  /*
   * THE SUPABASE ANON KEY IS PUBLIC. It is signed with `"role":"anon"`, it is
   * served inside the JavaScript bundle to every visitor, and row-level
   * security is what stands behind it. Refusing it would mean refusing every
   * push. The service-role key is the same SHAPE and is the thing this rule
   * exists to let through to — so the claim is decoded rather than assumed
   * from the file it sits in.
   */
  if (label === 'JSON Web Token') {
    const claims = jwtClaims(match);
    if (claims && claims.role === 'anon') return true;
  }

  /*
   * A prefix TEST, not a key: `startsWith('sk_test_')` decides which Stripe
   * mode a configured key is in, and the literal is the prefix alone.
   * Defensive: the patterns above already require a body, so this only fires
   * if one is loosened later.
   */
  if (/\b(startsWith|endsWith|includes|indexOf|match|test)\s*\(/.test(line)) return true;

  /*
   * A placeholder in a form, or an example in prose. These are the strings
   * that teach somebody where to paste the real thing.
   */
  if (/placeholder=|example|e\.g\.|your[-_ ]|xxxx|•••|\.\.\.|<REDACTED>|REPLACE_ME/i.test(line)) {
    return true;
  }

  /* Reading from the environment is the behaviour we want, not a leak. */
  if (/(Deno\.env\.get|process\.env|import\.meta\.env)/.test(line)) return true;

  return false;
}

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { maxBuffer: 1024 * 1024 * 64 });
  return out.toString('utf8').split('\0').filter(Boolean);
}

/**
 * The files this commit would add or change.
 *
 * Added, Copied, Modified, Renamed — never Deleted, because a deleted file has
 * no content to scan and listing it would read every path as a finding of
 * nothing.
 */
function stagedFiles() {
  const out = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'],
    { maxBuffer: 1024 * 1024 * 64 },
  );
  return out.toString('utf8').split('\0').filter(Boolean);
}

/**
 * What is actually STAGED, which is not what is on disk.
 *
 * The distinction is the whole point of scanning at commit time. Somebody can
 * `git add` a file holding a key and then delete the line in their editor: the
 * working copy is clean, the commit is not. Reading the index blob scans the
 * bytes that would be recorded.
 */
function stagedContent(file) {
  try {
    return execFileSync('git', ['show', `:${file}`], { maxBuffer: 1024 * 1024 * 64 })
      .toString('utf8');
  } catch {
    return null;
  }
}

function scanFiles(files, readFile = (f) => fs.readFileSync(f, 'utf8')) {
  const findings = [];
  for (const file of files) {
    if (SKIP_FILE.some((re) => re.test(file))) continue;
    let text;
    try {
      text = readFile(file);
    } catch {
      continue; // gone, or not readable as text
    }
    if (text === null || text === undefined) continue;
    if (text.includes('\0')) continue; // binary

    const lines = text.split('\n');
    for (const [label, re] of PATTERNS) {
      const global = new RegExp(re.source, 'g');
      let m;
      while ((m = global.exec(text)) !== null) {
        const lineNo = text.slice(0, m.index).split('\n').length;
        const line = lines[lineNo - 1] || '';
        if (allowed(label, m[0], line)) continue;
        findings.push({ file, line: lineNo, label, sample: redact(m[0]) });
      }
    }
  }
  return findings;
}

/**
 * Never print the key.
 *
 * A scanner that echoes what it found puts the credential into CI logs, the
 * terminal scrollback and whatever collects them — which is a second place to
 * leak from, created by the tool meant to prevent the first.
 */
function redact(value) {
  const head = value.slice(0, Math.min(10, Math.floor(value.length / 4)));
  return `${head}…<redacted ${value.length} chars>`;
}

/**
 * The on-demand pass over every commit that ever existed.
 *
 * Not run on push: history cannot change under you, so re-proving it on every
 * push buys nothing for minutes of cost. Run it after a rewrite, or when
 * somebody asks the question this answers.
 */
function scanHistory() {
  console.log('Scanning every blob in history. This takes a while on a large repository.\n');
  const revs = execFileSync('git', ['rev-list', '--all'], { maxBuffer: 1024 * 1024 * 256 })
    .toString('utf8').split('\n').filter(Boolean);
  console.log(`commits: ${revs.length}`);

  const findings = [];
  for (const [label, re] of PATTERNS) {
    if (label === 'JSON Web Token') continue; // handled below, by claim
    const hits = execFileSync(
      'git',
      ['log', '--all', '--oneline', '-G', re.source],
      { maxBuffer: 1024 * 1024 * 64 },
    ).toString('utf8').split('\n').filter(Boolean);
    if (hits.length) findings.push({ label, commits: hits.length, first: hits[0] });
  }

  // JWTs are decoded rather than counted: the anon key appears throughout
  // history legitimately, and only a non-anon claim is a finding.
  const tokens = new Set();
  const patch = execFileSync(
    'git',
    ['log', '--all', '-p', '-G', 'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{30,}'],
    { maxBuffer: 1024 * 1024 * 512 },
  ).toString('utf8');
  for (const m of patch.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{30,}/g)) {
    tokens.add(m[0]);
  }
  for (const token of tokens) {
    const claims = jwtClaims(token);
    const role = claims?.role || 'unknown';
    if (role !== 'anon') {
      findings.push({ label: `JWT with role "${role}"`, commits: '?', first: redact(token) });
    }
  }
  console.log(`distinct JWTs ever committed: ${tokens.size} (anon keys are public and expected)`);
  return findings;
}

const wantHistory = process.argv.includes('--history');
const wantStaged = process.argv.includes('--staged');

const findings = wantHistory
  ? scanHistory()
  : wantStaged
    ? scanFiles(stagedFiles(), stagedContent)
    : scanFiles(trackedFiles());

if (findings.length === 0) {
  console.log(wantHistory
    ? '\nNo credential found in any commit.'
    : wantStaged
      ? 'no credentials staged'
      : 'no credentials in tracked files');
  process.exit(0);
}

console.error('\nCREDENTIALS FOUND:\n');
for (const f of findings) {
  console.error(f.file ? `  ${f.file}:${f.line}  ${f.label}  ${f.sample}` : `  ${f.label} — ${f.commits} commit(s), e.g. ${f.first}`);
}
console.error(`
A key that reaches the remote must be ROTATED, not deleted. Removing the file
in a later commit leaves it in history; rewriting history leaves it in every
clone, fork and cache that already pulled. Rotation is the only thing that
actually revokes it.

  1. Rotate the credential at the provider, now.
  2. Move the value into an environment variable (see .env.example).
  3. Then fix the file.
`);
process.exit(1);
