/**
 * Which commit this server was built from. GENERATED — do not edit.
 *
 * Rewritten by `scripts/build-server.mjs` on every build. Exposed on
 * `/health` so that "what is production actually running" is a question
 * with an answer, rather than one inferred from whether a route replies.
 */
export const BUILD_INFO = {
  "commit": "6ac82b3fc",
  "branch": "session/quotes-social",
  "committedAt": "2026-11-17T11:24:39-05:00",
  "dirty": true,
  "builtAt": "2026-11-17T16:27:15.600Z"
} as const;
