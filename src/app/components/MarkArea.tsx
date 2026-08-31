/**
 * Drag a box around the part of the photograph that is allowed to change.
 *
 * WHY THIS EXISTS
 *
 * The render kept putting the deck on the wrong wall. The prompt had been
 * saying "build it on the back wall" and "do not place the new deck anywhere
 * else on the house" for some time, and it kept happening anyway, because words
 * cannot point at pixels. A photograph of a house has several walls and no
 * labels on them, so "the back wall" is a description the model has to resolve
 * against the image — and it resolves it wrong often enough to be useless.
 *
 * A box around the old deck is not a description. It becomes a mask, and pixels
 * outside a mask come back untouched. The deck cannot land on the wrong wall
 * because the model is never given the chance to paint there.
 *
 * It is also what makes changing one part of a house possible at all: mark the
 * siding on one elevation and change only that, mark a door and change only the
 * door. The rest of the photograph is guaranteed to survive, which is the whole
 * problem with asking an image model to edit a house.
 */
import { useCallback, useRef, useState } from 'react';
import { Crop, X, Check } from 'lucide-react';

export interface MarkedArea {
  /** Fractions of the image, 0–1, so they survive any resize. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Build the mask the edit API wants.
 *
 * Transparent where editing is allowed, opaque everywhere else, and exactly the
 * same pixel dimensions as the photograph — a mask of a different size is
 * rejected, and a mask the wrong way round edits everything except the part you
 * meant.
 */
export function buildMask(photoDataUri: string, area: MarkedArea): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d');
      if (!g) return reject(new Error('Could not prepare the mask.'));

      g.fillStyle = '#000';
      g.fillRect(0, 0, c.width, c.height);

      // Punch the hole. Everything inside becomes editable; the rest is frozen.
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(
        Math.round(area.x * c.width),
        Math.round(area.y * c.height),
        Math.round(area.w * c.width),
        Math.round(area.h * c.height),
      );

      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not read that photo.'));
    img.src = photoDataUri;
  });
}

export default function MarkArea({ photo, area, onChange, hint }: {
  photo: string;
  area: MarkedArea | null;
  onChange: (a: MarkedArea | null) => void;
  hint?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const rel = useCallback((e: React.PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = rel(e);
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = rel(e);
    setDrag(d => (d ? { ...d, x1: p.x, y1: p.y } : d));
  };
  const up = () => {
    if (!drag) return;
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    setDrag(null);
    // A stray click is not a selection. Below this it is almost certainly a
    // misclick, and a tiny mask produces a render with a postage stamp in it.
    if (w < 0.04 || h < 0.04) return;
    onChange({ x, y, w, h });
  };

  const live = drag
    ? {
        x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1),
        w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0),
      }
    : area;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
          <Crop className="w-3.5 h-3.5 text-[#ea580c]" />
          {area ? 'Only this area will change' : 'Drag a box around where it goes'}
        </p>
        {area && (
          <button onClick={() => onChange(null)}
            className="text-[11px] text-gray-500 hover:text-white flex items-center gap-1">
            <X className="w-3 h-3" /> clear
          </button>
        )}
      </div>

      <div
        ref={boxRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        className="relative rounded-xl overflow-hidden border border-[#2A2A2A] select-none touch-none cursor-crosshair"
      >
        <img src={photo} alt="" className="w-full block pointer-events-none" draggable={false} />

        {/* Everything outside the box is dimmed, which is the honest picture of
            what the render will do: those pixels come back untouched. */}
        {live && live.w > 0 && live.h > 0 && (
          <>
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: 'rgba(0,0,0,0.55)',
                clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${live.x * 100}% ${live.y * 100}%,
                  ${live.x * 100}% ${(live.y + live.h) * 100}%,
                  ${(live.x + live.w) * 100}% ${(live.y + live.h) * 100}%,
                  ${(live.x + live.w) * 100}% ${live.y * 100}%,
                  ${live.x * 100}% ${live.y * 100}%)`,
              }} />
            <div className="absolute border-2 border-[#ea580c] pointer-events-none"
              style={{
                left: `${live.x * 100}%`, top: `${live.y * 100}%`,
                width: `${live.w * 100}%`, height: `${live.h * 100}%`,
              }} />
          </>
        )}

        {!live && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              Drag across the photo
            </span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500 mt-1.5">
        {area
          ? (hint || 'Everything outside the box comes back exactly as it is now.')
          : 'Without a box the render can put the deck anywhere on the house — which is what it has been doing.'}
      </p>
    </div>
  );
}
