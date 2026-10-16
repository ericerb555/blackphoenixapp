/**
 * Copy the repository's hooks into .git/hooks.
 *
 *   npm run hooks:install
 *
 * WHY A SCRIPT AND NOT JUST A FILE IN .git/hooks
 *
 * `.git/hooks` is not version controlled, so a hook written there protects one
 * clone on one machine and silently protects nothing after the next `git
 * clone`. The hook lives in `scripts/hooks/` where it is reviewed and shared,
 * and this copies it into place.
 *
 * WHY NOT husky
 *
 * It would be a dependency, a `prepare` script and a directory convention for
 * one hook. This is nine lines.
 *
 * IT IS NOT AUTOMATIC, DELIBERATELY
 *
 * A `postinstall` that writes into `.git` surprises people and runs in CI where
 * there is nothing to protect. Run it once per clone; `npm run precommit` runs
 * the same check anyway, so a clone without the hook is not unguarded.
 */
import { copyFileSync, chmodSync, existsSync, mkdirSync, readdirSync } from 'node:fs';

const from = new URL('hooks/', import.meta.url);
const to = '.git/hooks';

if (!existsSync('.git')) {
  console.error('No .git here — nothing to install into.');
  process.exit(1);
}
if (!existsSync(to)) mkdirSync(to, { recursive: true });

for (const name of readdirSync(from)) {
  const target = `${to}/${name}`;
  copyFileSync(new URL(name, from), target);
  try { chmodSync(target, 0o755); } catch { /* Windows does not need it */ }
  console.log(`installed ${name} -> ${target}`);
}
