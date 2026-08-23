/**
 * Phoenix Exchange — the stylesheet, as real CSS.
 *
 * WHY THIS IS NOT TAILWIND SPACING
 *
 * `globals.css` deliberately keeps its `* { margin:0; padding:0 }` reset
 * unlayered, which in the CSS cascade beats every layered utility outright. So
 * `p-6`, `py-4`, `mb-3` and friends compute to 0px across this entire
 * application — that is a decision Eric made after seeing the alternative, and
 * it is documented at the reset itself.
 *
 * A class selector, on the other hand, out-specifies a bare `*` within the same
 * (unlayered) origin. So these rules apply normally. Everything that needs
 * padding or margin on this screen is therefore named here rather than reached
 * for from a utility that would silently do nothing.
 *
 * `gap-*` is untouched by the reset and still works, which is why layout leans
 * on flex and grid gaps wherever it can.
 */
export const EXCHANGE_CSS = `
.bpx { --bpx-orange:#ea580c; --bpx-orange-lit:#f97316; --bpx-surface:#141414;
       --bpx-raised:#1A1A1A; --bpx-line:#2A2A2A; --bpx-line-lit:#3A3A3A;
       --bpx-text:#f5f5f5; --bpx-dim:#9ca3af; --bpx-faint:#6b7280;
       background:#0A0A0A; min-height:100vh; color:var(--bpx-text); }

.bpx-shell { padding:20px; display:flex; flex-direction:column; gap:20px; max-width:1600px; margin-inline:auto; }
@media (min-width:1024px){ .bpx-shell { padding:28px 32px; gap:24px; } }

/* ── masthead ─────────────────────────────────────────────────────────────── */
.bpx-masthead { position:relative; overflow:hidden; border:1px solid var(--bpx-line);
  border-radius:22px; padding:22px; background:
    radial-gradient(1100px 320px at 8% -30%, rgba(234,88,12,.20), transparent 60%),
    linear-gradient(180deg,#171717,#101010); }
@media (min-width:768px){ .bpx-masthead { padding:26px 28px; } }
.bpx-masthead-row { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:16px; }
.bpx-brand { display:flex; align-items:center; gap:14px; min-width:0; }
.bpx-mark { width:46px; height:46px; border-radius:15px; display:grid; place-items:center; flex-shrink:0;
  background:linear-gradient(135deg,var(--bpx-orange),var(--bpx-orange-lit));
  box-shadow:0 10px 28px rgba(234,88,12,.35); }
.bpx-title { font-size:clamp(21px,3.4vw,29px); font-weight:800; letter-spacing:-.02em; line-height:1.1; }
.bpx-sub { color:var(--bpx-dim); font-size:13.5px; margin-top:3px; }

/* ── stat rail ────────────────────────────────────────────────────────────── */
.bpx-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:20px; }
@media (min-width:720px){ .bpx-stats { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.bpx-stat { border:1px solid var(--bpx-line); border-radius:15px; padding:13px 15px;
  background:rgba(255,255,255,.025); display:flex; flex-direction:column; gap:7px; }
.bpx-stat-k { display:flex; align-items:center; gap:7px; font-size:10.5px; letter-spacing:.09em;
  text-transform:uppercase; color:var(--bpx-faint); }
.bpx-stat-v { font-size:25px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1; }

/* ── toolbar ──────────────────────────────────────────────────────────────── */
.bpx-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
.bpx-search { position:relative; flex:1 1 260px; min-width:0; }
.bpx-search svg { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--bpx-faint); pointer-events:none; }
.bpx-search input { width:100%; min-height:46px; padding:12px 14px 12px 42px; border-radius:14px;
  background:var(--bpx-raised); border:1px solid var(--bpx-line); color:var(--bpx-text); font-size:14.5px; outline:none; }
.bpx-search input:focus { border-color:rgba(234,88,12,.55); box-shadow:0 0 0 3px rgba(234,88,12,.13); }

.bpx-btn { min-height:46px; padding:0 16px; border-radius:14px; border:1px solid var(--bpx-line);
  background:var(--bpx-raised); color:var(--bpx-text); font-size:13.5px; font-weight:700; cursor:pointer;
  display:inline-flex; align-items:center; gap:8px; white-space:nowrap; transition:border-color .15s,background .15s; }
.bpx-btn:hover { border-color:var(--bpx-line-lit); }
.bpx-btn[data-on="true"] { border-color:rgba(234,88,12,.6); background:rgba(234,88,12,.14); color:#fdba74; }
.bpx-btn-primary { background:linear-gradient(135deg,var(--bpx-orange),var(--bpx-orange-lit)); border:none; color:#fff;
  box-shadow:0 8px 22px rgba(234,88,12,.32); }
.bpx-btn-icon { width:46px; padding:0; justify-content:center; }
.bpx-count { min-width:19px; height:19px; padding:0 6px; border-radius:10px; background:var(--bpx-orange); color:#fff;
  font-size:11px; font-weight:800; display:grid; place-items:center; }

.bpx-select { min-height:46px; padding:0 12px; border-radius:14px; background:var(--bpx-raised);
  border:1px solid var(--bpx-line); color:var(--bpx-text); font-size:13.5px; font-weight:600; outline:none; cursor:pointer; }

.bpx-seg { display:inline-flex; padding:4px; gap:3px; border-radius:14px; background:var(--bpx-raised); border:1px solid var(--bpx-line); }
.bpx-seg button { width:40px; height:38px; border:none; border-radius:10px; background:transparent;
  color:var(--bpx-faint); cursor:pointer; display:grid; place-items:center; transition:background .15s,color .15s; }
.bpx-seg button[data-on="true"] { background:rgba(234,88,12,.16); color:#fdba74; }

/* ── presets ──────────────────────────────────────────────────────────────── */
.bpx-presets { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
.bpx-presets::-webkit-scrollbar { display:none; }
.bpx-chip { flex-shrink:0; min-height:38px; padding:0 14px; border-radius:12px; border:1px solid var(--bpx-line);
  background:var(--bpx-raised); color:var(--bpx-dim); font-size:12.5px; font-weight:700; cursor:pointer;
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap; }
.bpx-chip[data-on="true"] { border-color:rgba(234,88,12,.6); background:rgba(234,88,12,.14); color:#fdba74; }

/* ── filter drawer ────────────────────────────────────────────────────────── */
.bpx-filters { border:1px solid var(--bpx-line); border-radius:18px; background:var(--bpx-surface); padding:18px;
  display:grid; grid-template-columns:1fr; gap:18px; }
@media (min-width:760px){ .bpx-filters { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (min-width:1180px){ .bpx-filters { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.bpx-fgroup { display:flex; flex-direction:column; gap:9px; }
.bpx-flabel { font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--bpx-faint); font-weight:700; }
.bpx-frow { display:flex; flex-wrap:wrap; gap:7px; }
.bpx-tog { min-height:36px; padding:0 12px; border-radius:11px; border:1px solid var(--bpx-line);
  background:rgba(255,255,255,.03); color:var(--bpx-dim); font-size:12.5px; font-weight:600; cursor:pointer; text-transform:capitalize; }
.bpx-tog[data-on="true"] { border-color:rgba(234,88,12,.6); background:rgba(234,88,12,.15); color:#fdba74; }
.bpx-num { min-height:42px; width:100%; padding:0 12px; border-radius:12px; background:var(--bpx-raised);
  border:1px solid var(--bpx-line); color:var(--bpx-text); font-variant-numeric:tabular-nums; outline:none; }

/* ── cards ────────────────────────────────────────────────────────────────── */
.bpx-list { display:grid; gap:12px; grid-template-columns:1fr; }
.bpx-list[data-view="grid"] { grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); }

.bpx-card { position:relative; border:1px solid var(--bpx-line); border-radius:18px; background:var(--bpx-raised);
  overflow:hidden; transition:border-color .18s, transform .18s; }
.bpx-card:hover { border-color:var(--bpx-line-lit); }
.bpx-card[data-emergency="true"] { border-color:rgba(239,68,68,.5); }
.bpx-card[data-emergency="true"]::before { content:''; position:absolute; inset:0 auto 0 0; width:3px;
  background:linear-gradient(180deg,#ef4444,#b91c1c); }
.bpx-card-body { padding:17px; display:flex; flex-direction:column; gap:12px; }
.bpx-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.bpx-card-title { font-size:15.5px; font-weight:750; line-height:1.32; letter-spacing:-.01em; }
.bpx-meta { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; font-size:12.5px; color:var(--bpx-dim); }
.bpx-meta-item { display:inline-flex; align-items:center; gap:5px; }

.bpx-pill { padding:4px 9px; border-radius:9px; font-size:10.5px; font-weight:800; letter-spacing:.05em;
  text-transform:uppercase; white-space:nowrap; }
.bpx-tags { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }

/* spread bar — where this bid sits between the low and the high */
.bpx-spread { display:flex; flex-direction:column; gap:6px; padding:11px 13px; border-radius:13px;
  background:rgba(255,255,255,.03); border:1px solid var(--bpx-line); }
.bpx-spread-nums { display:flex; justify-content:space-between; font-size:12px; font-variant-numeric:tabular-nums; }
.bpx-spread-track { position:relative; height:6px; border-radius:3px; background:rgba(255,255,255,.08); }
.bpx-spread-fill { position:absolute; inset-block:0; border-radius:3px;
  background:linear-gradient(90deg,#34d399,#fbbf24,#f87171); }
.bpx-spread-tick { position:absolute; top:-3px; width:2px; height:12px; border-radius:1px; background:#fff; }

/* media */
.bpx-media { display:flex; gap:7px; overflow-x:auto; scrollbar-width:none; }
.bpx-media::-webkit-scrollbar { display:none; }
.bpx-thumb { position:relative; flex-shrink:0; width:74px; height:56px; border-radius:10px; overflow:hidden;
  border:1px solid var(--bpx-line); background:#0F0F0F; cursor:pointer; }
.bpx-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.bpx-thumb-play { position:absolute; inset:0; display:grid; place-items:center; background:rgba(0,0,0,.45); color:#fff; }

/* expanded detail */
.bpx-detail { border-top:1px solid var(--bpx-line); background:#111; padding:17px;
  display:flex; flex-direction:column; gap:16px; }
.bpx-desc { font-size:13.5px; line-height:1.62; color:#d4d4d4; white-space:pre-wrap; }

/* ── radar map ────────────────────────────────────────────────────────────── */
.bpx-radar-wrap { border:1px solid var(--bpx-line); border-radius:18px; background:
  radial-gradient(circle at 50% 50%, rgba(234,88,12,.07), transparent 62%), var(--bpx-surface); padding:18px; }
.bpx-radar { position:relative; width:100%; aspect-ratio:1; max-width:560px; margin-inline:auto; }
.bpx-radar-dot { position:absolute; transform:translate(-50%,-50%); cursor:pointer; }
.bpx-radar-legend { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; margin-top:14px;
  font-size:12px; color:var(--bpx-dim); }

/* ── first run ────────────────────────────────────────────────────────────── */
.bpx-firstrun { display:flex; flex-direction:column; gap:14px; }
.bpx-firstrun-hero { border:1px solid var(--bpx-line); border-radius:20px; padding:38px 24px;
  text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px;
  background:
    radial-gradient(760px 240px at 50% -30%, rgba(234,88,12,.16), transparent 62%),
    var(--bpx-surface); }
@media (min-width:768px){ .bpx-firstrun-hero { padding:52px 40px; } }
.bpx-firstrun-hero h2 { font-size:clamp(20px,3vw,27px); font-weight:800; letter-spacing:-.02em; margin:0; }
.bpx-firstrun-hero > p { margin:0; max-width:56ch; color:var(--bpx-dim); font-size:14.5px; line-height:1.65; }
.bpx-firstrun-count { font-size:12.5px; color:var(--bpx-faint); }

.bpx-steps { list-style:none; display:grid; grid-template-columns:1fr; gap:12px; padding:0; margin:0; }
@media (min-width:820px){ .bpx-steps { grid-template-columns:repeat(3,minmax(0,1fr)); } }
.bpx-step { position:relative; border:1px solid var(--bpx-line); border-radius:16px; padding:20px;
  background:var(--bpx-raised); display:flex; flex-direction:column; gap:9px; }
.bpx-step-n { position:absolute; top:16px; right:18px; font-size:26px; font-weight:800;
  color:rgba(255,255,255,.07); line-height:1; font-variant-numeric:tabular-nums; }
.bpx-step h3 { margin:0; font-size:15px; font-weight:700; letter-spacing:-.01em; }
.bpx-step p { margin:0; font-size:13.5px; color:var(--bpx-dim); line-height:1.6; }

.bpx-firstrun-note { display:flex; align-items:flex-start; gap:10px; padding:15px 18px;
  border:1px solid var(--bpx-line); border-left:3px solid rgba(56,189,248,.55);
  border-radius:14px; background:rgba(56,189,248,.05);
  font-size:13px; color:var(--bpx-dim); line-height:1.6; }

/* ── empty / states ───────────────────────────────────────────────────────── */
.bpx-empty { border:1px solid var(--bpx-line); border-radius:20px; background:var(--bpx-surface);
  padding:52px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:9px; }
.bpx-center { min-height:100vh; display:grid; place-items:center; padding:24px; background:#0A0A0A; }
.bpx-panel { border:1px solid var(--bpx-line); border-radius:20px; background:var(--bpx-raised);
  padding:32px; max-width:520px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px; }

/* ── shared spacing helpers, since the padding utilities are inert ────────── */
.bpx-stack { display:flex; flex-direction:column; gap:12px; }
.bpx-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.bpx-pad { padding:16px; }
.bpx-modal-head { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:18px 20px; border-bottom:1px solid var(--bpx-line); }
.bpx-modal-body { padding:20px; display:flex; flex-direction:column; gap:16px; }
.bpx-modal-foot { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:18px 20px; border-top:1px solid var(--bpx-line); flex-wrap:wrap; }
.bpx-field { display:flex; flex-direction:column; gap:7px; }
.bpx-field > label { font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--bpx-faint); font-weight:700; }
.bpx-input { width:100%; min-height:44px; padding:11px 13px; border-radius:12px; background:#0F0F0F;
  border:1px solid var(--bpx-line); color:var(--bpx-text); outline:none; font-size:14px; }
.bpx-input:focus { border-color:rgba(234,88,12,.55); }
.bpx-grid2 { display:grid; grid-template-columns:1fr; gap:14px; }
@media (min-width:560px){ .bpx-grid2 { grid-template-columns:repeat(2,minmax(0,1fr)); } }

/* On a touch screen every control clears 44px. Measured at 390px wide, the
   view toggle and the preset chips came in at 38 — fine for a mouse, a miss
   for a thumb. Gated on pointer:coarse so the desktop density is kept. */
@media (pointer:coarse){
  .bpx-seg button { width:44px; height:44px; }
  .bpx-chip { min-height:44px; }
  .bpx-tog { min-height:44px; }
}

@media (prefers-reduced-motion:reduce){ .bpx-card, .bpx-btn { transition:none; } }
`;
