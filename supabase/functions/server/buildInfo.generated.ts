/**
 * Which commit this server was built from. GENERATED — do not edit.
 *
 * Rewritten by `scripts/build-server.mjs` on every build. Exposed on
 * `/health` so that "what is production actually running" is a question
 * with an answer, rather than one inferred from whether a route replies.
 */
export const BUILD_INFO = {
  "commit": "0764554d0",
  "branch": "session/quotes-social",
  "committedAt": "2026-11-17T11:39:47-05:00",
  "dirty": true,
  "builtAt": "2026-11-17T16:54:45.258Z"
} as const;
