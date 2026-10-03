/**
 * Phoenix Exchange — claiming a listing, as real CSS.
 *
 * Only what `EXCHANGE_CSS` and `BROWSE_CSS` do not already carry: the progress
 * line, a factor card, the dispute warning, and inputs for a code and a domain
 * address.
 *
 * Named classes rather than utilities, per the reset documented in
 * `globals.css` — `p-*` and `m-*` compute to 0px application-wide.
 */
export const CLAIM_CSS = `
.bpxc-block { display:flex; flex-direction:column; gap:13px; }

/* ── where the claim stands ───────────────────────────────────────────────── */
.bpxc-progress { display:flex; flex-direction:column; gap:10px;
  border:1px solid rgba(234,88,12,.3); background:rgba(234,88,12,.07);
  border-radius:16px; padding:15px; }
.bpxc-progress-line { font-size:13.5px; line-height:1.55; color:#fdba74; font-weight:600; }

/* ── one way of proving control ───────────────────────────────────────────── */
.bpxc-factor { display:flex; flex-direction:column; gap:11px; }
.bpxc-factor[data-done="true"] { opacity:.72; }
.bpxc-factor-head { display:flex; align-items:center; justify-content:space-between;
  gap:10px; flex-wrap:wrap; }
.bpxc-factor-label { font-size:14.5px; font-weight:700; display:inline-flex;
  align-items:center; gap:8px; }
.bpxc-factor-label svg { flex-shrink:0; color:var(--bpx-dim); }

/* The DNS value to publish. Monospace because somebody has to copy it exactly,
   and wrapped because it is long. */
.bpxc-instruction { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12px; line-height:1.6; word-break:break-all;
  border:1px solid var(--bpx-line); background:var(--bpx-surface);
  border-radius:11px; padding:11px 13px; color:#d4d4d4; }

.bpxc-input { min-height:44px; padding:0 13px; border-radius:12px;
  background:var(--bpx-surface); border:1px solid var(--bpx-line);
  color:var(--bpx-text); font-size:14px; outline:none; flex:1 1 220px; min-width:0; }
.bpxc-input:focus { border-color:rgba(234,88,12,.55); }
.bpxc-input-code { flex:0 0 140px; letter-spacing:.18em; font-variant-numeric:tabular-nums;
  text-align:center; }

/* ── the dispute warning ──────────────────────────────────────────────────── */
.bpxc-warn { display:flex; gap:11px; align-items:flex-start;
  border:1px solid rgba(239,68,68,.4); background:rgba(239,68,68,.08);
  border-radius:14px; padding:13px; font-size:13px; line-height:1.55; color:#fca5a5; }
.bpxc-warn svg { flex-shrink:0; margin-top:2px; }
.bpxc-warn strong { display:block; margin-bottom:4px; color:#fecaca; }
`;
