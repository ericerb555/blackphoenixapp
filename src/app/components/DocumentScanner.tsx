/**
 * DocumentScanner — photographs of documents in, print-accurate PDF out.
 *
 * Built to be dropped into anything that submits paper to a town: variances,
 * permit applications, deeds, surveys, certificates. It is not variance-specific
 * and holds no knowledge of what the document says.
 *
 * The four corners are draggable rather than merely detected. Edge detection on
 * a form lying on a wood table, a dark countertop or another sheet of paper is
 * unreliable, and a scan that is silently off by an inch is worse than one the
 * operator had to correct — the first gets printed and rejected at the counter.
 *
 * Everything runs in the browser. Documents going to a town often carry names,
 * addresses and signatures, and none of that needs to be uploaded to be
 * straightened.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Camera, Loader2, Trash2, FileDown, RotateCw, Check,
  AlertTriangle, ScanLine, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  PAGE_SIZES, warpToPage, estimateQuad, fullFrameQuad,
  type Quad, type PageSize,
} from '../lib/documentScan';

interface Page {
  id: string;
  img: HTMLImageElement;
  src: string;
  quad: Quad;
  scanned?: string;
}

export default function DocumentScanner({
  title = 'Document scanner',
  onScanned,
}: {
  title?: string;
  /** Receives the finished PDF, for callers that want to store it. */
  onScanned?: (pdfDataUri: string, pageCount: number) => void;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [active, setActive] = useState(0);
  const [page, setPage] = useState<PageSize>(PAGE_SIZES[0]);
  const [dpi, setDpi] = useState(200);
  const [cleanup, setCleanup] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const camRef = useRef<HTMLInputElement | null>(null);

  const current = pages[active];

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const next: Page[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image. Photograph or scan the page first.`);
          continue;
        }
        const src = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.onerror = () => rej(new Error('read failed'));
          fr.readAsDataURL(file);
        });
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => rej(new Error('decode failed'));
          i.src = src;
        });
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          img, src,
          quad: estimateQuad(img),
        });
      }
      if (next.length) {
        setPages(p => [...p, ...next]);
        setActive(p => (pages.length ? p : 0));
      }
    } catch {
      toast.error('Could not read one of those images.');
    } finally {
      setBusy(false);
    }
  }, [pages.length]);

  /** Draw the photo with its adjustable quad on top. */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !current) return;
    const maxW = 520;
    const scale = Math.min(maxW / current.img.naturalWidth, 1);
    c.width = Math.round(current.img.naturalWidth * scale);
    c.height = Math.round(current.img.naturalHeight * scale);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(current.img, 0, 0, c.width, c.height);

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    current.quad.forEach((p, i) => {
      const x = p.x * scale, y = p.y * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Shade outside the quad so what will be cut is obvious.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();

    current.quad.forEach((p, i) => {
      const x = p.x * scale, y = p.y * scale;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = dragging === i ? '#fff' : '#ea580c';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [current, dragging]);

  const pointerToImage = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scale = current.img.naturalWidth / c.width;
    return {
      x: ((e.clientX - rect.left) * (c.width / rect.width)) * scale,
      y: ((e.clientY - rect.top) * (c.height / rect.height)) * scale,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;
    const p = pointerToImage(e);
    let best = -1, bestD = Infinity;
    current.quad.forEach((q, i) => {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    // Generous grab radius — this gets used on a phone with a fingertip.
    if (bestD < current.img.naturalWidth * 0.08) {
      setDragging(best);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging === null || !current) return;
    const p = pointerToImage(e);
    setPages(list => list.map((pg, i) => {
      if (i !== active) return pg;
      const quad = [...pg.quad] as Quad;
      quad[dragging] = {
        x: Math.max(0, Math.min(pg.img.naturalWidth, p.x)),
        y: Math.max(0, Math.min(pg.img.naturalHeight, p.y)),
      };
      return { ...pg, quad, scanned: undefined };
    }));
  };

  const scanAll = useCallback(async () => {
    if (!pages.length) return;
    setBusy(true);
    try {
      const done: Page[] = [];
      for (const pg of pages) {
        // Yield between pages so the tab does not freeze on a long set.
        await new Promise(r => setTimeout(r, 0));
        const out = warpToPage(pg.img, pg.quad, { page, dpi, cleanup });
        if (!out) {
          toast.error('Those corners do not form a page — move them apart.');
          done.push(pg);
          continue;
        }
        done.push({ ...pg, scanned: out.toDataURL('image/jpeg', 0.92) });
      }
      setPages(done);
      toast.success(`${done.filter(d => d.scanned).length} page(s) straightened.`);
    } finally {
      setBusy(false);
    }
  }, [pages, page, dpi, cleanup]);

  const exportPdf = useCallback(() => {
    const ready = pages.filter(p => p.scanned);
    if (!ready.length) { toast.error('Straighten the pages first.'); return; }
    // Page size in points, so the PDF carries real physical dimensions and
    // prints 1:1 rather than being scaled to fit by the printer driver.
    const pdf = new jsPDF({
      orientation: page.widthIn > page.heightIn ? 'landscape' : 'portrait',
      unit: 'in',
      format: [page.widthIn, page.heightIn],
      compress: true,
    });
    ready.forEach((p, i) => {
      if (i > 0) pdf.addPage([page.widthIn, page.heightIn], page.widthIn > page.heightIn ? 'landscape' : 'portrait');
      // Full bleed at exact page size — no margin, no fitting, no drift.
      pdf.addImage(p.scanned!, 'JPEG', 0, 0, page.widthIn, page.heightIn, undefined, 'FAST');
    });
    const uri = pdf.output('datauristring');
    pdf.save(`scan-${page.id}-${ready.length}p.pdf`);
    onScanned?.(uri, ready.length);
    toast.success(`PDF exported at ${page.widthIn}×${page.heightIn}in — print at 100%, not "fit to page".`);
  }, [pages, page, onScanned]);

  const rotate = useCallback(() => {
    if (!current) return;
    const c = document.createElement('canvas');
    c.width = current.img.naturalHeight;
    c.height = current.img.naturalWidth;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(current.img, -current.img.naturalWidth / 2, -current.img.naturalHeight / 2);
    const src = c.toDataURL('image/jpeg', 0.95);
    const img = new Image();
    img.onload = () => setPages(list => list.map((p, i) =>
      i === active ? { ...p, img, src, quad: estimateQuad(img), scanned: undefined } : p));
    img.src = src;
  }, [current, active]);

  const megapixels = useMemo(
    () => Math.round((page.widthIn * dpi * page.heightIn * dpi) / 1e5) / 10,
    [page, dpi],
  );

  const btn = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40';
  const ghost = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' };

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-[#ea580c]" /> {title}
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Photograph each page, set the corners, and export a PDF at true page size — so the
          printout matches the original and a counter clerk will take it.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} style={ghost} onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload className="w-4 h-4" /> Add pages
        </button>
        <button className={btn} style={ghost} onClick={() => camRef.current?.click()} disabled={busy}>
          <Camera className="w-4 h-4" /> Photograph
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

        <select className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm"
          value={page.id} onChange={e => setPage(PAGE_SIZES.find(p => p.id === e.target.value)!)}>
          {PAGE_SIZES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm"
          value={dpi} onChange={e => setDpi(Number(e.target.value))}>
          {[150, 200, 300].map(d => <option key={d} value={d}>{d} DPI</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" className="accent-[#ea580c]" checked={cleanup}
            onChange={e => setCleanup(e.target.checked)} />
          Clean up
        </label>
      </div>

      {dpi >= 300 && (
        <p className="flex items-start gap-2 text-xs text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          300 DPI on {page.label.split('—')[0].trim()} is {megapixels} megapixels per page — sharp,
          but slow to process and a large file. 200 is usually enough for a form.
        </p>
      )}

      {pages.length === 0 ? (
        <div className="border-2 border-dashed border-[#2A2A2A] rounded-2xl py-12 text-center text-gray-500">
          <ScanLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Add or photograph the pages of the document.</p>
          <p className="text-xs mt-1">
            Shoot square-on in even light. Include the whole page and a little of what it is lying on.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {pages.map((p, i) => (
              <button key={p.id} onClick={() => setActive(i)}
                className="relative w-16 h-20 rounded-lg overflow-hidden border-2"
                style={{ borderColor: i === active ? '#ea580c' : '#2A2A2A' }}>
                <img src={p.scanned || p.src} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-white">{i + 1}</span>
                {p.scanned && <Check className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-green-400" />}
              </button>
            ))}
          </div>

          {current && (
            <div className="space-y-2">
              <canvas ref={canvasRef}
                className="max-w-full rounded-xl border border-[#2A2A2A] touch-none cursor-crosshair"
                onPointerDown={onDown} onPointerMove={onMove}
                onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)} />
              <p className="text-xs text-gray-500">
                Drag the four dots onto the corners of the page. Detection is a starting guess — on a
                busy surface it will be wrong, and an inch out here is an inch out on the printout.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className={btn} style={ghost} onClick={rotate}>
                  <RotateCw className="w-4 h-4" /> Rotate
                </button>
                <button className={btn} style={ghost}
                  onClick={() => setPages(list => list.map((p, i) =>
                    i === active ? { ...p, quad: fullFrameQuad(p.img.naturalWidth, p.img.naturalHeight), scanned: undefined } : p))}>
                  <Eye className="w-4 h-4" /> Whole frame
                </button>
                <button className={btn} style={{ background: 'rgba(220,38,38,0.85)' }}
                  onClick={() => { setPages(l => l.filter((_, i) => i !== active)); setActive(0); }}>
                  <Trash2 className="w-4 h-4" /> Remove page
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button className={btn} style={{ background: 'rgba(234,88,12,0.9)' }} onClick={scanAll} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              Straighten {pages.length} page{pages.length === 1 ? '' : 's'}
            </button>
            <button className={btn} style={{ background: 'rgba(22,163,74,0.9)' }}
              onClick={exportPdf} disabled={busy || !pages.some(p => p.scanned)}>
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          </div>

          <p className="text-xs text-gray-500">
            The PDF is built at exactly {page.widthIn}×{page.heightIn}in. Print it at 100% — choosing
            "fit to page" or "shrink to printable area" rescales it and the printout no longer
            matches the original.
          </p>
        </>
      )}
    </div>
  );
}
