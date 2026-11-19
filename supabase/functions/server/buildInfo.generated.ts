/**
 * Which commit this server was built from. GENERATED — do not edit.
 *
 * Rewritten by `scripts/build-server.mjs` on every build. Exposed on
 * `/health` so that "what is production actually running" is a question
 * with an answer, rather than one inferred from whether a route replies.
 */
export const BUILD_INFO = {
  "commit": "e86f5f7b2",
  "branch": "session/fnf",
  "committedAt": "2026-11-19T17:12:31-05:00",
  "dirty": false,
  "builtAt": "2026-11-19T22:12:39.154Z"
} as const;
