/**
 * Styles for the public listing page.
 *
 * Separate from `exchangeStyles.ts` because that file dresses the operator's
 * bid room — dense, dark, built for somebody working. This page is the
 * opposite job: it is the shop window, read by a resident who has never heard
 * of us, on a phone, probably outdoors. Bigger type, more air, fewer things.
 *
 * Real CSS rather than Tailwind spacing for the reason given at the top of
 * `exchangeStyles.ts`: `p-*` and `m-*` compute to 0px application-wide, so
 * anything that needs padding names it here. `gap-*` is unaffected and layout
 * leans on it.
 */
export const LISTING_CSS = `
.bpxl { --bpxl-ink:#f5f5f5; --bpxl-dim:#a3a3a3; --bpxl-faint:#6b7280;
        --bpxl-line:#2A2A2A; --bpxl-raised:#161616; --bpxl-accent:#ea580c;
        --bpxl-good:#34d399; }

.bpxl-shell { max-width:760px; margin-inline:auto; padding:24px 18px 64px;
  display:flex; flex-direction:column; gap:22px; }
@media (min-width:768px){ .bpxl-shell { padding:40px 24px 80px; gap:28px; } }

.bpxl-centre { min-height:60vh; display:grid; place-items:center; color:var(--bpxl-dim); }
.bpxl-stack { gap:14px; grid-auto-flow:row; justify-items:center; text-align:center; padding:24px; }
.bpxl-lede { font-size:16px; color:var(--bpxl-dim); max-width:36ch; }

/* ── header ───────────────────────────────────────────────────────────────── */
.bpxl-head { display:flex; align-items:flex-start; gap:16px; }
.bpxl-mark { width:62px; height:62px; flex-shrink:0; border-radius:18px; display:grid; place-items:center;
  background:linear-gradient(135deg,#1f1f1f,#141414); border:1px solid var(--bpxl-line); color:var(--bpxl-accent); }
.bpxl-headtext { min-width:0; display:flex; flex-direction:column; gap:6px; }
.bpxl-name { font-size:clamp(24px,5vw,34px); font-weight:800; letter-spacing:-.02em; line-height:1.12; }
.bpxl-trade { color:var(--bpxl-dim); font-size:15px; }

.bpxl-badges { display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; }
.bpxl-badge { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600;
  padding:5px 10px; border-radius:999px; border:1px solid var(--bpxl-line); color:var(--bpxl-dim); }
.bpxl-badge-good { color:var(--bpxl-good); border-color:rgba(52,211,153,.35); background:rgba(52,211,153,.08); }
.bpxl-badge-quiet { color:var(--bpxl-faint); }

/* ── the claim prompt on an unclaimed listing ─────────────────────────────── */
.bpxl-claim { border:1px solid rgba(234,88,12,.35); border-radius:18px; padding:18px;
  background:linear-gradient(180deg,rgba(234,88,12,.10),rgba(234,88,12,.03));
  display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; }
.bpxl-claim-title { font-size:17px; font-weight:700; }
.bpxl-claim-body { color:var(--bpxl-dim); font-size:14px; line-height:1.55; margin-top:6px; max-width:52ch; }

/* ── contact ──────────────────────────────────────────────────────────────── */
.bpxl-h2 { font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  color:var(--bpxl-faint); margin-bottom:12px; }
.bpxl-contact, .bpxl-cats { border:1px solid var(--bpxl-line); border-radius:18px; padding:18px;
  background:var(--bpxl-raised); }
.bpxl-rows { display:flex; flex-direction:column; gap:10px; }
.bpxl-row { display:flex; align-items:center; gap:12px; padding:13px 14px; border-radius:13px;
  border:1px solid var(--bpxl-line); color:var(--bpxl-ink); text-decoration:none;
  transition:border-color .15s ease, background .15s ease; }
.bpxl-row:hover { border-color:#4a4a4a; background:#1c1c1c; }
.bpxl-row-value { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  font-size:15.5px; font-weight:600; }
.bpxl-row-go { color:var(--bpxl-faint); flex-shrink:0; }
.bpxl-row-empty { color:var(--bpxl-faint); }
.bpxl-row-empty .bpxl-row-value { font-weight:500; font-size:14.5px; }
.bpxl-note { margin-top:12px; font-size:12.5px; color:var(--bpxl-faint); line-height:1.5; }

/* ── categories ───────────────────────────────────────────────────────────── */
.bpxl-chips { display:flex; flex-wrap:wrap; gap:8px; }
.bpxl-chip { font-size:13.5px; font-weight:600; padding:7px 13px; border-radius:999px;
  border:1px solid var(--bpxl-line); color:var(--bpxl-ink); text-decoration:none; }
.bpxl-chip:hover { border-color:var(--bpxl-accent); color:#fdba74; }

/* ── buttons ──────────────────────────────────────────────────────────────── */
.bpxl-btn { display:inline-flex; align-items:center; gap:8px; font-size:14.5px; font-weight:700;
  padding:11px 18px; border-radius:12px; text-decoration:none; white-space:nowrap;
  color:#fff; background:linear-gradient(135deg,#ea580c,#f97316);
  box-shadow:0 8px 22px rgba(234,88,12,.28); }
.bpxl-btn:hover { filter:brightness(1.07); }
.bpxl-btn-ghost { background:none; box-shadow:none; border:1px solid var(--bpxl-line); color:var(--bpxl-ink); }
/* A control whose destination arrives in a later phase: it should look
   like the real thing without pretending to work. */
.bpxl-btn-soon { opacity:.55; cursor:default; box-shadow:none; }
`;
