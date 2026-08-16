/**
 * The framing plan, drawn on a 2D canvas.
 *
 * This was previously a WebGL view with 3D text. That was the wrong tool twice
 * over: a framing plan is a flat orthographic drawing, and the 3D text
 * dependency fetches a font at runtime — when that does not arrive you get
 * geometry with no labels, which is a drawing with nothing on it.
 *
 * Plain canvas draws with the system font, needs nothing from the network,
 * prints crisply, and exports through toDataURL like any other image. It is
 * also simply how a plan is drawn: members become rectangles, dimensions become
 * lines with ticks, callouts become leaders with text.
 */
import { useCallback, useEffect, useRef } from 'react';
import { buildMembers, STRUCTURAL_KINDS, MEMBER_COLOR, type DeckModel } from '../lib/deckModel';
import { buildAnnotations } from '../lib/deckAnnotations';

export default function FramingPlanCanvas({
  model,
  width = 1400,
  height = 1000,
  onCaptureReady,
}: {
  model: DeckModel;
  width?: number;
  height?: number;
  onCaptureReady?: (capture: () => string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const members = buildMembers(model).filter(m => STRUCTURAL_KINDS.includes(m.kind));
    const a = buildAnnotations(model);

    // Fit the deck plus the space the callouts occupy, then scale to the canvas.
    const padX = 13;
    const padZ = 11;
    const worldW = model.widthFt + padX * 2;
    const worldD = model.depthFt + padZ * 2;
    const scale = Math.min(width / worldW, height / worldD);
    const ox = width / 2;
    const oz = (height - model.depthFt * scale) / 2;

    // World feet -> canvas pixels. x is centred on the deck; z runs out from the
    // house, which is the top of the sheet.
    const X = (x: number) => ox + x * scale;
    const Z = (z: number) => oz + z * scale;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const INK = '#111827';
    const font = (px: number, weight = '400') =>
      `${weight} ${Math.max(9, Math.round(px * scale * 0.055))}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;

    // House wall, so the ledger side is unambiguous.
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(X(-model.widthFt / 2 - 3), Z(-1.2), (model.widthFt + 6) * scale, 1.2 * scale);
    ctx.fillStyle = '#6b7280';
    ctx.font = font(12, '600');
    ctx.textAlign = 'center';
    ctx.fillText('EXISTING DWELLING', X(0), Z(-0.45));

    // Members, filled and outlined. In a structural drawing the joint between
    // two members matters more than the surface of either.
    for (const m of members) {
      const [mx, , mz] = m.pos;
      const [sx, , sz] = m.size;
      const x = X(mx - sx / 2);
      const z = Z(mz - sz / 2);
      const w = Math.max(1.5, sx * scale);
      const d = Math.max(1.5, sz * scale);
      ctx.fillStyle = m.kind === 'footing' ? '#f3f4f6' : MEMBER_COLOR[m.kind];
      ctx.globalAlpha = m.kind === 'footing' ? 1 : 0.55;
      ctx.fillRect(x, z, w, d);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK;
      ctx.lineWidth = m.kind === 'post' || m.kind === 'beam' ? 1.6 : 0.9;
      ctx.strokeRect(x, z, w, d);
    }

    // Dimension strings with extension ticks.
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = 1.1;
    for (const d of a.dimensions) {
      const x1 = X(d.from[0]), z1 = Z(d.from[2]);
      const x2 = X(d.to[0]), z2 = Z(d.to[2]);
      const t = 5;
      ctx.beginPath();
      ctx.moveTo(x1, z1); ctx.lineTo(x2, z2);
      if (d.axis === 'x') {
        ctx.moveTo(x1, z1 - t); ctx.lineTo(x1, z1 + t);
        ctx.moveTo(x2, z2 - t); ctx.lineTo(x2, z2 + t);
      } else {
        ctx.moveTo(x1 - t, z1); ctx.lineTo(x1 + t, z1);
        ctx.moveTo(x2 - t, z2); ctx.lineTo(x2 + t, z2);
      }
      ctx.stroke();

      ctx.font = font(13, '600');
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      const label = d.label;
      const w = ctx.measureText(label).width;
      // Knock the line out behind the text so the dimension stays readable.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - w / 2 - 4, mz - 9, w + 8, 18);
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, mz);
    }

    // Callouts on leader lines.
    ctx.font = font(12);
    for (const co of a.callouts) {
      const tx = X(co.target[0]), tz = Z(co.target[2]);
      const ax = X(co.at[0]), az = Z(co.at[2]);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(tx, tz); ctx.lineTo(ax, az);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tx, tz, 3, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();

      const right = co.at[0] >= 0;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      const lh = Math.max(12, Math.round(14 * scale * 0.055) + 4);
      co.lines.forEach((line, i) => {
        const y = az + i * lh;
        ctx.font = font(i === 0 ? 13 : 12, i === 0 ? '700' : '400');
        const w = ctx.measureText(line).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(right ? ax - 2 : ax - w - 2, y - lh / 2, w + 4, lh);
        ctx.fillStyle = INK;
        ctx.fillText(line, ax, y);
      });
    }

    // Sheet notes, bottom left.
    ctx.textAlign = 'left';
    ctx.font = font(11);
    ctx.fillStyle = INK;
    a.notes.forEach((n, i) => {
      ctx.fillText((i === 0 ? 'NOTES:  ' : '        ') + n, 14, height - 14 - (a.notes.length - 1 - i) * 15);
    });
  }, [model, width, height]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    onCaptureReady?.(() => {
      try { return ref.current?.toDataURL('image/png') || null; } catch { return null; }
    });
  }, [onCaptureReady]);

  return (
    <canvas ref={ref} width={width} height={height}
      className="w-full h-auto rounded-xl border border-[#2A2A2A] bg-white" />
  );
}
