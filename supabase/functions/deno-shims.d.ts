/**
 * Enough of Deno for TypeScript to read the server.
 *
 * WHY THIS EXISTS
 *
 * The edge functions were outside every check. `vite build` and `tsc` both
 * cover `src/` and neither goes near `supabase/functions/`, so the file holding
 * every authorisation gate and every price lookup was the one nothing was
 * reading. A script writing a route left a literal newline inside a `join()`
 * and both checks passed; Supabase refused to bundle it on deploy, which is
 * luck rather than a safety net.
 *
 * Deno resolves `npm:hono@4` and `https://…` specifiers natively and TypeScript
 * does not, so those are declared as wildcard modules. That makes the libraries
 * `any`, which is the right trade: the point is to check our own code — that
 * every name exists, every file parses, every call has its arguments — not to
 * type-check Hono.
 */

declare module 'npm:*';
declare module 'jsr:*';
declare module 'https://*';
declare module 'node:*';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): unknown;
  serve(options: unknown, handler: (req: Request) => Response | Promise<Response>): unknown;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, data: string): Promise<void>;
  exit(code?: number): never;
  cwd(): string;
};
