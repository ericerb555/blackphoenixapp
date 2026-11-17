/**
 * Build the edge function small enough to deploy.
 *
 * WHY THIS EXISTS
 *
 * `supabase functions deploy` refuses anything over 5 MB of source, and on
 * 2026-10-16 the function crossed it: 223 files, 4.41 MB, with nothing
 * unreferenced to delete — every file is genuinely imported from `index.tsx`.
 * Deploys stopped working for everybody, which is a wall in front of every
 * future server change rather than a tidiness problem.
 *
 * WHAT IS ACTUALLY BIG, AND WHY IT IS NOT A MISTAKE
 *
 * 1.34 MB of those 4.41 are comments — 30.5%. That is not bloat to be ashamed
 * of: the long explanations in this server are the most valuable thing in the
 * repository, and several of them are the only record of why a route is shaped
 * the way it is or why a router stays unmounted. Deleting them to fit a
 * deployment limit would be trading the thing that makes the code
 * maintainable for the thing that makes it shippable.
 *
 * So nothing is deleted. The SOURCE keeps every word, and what gets uploaded
 * is a build of it with the comments and the type annotations removed. The
 * machine does not read the comments.
 *
 * WHY TYPESCRIPT'S OWN COMPILER RATHER THAN A REGEX
 *
 * Because a regex that strips `//` to end-of-line will happily eat the middle
 * of `https://…` inside a string, and the server is full of URLs, SQL and
 * template literals. `ts.transpileModule` is the parser that already
 * understands this code; it cannot make that mistake.
 *
 * FILENAMES AND IMPORT SPECIFIERS ARE PRESERVED EXACTLY
 *
 * Output keeps each file's original name, `.ts`/`.tsx` and all, because the
 * imports inside name each other that way and Deno resolves the literal
 * specifier. A file called `.tsx` containing plain JavaScript is fine; a file
 * renamed to `.js` while its siblings import `./thing.ts` is not.
 *
 * `npm:`, `jsr:`, `node:` and `https:` specifiers pass through untouched, so
 * the function still resolves its dependencies the way Deno Deploy expects.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { execSync } from 'node:child_process';

const SOURCE = 'supabase/functions/server';
const OUT = 'supabase/functions/server-dist';

const transpilable = /\.(ts|tsx)$/;

/**
 * Stamp the build with the commit it was made from.
 *
 * WHY, WITH THE DATE
 *
 * On 2026-11-17 two sessions spent days overwriting each other's function,
 * because a deploy builds from a working tree and nothing anywhere recorded
 * which tree. `/health` answered `version: "2.9.0-command-center-resilient"`
 * throughout — a hand-written string, the same before and after every deploy,
 * so it could not distinguish a server with `/team/members/role` from one
 * without it. The health check said `ok` the whole time, correctly: a server
 * missing a route is a perfectly healthy server.
 *
 * `predeploy-check` now refuses to deploy a tree that is behind main, which
 * stops it happening. This is the other half — being able to ASK production
 * what it is running, rather than inferring it from whether a route answers.
 *
 * Written as a generated file rather than an environment variable because the
 * build is the only moment that knows the answer, and because
 * `taskDigest.generated.ts` already established the pattern next door.
 *
 * `dirty` is recorded rather than refused here: `predeploy-check` owns that
 * decision and can be overridden, so the stamp has to be able to say "this
 * build contained uncommitted changes" rather than assume it never does.
 */
function buildStamp() {
  const git = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  return {
    commit: git('git rev-parse --short HEAD') || 'unknown',
    branch: git('git rev-parse --abbrev-ref HEAD') || 'unknown',
    committedAt: git('git log -1 --format=%cI') || '',
    dirty: git('git status --porcelain -- supabase/functions/').split('\n').filter(Boolean).length > 0,
    builtAt: new Date().toISOString(),
  };
}

function build() {
  // A clean room every time: a file deleted from source must not survive in
  // the build and get deployed for ever.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  /*
   * Written into SOURCE, not just the build, so `index.tsx` can import it the
   * ordinary way and the typecheck sees the same file Deno will. Same shape
   * and the same reason as `taskDigest.generated.ts`, which sits beside it —
   * and like that one it is excluded from the uncommitted-changes check,
   * because the build rewrites it every time and it is never anybody's work
   * in progress.
   */
  const stamp = buildStamp();
  fs.writeFileSync(
    path.join(SOURCE, 'buildInfo.generated.ts'),
    '/**\n'
    + ' * Which commit this server was built from. GENERATED — do not edit.\n'
    + ' *\n'
    + ' * Rewritten by `scripts/build-server.mjs` on every build. Exposed on\n'
    + ' * `/health` so that "what is production actually running" is a question\n'
    + ' * with an answer, rather than one inferred from whether a route replies.\n'
    + ' */\n'
    + `export const BUILD_INFO = ${JSON.stringify(stamp, null, 2)} as const;\n`,
  );

  let sourceBytes = 0;
  let builtBytes = 0;
  let files = 0;

  for (const name of fs.readdirSync(SOURCE)) {
    const from = path.join(SOURCE, name);
    if (!fs.statSync(from).isFile()) continue;

    const to = path.join(OUT, name);
    const raw = fs.readFileSync(from, 'utf8');
    sourceBytes += Buffer.byteLength(raw);

    if (!transpilable.test(name)) {
      // deno.json, deno.lock and anything else go across untouched.
      fs.copyFileSync(from, to);
      builtBytes += Buffer.byteLength(raw);
      files += 1;
      continue;
    }

    const out = ts.transpileModule(raw, {
      fileName: name,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        // ESNext leaves every import and export exactly as written, which is
        // what keeps `npm:hono@4` and `./exchangeLogo.ts` working.
        module: ts.ModuleKind.ESNext,
        removeComments: true,
        // No JSX anywhere in this server — checked — but preserve rather than
        // transform, so that if any ever appears this does not silently
        // rewrite it for the wrong runtime.
        jsx: ts.JsxEmit.Preserve,
        isolatedModules: true,
      },
    });

    /*
     * A transpile that reported anything is not shipped. `isolatedModules`
     * diagnostics are the ones that matter here: they catch the constructs a
     * per-file transpile cannot translate safely, which is exactly the class
     * of silent breakage this script could otherwise introduce.
     */
    if (out.diagnostics?.length) {
      console.error(`
${name}: ${out.diagnostics.length} diagnostic(s)`);
      for (const d of out.diagnostics.slice(0, 5)) {
        console.error("  " + ts.flattenDiagnosticMessageText(d.messageText, " "));
      }
      process.exit(1);
    }
    if (!out.outputText.trim() && raw.trim()) {
      console.error(`
${name}: transpiled to nothing. Refusing to ship an empty module.`);
      process.exit(1);
    }

    fs.writeFileSync(to, out.outputText);
    builtBytes += Buffer.byteLength(out.outputText);
    files += 1;
  }

  const mb = (n) => (n / 1048576).toFixed(2);
  console.log(`source: ${mb(sourceBytes)} MB`);
  console.log(`built:  ${mb(builtBytes)} MB across ${files} files`);
  console.log(`saved:  ${mb(sourceBytes - builtBytes)} MB (${((1 - builtBytes / sourceBytes) * 100).toFixed(0)}%)`);

  const LIMIT = 5 * 1048576;
  if (builtBytes > LIMIT) {
    console.error(`\nSTILL OVER THE 5 MB LIMIT by ${mb(builtBytes - LIMIT)} MB.`);
    console.error('Stripping comments is no longer enough; the function needs splitting.');
    process.exit(1);
  }
  console.log(`headroom: ${mb(LIMIT - builtBytes)} MB under the 5 MB limit`);
}

build();
