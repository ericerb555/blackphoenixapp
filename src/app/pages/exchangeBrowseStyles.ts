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

/* ── the town switcher and the category list ──────────────────────────────── */
.bpxb-towns { display:flex; gap:6px; flex-wrap:wrap; }
.bpxb-town { min-height:32px; padding:0 12px; border-radius:10px; cursor:pointer;
  font-size:12.5px; font-weight:650; border:1px solid var(--bpx-line);
  background:rgba(255,255,255,.03); color:var(--bpx-dim); }
.bpxb-town:hover { border-color:var(--bpx-line-lit); color:var(--bpx-text); }
.bpxb-town[data-current="true"] { border-color:rgba(234,88,12,.55);
  background:rgba(234,88,12,.12); color:#fdba74; }

/* Horizontally scrollable rather than wrapped into a wall: Manchester has
   fifty-two categories, and a block of fifty-two buttons above the list
   would push the businesses off the screen entirely. */
.bpxb-chips { display:flex; gap:7px; overflow-x:auto; padding-bottom:4px;
  scrollbar-width:thin; }
.bpxb-chip { flex:0 0 auto; min-height:32px; padding:0 12px; border-radius:999px;
  cursor:pointer; font-size:12.5px; font-weight:650; white-space:nowrap;
  border:1px solid var(--bpx-line); background:rgba(255,255,255,.03);
  color:var(--bpx-dim); }
.bpxb-chip:hover { border-color:var(--bpx-line-lit); color:var(--bpx-text); }
.bpxb-chip[data-current="true"] { border-color:rgba(234,88,12,.55);
  background:rgba(234,88,12,.14); color:#fdba74; }

/* ── asking in words, and the answer ──────────────────────────────────────── */
/* The ask is a separate control from the search field it sits beside, because
   they are not the same promise: the field filters what is already on screen,
   instantly and for nothing, while this one sends a question to a server and
   costs money. A resident should be able to tell which one they are using. */
.bpxb-ask { min-height:44px; padding:0 15px; border-radius:13px; cursor:pointer;
  display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:700;
  border:1px solid rgba(234,88,12,.5); background:rgba(234,88,12,.12); color:#fdba74;
  white-space:nowrap; transition:border-color .16s, background .16s; }
.bpxb-ask:hover:not(:disabled) { border-color:rgba(234,88,12,.8); background:rgba(234,88,12,.2); }
.bpxb-ask:disabled { opacity:.45; cursor:default; }

/* Quiet on purpose. This panel explains what the page did; it is not the
   answer, which is the businesses on the map underneath it. */
.bpxb-answer { display:flex; flex-direction:column; gap:9px;
  border:1px solid var(--bpx-line); border-left:3px solid rgba(234,88,12,.7);
  border-radius:13px; padding:12px 13px; background:var(--bpx-raised); }
.bpxb-answer-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.bpxb-answer-said { font-size:14px; line-height:1.55; min-width:0; }
.bpxb-answer-drop { flex-shrink:0; width:28px; height:28px; border-radius:9px; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center;
  border:1px solid var(--bpx-line); background:transparent; color:var(--bpx-faint); }
.bpxb-answer-drop:hover { background:rgba(255,255,255,.07); color:var(--bpx-text); }
/* The reading, shown rather than hidden: a wrong guess should be obvious at a
   glance and undoable in one tap, which is the whole reason this line exists. */
.bpxb-answer-read { font-size:12px; color:var(--bpx-dim); line-height:1.5; }
.bpxb-answer-read b { color:#fdba74; font-weight:750; }
.bpxb-answer-ask { font-size:13px; color:var(--bpx-text); line-height:1.5; }

/* ── ours, and unmistakably labelled as ours ──────────────────────────────── */
/* The directory list stays neutral and is ranked by match and distance alone.
   This block is Black Phoenix offering its own work, so it is allowed to look
   like Black Phoenix — the brand treatment IS the disclosure. A resident who
   cannot tell the difference has been misled; one who can is being offered
   something. Never mixed into the list, and never ranked for money. */
.bpxb-ours { display:flex; align-items:center; gap:12px; text-decoration:none; color:inherit;
  border:1px solid rgba(234,88,12,.45); border-radius:13px; padding:12px 13px;
  background:linear-gradient(90deg, rgba(234,88,12,.16), rgba(234,88,12,.04));
  transition:border-color .16s; }
.bpxb-ours:hover { border-color:rgba(234,88,12,.8); }
.bpxb-ours-text { display:flex; flex-direction:column; gap:3px; min-width:0; }
.bpxb-ours-tag { font-size:10.5px; font-weight:800; letter-spacing:.06em;
  text-transform:uppercase; color:#fdba74; }
.bpxb-ours-line { font-size:13.5px; font-weight:650; line-height:1.45; }
.bpxb-ours svg { flex-shrink:0; color:#fdba74; }

/* ── a logo, which only a claimed listing can have ───────────────── */
/* A fixed frame rather than a loose image. Logos arrive as any aspect ratio a
   business happens to have, and a row of differently-shaped images reads as a
   broken page; contain keeps the whole mark visible inside a predictable box. */
.bpxb-logo-frame { width:72px; height:72px; flex-shrink:0; border-radius:14px;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  border:1px solid var(--bpx-line); background:#fff; }
/* White behind a logo on purpose: most are drawn for paper and a dark panel
   turns a black wordmark into a rectangle of nothing. */
.bpxb-logo-frame[data-empty="true"] { background:var(--bpx-raised); }
.bpxb-logo-frame img { max-width:100%; max-height:100%; object-fit:contain; }

.bpxb-logo-row { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
.bpxb-logo-words { display:flex; flex-direction:column; gap:7px; flex:1 1 260px; min-width:0; }
.bpxb-logo-badge { display:inline-flex; align-items:center; gap:6px;
  font-size:12.5px; font-weight:750; }
.bpxb-logo-acts { display:flex; gap:8px; flex-wrap:wrap; }

/* The small one, on a list row and beside a business name. 40px because it sits
   on the same line as a name at 15.5px and must not out-shout it. */
.bpxb-logo-chip { width:40px; height:40px; flex-shrink:0; border-radius:10px;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  border:1px solid var(--bpx-line); background:#fff; }
.bpxb-logo-chip img { max-width:100%; max-height:100%; object-fit:contain; }

/* ── the map, as the main feature it is supposed to be ────────────────────── */
/* Eric, twice: "the map should be a main feature". It was a one-line link
   wedged between the town chips and the category tree, which reads as a notice
   rather than a way in — on the live page he did not register it as the map at
   all, and he was right not to.

   What it must NOT become is the page itself. /exchange is the crawlable tree
   of categories and names that the entire free-traffic plan rests on, and a map
   canvas has nothing in it for a crawler to read. So this is a door built to
   look like the thing behind it: the pin field is CSS, it costs no request, and
   the tree underneath is untouched. */
/* The map is now the real canvas rather than a door, so what is left of the
   hero is the line above it and the way through to the full map page. */
.bpxb-mapwrap { display:flex; flex-direction:column; gap:10px;
  border:1px solid rgba(234,88,12,.45); border-radius:18px; padding:16px;
  background:linear-gradient(135deg, rgba(234,88,12,.12), rgba(255,255,255,.015)); }
.bpxb-maphead { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
/* Every state the map can be in gets the same height, so the page does not
   jump as it loads, fails or fills. */
.bpxb-mapwait { height:320px; border-radius:15px; display:flex; gap:10px;
  flex-direction:column; align-items:center; justify-content:center;
  border:1px solid var(--bpx-line); background:var(--bpx-raised); text-align:center; }
.bpxb-mappick { display:flex; gap:11px; align-items:center; flex-wrap:wrap;
  border:1px solid var(--bpx-line); border-radius:13px; padding:11px 12px;
  background:var(--bpx-raised); }
.bpxb-mappick .bpxb-door-text { flex:1 1 140px; }
.bpxb-hero-text { display:flex; flex-direction:column; gap:5px; min-width:0; flex:1 1 240px; }
.bpxb-hero-title { font-size:clamp(19px,2.6vw,25px); font-weight:800; letter-spacing:-.02em; }
.bpxb-hero-sub { font-size:13.5px; color:var(--bpx-dim); line-height:1.5; }
.bpxb-hero-go { flex-shrink:0; display:inline-flex; align-items:center; gap:7px;
  min-height:44px; padding:0 18px; border-radius:13px; font-size:14px; font-weight:750;
  background:#ea580c; color:#fff; }

/* ── the two doors a directory has to have and did not ────────────────────── */
/* An owner arriving at the Exchange had no way to claim: the only route in was
   to find your own listing by browsing and press the button on it. And the
   resident account — saved businesses, who you contacted — was reachable only
   from the staff role switcher, so no actual resident could ever find it.
   Both existed. Neither had a door. */
.bpxb-doors { display:grid; gap:10px; grid-template-columns:1fr; }
@media (min-width:700px) { .bpxb-doors { grid-template-columns:1fr 1fr; } }
.bpxb-door { display:flex; align-items:center; gap:12px; text-decoration:none;
  color:inherit; border:1px solid var(--bpx-line); border-radius:14px; padding:14px;
  background:var(--bpx-raised); transition:border-color .16s, background .16s; }
.bpxb-door:hover { border-color:var(--bpx-line-lit); background:rgba(255,255,255,.04); }
.bpxb-door svg { flex-shrink:0; color:#fdba74; }
.bpxb-door-text { display:flex; flex-direction:column; gap:3px; min-width:0; }
.bpxb-door-title { font-size:14.5px; font-weight:750; letter-spacing:-.01em; }

`;
