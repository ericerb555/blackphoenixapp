/**
 * Phoenix Exchange — the browse surface, as real CSS.
 *
 * Only what `EXCHANGE_CSS` does not already carry. The shell, masthead, cards,
 * chips, pills, buttons and empty states all come from there; this is the few
 * things a directory needs and a bid room does not — the section bands, the
 * category tiles, and the quieter treatment for a listing nobody has claimed.
 *
 * Named classes rather than utilities, for the reason documented at the reset
 * in `globals.css`: an unlayered `* { margin:0; padding:0 }` beats every
 * layered Tailwind utility, so `p-*` and `m-*` compute to 0px application-wide.
 */
export const BROWSE_CSS = `
/* ── a section band ───────────────────────────────────────────────────────── */
.bpxb-section { display:flex; flex-direction:column; gap:12px; }
.bpxb-section-head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;
  border-bottom:1px solid var(--bpx-line); padding-bottom:9px; }
.bpxb-section-name { font-size:17px; font-weight:750; letter-spacing:-.015em; }
.bpxb-section-tag { font-size:12.5px; color:var(--bpx-dim); }

/* ── category tiles ───────────────────────────────────────────────────────── */
.bpxb-tiles { display:grid; gap:10px; grid-template-columns:1fr; }
@media (min-width:600px){ .bpxb-tiles { grid-template-columns:repeat(2,1fr); } }
@media (min-width:1000px){ .bpxb-tiles { grid-template-columns:repeat(3,1fr); } }

.bpxb-tile { display:flex; flex-direction:column; gap:5px; text-align:left;
  border:1px solid var(--bpx-line); border-radius:15px; background:var(--bpx-raised);
  padding:14px; cursor:pointer; color:inherit; text-decoration:none;
  transition:border-color .16s, background .16s; min-width:0; }
.bpxb-tile:hover { border-color:rgba(234,88,12,.5); background:rgba(234,88,12,.06); }
.bpxb-tile-name { font-size:14.5px; font-weight:700; display:flex; align-items:center;
  justify-content:space-between; gap:8px; }
.bpxb-tile-name svg { flex-shrink:0; color:var(--bpx-faint); }
/* The services under a category, as plain prose. It tells a resident whether
   this is the right door without making them open it. */
.bpxb-tile-services { font-size:12px; line-height:1.5; color:var(--bpx-dim);
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }

/* ── a business in a category ─────────────────────────────────────────────── */
.bpxb-biz { display:flex; flex-direction:column; gap:10px; }
.bpxb-biz-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.bpxb-biz-name { font-size:15.5px; font-weight:750; letter-spacing:-.01em; line-height:1.3; }

/* An unclaimed listing reads as deliberate, not broken: quieter, and it says
   what it is. On launch day most of the directory looks like this. */
.bpxb-biz[data-claimed="false"] { opacity:.92; }
.bpxb-pill-claimed { background:rgba(34,197,94,.14); color:#86efac; }
.bpxb-pill-listed  { background:rgba(255,255,255,.06); color:var(--bpx-dim); }

.bpxb-contact { display:flex; flex-wrap:wrap; gap:7px; }
.bpxb-contact a { min-height:38px; padding:0 13px; border-radius:11px;
  border:1px solid var(--bpx-line); background:rgba(255,255,255,.03);
  color:var(--bpx-text); font-size:12.5px; font-weight:650; text-decoration:none;
  display:inline-flex; align-items:center; gap:6px; }
.bpxb-contact a:hover { border-color:var(--bpx-line-lit); }

.bpxb-note { font-size:12px; color:var(--bpx-faint); line-height:1.55; }

/* ── "tell us who is missing" ─────────────────────────────────────────────── */
.bpxb-missing { display:flex; flex-direction:column; gap:10px; width:100%; max-width:440px;
  margin-inline:auto; text-align:left; }
.bpxb-missing input { width:100%; min-height:46px; padding:0 14px; border-radius:13px;
  background:var(--bpx-raised); border:1px solid var(--bpx-line); color:var(--bpx-text);
  font-size:14px; outline:none; }
.bpxb-missing input:focus { border-color:rgba(234,88,12,.55); }
.bpxb-said { font-size:13px; color:#86efac; font-weight:600; }
.bpxb-failed { font-size:13px; color:#fca5a5; font-weight:600; }

/* ── crumb ────────────────────────────────────────────────────────────────── */
.bpxb-crumb { font-size:12.5px; color:var(--bpx-dim); display:inline-flex;
  align-items:center; gap:6px; text-decoration:none; }
.bpxb-crumb:hover { color:var(--bpx-text); }
`;
