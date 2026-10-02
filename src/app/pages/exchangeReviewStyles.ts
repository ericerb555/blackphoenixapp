/**
 * Phoenix Exchange — the claim review queue, as real CSS.
 *
 * Only what `EXCHANGE_CSS` does not already carry. The shell, masthead, cards,
 * chips, pills, buttons and inputs all come from there, so this file is the
 * handful of things a review screen needs and a directory does not: the
 * evidence rows, the dispute clock, and the decision bar.
 *
 * Named classes rather than utilities for the same reason as every other
 * Exchange screen — `globals.css` keeps an unlayered `* { margin:0; padding:0 }`
 * reset, which beats every layered Tailwind utility outright, so `p-*` and
 * `m-*` compute to 0px application-wide.
 */
export const REVIEW_CSS = `
.bpxr-queue { display:flex; flex-direction:column; gap:14px; }

/* ── one claim ────────────────────────────────────────────────────────────── */
.bpxr-case { display:flex; flex-direction:column; gap:14px; }
.bpxr-case[data-dispute="true"] { border-color:rgba(234,88,12,.45); }

.bpxr-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.bpxr-name { font-size:16px; font-weight:750; letter-spacing:-.01em; line-height:1.3; }
.bpxr-sub { font-size:12.5px; color:var(--bpx-dim); margin-top:3px; }
.bpxr-flags { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }

.bpxr-pill-review { background:rgba(234,88,12,.16); color:#fdba74; }
.bpxr-pill-dispute { background:rgba(239,68,68,.16); color:#fca5a5; }
.bpxr-pill-ready { background:rgba(34,197,94,.14); color:#86efac; }
.bpxr-pill-waiting { background:rgba(255,255,255,.06); color:var(--bpx-dim); }

/* ── the facts a decision needs ───────────────────────────────────────────── */
.bpxr-facts { display:grid; grid-template-columns:1fr; gap:1px; background:var(--bpx-line);
  border:1px solid var(--bpx-line); border-radius:14px; overflow:hidden; }
@media (min-width:720px){ .bpxr-facts { grid-template-columns:repeat(2,1fr); } }
.bpxr-fact { background:var(--bpx-surface); padding:11px 13px; display:flex; flex-direction:column; gap:3px; min-width:0; }
.bpxr-fact-label { font-size:10px; letter-spacing:.09em; text-transform:uppercase; color:var(--bpx-faint); font-weight:700; }
.bpxr-fact-value { font-size:13px; font-weight:600; word-break:break-word; }
.bpxr-fact-value[data-empty="true"] { color:var(--bpx-faint); font-weight:500; font-style:italic; }

/* ── what was attempted ───────────────────────────────────────────────────── */
.bpxr-evidence { display:flex; flex-direction:column; gap:7px; }
.bpxr-attempt { display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  border:1px solid var(--bpx-line); border-radius:12px; padding:9px 12px; background:rgba(255,255,255,.02); }
.bpxr-attempt[data-ok="true"] { border-color:rgba(34,197,94,.35); }
.bpxr-attempt[data-burned="true"] { border-color:rgba(239,68,68,.35); }
.bpxr-attempt-factor { font-size:13px; font-weight:700; }
.bpxr-attempt-meta { font-size:12px; color:var(--bpx-dim); }
.bpxr-attempt-verdict { margin-left:auto; font-size:11px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
.bpxr-attempt-verdict[data-ok="true"] { color:#86efac; }
.bpxr-attempt-verdict[data-burned="true"] { color:#fca5a5; }
.bpxr-attempt-verdict[data-open="true"] { color:var(--bpx-faint); }

/* ── the decision ─────────────────────────────────────────────────────────── */
.bpxr-why { border:1px solid rgba(234,88,12,.3); background:rgba(234,88,12,.07);
  border-radius:12px; padding:11px 13px; font-size:13px; line-height:1.5; color:#fdba74; }

.bpxr-decide { display:flex; flex-direction:column; gap:10px; border-top:1px solid var(--bpx-line); padding-top:14px; }
.bpxr-note { width:100%; min-height:72px; resize:vertical; padding:11px 13px; border-radius:12px;
  border:1px solid var(--bpx-line); background:var(--bpx-surface); color:var(--bpx-text);
  font-size:13px; font-family:inherit; line-height:1.5; }
.bpxr-note:focus { outline:none; border-color:rgba(234,88,12,.55); }
.bpxr-actions { display:flex; gap:9px; flex-wrap:wrap; align-items:center; }
.bpxr-btn-refuse { border-color:rgba(239,68,68,.45); color:#fca5a5; }
.bpxr-btn-refuse:hover { border-color:rgba(239,68,68,.75); }
.bpxr-blocked { font-size:12.5px; color:var(--bpx-faint); line-height:1.5; }
.bpxr-said { font-size:12.5px; color:#86efac; font-weight:600; }
.bpxr-failed { font-size:12.5px; color:#fca5a5; font-weight:600; }
`;
