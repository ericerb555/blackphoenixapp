/**
 * Which commit this server was built from. GENERATED — do not edit.
 *
 * Rewritten by `scripts/build-server.mjs` on every build. Exposed on
 * `/health` so that "what is production actually running" is a question
 * with an answer, rather than one inferred from whether a route replies.
 */
export const BUILD_INFO = {
  "commit": "2be5d5425",
  "branch": "session/pdftotal",
  "committedAt": "2026-11-21T15:49:30-05:00",
  "dirty": false,
  "builtAt": "2026-11-21T21:04:18.953Z"
} as const;
