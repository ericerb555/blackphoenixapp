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

/* ── finding a place near you ─────────────────────────────────────────────── */
/* The search box and the location button sit together because they answer the
   same question from two directions: what am I after, and what is close. */
.bpxb-find { display:flex; flex-direction:column; gap:9px; }
.bpxb-find-row { display:flex; flex-wrap:wrap; gap:8px; align-items:stretch; }
.bpxb-find-field { position:relative; flex:1 1 220px; min-width:0; display:flex; align-items:center; }
.bpxb-find-field > svg { position:absolute; left:13px; color:var(--bpx-faint); pointer-events:none; }
.bpxb-find-field input { width:100%; min-height:44px; padding:0 38px 0 36px; border-radius:13px;
  background:var(--bpx-raised); border:1px solid var(--bpx-line); color:var(--bpx-text);
  font-size:14px; outline:none; }
.bpxb-find-field input:focus { border-color:rgba(234,88,12,.55); }
.bpxb-find-clear { position:absolute; right:7px; width:28px; height:28px; border-radius:9px;
  display:inline-flex; align-items:center; justify-content:center; border:0;
  background:transparent; color:var(--bpx-dim); cursor:pointer; }
.bpxb-find-clear:hover { background:rgba(255,255,255,.07); color:var(--bpx-text); }

/* ── a result the search answers, and one it does not ─────────────────────── */
/* Non-matches are DIMMED rather than removed. Somebody searching "brake" should
   still be able to see that a general garage sits two streets closer, which a
   filter would have hidden from them. */
.bpxb-biz[data-dim="true"] { opacity:.34; }
.bpxb-biz[data-hit="true"] { box-shadow:inset 3px 0 0 #ea580c; }
.bpxb-biz[data-hit="true"] .bpxb-biz-name { color:#fdba74; }

/* ── how far away it is ───────────────────────────────────────────────────── */
/* Tabular figures so a column of distances lines up and can be compared at a
   glance, which is the whole point of showing them. */
.bpxb-away { font-size:12px; font-weight:700; color:var(--bpx-dim); white-space:nowrap;
  font-variant-numeric:tabular-nums; display:inline-flex; align-items:center; gap:4px; }
.bpxb-away svg { color:var(--bpx-faint); }

/* ── the map ──────────────────────────────────────────────────────────────── */
/* A fixed height rather than an aspect ratio: on a phone an aspect-ratio map
   either eats the whole screen or becomes a letterbox, and what matters here
   is how many pins fit, not the shape. */
.bpxm-wrap { display:flex; flex-direction:column; gap:7px; }
.bpxm-shell { position:relative; width:100%; height:320px; border-radius:15px;
  border:1px solid var(--bpx-line); background:var(--bpx-raised); overflow:hidden; }
@media (min-width:800px){ .bpxm-shell { height:420px; } }

/* Standing in for the map: no key, no WebGL, or nothing to show. */
.bpxm-flat, .bpxm-cover { display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:9px; }
.bpxm-flat { height:150px; }
.bpxm-cover { position:absolute; inset:0; background:var(--bpx-raised); z-index:2; }

/* Ours rather than MapLibre's, whose stylesheet is built on the padding this
   app zeroes application-wide. */
.bpxm-controls { position:absolute; top:9px; right:9px; z-index:3;
  display:flex; flex-direction:column; gap:5px; }
.bpxm-controls button { width:32px; height:32px; border-radius:9px; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center;
  border:1px solid var(--bpx-line-lit); background:rgba(12,12,14,.84);
  color:var(--bpx-text); backdrop-filter:blur(3px); }
.bpxm-controls button:hover { border-color:rgba(234,88,12,.6); }

/* ODbL and the tile provider both require a credit, and a map is the most
   visible place that has ever mattered. */
.bpxm-credit { position:absolute; bottom:5px; right:7px; z-index:3; font-size:10px;
  color:rgba(255,255,255,.62); background:rgba(12,12,14,.6); border-radius:5px;
  line-height:1.5; letter-spacing:.01em; }

/* Where the resident is. Blue, because every map in the world uses blue for
   "you" and this is not the place to be original. */
.bpxm-you { width:14px; height:14px; border-radius:50%; background:#3b82f6;
  border:2.5px solid #fff; box-shadow:0 0 0 5px rgba(59,130,246,.3); }

/* A selected row in the list, so the map and the list agree about which one
   is being talked about. */
.bpxb-biz[data-chosen="true"] { box-shadow:inset 3px 0 0 #3b82f6; }

/* ── saving a business ────────────────────────────────────────────────────── */
/* Quiet until used. A save is a note to yourself, not a vote, so it should
   not shout for attention beside the business's own name. */
.bpxb-save-wrap { display:inline-flex; align-items:center; gap:7px; }
.bpxb-save { min-height:30px; padding:0 10px; border-radius:9px; cursor:pointer;
  display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:650;
  border:1px solid var(--bpx-line); background:rgba(255,255,255,.03);
  color:var(--bpx-dim); transition:border-color .16s, color .16s, background .16s; }
.bpxb-save:hover { border-color:var(--bpx-line-lit); color:var(--bpx-text); }
.bpxb-save[data-saved="true"] { border-color:rgba(234,88,12,.5);
  background:rgba(234,88,12,.12); color:#fdba74; }
.bpxb-save:disabled { opacity:.6; cursor:default; }
.bpxb-save-note { font-size:11.5px; color:var(--bpx-faint); }
.bpxb-save-note a { color:#fdba74; text-decoration:none; }
.bpxb-save-note a:hover { text-decoration:underline; }

/* ── hearing from a business ──────────────────────────────────────────────── */
/* Deliberately not the same control as Save. Saving is private and silent;
   this is consent to hear from somebody, and two different commitments
   should not look like two instances of one button. Blue rather than the
   orange accent, so a glance tells them apart. */
.bpxb-follow { min-height:30px; padding:0 10px; border-radius:9px; cursor:pointer;
  display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:650;
  border:1px solid var(--bpx-line); background:rgba(255,255,255,.03);
  color:var(--bpx-dim); transition:border-color .16s, color .16s, background .16s; }
.bpxb-follow:hover { border-color:var(--bpx-line-lit); color:var(--bpx-text); }
.bpxb-follow[data-following="true"] { border-color:rgba(59,130,246,.5);
  background:rgba(59,130,246,.12); color:#93c5fd; }
.bpxb-follow:disabled { opacity:.6; cursor:default; }

/* ── a deal ───────────────────────────────────────────────────────────────── */
.bpxb-deal { display:flex; flex-direction:column; gap:6px; }
.bpxb-deal-title { font-size:14.5px; font-weight:750; color:#fdba74; }
.bpxb-deal-body { font-size:13px; line-height:1.55; color:var(--bpx-text); white-space:pre-wrap; }
.bpxb-deal-when { font-size:11.5px; color:var(--bpx-faint); font-variant-numeric:tabular-nums; }
.bpxb-deal-state { font-size:11px; font-weight:700; letter-spacing:.02em; }
.bpxb-deal-state[data-state="approved"]  { color:#86efac; }
.bpxb-deal-state[data-state="submitted"] { color:#fcd34d; }
.bpxb-deal-state[data-state="rejected"]  { color:#fca5a5; }
.bpxb-deal-state[data-state="draft"],
.bpxb-deal-state[data-state="withdrawn"] { color:var(--bpx-dim); }

/* ── a small form ─────────────────────────────────────────────────────────── */
.bpxb-form { display:flex; flex-direction:column; gap:10px; }
.bpxb-form label { display:flex; flex-direction:column; gap:5px; font-size:12.5px;
  color:var(--bpx-dim); font-weight:650; }
.bpxb-form input, .bpxb-form textarea { width:100%; padding:10px 13px; border-radius:11px;
  background:var(--bpx-raised); border:1px solid var(--bpx-line); color:var(--bpx-text);
  font-size:14px; font-family:inherit; outline:none; }
.bpxb-form input:focus, .bpxb-form textarea:focus { border-color:rgba(234,88,12,.55); }
.bpxb-form textarea { min-height:96px; resize:vertical; }
.bpxb-form-row { display:flex; gap:10px; flex-wrap:wrap; }
.bpxb-form-row > label { flex:1 1 170px; }
`;
